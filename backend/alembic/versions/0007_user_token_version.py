"""add token_version to users for token revocation

Revision ID: 0007_user_token_version
Revises: 0006_google_auth
Create Date: 2026-06-30

Adds an integer `token_version` to users. Access tokens embed the value at issue
time and `get_current_user` rejects any token whose value is stale, so bumping the
column (on password/role change or an explicit logout-all) revokes outstanding
tokens without a server-side session store.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_user_token_version"
down_revision: Union[str, None] = "0006_google_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS keeps the chain composable on a fresh DB (0001 create_all already
    # built this column from the current models).
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")
    # Drop the server_default now existing rows are backfilled; the model supplies the
    # default on insert.
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS token_version")
