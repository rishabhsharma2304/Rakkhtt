"""add name/contact/action_taken to feedback

Revision ID: 0003_feedback_suggestion_fields
Revises: 0002_serology_stage
Create Date: 2026-06-27

Adds the suggester's name, contact number and the action-taken note so the
Feedbacks › Suggestions table can show who left each comment and how it was
followed up.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_feedback_suggestion_fields"
down_revision: Union[str, None] = "0002_serology_stage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS keeps the chain composable on a fresh DB (0001 create_all already
    # built these columns from the current models).
    op.execute("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS name VARCHAR(200)")
    op.execute("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS contact VARCHAR(40)")
    op.execute("ALTER TABLE feedback ADD COLUMN IF NOT EXISTS action_taken TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE feedback DROP COLUMN IF EXISTS action_taken")
    op.execute("ALTER TABLE feedback DROP COLUMN IF EXISTS contact")
    op.execute("ALTER TABLE feedback DROP COLUMN IF EXISTS name")
