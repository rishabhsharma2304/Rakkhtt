"""Lab pipeline + stock movement workflow endpoints.

Implements real state transitions over BloodBag / Component / GroupingResult /
TTIResult so every stepper stage actually advances and persists.

Pipelines (ordered stages):
  component : segmentation -> processing -> volume -> validation
  grouping  : forward-reverse -> validation
  tti       : hiv-hbsag-hcv -> vdrl-mp -> validation
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_org, get_current_user
from app.core.rbac import SUPERVISOR, TECH, role_of
from app.db.session import get_db
from app.models.camp import Donor
from app.models.identity import Organisation, User
from app.models.lab import BloodBag, Component, GroupingResult, PipelineStageRecord, TTIResult

router = APIRouter(tags=["workflows"])

# bag_type prefix -> components produced
COMPONENT_RECIPE = {
    "SB": ["WB"],
    "DB": ["PRBC", "FFP"],
    "TB": ["PRBC", "FFP", "PLC"],
}
COMPONENT_SHELF_DAYS = {"WB": 35, "PRBC": 42, "FFP": 365, "PLC": 5, "RDP": 5, "SDP": 5, "CRYO": 365}


def _recipe_for(bag_type: str) -> list[str]:
    return COMPONENT_RECIPE.get((bag_type or "").split("-")[0].upper(), ["WB"])


class AdvanceBody(BaseModel):
    ids: list[str] = []
    data: dict = {}


def _record(db, org, pipeline, stage, subject_id, user, data=None):
    db.add(PipelineStageRecord(
        org_id=org.id, pipeline=pipeline, stage=stage, subject_id=subject_id,
        completed_at=datetime.now(timezone.utc), done_by=user.name, data=data or {},
    ))


def _queue_response(stage: str, items: list[dict]) -> dict:
    return {"stage": stage, "queue_count": len(items), "items": items, "all_completed": len(items) == 0}


def _guard_advance(user: User, stage: str) -> None:
    """Data-entry stages need technician+; validation needs a supervisor (Section 9)."""
    needed = SUPERVISOR if stage == "validation" else TECH
    if role_of(user) not in needed:
        raise HTTPException(403, f"Your role ({role_of(user)}) cannot advance the {stage} stage")


# --------------------------------------------------------------------------- #
#  COMPONENT PIPELINE
# --------------------------------------------------------------------------- #
@router.get("/components/pipeline/{stage}")
def component_queue(stage: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    if stage == "segmentation":
        rows = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.status == "collected", BloodBag.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(b) for b in rows])
    if stage == "processing":
        rows = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.status == "in_processing", BloodBag.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(b) for b in rows])
    if stage == "volume":
        rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.volume_ml.is_(None), Component.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(c) for c in rows])
    if stage == "validation":
        done = select(PipelineStageRecord.subject_id).where(PipelineStageRecord.pipeline == "component", PipelineStageRecord.stage == "validation")
        rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.status == "untested", Component.volume_ml.isnot(None), Component.id.notin_(done), Component.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(c) for c in rows])
    raise HTTPException(404, "Unknown component stage")


@router.post("/components/pipeline/{stage}/advance")
def component_advance(stage: str, body: AdvanceBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    _guard_advance(user, stage)
    ids = set(body.ids)
    affected = 0
    if stage == "segmentation":
        bags = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.id.in_(ids))).all()
        for b in bags:
            b.status = "in_processing"
            if not b.segment_no:
                b.segment_no = f"{b.bag_no}-SEG"
            _record(db, org, "component", "segmentation", b.id, user)
            affected += 1
    elif stage == "processing":
        bags = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.id.in_(ids))).all()
        for b in bags:
            grp = db.scalar(select(GroupingResult).where(GroupingResult.bag_id == b.id))
            bg = grp.abo + ("+" if grp and grp.rh == "positive" else "-") if grp and grp.abo else None
            for ctype in _recipe_for(b.bag_type):
                db.add(Component(
                    org_id=org.id, bag_id=b.id, type=ctype, blood_group=bg,
                    prepared_date=date.today(),
                    expiry_date=date.today() + timedelta(days=COMPONENT_SHELF_DAYS.get(ctype, 35)),
                    status="untested",
                ))
            b.status = "processed"
            _record(db, org, "component", "processing", b.id, user)
            affected += 1
    elif stage == "volume":
        comps = db.scalars(select(Component).where(Component.org_id == org.id, Component.id.in_(ids))).all()
        default_vol = {"WB": 450, "PRBC": 280, "FFP": 220, "PLC": 50}
        for c in comps:
            c.volume_ml = body.data.get("volume_ml") or default_vol.get(c.type, 250)
            _record(db, org, "component", "volume", c.id, user)
            affected += 1
    elif stage == "validation":
        comps = db.scalars(select(Component).where(Component.org_id == org.id, Component.id.in_(ids))).all()
        for c in comps:
            _record(db, org, "component", "validation", c.id, user)
            affected += 1
    else:
        raise HTTPException(404, "Unknown component stage")
    db.commit()
    return {"advanced": affected, "stage": stage}


# --------------------------------------------------------------------------- #
#  GROUPING PIPELINE
# --------------------------------------------------------------------------- #
@router.get("/grouping/pipeline/{stage}")
def grouping_queue(stage: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    if stage == "forward-reverse":
        have = select(GroupingResult.bag_id).where(GroupingResult.org_id == org.id)
        rows = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.status.in_(["in_processing", "processed"]), BloodBag.id.notin_(have), BloodBag.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(b) for b in rows])
    if stage == "validation":
        rows = db.scalars(select(GroupingResult).where(GroupingResult.org_id == org.id, GroupingResult.validated.is_(False), GroupingResult.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(g) for g in rows])
    raise HTTPException(404, "Unknown grouping stage")


@router.post("/grouping/pipeline/{stage}/advance")
def grouping_advance(stage: str, body: AdvanceBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    _guard_advance(user, stage)
    affected = 0
    if stage == "forward-reverse":
        bags = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.id.in_(body.ids))).all()
        for b in bags:
            donor = db.get(Donor, b.donor_id) if b.donor_id else None
            bg = (donor.blood_group if donor else None) or body.data.get("blood_group") or "O+"
            abo, rh = bg[:-1], ("positive" if bg.endswith("+") else "negative")
            db.add(GroupingResult(
                org_id=org.id, bag_id=b.id, forward_result=abo, reverse_result=abo,
                abo=abo, rh=rh, discrepancy=False, validated=False,
            ))
            affected += 1
    elif stage == "validation":
        rows = db.scalars(select(GroupingResult).where(GroupingResult.org_id == org.id, GroupingResult.id.in_(body.ids))).all()
        for g in rows:
            g.validated = True
            g.validated_by = user.name
            affected += 1
    else:
        raise HTTPException(404, "Unknown grouping stage")
    db.commit()
    return {"advanced": affected, "stage": stage}


# --------------------------------------------------------------------------- #
#  TTI PIPELINE
# --------------------------------------------------------------------------- #
@router.get("/tti/pipeline/{stage}")
def tti_queue(stage: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    if stage == "hiv-hbsag-hcv":
        have = select(TTIResult.bag_id).where(TTIResult.org_id == org.id)
        rows = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.status.in_(["in_processing", "processed"]), BloodBag.id.notin_(have), BloodBag.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(b) for b in rows])
    if stage == "vdrl-mp":
        rows = db.scalars(select(TTIResult).where(TTIResult.org_id == org.id, TTIResult.hiv.isnot(None), TTIResult.vdrl.is_(None), TTIResult.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(t) for t in rows])
    if stage == "validation":
        rows = db.scalars(select(TTIResult).where(TTIResult.org_id == org.id, TTIResult.vdrl.isnot(None), TTIResult.validated.is_(False), TTIResult.is_deleted.is_(False))).all()
        return _queue_response(stage, [serialize(t) for t in rows])
    raise HTTPException(404, "Unknown TTI stage")


@router.post("/tti/pipeline/{stage}/advance")
def tti_advance(stage: str, body: AdvanceBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    _guard_advance(user, stage)
    affected = 0
    nr = "nonreactive"
    if stage == "hiv-hbsag-hcv":
        bags = db.scalars(select(BloodBag).where(BloodBag.org_id == org.id, BloodBag.id.in_(body.ids))).all()
        for b in bags:
            d = body.data
            db.add(TTIResult(
                org_id=org.id, bag_id=b.id, donor_id=b.donor_id,
                hiv=d.get("hiv", nr), hbsag=d.get("hbsag", nr), hcv=d.get("hcv", nr),
                method=d.get("method", "elisa"),
            ))
            affected += 1
    elif stage == "vdrl-mp":
        rows = db.scalars(select(TTIResult).where(TTIResult.org_id == org.id, TTIResult.id.in_(body.ids))).all()
        for t in rows:
            t.vdrl = body.data.get("vdrl", nr)
            t.mp = body.data.get("mp", nr)
            affected += 1
    elif stage == "validation":
        rows = db.scalars(select(TTIResult).where(TTIResult.org_id == org.id, TTIResult.id.in_(body.ids))).all()
        for t in rows:
            reactive = any(v == "reactive" for v in [t.hiv, t.hbsag, t.hcv, t.vdrl, t.mp])
            t.any_reactive = reactive
            t.validated = True
            if reactive:
                # Route this bag's components to quarantine.
                comps = db.scalars(select(Component).where(Component.org_id == org.id, Component.bag_id == t.bag_id)).all()
                for c in comps:
                    if c.status in ("untested", "tested"):
                        c.status = "quarantine"
            affected += 1
    else:
        raise HTTPException(404, "Unknown TTI stage")
    db.commit()
    return {"advanced": affected, "stage": stage}


# --------------------------------------------------------------------------- #
#  STOCK MOVEMENT
# --------------------------------------------------------------------------- #
@router.get("/stock/untested")
def untested_stock(db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.status == "untested", Component.is_deleted.is_(False))).all()
    return {"items": [serialize(c) for c in rows], "total": len(rows)}


@router.post("/stock/shift-to-tested")
def shift_to_tested(body: AdvanceBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    """Validated grouping + TTI-clear untested components move to tested stock."""
    if role_of(user) not in SUPERVISOR:
        raise HTTPException(403, "Shift to tested stock requires a supervisor")
    q = select(Component).where(Component.org_id == org.id, Component.status == "untested", Component.is_deleted.is_(False))
    if body.ids:
        q = q.where(Component.id.in_(body.ids))
    moved, blocked = 0, 0
    for c in db.scalars(q).all():
        grp = db.scalar(select(GroupingResult).where(GroupingResult.bag_id == c.bag_id))
        tti = db.scalar(select(TTIResult).where(TTIResult.bag_id == c.bag_id))
        clear = grp and grp.validated and tti and tti.validated and not tti.any_reactive
        if clear:
            c.status = "tested"
            moved += 1
        else:
            blocked += 1
    db.commit()
    return {"moved": moved, "blocked": blocked}


@router.get("/quarantine")
def quarantine(tab: str = "component", db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.status == "quarantine", Component.is_deleted.is_(False))).all()
    return {"tab": tab, "items": [serialize(c) for c in rows], "total": len(rows)}


class DiscardBody(BaseModel):
    component_ids: list[str]
    reason: str = "Expired Component"


@router.post("/discard")
def discard(body: DiscardBody, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), user: User = Depends(get_current_user)):
    if role_of(user) not in SUPERVISOR:
        raise HTTPException(403, "Discarding components requires a supervisor")
    rows = db.scalars(select(Component).where(Component.org_id == org.id, Component.id.in_(body.component_ids))).all()
    for c in rows:
        c.status = "discarded"
        _record(db, org, "component", "discard", c.id, user, {"reason": body.reason})
    db.commit()
    return {"discarded": len(rows), "reason": body.reason}
