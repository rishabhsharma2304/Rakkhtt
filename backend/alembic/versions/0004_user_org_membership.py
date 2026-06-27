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
    op.create_table(
        "user_orgs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organisations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "org_id", name="uq_user_orgs_user_org"),
    )
    op.create_index("ix_user_orgs_user_id", "user_orgs", ["user_id"])
    op.create_index("ix_user_orgs_org_id", "user_orgs", ["org_id"])

    # Backfill: every existing user is a member of their home org.
    op.execute(
        "INSERT INTO user_orgs (id, user_id, org_id, created_at, updated_at) "
        "SELECT gen_random_uuid(), id, org_id, now(), now() FROM users"
    )


def downgrade() -> None:
    op.drop_index("ix_user_orgs_org_id", table_name="user_orgs")
    op.drop_index("ix_user_orgs_user_id", table_name="user_orgs")
    op.drop_table("user_orgs")
