import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, SoftDeleteMixin, TimestampMixin, UUIDMixin


class BloodBag(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "blood_bags"
    # A bag number is the physical barcode — it must never collide within an org. Partial
    # unique (live rows only) so a number freed by a soft-delete can be reissued.
    __table_args__ = (
        Index(
            "uq_blood_bags_org_bag_no", "org_id", "bag_no",
            unique=True, postgresql_where=text("is_deleted = false"),
        ),
    )
    bag_no: Mapped[str] = mapped_column(String(60), index=True, nullable=False)  # barcode
    bag_type: Mapped[str] = mapped_column(String(30), nullable=False)  # DB-SAGM-350, TB-SAGM-450...
    donor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("donors.id"), index=True)
    camp_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("camps.id"), index=True)
    collection_date: Mapped[date] = mapped_column(Date, nullable=False)
    gross_volume_ml: Mapped[int | None] = mapped_column(Integer)
    segment_no: Mapped[str | None] = mapped_column(String(40))
    # collected | in_processing | processed | discarded
    status: Mapped[str] = mapped_column(String(20), default="collected", nullable=False, index=True)


class Component(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "components"
    bag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("blood_bags.id"), index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # WB|PRBC|FFP|PLC|RDP|SDP|CRYO
    volume_ml: Mapped[int | None] = mapped_column(Integer)
    blood_group: Mapped[str | None] = mapped_column(String(4), index=True)
    prepared_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date, index=True)
    # untested | tested | quarantine | issued | discarded | expired
    status: Mapped[str] = mapped_column(String(20), default="untested", nullable=False, index=True)


class GroupingResult(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "grouping_results"
    bag_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("blood_bags.id"), index=True)
    component_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("components.id"))
    forward_result: Mapped[str | None] = mapped_column(String(20))
    reverse_result: Mapped[str | None] = mapped_column(String(20))
    abo: Mapped[str | None] = mapped_column(String(4))
    rh: Mapped[str | None] = mapped_column(String(8))  # positive|negative
    discrepancy: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    validated_by: Mapped[str | None] = mapped_column(String(120))


class TTIResult(UUIDMixin, TimestampMixin, SoftDeleteMixin, OrgScopedMixin, Base):
    __tablename__ = "tti_results"
    bag_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("blood_bags.id"), index=True)
    donor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("donors.id"))
    # screening 1
    hiv: Mapped[str | None] = mapped_column(String(14))  # nonreactive|reactive
    hbsag: Mapped[str | None] = mapped_column(String(14))
    hcv: Mapped[str | None] = mapped_column(String(14))
    # screening 2
    vdrl: Mapped[str | None] = mapped_column(String(14))
    mp: Mapped[str | None] = mapped_column(String(14))
    method: Mapped[str] = mapped_column(String(10), default="rapid", nullable=False)  # rapid|elisa
    validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    any_reactive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PipelineStageRecord(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    """Generic audit record that drives the steppers / 'All Completed' states."""
    __tablename__ = "pipeline_stage_records"
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    pipeline: Mapped[str] = mapped_column(String(20), nullable=False)  # component|grouping|tti
    stage: Mapped[str] = mapped_column(String(40), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    done_by: Mapped[str | None] = mapped_column(String(120))
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
