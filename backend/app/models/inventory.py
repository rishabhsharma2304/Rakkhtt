import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, SoftDeleteMixin, TimestampMixin, UUIDMixin


class StoreItem(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "store_items"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)  # blood_bag|reagent|consumable
    supplier: Mapped[str | None] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, index=True)


class QCRecord(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "qc_records"
    # blood_component|reagent|other|abo_pooled_suspension
    qc_type: Mapped[str] = mapped_column(String(30), nullable=False)
    donor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("donors.id"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    done_by: Mapped[str | None] = mapped_column(String(120))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pass|fail|pending
    parameters_json: Mapped[dict] = mapped_column(JSONB, default=dict)
