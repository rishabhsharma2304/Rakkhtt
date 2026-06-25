import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Hospital(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "hospitals"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(String(40))


class Patient(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "patients"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(12))
    contact: Mapped[str | None] = mapped_column(String(40))
    hospital_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hospitals.id"))


class ThalassemiaPatient(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "thalassemia_patients"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(String(40))
    blood_group: Mapped[str | None] = mapped_column(String(4))


class TherapeuticDonation(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "therapeutic_donations"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    doctor: Mapped[str | None] = mapped_column(String(200))
    hospital_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hospitals.id"))
    date: Mapped[date | None] = mapped_column(Date)


class BloodInquiry(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "blood_inquiries"
    hospital_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hospitals.id"))
    patient_name: Mapped[str | None] = mapped_column(String(200))
    contact: Mapped[str | None] = mapped_column(String(40))
    blood_group: Mapped[str | None] = mapped_column(String(4))
    component: Mapped[str | None] = mapped_column(String(10))
    qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
