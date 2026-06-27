"""add crossmatch result fields to blood_requests

Revision ID: 0005_blood_request_crossmatch
Revises: 0004_user_org_membership
Create Date: 2026-06-27

Records the crossmatch outcome on a blood request so the serology workflow can
gate the crossmatch → issue transition on a compatible cross result being on file.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_blood_request_crossmatch"
down_revision: Union[str, None] = "0004_user_org_membership"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("blood_requests", sa.Column("crossmatch_result", sa.String(length=20), nullable=True))
    op.add_column("blood_requests", sa.Column("crossmatch_unit_id", sa.String(length=60), nullable=True))
    op.add_column("blood_requests", sa.Column("crossmatch_at", sa.DateTime(timezone=True), nullable=True))
    # Backfill: requests whose serology is already completed implicitly passed crossmatch.
    op.execute("UPDATE blood_requests SET crossmatch_result = 'compatible' WHERE serology_status = 'completed'")


def downgrade() -> None:
    op.drop_column("blood_requests", "crossmatch_at")
    op.drop_column("blood_requests", "crossmatch_unit_id")
    op.drop_column("blood_requests", "crossmatch_result")
