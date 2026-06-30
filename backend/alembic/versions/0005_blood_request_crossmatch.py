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
    # IF NOT EXISTS keeps the chain composable on a fresh DB (0001 create_all already
    # built these columns from the current models).
    op.execute("ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS crossmatch_result VARCHAR(20)")
    op.execute("ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS crossmatch_unit_id VARCHAR(60)")
    op.execute("ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS crossmatch_at TIMESTAMPTZ")
    # Backfill: requests whose serology is already completed implicitly passed crossmatch.
    op.execute("UPDATE blood_requests SET crossmatch_result = 'compatible' WHERE serology_status = 'completed'")


def downgrade() -> None:
    op.execute("ALTER TABLE blood_requests DROP COLUMN IF EXISTS crossmatch_at")
    op.execute("ALTER TABLE blood_requests DROP COLUMN IF EXISTS crossmatch_unit_id")
    op.execute("ALTER TABLE blood_requests DROP COLUMN IF EXISTS crossmatch_result")
