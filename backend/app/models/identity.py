import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Organisation(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """A blood centre / tenant."""
    __tablename__ = "organisations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    license_no: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    id_prefix: Mapped[str] = mapped_column(String(12), default="ACBC", nullable=False)
    billing_prefix: Mapped[str] = mapped_column(String(12), default="ACBC", nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(512))
    compliance_flags: Mapped[dict] = mapped_column(JSONB, default=dict)
    blood_pricing: Mapped[dict] = mapped_column(JSONB, default=dict)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)


class User(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Staff member. Belongs to one home org but the token carries the active org."""
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # technician | technical_supervisor | motivation | general | master_user | admin
    designation: Mapped[str] = mapped_column(String(40), default="general", nullable=False)
    permissions: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_master_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organisations.id"), nullable=False, index=True
    )

    org: Mapped["Organisation"] = relationship()
