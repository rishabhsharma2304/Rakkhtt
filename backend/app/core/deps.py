import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.security import ACCESS_TOKEN_TYPE, decode_token
from app.db.session import get_db
from app.models.identity import Organisation, User

log = get_logger("auth")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        log.warning("auth.token_invalid", reason="decode_error")
        raise cred_exc

    # Only true access tokens authenticate — a registration token (purpose=register)
    # or any other token type is rejected here rather than half-parsed.
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        log.warning("auth.token_invalid", reason="wrong_token_type")
        raise cred_exc

    user_id = payload.get("sub")
    try:
        uid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        log.warning("auth.token_invalid", reason="bad_subject")
        raise cred_exc

    user = db.get(User, uid)
    if user is None or user.is_deleted:
        log.warning("auth.token_invalid", reason="unknown_or_deleted_user", user_id=user_id)
        raise cred_exc

    # token_version lets us revoke outstanding tokens: any change to the user's auth
    # (password reset, role change, logout-all) bumps it, leaving older tokens stale.
    if int(payload.get("tv", 0)) != int(user.token_version or 0):
        log.warning("auth.token_invalid", reason="stale_token_version", user_id=user_id)
        raise cred_exc

    # Stash the token's active org on the instance for get_current_org.
    user._active_org_id = payload.get("org_id")  # type: ignore[attr-defined]
    return user


def get_current_org(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Organisation:
    org_id = getattr(user, "_active_org_id", None) or user.org_id
    try:
        org = db.get(Organisation, uuid.UUID(str(org_id))) if org_id else None
    except (ValueError, TypeError):
        org = None
    if org is None or org.is_deleted:
        raise HTTPException(status_code=400, detail="No active organisation on token")
    # Bind this org as the DB-level tenant context so RLS scopes every subsequent query
    # to it — a backstop in case an endpoint's own org_id filter is missing.
    from app.db.rls import apply_org

    apply_org(db, org.id)
    return org


def require_master_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_master_user and user.designation not in ("master_user", "admin"):
        raise HTTPException(status_code=403, detail="Master User privilege required")
    return user
