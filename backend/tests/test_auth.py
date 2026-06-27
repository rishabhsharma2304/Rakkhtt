"""Auth smoke tests: login success/failure + /me identity + unauthenticated rejection.

Also covers multi-tenant switch-org membership enforcement: a user may only assume
an org they belong to (their home org or an explicit user_orgs membership)."""

import uuid

import pytest


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


def _other_org_id(client, headers):
    me = client.get("/api/v1/auth/me", headers=headers).json()
    others = [o for o in me["memberships"] if o["id"] != me["active_org_id"]]
    return others[0]["id"] if others else None


def test_master_user_can_switch_between_member_orgs(client, admin_headers):
    other = _other_org_id(client, admin_headers)
    if other is None:
        pytest.skip("only one centre seeded")
    res = client.post(f"/api/v1/auth/switch-org/{other}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_switch_to_non_member_org_is_forbidden(client, technician_headers, admin_headers):
    # The throwaway technician belongs only to their home org. A master user is a
    # member of a second centre — that centre is off-limits to the technician.
    other = _other_org_id(client, admin_headers)
    if other is None:
        pytest.skip("only one centre seeded")
    me_tech = client.get("/api/v1/auth/me", headers=technician_headers).json()
    assert all(o["id"] != other for o in me_tech["memberships"])
    res = client.post(f"/api/v1/auth/switch-org/{other}", headers=technician_headers)
    assert res.status_code == 403


def test_switch_to_unknown_org_is_404(client, admin_headers):
    res = client.post(f"/api/v1/auth/switch-org/{uuid.uuid4()}", headers=admin_headers)
    assert res.status_code == 404
