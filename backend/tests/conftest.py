"""Smoke-test fixtures.

These tests exercise the real running stack (app + seeded Postgres). They assume the
synthetic seed has run, which it does on container start (`SEED_ON_START`). The demo
master account is documented in the README and is the only fixed dependency — every
other actor a test needs (e.g. a technician) is created on the fly via the API and
cleaned up afterwards.

Run inside the api container:  docker compose exec api python -m pytest -q
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

ADMIN_EMAIL = "admin@acbc.in"
PASSWORD = "password123"


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


def _login(client: TestClient, email: str, password: str = PASSWORD) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    return _login(client, ADMIN_EMAIL)


@pytest.fixture()
def admin_headers(admin_token: str) -> dict:
    return _auth(admin_token)


@pytest.fixture()
def technician_headers(client: TestClient, admin_headers: dict):
    """Create a throwaway technician via the admin API, log in as them, then clean up."""
    email = f"tech-{uuid.uuid4().hex[:10]}@example.in"
    created = client.post(
        "/api/v1/staff",
        headers=admin_headers,
        json={"name": "Smoke Technician", "email": email, "designation": "technician", "password": PASSWORD},
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]
    token = _login(client, email)

    yield _auth(token)

    client.delete(f"/api/v1/staff/{user_id}", headers=admin_headers)
