"""Google-only accounts (no local password_hash) must fail password login *cleanly*.

A user created via the Google onboarding path has password_hash = NULL. Attempting a
password login for them must return 401 — never 500 from passlib being handed a None hash.
"""
import uuid

from sqlalchemy import delete, select

from app.core.security import create_registration_token, verify_password
from app.db.session import SessionLocal
from app.models.identity import Organisation, User, UserOrg


def test_verify_password_rejects_null_hash():
    # The unit-level guard: a missing hash is a failed login, not an exception.
    assert verify_password("anything", None) is False


def _onboard_google_user(client) -> tuple[str, str]:
    email = f"goog-{uuid.uuid4().hex[:8]}@goog.test"
    reg = create_registration_token({"sub": f"g-{uuid.uuid4().hex}", "email": email, "name": "Goog", "picture": None})
    org_name = f"Goog Centre {uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/auth/onboard", json={"registration_token": reg, "org_name": org_name})
    assert res.status_code == 200, res.text
    return email, org_name


def _cleanup(email: str, org_name: str):
    db = SessionLocal()
    u = db.scalar(select(User).where(User.email == email))
    o = db.scalar(select(Organisation).where(Organisation.name == org_name))
    if u:
        db.execute(delete(UserOrg).where(UserOrg.user_id == u.id))
        db.delete(u)
    if o:
        db.delete(o)
    db.commit()
    db.close()


def test_password_login_for_google_only_user_is_401_not_500(client):
    email, org_name = _onboard_google_user(client)
    try:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "whatever"})
        # Must be a clean auth failure (401). Tolerate 429 if the login limiter trips in a
        # busy suite run, but a 500 (passlib choking on a NULL hash) is the regression.
        assert res.status_code in (401, 429), res.text
    finally:
        _cleanup(email, org_name)
