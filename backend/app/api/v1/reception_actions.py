"""Reception-specific actions: return-to-stock + donor recall computation."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

import uuid
from datetime import date as date_cls

from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_org, get_current_user
from app.core.rbac import RECEPTION, role_of
from app.db.session import get_db
from app.models.camp import Donor
from app.models.identity import Organisation, User
from app.models.lab import Component
from app.models.reception import BloodRequest, Invoice
from app.services.ids import next_invoice_no, next_request_id

router = APIRouter(tags=["reception"])


class CreateRequestBody(BaseModel):
    date: date_cls
    request_type: str = "blood"
    patient_name: str | None = None
    blood_group: str | None = None
    component: str | None = None
    qty: int = 1


@router.post("/reception/request", status_code=201)
def create_request(body: CreateRequestBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Register a new blood request with an auto-generated request_id ({prefix}{yy}-R{NNNNN})."""
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot create blood requests")
    req = BloodRequest(
        org_id=org.id, request_id=next_request_id(db, org, body.date.strftime("%y")),
        date=body.date, request_type=body.request_type, patient_name=body.patient_name,
        blood_group=body.blood_group, component=body.component, qty=body.qty,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return serialize(req)


class IssueBody(BaseModel):
    request_id: str  # the UUID of the BloodRequest


@router.post("/reception/issue")
def issue_request(body: IssueBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Allocate tested components to a request → mark issued, raise an invoice, and
    complete billing + serology (Section 8 reception-issue workflow). Only *tested*
    components are issuable."""
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot issue blood requests")
    req = db.get(BloodRequest, uuid.UUID(body.request_id))
    if req is None or req.org_id != org.id or req.is_deleted:
        raise HTTPException(404, "Request not found")

    q = select(Component).where(
        Component.org_id == org.id, Component.status == "tested",
        Component.type == req.component, Component.is_deleted.is_(False),
    )
    if req.blood_group:
        q = q.where(Component.blood_group == req.blood_group)
    available = db.scalars(q.limit(req.qty)).all()
    if not available:
        raise HTTPException(409, f"No tested {req.component} {req.blood_group or ''} units available to issue")

    issued_ids = []
    for c in available:
        c.status = "issued"
        issued_ids.append(str(c.id))

    req.issued_component_ids = (req.issued_component_ids or []) + issued_ids
    req.billing_status = "completed"
    req.serology_status = "completed"

    price = float((org.blood_pricing or {}).get(req.component or "", 1450))
    inv = Invoice(
        org_id=org.id, invoice_no=next_invoice_no(db, org), date=date_cls.today(),
        name=req.patient_name, direction="received", amount_inr=price * len(issued_ids),
        created_by=user.name, request_id=req.id,
    )
    db.add(inv)
    db.commit()
    return {"issued": len(issued_ids), "invoice_no": inv.invoice_no, "request_id": req.request_id}


class ReturnBody(BaseModel):
    request_id: str
    component_ids: list[str] = []


@router.post("/reception/return-to-stock")
def return_to_stock(body: ReturnBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot return stock")
    req = db.get(BloodRequest, uuid.UUID(str(body.request_id)))
    if req is None or req.org_id != org.id:
        raise HTTPException(404, "Request not found")
    ids = body.component_ids or list(req.issued_component_ids or [])
    rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.id.in_(ids))).all()
    returned = 0
    for c in rows:
        if c.status == "issued":
            c.status = "tested"
            returned += 1
    req.issued_component_ids = [i for i in (req.issued_component_ids or []) if i not in ids]
    db.commit()
    return {"returned": returned, "request_id": req.request_id}


@router.get("/donor/recall")
def donor_recall(
    intent: str | None = Query(None, description="filter by low|normal|high"),
    blood_group: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    """Donors due for recall, classified by recency since last donation.

    ASSUMPTION (clinical default): whole-blood donors are eligible again after 90 days.
      high   : > 270 days (or never recorded) — strongly overdue
      normal : 90–270 days — eligible and due
      low    : < 90 days — recently donated, not yet due
    """
    today = date.today()
    rows = db.scalars(
        select(Donor).where(Donor.org_id == org.id, Donor.is_deleted.is_(False), Donor.deferral_status != "permanent")
    ).all()
    out = []
    for d in rows:
        if d.last_donation_date:
            days = (today - d.last_donation_date).days
        else:
            days = 99999
        tag = "high" if days > 270 else "normal" if days >= 90 else "low"
        rec = serialize(d)
        rec["days_since_last"] = None if days == 99999 else days
        rec["recall_intent"] = tag
        out.append(rec)
    if intent:
        out = [r for r in out if r["recall_intent"] == intent]
    if blood_group:
        out = [r for r in out if r["blood_group"] == blood_group]
    if search:
        s = search.lower()
        out = [r for r in out if s in (r.get("name") or "").lower() or s in (r.get("contact") or "").lower()]
    out.sort(key=lambda r: r["days_since_last"] or 10**9, reverse=True)
    return {"items": out, "total": len(out)}
