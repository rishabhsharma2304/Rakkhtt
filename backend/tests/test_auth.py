"""Auth smoke tests: login success/failure + /me identity + unauthenticated rejection."""


def test_login_success_returns_bearer_token(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@acbc.in", "password": "password123"})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_is_401(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@acbc.in", "password": "nope"})
    assert res.status_code == 401


def test_me_reports_master_role(client, admin_headers):
    res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert res.status_code == 200
    me = res.json()
    assert me["email"] == "admin@acbc.in"
    assert me["is_master_user"] is True
    assert me["role"] == "master_user"
    assert len(me["memberships"]) >= 1


def test_me_requires_authentication(client):
    assert client.get("/api/v1/auth/me").status_code == 401
