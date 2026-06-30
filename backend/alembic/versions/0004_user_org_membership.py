"""add user_orgs membership junction

Revision ID: 0004_user_org_membership
Revises: 0003_feedback_suggestion_fields
Create Date: 2026-06-27

Adds the user_orgs junction so /auth/switch-org can validate that a user
belongs to the target centre before issuing a token scoped to it. Backfills a
membership row for every user's home org so existing tokens keep working.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_user_org_membership"
down_revision: Union[str, None] = "0003_feedback_suggestion_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS guards so the chain stays composable on a fresh DB, where 0001's
    # create_all already built the table/indexes from the current models.
    op.execute(
        "CREATE TABLE IF NOT EXISTS user_orgs ("
        "  id uuid PRIMARY KEY,"
        "  user_id uuid NOT NULL REFERENCES users(id),"
        "  org_id uuid NOT NULL REFERENCES organisations(id),"
        "  created_at timestamptz NOT NULL DEFAULT now(),"
        "  updated_at timestamptz NOT NULL DEFAULT now(),"
        "  CONSTRAINT uq_user_orgs_user_org UNIQUE (user_id, org_id)"
        ")"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_orgs_user_id ON user_orgs (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_orgs_org_id ON user_orgs (org_id)")

    # Backfill: every existing user is a member of their home org. ON CONFLICT keeps it
    # idempotent (no-op on a fresh DB that has no users yet, or on re-run).
    op.execute(
        "INSERT INTO user_orgs (id, user_id, org_id, created_at, updated_at) "
        "SELECT gen_random_uuid(), id, org_id, now(), now() FROM users "
        "ON CONFLICT (user_id, org_id) DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_user_orgs_org_id")
    op.execute("DROP INDEX IF EXISTS ix_user_orgs_user_id")
    op.execute("DROP TABLE IF EXISTS user_orgs")
