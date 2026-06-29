"""Row-Level Security enforcement tests.

These prove tenant isolation *at the database layer*, independent of the application's
own org_id filters. They run a raw `SELECT * FROM donors` (no org_id predicate) through
the runtime engine and assert the DB itself only returns the org bound to the
`app.current_org` GUC.

RLS only enforces when the runtime engine connects as the unprivileged `rakkhtt_app`
role (i.e. APP_DATABASE_URL is set). When it connects as the table owner (the default
local setup), the owner bypasses RLS — so these tests detect that and skip rather than
giving a false pass. To run them enforced:

    docker compose exec -e APP_DATABASE_URL=postgresql+psycopg://rakkhtt_app:<pw>@db:5432/<db> \
        -T api python -m pytest tests/test_rls.py -v
"""
import uuid

import pytest
from sqlalchemy import text

from app.db.session import AdminSessionLocal, engine
from app.models.camp import Donor
from app.models.identity import Organisation


def _make_org(db, name: str) -> uuid.UUID:
    o = Organisation(name=name, id_prefix="RLS", billing_prefix="RLS")
    db.add(o)
    db.flush()
    db.add(Donor(org_id=o.id, name=f"Donor for {name}"))
    db.commit()
    return o.id


@pytest.fixture()
def two_orgs():
    """Create two centres (A, B) each with one donor, via the privileged admin engine
    (which bypasses RLS). Yields (org_a, org_b, donor_a_id, donor_b_id)."""
    db = AdminSessionLocal()
    a = _make_org(db, f"RLS-A-{uuid.uuid4().hex[:6]}")
    b = _make_org(db, f"RLS-B-{uuid.uuid4().hex[:6]}")
    da = db.scalar(text("SELECT id FROM donors WHERE org_id = :o").bindparams(o=a))
    dbid = db.scalar(text("SELECT id FROM donors WHERE org_id = :o").bindparams(o=b))
    db.close()
    yield a, b, da, dbid
    cleanup = AdminSessionLocal()
    cleanup.execute(text("DELETE FROM donors WHERE org_id = ANY(:ids)").bindparams(ids=[a, b]))
    cleanup.execute(text("DELETE FROM organisations WHERE id = ANY(:ids)").bindparams(ids=[a, b]))
    cleanup.commit()
    cleanup.close()


def _rls_enforced(donor_id: uuid.UUID) -> bool:
    """True if the runtime engine is subject to RLS (a row vanishes under a foreign
    GUC). False when connected as the owner, which bypasses RLS."""
    with engine.connect() as c:
        c.execute(text("SELECT set_config('app.current_org', :v, true)"), {"v": str(uuid.uuid4())})
        n = c.execute(text("SELECT count(*) FROM donors WHERE id = :i"), {"i": str(donor_id)}).scalar()
    return n == 0


def test_rls_scopes_select_to_guc_org(two_orgs):
    a, b, da, dbid = two_orgs
    if not _rls_enforced(da):
        pytest.skip("runtime engine is the table owner (RLS bypassed); set APP_DATABASE_URL to enforce")

    with engine.connect() as c:
        # Bind tenant A, then a deliberately UNfiltered query — the DB must hide B's row.
        c.execute(text("SELECT set_config('app.current_org', :v, true)"), {"v": str(a)})
        visible = {
            str(r[0]) for r in c.execute(text("SELECT id FROM donors WHERE id = ANY(:ids)"),
                                         {"ids": [da, dbid]})
        }
    assert str(da) in visible
    assert str(dbid) not in visible


def test_rls_unset_guc_sees_nothing(two_orgs):
    a, b, da, dbid = two_orgs
    if not _rls_enforced(da):
        pytest.skip("RLS bypassed (owner); set APP_DATABASE_URL to enforce")
    with engine.connect() as c:
        # No GUC set → missing_ok current_setting yields NULL → zero rows (deny by default).
        n = c.execute(text("SELECT count(*) FROM donors WHERE id = ANY(:ids)"),
                      {"ids": [da, dbid]}).scalar()
    assert n == 0


def test_rls_with_check_blocks_cross_org_insert(two_orgs):
    a, b, da, dbid = two_orgs
    if not _rls_enforced(da):
        pytest.skip("RLS bypassed (owner); set APP_DATABASE_URL to enforce")
    with engine.connect() as c:
        c.execute(text("SELECT set_config('app.current_org', :v, true)"), {"v": str(a)})
        # Bound to A, attempt to write a row owned by B → WITH CHECK must reject it.
        with pytest.raises(Exception):
            c.execute(
                text("INSERT INTO donors (id, org_id, name, is_deleted, total_donations, "
                     "deferral_status, created_at, updated_at) "
                     "VALUES (:id, :org, 'sneaky', false, 0, 'none', now(), now())"),
                {"id": str(uuid.uuid4()), "org": str(b)},
            )
            c.commit()
