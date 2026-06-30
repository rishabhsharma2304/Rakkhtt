import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Vehicle(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "vehicles"
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    vehicle_no: Mapped[str | None] = mapped_column(String(40))


class Camp(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "camps"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location_text: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[str | None] = mapped_column(String(20))
    type: Mapped[str] = mapped_column(String(20), default="camp", nullable=False)  # camp|inhouse
    organiser: Mapped[str | None] = mapped_column(String(200))
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    eligibility_flag: Mapped[bool] = mapped_column(default=True, nullable=False)


class Donor(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "donors"
    # When a govt ID is supplied it's a real identity — no two live donors in an org may
    # share one. Partial so the many NULL (no-id) donors are exempt, not collapsed together.
    __table_args__ = (
        Index(
            "uq_donors_org_govt_id", "org_id", "govt_id",
            unique=True, postgresql_where=text("govt_id IS NOT NULL AND is_deleted = false"),
        ),
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    dob: Mapped[date | None] = mapped_column(Date)
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(12))
    contact: Mapped[str | None] = mapped_column(String(40))
    govt_id: Mapped[str | None] = mapped_column(String(60))
    address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    blood_group: Mapped[str | None] = mapped_column(String(4), index=True)  # A+, O-, ...
    last_donation_date: Mapped[date | None] = mapped_column(Date)
    total_donations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # none | temporary | permanent
    deferral_status: Mapped[str] = mapped_column(String(20), default="none", nullable=False)


class Donation(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "donations"
    donor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("donors.id"), index=True)
    camp_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("camps.id"), index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # pending | completed | deferred
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    deferral_reason: Mapped[str | None] = mapped_column(String(255))
    screening_json: Mapped[dict] = mapped_column(JSONB, default=dict)  # Hb, BP, weight, etc.
