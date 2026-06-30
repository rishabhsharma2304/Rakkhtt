from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, OrgScopedMixin, TimestampMixin, UUIDMixin


class OrgCounter(UUIDMixin, TimestampMixin, OrgScopedMixin, Base):
    """Monotonic per-org sequence backing formatted business IDs (request_id, invoice_no).

    Each (org_id, counter_type, year) row holds the last value issued. Generation does an
    atomic ``UPDATE ... value = value + 1 RETURNING`` so concurrent requests can never read
    the same number — unlike the previous ``COUNT(*) + base`` scheme, which raced. ``year``
    is "" for counters that don't reset annually (e.g. invoices).
    """
    __tablename__ = "org_counters"
    __table_args__ = (
        UniqueConstraint("org_id", "counter_type", "year", name="uq_org_counters"),
    )

    counter_type: Mapped[str] = mapped_column(String(30), nullable=False)  # request | invoice
    year: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
