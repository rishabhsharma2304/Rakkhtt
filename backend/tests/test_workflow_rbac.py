"""Workflow + RBAC smoke tests.

Covers a lab-pipeline read, a stock-movement transition, and — the Phase-7 acceptance
criterion — that non-admin roles are denied restricted actions server-side regardless
of what the UI shows.
"""
import uuid


def test_component_pipeline_queue_shape(client, admin_headers):
    res = client.get("/api/v1/components/pipeline/segmentation", headers=admin_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["stage"] == "segmentation"
    assert "items" in body and "queue_count" in body


def test_shift_to_tested_runs_for_supervisor(client, admin_headers):
    # admin/master is a supervisor — the call is allowed (moved/blocked may be any count)
    res = client.post("/api/v1/stock/shift-to-tested", headers=admin_headers, json={"ids": []})
    assert res.status_code == 200
    assert "moved" in res.json() and "blocked" in res.json()


# ---- RBAC: a technician must be blocked from supervisor- and master-only actions ----

def test_technician_cannot_shift_to_tested(client, technician_headers):
    res = client.post("/api/v1/stock/shift-to-tested", headers=technician_headers, json={"ids": []})
    assert res.status_code == 403


def test_technician_cannot_advance_validation_stage(client, technician_headers):
    res = client.post(
        "/api/v1/components/pipeline/validation/advance",
        headers=technician_headers,
        json={"ids": [], "data": {}},
    )
    assert res.status_code == 403


def test_technician_cannot_manage_staff(client, technician_headers):
    res = client.post(
        "/api/v1/staff",
        headers=technician_headers,
        json={"name": "Nope", "email": f"nope-{uuid.uuid4().hex[:8]}@example.in", "designation": "general"},
    )
    assert res.status_code == 403


def test_technician_can_do_data_entry(client, technician_headers):
    """Positive control: the technician role IS allowed to create donors (data entry)."""
    res = client.post(
        "/api/v1/donors",
        headers=technician_headers,
        json={"name": f"Tech Donor {uuid.uuid4().hex[:6]}", "blood_group": "B+"},
    )
    assert res.status_code == 201
