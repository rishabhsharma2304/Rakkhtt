from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt only considers the first 72 bytes of input and some passlib/bcrypt
# combinations raise on longer values. Truncate to 72 bytes before hashing AND
# verifying so the two stay consistent and an over-long password can't error or be
# used as a cheap CPU-DoS vector.
_BCRYPT_MAX_BYTES = 72


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return pwd_context.hash(_prepare(password))


def verify_password(plain: str, hashed: str | None) -> bool:
    # Google-only accounts have no local password_hash; never let that 500 — treat a
    # missing hash as a failed password login.
    if not hashed:
        return False
    return pwd_context.verify(_prepare(plain), hashed)


# Token "typ" discriminators so a registration token can never be presented as an
# access token (and vice-versa) even though both are signed with JWT_SECRET.
ACCESS_TOKEN_TYPE = "access"


def create_access_token(
    subject: str, org_id: str | None, extra: dict | None = None, token_version: int = 0
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "org_id": org_id,
        "typ": ACCESS_TOKEN_TYPE,
        "tv": token_version,  # bumped on password/role change & logout-all → old tokens die
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# How long a new (org-less) Google user has to complete onboarding before the
# short-lived registration token expires and they must sign in again.
REGISTRATION_TOKEN_MINUTES = 30


def create_registration_token(claims: dict) -> str:
    """Sign a short-lived token carrying a verified Google identity that has no
    account/org yet. Exchanged at /auth/onboard for a real access token once the
    user supplies their blood centre details."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=REGISTRATION_TOKEN_MINUTES)
    payload = {"purpose": "register", "exp": expire, **claims}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    # algorithms is pinned to a single symmetric algorithm — this is what prevents JWT
    # "alg" confusion (e.g. a forged token claiming alg=none or RS256).
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
