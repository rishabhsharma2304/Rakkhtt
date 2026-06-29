"""Google sign-in config + self-serve onboarding smoke tests.

These deliberately avoid /auth/login (which is rate-limited) — onboarding mints
its own access token. A registration token is created directly via the security
helper, mirroring exactly what /auth/google issues after verifying a Google ID
token, so we exercise /auth/onboard end to end without a real Google round-trip.
"""
import uuid

from sqlalchemy import delete, select

from app.core.security import create_registration_token
from app.db.session import SessionLocal
from app.models.identity import Organisation, User, UserOrg


def test_auth_config_is_public(client):
    res = client.get("/api/v1/auth/config")
    assert res.status_code == 200
    body = res.json()
    assert "google_enabled" in body and "google_client_id" in body


def test_google_endpoint_when_disabled_is_400(client):
    # No GOOGLE_CLIENT_ID configured in the test env → google sign-in is off.
    res = client.post("/api/v1/auth/google", json={"credential": "anything"})
    assert res.status_code == 400


def test_onboard_with_bad_token_is_401(client):
    res = client.post("/api/v1/auth/onboard", json={"registration_token": "nope", "org_name": "X"})
    assert res.status_code == 401


def test_onboard_creates_org_and_master_user(client):
    email = f"owner-{uuid.uuid4().hex[:8]}@newbank.test"
    reg = create_registration_token({"sub": f"g-{uuid.uuid4().hex}", "email": email, "name": "Dr Owner", "picture": None})
    org_name = f"Onboard Test Centre {uuid.uuid4().hex[:6]}"
    try:
        res = client.post(
            "/api/v1/auth/onboard",
            json={"registration_token": reg, "org_name": org_name, "contact": "022-0000"},
        )
        assert res.status_code == 200, res.text
        token = res.json()["access_token"]

        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
        assert me["email"] == email
        assert me["is_master_user"] is True
        assert me["role"] == "master_user"
        assert any(o["name"] == org_name for o in me["memberships"])

        # A second exchange of the same token must not create a duplicate account.
        dup = client.post("/api/v1/auth/onboard", json={"registration_token": reg, "org_name": org_name})
        assert dup.status_code == 409
    finally:
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
