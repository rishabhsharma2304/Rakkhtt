"""Reception-specific actions: return-to-stock + donor recall computation."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import String, cast, func, or_, select, update
from sqlalchemy.orm import Session

import uuid
from datetime import date as date_cls, datetime, timezone

from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_org, get_current_user
from app.core.rbac import RECEPTION, role_of
from app.db.session import get_db
from app.models.audit import ActivityLog
from app.models.camp import Camp, Donation, Donor
from app.models.identity import Organisation, User
from app.models.lab import BloodBag, Component, GroupingResult, PipelineStageRecord, TTIResult
from app.models.reception import BloodRequest, Invoice
from app.services.activity import log_activity
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
    db.flush()
    log_activity(db, org, user, f"Added {req.request_id}", entity_ref=req.request_id)
    db.commit()
    db.refresh(req)
    return serialize(req)


class IssueBody(BaseModel):
    request_id: str  # the UUID of the BloodRequest


# Ordered serology workflow: each stage is the action still pending for the request.
SEROLOGY_STAGES = ["grouping", "crossmatch", "issue", "done"]
SEROLOGY_LABELS = {"grouping": "Blood Grouping", "crossmatch": "Crossmatch", "issue": "Issue"}


# ABO/Rh red-cell compatibility: maps a recipient's blood group to the donor groups
# whose units may be safely transfused to them. O- is the universal red-cell donor;
# AB+ is the universal recipient. Used to allocate compatible (not just identical) units.
RBC_COMPATIBILITY = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
}


def compatible_blood_groups(recipient_group: str | None) -> list[str] | None:
    """Donor blood groups whose red-cell units are compatible with the recipient.
    Returns None when the recipient group is unknown/unspecified (no restriction)."""
    if not recipient_group:
        return None
    return RBC_COMPATIBILITY.get(recipient_group.strip().upper())


# Component statuses that should auto-expire once their expiry_date has passed.
# (Already-issued/discarded/expired units are left as-is.)
_EXPIRABLE_STATUSES = ("untested", "tested", "quarantine", "allotted")


def expire_stale_components(db: Session, org: Organisation) -> int:
    """On-read sweep: flip any in-stock component past its expiry_date to status
    'expired'. Returns the number of rows updated. Call this before any read or
    allocation that must not surface expired stock. Caller is responsible for the
    surrounding commit (this only stages the UPDATE)."""
    result = db.execute(
        update(Component)
        .where(
            Component.org_id == org.id,
            Component.is_deleted.is_(False),
            Component.status.in_(_EXPIRABLE_STATUSES),
            Component.expiry_date.is_not(None),
            Component.expiry_date < date_cls.today(),
        )
        .values(status="expired")
    )
    return result.rowcount or 0


def _perform_issue(db: Session, org: Organisation, user: User, req: BloodRequest) -> dict:
    """Allocate tested components to a request → mark issued, raise an invoice, and
    complete billing + serology (Section 8 reception-issue workflow). Only *tested*
    components are issuable."""
    # Sweep stale stock to 'expired' first so it can never be allocated below.
    expire_stale_components(db, org)
    q = select(Component).where(
        Component.org_id == org.id, Component.status == "tested",
        Component.type == req.component, Component.is_deleted.is_(False),
        Component.expiry_date >= date_cls.today(),
    )
    if req.blood_group:
        compatible = compatible_blood_groups(req.blood_group)
        if compatible is None:
            raise HTTPException(422, f"Unknown recipient blood group '{req.blood_group}'; cannot determine compatibility")
        q = q.where(Component.blood_group.in_(compatible))
    available = db.scalars(q.limit(req.qty)).all()
    if not available:
        raise HTTPException(
            422,
            f"No ABO/Rh-compatible tested {req.component} units available for {req.blood_group or 'request'}",
        )

    issued_ids = []
    for c in available:
        c.status = "issued"
        issued_ids.append(str(c.id))

    req.issued_component_ids = (req.issued_component_ids or []) + issued_ids
    req.billing_status = "completed"
    req.serology_status = "completed"
    req.serology_stage = "done"

    price = float((org.blood_pricing or {}).get(req.component or "", 1450))
    inv = Invoice(
        org_id=org.id, invoice_no=next_invoice_no(db, org), date=date_cls.today(),
        name=req.patient_name, direction="received", amount_inr=price * len(issued_ids),
        created_by=user.name, request_id=req.id,
    )
    db.add(inv)
    log_activity(db, org, user, f"Issued {len(issued_ids)} unit(s) for {req.request_id}", entity_ref=req.request_id)
    db.commit()
    return {"issued": len(issued_ids), "invoice_no": inv.invoice_no, "request_id": req.request_id, "serology_stage": "done"}


@router.post("/reception/issue")
def issue_request(body: IssueBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Allocate tested components to a request and complete the reception workflow."""
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot issue blood requests")
    req = db.get(BloodRequest, uuid.UUID(body.request_id))
    if req is None or req.org_id != org.id or req.is_deleted:
        raise HTTPException(404, "Request not found")
    return _perform_issue(db, org, user, req)


@router.post("/reception/serology/advance")
def advance_serology(body: IssueBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Advance a request one step through the serology workflow
    (grouping → crossmatch → issue). The final 'issue' step allocates tested units,
    raises the invoice and completes billing + serology."""
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot update serology")
    req = db.get(BloodRequest, uuid.UUID(body.request_id))
    if req is None or req.org_id != org.id or req.is_deleted:
        raise HTTPException(404, "Request not found")
    if req.serology_status == "completed":
        raise HTTPException(409, "Serology already completed for this request")

    stage = req.serology_stage if req.serology_stage in SEROLOGY_STAGES else "grouping"
    if stage == "issue":
        return _perform_issue(db, org, user, req)

    if stage == "crossmatch":
        # Crossmatch → Issue is a clinical gate, not a label change: a unit may only
        # be carried forward to issue once a crossmatch has been performed AND found
        # compatible. Recording happens via POST /reception/crossmatch.
        if not req.crossmatch_result:
            raise HTTPException(422, "No crossmatch result on file — record a crossmatch before advancing to issue")
        if req.crossmatch_result != "compatible":
            raise HTTPException(
                422,
                f"Crossmatch result is '{req.crossmatch_result}'; an incompatible unit cannot be advanced to issue",
            )

    next_stage = SEROLOGY_STAGES[SEROLOGY_STAGES.index(stage) + 1]
    req.serology_stage = next_stage
    log_activity(db, org, user, f"{SEROLOGY_LABELS.get(stage, stage)} done for {req.request_id}", entity_ref=req.request_id)
    db.commit()
    return {"request_id": req.request_id, "serology_stage": next_stage}


class CrossmatchBody(BaseModel):
    request_id: str  # the UUID of the BloodRequest
    result: str  # compatible | incompatible
    unit_id: str | None = None


@router.post("/reception/crossmatch")
def record_crossmatch(body: CrossmatchBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Record the crossmatch outcome for a blood request. This must be done (and be
    'compatible') before serology can advance from crossmatch → issue."""
    if role_of(user) not in RECEPTION:
        raise HTTPException(403, "Your role cannot record crossmatch results")
    req = db.get(BloodRequest, uuid.UUID(body.request_id))
    if req is None or req.org_id != org.id or req.is_deleted:
        raise HTTPException(404, "Request not found")
    result = body.result.strip().lower()
    if result not in ("compatible", "incompatible"):
        raise HTTPException(422, "Crossmatch result must be 'compatible' or 'incompatible'")
    req.crossmatch_result = result
    req.crossmatch_unit_id = body.unit_id
    req.crossmatch_at = datetime.now(timezone.utc)
    log_activity(db, org, user, f"Crossmatch {result} for {req.request_id}", entity_ref=req.request_id)
    db.commit()
    return {"request_id": req.request_id, "crossmatch_result": result}


# Friendly product names for the printable invoice line items.
COMPONENT_NAMES = {
    "WB": "Whole Blood I.P",
    "PRBC": "Packed Red Blood Cells I.P",
    "FFP": "Fresh Frozen Plasma I.P",
    "PLC": "Platelet Concentrate I.P",
    "RDP": "Random Donor Platelets I.P",
    "SDP": "Single Donor Platelets I.P",
    "CRYO": "Cryoprecipitate I.P",
}


def _invoice_payload(org: Organisation, inv: Invoice | None, req: BloodRequest | None) -> dict:
    """Render-ready invoice payload shared by the by-invoice and by-request endpoints.
    When no invoice exists yet (request not issued), the amount is derived from the
    request quantity and the org's blood pricing so the billing page still renders."""
    if inv is not None:
        amount = float(inv.amount_inr or 0)
    elif req is not None:
        price = float((org.blood_pricing or {}).get(req.component or "", 1450))
        amount = price * (req.qty or 1)
    else:
        amount = 0.0

    items: list[dict] = []
    if req is not None:
        units = len(req.issued_component_ids or []) or req.qty or 1
        comp = req.component or ""
        items.append({
            "name": COMPONENT_NAMES.get(comp.upper(), comp or "Blood Component"),
            "component": comp,
            "qty": units,
            "unit_price": round(amount / units, 2) if units else amount,
            "line_total": amount,
        })
    else:
        items.append({
            "name": "Blood Component", "component": None,
            "qty": 1, "unit_price": amount, "line_total": amount,
        })

    return {
        "id": str(inv.id) if inv is not None else None,
        "invoice_no": inv.invoice_no if inv is not None else "—",
        "date": str(inv.date) if inv is not None else (str(req.date) if req is not None else None),
        "name": inv.name if inv is not None else (req.patient_name if req is not None else None),
        "direction": inv.direction if inv is not None else "received",
        "amount_inr": amount,
        "created_by": inv.created_by if inv is not None else None,
        "created_at": inv.created_at.isoformat() if inv is not None and inv.created_at else None,
        "org": {
            "name": org.name, "address": org.address, "contact": org.contact,
            "email": org.email, "license_no": org.license_no,
        },
        "request": {
            "request_id": req.request_id,
            "patient_name": req.patient_name,
            "blood_group": req.blood_group,
            "component": req.component,
            "qty": req.qty,
            "billing_status": req.billing_status,
            "serology_status": req.serology_status,
        } if req is not None else None,
        "items": items,
        "subtotal": amount,
        "discount": 0.0,
        "service_charge": 0.0,
        "total": amount,
    }


@router.get("/invoices/{invoice_id}/detail")
def invoice_detail(invoice_id: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Full, render-ready invoice for the printable invoice page: invoice fields +
    organisation header + line items derived from the linked blood request."""
    try:
        inv = db.get(Invoice, uuid.UUID(str(invoice_id)))
    except ValueError:
        raise HTTPException(404, "Invoice not found")
    if inv is None or inv.org_id != org.id or inv.is_deleted:
        raise HTTPException(404, "Invoice not found")
    req = db.get(BloodRequest, inv.request_id) if inv.request_id else None
    return _invoice_payload(org, inv, req)


@router.get("/reception/blood-request/{request_id}/invoice")
def request_invoice_detail(request_id: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Render-ready billing/invoice page for a blood request (used when a Reception
    row is clicked). Returns the request's existing invoice if one was raised, else a
    pro-forma billing sheet derived from the request."""
    try:
        req = db.get(BloodRequest, uuid.UUID(str(request_id)))
    except ValueError:
        raise HTTPException(404, "Request not found")
    if req is None or req.org_id != org.id or req.is_deleted:
        raise HTTPException(404, "Request not found")
    inv = db.scalars(
        select(Invoice)
        .where(Invoice.org_id == org.id, Invoice.request_id == req.id, Invoice.is_deleted.is_(False))
        .order_by(Invoice.created_at.desc())
    ).first()
    return _invoice_payload(org, inv, req)


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
    log_activity(db, org, user, f"Returned {returned} unit(s) to stock for {req.request_id}", entity_ref=req.request_id)
    db.commit()
    return {"returned": returned, "request_id": req.request_id}


# --- Blood inventory: tested stock available to reception, by lifecycle bucket ---
# Maps the three reception inventory tabs onto real component statuses.
STATUS_BY_BUCKET = {"available": "tested", "allotted": "allotted", "issued": "issued"}


@router.get("/reception/inventory")
def reception_inventory(
    bucket: str = Query("available", description="available | allotted | issued"),
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    """Blood inventory shown on Reception: each row is a single component unit,
    grouped into Available (tested stock), Allotted (reserved) and Issued tabs."""
    if expire_stale_components(db, org):
        db.commit()
    counts = {
        b: (db.scalar(
            select(func.count()).select_from(Component).where(
                Component.org_id == org.id, Component.status == st, Component.is_deleted.is_(False),
            )
        ) or 0)
        for b, st in STATUS_BY_BUCKET.items()
    }

    status = STATUS_BY_BUCKET.get(bucket, "tested")
    stmt = (
        select(Component, BloodBag.bag_no)
        .join(BloodBag, Component.bag_id == BloodBag.id)
        .where(Component.org_id == org.id, Component.status == status, Component.is_deleted.is_(False))
    )
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(or_(
            func.lower(BloodBag.bag_no).like(like),
            func.lower(cast(Component.type, String)).like(like),
            func.lower(cast(Component.blood_group, String)).like(like),
        ))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Component.expiry_date.asc()).offset((page - 1) * page_size).limit(page_size)

    items = [
        {
            "id": str(c.id),
            "unit_id": bag_no,
            "component_type": c.type,
            "blood_group": c.blood_group,
            "prepared_date": c.prepared_date,
            "expiry_date": c.expiry_date,
            "status": c.status,
        }
        for c, bag_no in db.execute(stmt).all()
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size, "counts": counts}


@router.get("/reception/activity")
def reception_activity(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    """History feed for Reception — who added/issued/returned what, newest first."""
    stmt = select(ActivityLog).where(ActivityLog.org_id == org.id, ActivityLog.module == "reception")
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(or_(
            func.lower(ActivityLog.action).like(like),
            func.lower(ActivityLog.user_name).like(like),
        ))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(ActivityLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = [
        {"id": str(a.id), "user": a.user_name, "action": a.action, "created_at": a.created_at}
        for a in db.scalars(stmt).all()
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/camps/activity")
def camps_activity(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    """History feed for Camps — who added/updated/deleted what, newest first."""
    stmt = select(ActivityLog).where(ActivityLog.org_id == org.id, ActivityLog.module == "camp")
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(or_(
            func.lower(ActivityLog.action).like(like),
            func.lower(ActivityLog.user_name).like(like),
        ))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(ActivityLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = [
        {"id": str(a.id), "user": a.user_name, "action": a.action, "created_at": a.created_at}
        for a in db.scalars(stmt).all()
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/donors/{donor_id}/detail")
def donor_detail_view(
    donor_id: uuid.UUID,
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    """Full donor profile: donor + latest donation + blood bag + lab results + history."""
    donor = db.get(Donor, donor_id)
    if donor is None or donor.org_id != org.id or donor.is_deleted:
        raise HTTPException(404, "Donor not found")

    # Latest donation (most recent by date)
    latest_don = db.scalars(
        select(Donation).where(
            Donation.donor_id == donor_id,
            Donation.org_id == org.id,
            Donation.is_deleted.is_(False),
        ).order_by(Donation.date.desc())
    ).first()

    # Latest blood bag
    latest_bag = db.scalars(
        select(BloodBag).where(
            BloodBag.donor_id == donor_id,
            BloodBag.org_id == org.id,
            BloodBag.is_deleted.is_(False),
        ).order_by(BloodBag.collection_date.desc())
    ).first()

    # Lab data for latest bag
    components: list = []
    grouping = None
    tti = None
    pipeline_records: list = []
    if latest_bag:
        components = list(db.scalars(
            select(Component).where(
                Component.bag_id == latest_bag.id,
                Component.org_id == org.id,
                Component.is_deleted.is_(False),
            )
        ).all())
        grouping = db.scalars(
            select(GroupingResult).where(
                GroupingResult.bag_id == latest_bag.id,
                GroupingResult.org_id == org.id,
                GroupingResult.is_deleted.is_(False),
            )
        ).first()
        tti = db.scalars(
            select(TTIResult).where(
                TTIResult.bag_id == latest_bag.id,
                TTIResult.org_id == org.id,
                TTIResult.is_deleted.is_(False),
            )
        ).first()
        subject_ids = [latest_bag.id] + [c.id for c in components]
        pipeline_records = list(db.scalars(
            select(PipelineStageRecord).where(
                PipelineStageRecord.subject_id.in_(subject_ids),
                PipelineStageRecord.org_id == org.id,
            ).order_by(PipelineStageRecord.completed_at.asc())
        ).all())

    # Camp linked to latest donation or bag
    camp = None
    camp_id = getattr(latest_don, "camp_id", None) or getattr(latest_bag, "camp_id", None)
    if camp_id:
        camp = db.get(Camp, camp_id)

    # Full history
    all_donations = list(db.scalars(
        select(Donation).where(
            Donation.donor_id == donor_id,
            Donation.org_id == org.id,
            Donation.is_deleted.is_(False),
        ).order_by(Donation.date.desc())
    ).all())
    all_bags = list(db.scalars(
        select(BloodBag).where(
            BloodBag.donor_id == donor_id,
            BloodBag.org_id == org.id,
            BloodBag.is_deleted.is_(False),
        ).order_by(BloodBag.collection_date.desc())
    ).all())

    return {
        "donor": serialize(donor),
        "latest_donation": serialize(latest_don) if latest_don else None,
        "bag": serialize(latest_bag) if latest_bag else None,
        "components": [serialize(c) for c in components],
        "grouping": serialize(grouping) if grouping else None,
        "tti": serialize(tti) if tti else None,
        "camp": serialize(camp) if camp else None,
        "pipeline_records": [serialize(p) for p in pipeline_records],
        "all_donations": [serialize(d) for d in all_donations],
        "all_bags": [serialize(b) for b in all_bags],
    }


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
