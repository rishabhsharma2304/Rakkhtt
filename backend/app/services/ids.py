"""Formatted-ID generation for requests, invoices, bags, donors."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.identity import Organisation
from app.models.reception import BloodRequest, Invoice


def next_request_id(db: Session, org: Organisation, year2: str) -> str:
    """{prefix}{yy}-R{NNNNN}, e.g. ACBC26-R00618."""
    prefix = f"{org.id_prefix}{year2}-R"
    count = db.scalar(
        select(func.count())
        .select_from(BloodRequest)
        .where(BloodRequest.org_id == org.id, BloodRequest.request_id.like(f"{prefix}%"))
    ) or 0
    return f"{prefix}{count + 610:05d}"


def next_invoice_no(db: Session, org: Organisation) -> str:
    count = db.scalar(
        select(func.count()).select_from(Invoice).where(Invoice.org_id == org.id)
    ) or 0
    return str(2968 + count)
