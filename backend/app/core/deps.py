import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.security import decode_token
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
        user_id = payload.get("sub")
        if user_id is None:
            log.warning("auth.token_invalid", reason="missing_sub")
            raise cred_exc
    except JWTError:
        log.warning("auth.token_invalid", reason="decode_error")
        raise cred_exc

    user = db.get(User, uuid.UUID(user_id))
    if user is None or user.is_deleted:
        log.warning("auth.token_invalid", reason="unknown_or_deleted_user", user_id=user_id)
        raise cred_exc
    # Stash the token's active org on the instance for get_current_org.
    user._active_org_id = payload.get("org_id")  # type: ignore[attr-defined]
    return user


def get_current_org(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Organisation:
    org_id = getattr(user, "_active_org_id", None) or user.org_id
    org = db.get(Organisation, uuid.UUID(str(org_id))) if org_id else None
    if org is None:
        raise HTTPException(status_code=400, detail="No active organisation on token")
    return org


def require_master_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_master_user and user.designation not in ("master_user", "admin"):
        raise HTTPException(status_code=403, detail="Master User privilege required")
    return user
