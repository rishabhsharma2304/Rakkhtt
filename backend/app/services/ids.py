"""Formatted-ID generation for requests and invoices.

Numbers come from the ``org_counters`` table via an atomic increment so two concurrent
requests can never be handed the same id (the old ``COUNT(*) + base`` scheme raced and,
combined with only-indexed id columns, could store duplicates). The first time a counter
is used it is seeded from any pre-existing rows so historical numbering is preserved.
"""
import uuid

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.identity import Organisation
from app.models.reception import BloodRequest, Invoice

# Legacy starting points — the first id ever issued for an org keeps matching what the old
# count-based code would have produced, so numbering is continuous across the change.
_REQUEST_BASE = 610
_INVOICE_BASE = 2968


def _next_counter(db: Session, org_id: uuid.UUID, counter_type: str, year: str, bootstrap_start: int) -> int:
    """Atomically return the next value for (org, counter_type, year).

    Fast path is a single ``UPDATE ... RETURNING``. Only the very first use of a counter
    falls through to an upsert seeded with ``bootstrap_start``; ``ON CONFLICT`` keeps that
    seed race-safe without disturbing the caller's surrounding transaction.
    """
    val = db.execute(
        text(
            "UPDATE org_counters SET value = value + 1, updated_at = now() "
            "WHERE org_id = :o AND counter_type = :t AND year = :y RETURNING value"
        ),
        {"o": str(org_id), "t": counter_type, "y": year},
    ).scalar()
    if val is not None:
        return val
    return db.execute(
        text(
            "INSERT INTO org_counters (id, org_id, counter_type, year, value) "
            "VALUES (:id, :o, :t, :y, :start) "
            "ON CONFLICT (org_id, counter_type, year) "
            "DO UPDATE SET value = org_counters.value + 1, updated_at = now() "
            "RETURNING value"
        ),
        {"id": str(uuid.uuid4()), "o": str(org_id), "t": counter_type, "y": year, "start": bootstrap_start},
    ).scalar()


def next_request_id(db: Session, org: Organisation, year2: str) -> str:
    """{prefix}{yy}-R{NNNNN}, e.g. ACBC26-R00618. Resets per year (the prefix carries yy)."""
    prefix = f"{org.id_prefix}{year2}-R"
    existing = db.scalar(
        select(func.count())
        .select_from(BloodRequest)
        .where(BloodRequest.org_id == org.id, BloodRequest.request_id.like(f"{prefix}%"))
    ) or 0
    seq = _next_counter(db, org.id, "request", year2, _REQUEST_BASE + existing)
    return f"{prefix}{seq:05d}"


def next_invoice_no(db: Session, org: Organisation) -> str:
    existing = db.scalar(
        select(func.count()).select_from(Invoice).where(Invoice.org_id == org.id)
    ) or 0
    seq = _next_counter(db, org.id, "invoice", "", _INVOICE_BASE + existing)
    return str(seq)
