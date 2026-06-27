import uuid
from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, TimestampMixin, UUIDMixin


class ActivityLog(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    """Append-only audit trail: who did what, when. Surfaced as the per-module
    History feed (e.g. Reception › History)."""

    __tablename__ = "activity_logs"
    module: Mapped[str] = mapped_column(String(40), default="reception", nullable=False, index=True)
    user_name: Mapped[str | None] = mapped_column(String(120))
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_ref: Mapped[str | None] = mapped_column(String(80), index=True)
