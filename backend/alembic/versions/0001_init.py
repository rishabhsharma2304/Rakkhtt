"""initial schema — create all tables from SQLAlchemy metadata

Revision ID: 0001_init
Revises:
Create Date: 2026-06-25

We create the full schema directly from Base.metadata. This keeps the migration in
lockstep with the models for a greenfield build and guarantees `alembic upgrade head`
produces a working database with no manual surgery.
"""
from typing import Sequence, Union

from alembic import op

from app.db.base import Base
import app.models  # noqa: F401  (registers every model on Base.metadata)

revision: str = "0001_init"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
