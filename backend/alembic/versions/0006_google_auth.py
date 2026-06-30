"""add Google Sign-In fields to users

Revision ID: 0006_google_auth
Revises: 0005_blood_request_crossmatch
Create Date: 2026-06-28

Adds self-serve Google auth support: an `auth_provider`, the stable Google
`google_sub` id, an `avatar_url`, and makes `password_hash` nullable since
Google-authenticated accounts have no local password.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_google_auth"
down_revision: Union[str, None] = "0005_blood_request_crossmatch"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS guards so the chain stays composable on a fresh DB, where 0001's
    # create_all already built these columns/index from the current models.
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "auth_provider VARCHAR(20) NOT NULL DEFAULT 'password'"
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512)")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)")
    # Drop the server_default now that existing rows are backfilled; the model supplies
    # the default on insert. (No-op when create_all already left it without one.)
    op.alter_column("users", "auth_provider", server_default=None)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_google_sub")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS avatar_url")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_sub")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS auth_provider")
