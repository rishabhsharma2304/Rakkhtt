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
    op.add_column("feedback", sa.Column("name", sa.String(length=200), nullable=True))
    op.add_column("feedback", sa.Column("contact", sa.String(length=40), nullable=True))
    op.add_column("feedback", sa.Column("action_taken", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("feedback", "action_taken")
    op.drop_column("feedback", "contact")
    op.drop_column("feedback", "name")
