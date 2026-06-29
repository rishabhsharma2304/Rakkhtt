"""row-level security for tenant isolation

Revision ID: 0008_row_level_security
Revises: 0007_user_token_version
Create Date: 2026-06-30

Database-level backstop for multi-tenant isolation. Every org-scoped table gets RLS
with a policy that only exposes rows whose org_id matches the per-request GUC
``app.current_org`` (set by the app from the authenticated user's active org). A
dedicated, unprivileged ``rakkhtt_app`` role — which the FastAPI runtime connects as —
is subject to these policies; migrations/seeds keep using the privileged owner role,
which bypasses RLS.

The role is created here WITHOUT login/password. The operator grants it
``LOGIN PASSWORD`` out of band and points APP_DATABASE_URL at it (see the migration
plan / README). Until APP_DATABASE_URL is set, the app connects as the owner and RLS is
present but bypassed — safe for local dev.

Identity tables (organisations, users, user_orgs) are intentionally NOT covered: login
resolves users by email before any org context exists, and org/membership access is
enforced in application code.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008_row_level_security"
down_revision: Union[str, None] = "0007_user_token_version"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The 26 org-scoped tables (every OrgScopedMixin model). Keep in sync with the models.
ORG_SCOPED_TABLES = [
    # camp
    "vehicles", "camps", "donors", "donations",
    # lab
    "blood_bags", "components", "grouping_results", "tti_results", "pipeline_stage_records",
    # inventory
    "store_items", "qc_records",
    # directory
    "hospitals", "patients", "thalassemia_patients", "therapeutic_donations", "blood_inquiries",
    # reception
    "blood_requests", "invoices", "barcode_batches", "label_jobs", "reservations",
    "downloads", "feedback", "custom_reports", "custom_registers",
    # audit
    "activity_logs",
]

APP_ROLE = "rakkhtt_app"
POLICY = "org_isolation"
# Matches a row only when its org_id equals the request's GUC. current_setting(...,
# true) yields NULL if the GUC was never set this session, but an EMPTY STRING if it was
# set-then-cleared on a reused pooled connection — and ''::uuid errors. nullif(...,'')
# collapses both cases to NULL so the policy fails CLOSED (zero rows) instead of raising.
_PREDICATE = "org_id = nullif(current_setting('app.current_org', true), '')::uuid"


def upgrade() -> None:
    # 1) Unprivileged runtime role (no login here; operator adds LOGIN PASSWORD).
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
                CREATE ROLE {APP_ROLE} NOLOGIN;
            END IF;
        END
        $$;
        """
    )

    # 2) Privileges: schema usage, DML on existing tables/sequences, and defaults for
    #    any future tables. No DDL/owner rights — this role cannot bypass RLS.
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE};")
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE};")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE};")
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE};"
    )
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT USAGE, SELECT ON SEQUENCES TO {APP_ROLE};"
    )

    # 3) Enable RLS + the org-isolation policy on every org-scoped table.
    for table in ORG_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(
            f"CREATE POLICY {POLICY} ON {table} "
            f"USING ({_PREDICATE}) WITH CHECK ({_PREDICATE});"
        )


def downgrade() -> None:
    for table in ORG_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS {POLICY} ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM {APP_ROLE};"
    )
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"REVOKE USAGE, SELECT ON SEQUENCES FROM {APP_ROLE};"
    )
    op.execute(f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {APP_ROLE};")
    op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {APP_ROLE};")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {APP_ROLE};")
    # Role is left in place (may be shared / hold other grants); drop manually if needed.
