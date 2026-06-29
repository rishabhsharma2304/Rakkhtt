import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_org, get_current_user
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_registration_token,
    decode_token,
    verify_password,
)
from app.db.session import get_db
from app.models.identity import Organisation, User, UserOrg

log = get_logger("auth")

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleIn(BaseModel):
    # The ID token (a credential JWT) returned by Google Identity Services in the
    # browser. Verified server-side against GOOGLE_CLIENT_ID.
    credential: str


class GoogleResult(BaseModel):
    # Either an access token (existing account) or a registration token plus the
    # verified profile, when the Google user has no account/org yet.
    access_token: str | None = None
    token_type: str = "bearer"
    registration_required: bool = False
    registration_token: str | None = None
    email: str | None = None
    name: str | None = None


class OnboardIn(BaseModel):
    registration_token: str
    org_name: str
    license_no: str | None = None
    contact: str | None = None
    address: str | None = None
    id_prefix: str | None = None


def _org_brief(o: Organisation) -> dict:
    return {"id": str(o.id), "name": o.name, "id_prefix": o.id_prefix}


def _is_member(db: Session, user: User, org_id: uuid.UUID) -> bool:
    """True if the user belongs to ``org_id`` (home org or an explicit membership)."""
    if user.org_id == org_id:
        return True
    return db.scalar(
        select(UserOrg.id).where(UserOrg.user_id == user.id, UserOrg.org_id == org_id)
    ) is not None


def _memberships(db: Session, user: User) -> list[dict]:
    # Only the (non-deleted) centres this user is actually a member of: their home
    # org plus any rows in the user_orgs junction table.
    org_ids = {user.org_id} | set(
        db.scalars(select(UserOrg.org_id).where(UserOrg.user_id == user.id)).all()
    )
    orgs = db.scalars(
        select(Organisation)
        .where(Organisation.id.in_(org_ids), Organisation.is_deleted.is_(False))
        .order_by(Organisation.name)
    ).all()
    return [_org_brief(o) for o in orgs]


def _me_payload(db: Session, user: User, active_org_id: str | None) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "designation": user.designation,
        "role": "master_user" if user.is_master_user else user.designation,
        "is_master_user": user.is_master_user,
        "active_org_id": active_org_id or str(user.org_id),
        "memberships": _memberships(db, user),
    }


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email, User.is_deleted.is_(False)))
    if not user or not verify_password(body.password, user.password_hash):
        log.warning(
            "auth.login_failed",
            email=body.email,
            reason="unknown_user" if not user else "bad_password",
            client=request.client.host if request.client else None,
        )
        raise HTTPException(401, "Incorrect email or password")
    token = create_access_token(str(user.id), str(user.org_id), token_version=user.token_version)
    return TokenOut(access_token=token)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("5/minute")
def refresh(request: Request, user: User = Depends(get_current_user)):
    active = getattr(user, "_active_org_id", None) or str(user.org_id)
    return TokenOut(access_token=create_access_token(str(user.id), str(active), token_version=user.token_version))


@router.post("/logout-all", response_model=TokenOut)
def logout_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Revoke every outstanding token for the current user (e.g. after a suspected
    leak) by bumping token_version, then hand back a fresh token for this session."""
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    active = getattr(user, "_active_org_id", None) or str(user.org_id)
    return TokenOut(access_token=create_access_token(str(user.id), str(active), token_version=user.token_version))


@router.get("/me")
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    active = getattr(user, "_active_org_id", None)
    return _me_payload(db, user, active)


@router.post("/switch-org/{org_id}", response_model=TokenOut)
def switch_org(org_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org = db.get(Organisation, org_id)
    if org is None or org.is_deleted:
        raise HTTPException(404, "Organisation not found")
    if not _is_member(db, user, org.id):
        raise HTTPException(403, "You are not a member of this organisation")
    return TokenOut(access_token=create_access_token(str(user.id), str(org.id), token_version=user.token_version))


# --- Google Sign-In + self-serve onboarding ---------------------------------


@router.get("/config")
def auth_config():
    """Public: tells the frontend which sign-in methods are available so it can
    render the Google button (and with which client id) when configured."""
    return {
        "google_enabled": settings.google_enabled,
        "google_client_id": settings.GOOGLE_CLIENT_ID or None,
    }


def _verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token against GOOGLE_CLIENT_ID and return its claims.

    Imported lazily so the dependency is only required when Google auth is used.
    """
    if not settings.google_enabled:
        raise HTTPException(400, "Google sign-in is not configured on this server")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        info = id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        log.warning("auth.google_verify_failed")
        raise HTTPException(401, "Invalid Google credential")
    if not info.get("email_verified"):
        raise HTTPException(401, "Google account email is not verified")
    return info


def _derive_prefix(name: str) -> str:
    """A short uppercase id prefix from an org name, e.g. 'Arogya City Blood
    Centre' -> 'ACBC'. Falls back to the first alphanumerics, then 'ORG'."""
    initials = "".join(w[0] for w in re.findall(r"[A-Za-z0-9]+", name))[:6].upper()
    if not initials:
        return "ORG"
    return initials if len(initials) >= 2 else (re.sub(r"[^A-Za-z0-9]", "", name)[:4].upper() or "ORG")


@router.post("/google", response_model=GoogleResult)
@limiter.limit("10/minute")
def google_auth(request: Request, body: GoogleIn, db: Session = Depends(get_db)):
    info = _verify_google_credential(body.credential)
    sub = info["sub"]
    email = info["email"].lower()
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    user = db.scalar(
        select(User).where(
            (User.google_sub == sub) | (User.email == email), User.is_deleted.is_(False)
        )
    )
    if user:
        # Link Google to a pre-existing (e.g. password) account on first use.
        changed = False
        if not user.google_sub:
            user.google_sub = sub
            changed = True
        if picture and not user.avatar_url:
            user.avatar_url = picture
            changed = True
        if changed:
            db.commit()
        log.info("auth.google_login", user_id=str(user.id))
        return GoogleResult(access_token=create_access_token(str(user.id), str(user.org_id), token_version=user.token_version))

    # No account yet → issue a short-lived registration token; the frontend
    # collects the blood centre details and calls /auth/onboard.
    reg = create_registration_token({"sub": sub, "email": email, "name": name, "picture": picture})
    log.info("auth.google_registration_required", email=email)
    return GoogleResult(registration_required=True, registration_token=reg, email=email, name=name)


@router.post("/onboard", response_model=TokenOut)
@limiter.limit("10/minute")
def onboard(request: Request, body: OnboardIn, db: Session = Depends(get_db)):
    """Exchange a registration token (from /auth/google) for a real account: this
    creates the user's blood centre and makes them its master user."""
    try:
        claims = decode_token(body.registration_token)
    except Exception:
        raise HTTPException(401, "Registration session expired — please sign in again")
    if claims.get("purpose") != "register":
        raise HTTPException(401, "Invalid registration token")

    email = (claims.get("email") or "").lower()
    sub = claims.get("sub")
    if not email or not sub:
        raise HTTPException(401, "Invalid registration token")

    # Guard against a double-submit / race creating two accounts.
    if db.scalar(select(User.id).where(User.email == email, User.is_deleted.is_(False))):
        raise HTTPException(409, "An account already exists for this email — please sign in")

    org_name = body.org_name.strip()
    if not org_name:
        raise HTTPException(422, "Blood centre name is required")
    prefix = (body.id_prefix or _derive_prefix(org_name)).strip().upper()[:12] or "ORG"

    org = Organisation(
        name=org_name,
        license_no=body.license_no,
        contact=body.contact,
        address=body.address,
        email=email,
        id_prefix=prefix,
        billing_prefix=prefix,
    )
    db.add(org)
    db.flush()  # assign org.id

    user = User(
        name=claims.get("name") or email.split("@")[0],
        email=email,
        google_sub=sub,
        avatar_url=claims.get("picture"),
        auth_provider="google",
        designation="master_user",
        is_master_user=True,
        org_id=org.id,
    )
    db.add(user)
    db.flush()
    db.add(UserOrg(user_id=user.id, org_id=org.id))
    db.commit()
    log.info("auth.onboarded", user_id=str(user.id), org_id=str(org.id))
    return TokenOut(access_token=create_access_token(str(user.id), str(org.id)))
