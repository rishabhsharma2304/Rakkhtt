"""per-org uniqueness, org_counters table, and RLS on it

Revision ID: 0009_uniqueness_and_counters
Revises: 0008_row_level_security
Create Date: 2026-06-30

Phase-1 pre-launch data-integrity hardening:

1. Per-org partial-unique indexes on the business identifiers that must never collide
   (bag_no, request_id, invoice_no, donors.govt_id). Partial on ``is_deleted = false`` so a
   value freed by a soft-delete can be reused, and govt_id only when actually supplied.
2. A row-locked ``org_counters`` table that replaces the race-prone ``COUNT(*) + base`` id
   generation; ids are now minted with an atomic increment.
3. RLS + grants on ``org_counters`` so it matches every other org-scoped table (0008).

Every statement is ``IF NOT EXISTS`` / idempotent so the chain composes on a fresh DB
(0001 ``create_all`` already builds the table + indexes from the models) and on an existing
one (these statements actually create them).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009_uniqueness_and_counters"
down_revision: Union[str, None] = "0008_row_level_security"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "rakkhtt_app"
POLICY = "org_isolation"
_PREDICATE = "org_id = nullif(current_setting('app.current_org', true), '')::uuid"

# index name -> (table, columns, partial WHERE)
_UNIQUE_INDEXES = [
    ("uq_blood_bags_org_bag_no", "blood_bags", "org_id, bag_no", "is_deleted = false"),
    ("uq_blood_requests_org_request_id", "blood_requests", "org_id, request_id", "is_deleted = false"),
    ("uq_invoices_org_invoice_no", "invoices", "org_id, invoice_no", "is_deleted = false"),
    ("uq_donors_org_govt_id", "donors", "org_id, govt_id", "govt_id IS NOT NULL AND is_deleted = false"),
]


def upgrade() -> None:
    # 1) org_counters (mirrors the OrgCounter model; UUIDMixin id is supplied by the app).
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS org_counters (
            id uuid PRIMARY KEY,
            org_id uuid NOT NULL REFERENCES organisations(id),
            counter_type varchar(30) NOT NULL,
            year varchar(8) NOT NULL DEFAULT '',
            value integer NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_org_counters UNIQUE (org_id, counter_type, year)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_org_counters_org_id ON org_counters (org_id);")

    # 2) Per-org uniqueness on business identifiers.
    for name, table, cols, where in _UNIQUE_INDEXES:
        op.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS {name} ON {table} ({cols}) WHERE {where};")

    # 3) Bring org_counters under the same RLS regime as every other org-scoped table.
    #    0008 created the role and set default privileges, but grant explicitly too. The
    #    policy is brand new (create_all never builds policies, and this table is new here),
    #    so a plain CREATE — exactly as 0008 does — needs no IF-NOT-EXISTS guard.
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON org_counters TO {APP_ROLE};")
    op.execute("ALTER TABLE org_counters ENABLE ROW LEVEL SECURITY;")
    op.execute(
        f"CREATE POLICY {POLICY} ON org_counters "
        f"USING ({_PREDICATE}) WITH CHECK ({_PREDICATE});"
    )


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS {POLICY} ON org_counters;")
    op.execute("ALTER TABLE IF EXISTS org_counters DISABLE ROW LEVEL SECURITY;")
    for name, _table, _cols, _where in _UNIQUE_INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name};")
    op.execute("DROP TABLE IF EXISTS org_counters;")
