"""Verifies the security-audit fixes end to end, using the onboarding path to mint
tokens (so we don't trip the /auth/login rate limiter).

Covers:
  - access-token `typ` discrimination (a registration token can't authenticate)
  - token_version revocation via /auth/logout-all
  - /orgs tenant scoping (a fresh centre sees only itself)
  - bad-Bearer guards return 401, never 500
"""
import uuid

from sqlalchemy import delete, select

from app.core.security import create_registration_token
from app.db.session import SessionLocal
from app.models.identity import Organisation, User, UserOrg


def _onboard(client) -> tuple[str, str, str]:
    """Onboard a brand-new Google user → (access_token, email, org_name)."""
    email = f"sec-{uuid.uuid4().hex[:8]}@sec.test"
    reg = create_registration_token({"sub": f"g-{uuid.uuid4().hex}", "email": email, "name": "Sec", "picture": None})
    org_name = f"Sec Centre {uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/auth/onboard", json={"registration_token": reg, "org_name": org_name})
    assert res.status_code == 200, res.text
    return res.json()["access_token"], email, org_name


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


def test_registration_token_cannot_authenticate(client):
    """A registration token (typ != access) must be rejected as a Bearer, not parsed."""
    reg = create_registration_token({"sub": "g-x", "email": "x@y.z", "name": "X", "picture": None})
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reg}"})
    assert res.status_code == 401


def test_garbage_bearer_is_401_not_500(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert res.status_code == 401


def test_orgs_list_is_scoped_to_membership(client):
    token, email, org_name = _onboard(client)
    try:
        res = client.get("/api/v1/orgs", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, res.text
        items = res.json()["items"]
        # A freshly-onboarded centre must see exactly its own org — never other tenants'.
        assert len(items) == 1
        assert items[0]["name"] == org_name
    finally:
        _cleanup(email, org_name)


def test_logout_all_revokes_old_token(client):
    token, email, org_name = _onboard(client)
    try:
        h = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/v1/auth/me", headers=h).status_code == 200
        # Bump token_version; the new token works, the old one is now stale.
        out = client.post("/api/v1/auth/logout-all", headers=h)
        assert out.status_code == 200, out.text
        new_token = out.json()["access_token"]
        assert client.get("/api/v1/auth/me", headers=h).status_code == 401
        assert client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_token}"}
        ).status_code == 200
    finally:
        _cleanup(email, org_name)
