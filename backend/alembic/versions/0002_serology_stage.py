"""add serology_stage to blood_requests

Revision ID: 0002_serology_stage
Revises: 0001_init
Create Date: 2026-06-26

Tracks the in-flight serology workflow stage (grouping → crossmatch → issue → done)
for a blood request so Reception can surface the next pending serology action.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_serology_stage"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "blood_requests",
        sa.Column("serology_stage", sa.String(length=20), nullable=False, server_default="grouping"),
    )
    # Requests with serology already completed are past the workflow.
    op.execute("UPDATE blood_requests SET serology_stage = 'done' WHERE serology_status = 'completed'")


def downgrade() -> None:
    op.drop_column("blood_requests", "serology_stage")
