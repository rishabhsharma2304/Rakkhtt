import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, SoftDeleteMixin, TimestampMixin, UUIDMixin


class BloodRequest(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "blood_requests"
    request_id: Mapped[str] = mapped_column(String(40), index=True, nullable=False)  # ACBC26-R00618
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # blood | bulk | fractionation | inward
    request_type: Mapped[str] = mapped_column(String(20), default="blood", nullable=False, index=True)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"))
    patient_name: Mapped[str | None] = mapped_column(String(200))
    hospital_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hospitals.id"))
    blood_group: Mapped[str | None] = mapped_column(String(4))
    component: Mapped[str | None] = mapped_column(String(10))
    qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    billing_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending|completed
    serology_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # Serology workflow stage while serology is pending: grouping → crossmatch → issue → done
    serology_stage: Mapped[str] = mapped_column(String(20), default="grouping", nullable=False)
    issued_component_ids: Mapped[list] = mapped_column(JSONB, default=list)


class Invoice(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "invoices"
    invoice_no: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    direction: Mapped[str] = mapped_column(String(12), default="received", nullable=False)  # received|sent
    amount_inr: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(120))
    request_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("blood_requests.id"))


class BarcodeBatch(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "barcode_batches"
    batch_type: Mapped[str] = mapped_column(String(20), nullable=False)  # blood_bag|request|deferred_donor
    bag_type: Mapped[str | None] = mapped_column(String(30))
    prepend_text: Mapped[str | None] = mapped_column(String(40))
    range_start: Mapped[int | None] = mapped_column(Integer)
    range_end: Mapped[int | None] = mapped_column(Integer)
    copies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    generated_by: Mapped[str | None] = mapped_column(String(120))
    file_url: Mapped[str | None] = mapped_column(String(512))


class LabelJob(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "label_jobs"
    donor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("donors.id"))
    component_type: Mapped[str | None] = mapped_column(String(10))
    mode: Mapped[str] = mapped_column(String(10), default="single", nullable=False)  # single|range|date
    file_url: Mapped[str | None] = mapped_column(String(512))


class Reservation(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "reservations"
    id_range: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))
    date: Mapped[date | None] = mapped_column(Date)


class Download(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "downloads"
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    generated_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(120))
    file_url: Mapped[str | None] = mapped_column(String(512))


class Feedback(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "feedback"
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # donor|recipient|camp_organiser
    overall: Mapped[int] = mapped_column(Integer, default=0)
    cleanliness: Mapped[int] = mapped_column(Integer, default=0)
    staff_behaviour: Mapped[int] = mapped_column(Integer, default=0)
    would_recommend: Mapped[int] = mapped_column(Integer, default=0)
    date: Mapped[date | None] = mapped_column(Date)
    comment: Mapped[str | None] = mapped_column(Text)


class CustomReport(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "custom_reports"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str | None] = mapped_column(String(40))
    columns_json: Mapped[list] = mapped_column(JSONB, default=list)


class CustomRegister(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "custom_registers"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str | None] = mapped_column(String(40))
    columns_json: Mapped[list] = mapped_column(JSONB, default=list)
