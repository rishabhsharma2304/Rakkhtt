"""CRUD smoke test over the generic factory, using donors as the representative resource:
full create -> list -> get -> update -> soft-delete lifecycle, plus org scoping."""
import uuid


def test_donor_crud_lifecycle(client, admin_headers):
    name = f"Smoke Donor {uuid.uuid4().hex[:8]}"

    # create
    created = client.post(
        "/api/v1/donors",
        headers=admin_headers,
        json={"name": name, "blood_group": "O+", "gender": "male", "age": 30},
    )
    assert created.status_code == 201, created.text
    donor = created.json()
    donor_id = donor["id"]
    assert donor["name"] == name

    # appears in a search-filtered list
    listed = client.get(f"/api/v1/donors?search={name}", headers=admin_headers)
    assert listed.status_code == 200
    assert any(d["id"] == donor_id for d in listed.json()["items"])

    # fetch one
    got = client.get(f"/api/v1/donors/{donor_id}", headers=admin_headers)
    assert got.status_code == 200
    assert got.json()["blood_group"] == "O+"

    # update
    patched = client.patch(f"/api/v1/donors/{donor_id}", headers=admin_headers, json={"blood_group": "A+"})
    assert patched.status_code == 200
    assert patched.json()["blood_group"] == "A+"

    # soft-delete, then it is gone
    deleted = client.delete(f"/api/v1/donors/{donor_id}", headers=admin_headers)
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/donors/{donor_id}", headers=admin_headers).status_code == 404


def test_donor_create_requires_auth(client):
    res = client.post("/api/v1/donors", json={"name": "no auth"})
    assert res.status_code == 401
