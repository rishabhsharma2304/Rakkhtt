import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_org, get_current_user
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.core.security import create_access_token, verify_password
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
    token = create_access_token(str(user.id), str(user.org_id))
    return TokenOut(access_token=token)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("5/minute")
def refresh(request: Request, user: User = Depends(get_current_user)):
    active = getattr(user, "_active_org_id", None) or str(user.org_id)
    return TokenOut(access_token=create_access_token(str(user.id), str(active)))


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
    return TokenOut(access_token=create_access_token(str(user.id), str(org.id)))
