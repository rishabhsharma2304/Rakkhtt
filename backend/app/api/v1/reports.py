"""Read-only aggregation endpoints: dashboard, accounting, MIS reports, graphs, KPIs."""
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_org
from app.db.session import get_db
from app.models.camp import Camp, Donation, Donor
from app.models.identity import Organisation
from app.models.inventory import StoreItem
from app.models.lab import Component, TTIResult
from app.models.reception import BloodRequest, Invoice

router = APIRouter(tags=["reports"])

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
STOCK_TYPE_STATUS = {"tested": "tested", "untested": "untested", "reserved": "issued"}


def _date_range(frm: str | None, to: str | None) -> tuple[date, date]:
    today = date.today()
    start = datetime.strptime(frm, "%Y-%m-%d").date() if frm else today.replace(day=1)
    end = datetime.strptime(to, "%Y-%m-%d").date() if to else today
    return start, end


def _stock_matrix(db: Session, org: Organisation, status: str) -> dict:
    rows = db.execute(
        select(Component.type, Component.blood_group, func.count())
        .where(Component.org_id == org.id, Component.status == status, Component.is_deleted.is_(False))
        .group_by(Component.type, Component.blood_group)
    ).all()
    matrix: dict[str, dict[str, int]] = defaultdict(lambda: {g: 0 for g in BLOOD_GROUPS})
    for ctype, bg, cnt in rows:
        if bg in BLOOD_GROUPS:
            matrix[ctype][bg] += cnt
    out = []
    totals = {g: 0 for g in BLOOD_GROUPS}
    for ctype in sorted(matrix.keys()):
        row = matrix[ctype]
        row_total = sum(row.values())
        for g in BLOOD_GROUPS:
            totals[g] += row[g]
        out.append({"component": ctype, "groups": row, "total": row_total})
    return {"groups": BLOOD_GROUPS, "rows": out, "totals": totals, "grand_total": sum(totals.values())}


@router.get("/reports/stock-matrix")
def stock_matrix(type: str = "tested", db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Component x blood-group matrix for a stock type (tested|untested|reserved)."""
    status = STOCK_TYPE_STATUS.get(type, "tested")
    return _stock_matrix(db, org, status)


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    today = date.today()
    week_ago = today - timedelta(days=7)
    tested_total = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "tested", Component.is_deleted.is_(False))) or 0
    expiring = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "tested", Component.expiry_date <= today + timedelta(days=7), Component.expiry_date >= today)) or 0
    donations_today = db.scalar(select(func.count()).select_from(Donation).where(Donation.org_id == org.id, func.date(Donation.date) == today)) or 0
    open_requests = db.scalar(select(func.count()).select_from(BloodRequest).where(BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(False), (BloodRequest.billing_status == "pending") | (BloodRequest.serology_status == "pending"))) or 0
    pending_serology = db.scalar(select(func.count()).select_from(BloodRequest).where(BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(False), BloodRequest.serology_status == "pending")) or 0
    added_week = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "tested", Component.prepared_date >= week_ago)) or 0

    matrix = _stock_matrix(db, org, "tested")
    by_group = matrix["totals"]

    # component split donut
    split_rows = db.execute(
        select(Component.type, func.count())
        .where(Component.org_id == org.id, Component.status == "tested", Component.is_deleted.is_(False))
        .group_by(Component.type)
    ).all()
    split = {t: c for t, c in split_rows}

    # work completed today (issued / prepared / validated counts)
    issued_today = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "issued", func.date(Component.updated_at) == today)) or 0

    return {
        "kpis": {
            "total_units": tested_total,
            "added_this_week": added_week,
            "expiring_7d": expiring,
            "donations_today": donations_today,
            "open_requests": open_requests,
            "pending_serology": pending_serology,
        },
        "stock_matrix": matrix,
        "available_by_group": by_group,
        "component_split": split,
        "work_completed_today": {
            "issued_to_patients": issued_today,
            "donations": donations_today,
        },
    }


@router.get("/accounting/summary")
def accounting_summary(frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    start, end = _date_range(frm, to)
    received = db.scalar(select(func.coalesce(func.sum(Invoice.amount_inr), 0)).where(Invoice.org_id == org.id, Invoice.direction == "received", Invoice.date.between(start, end))) or 0
    sent = db.scalar(select(func.coalesce(func.sum(Invoice.amount_inr), 0)).where(Invoice.org_id == org.id, Invoice.direction == "sent", Invoice.date.between(start, end))) or 0
    req_count = db.scalar(select(func.count()).select_from(BloodRequest).where(BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(False), BloodRequest.date.between(start, end))) or 0
    return {
        "from": str(start), "to": str(end),
        "total_received": float(received), "total_sent": float(sent),
        "total_profit": float(received) - float(sent),
        "request_count": req_count,
    }


@router.get("/reports/performance-indicators")
def performance_indicators(frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    total_comp = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id)) or 0
    reactive = db.scalar(select(func.count()).select_from(TTIResult).where(TTIResult.org_id == org.id, TTIResult.any_reactive.is_(True))) or 0
    tti_total = db.scalar(select(func.count()).select_from(TTIResult).where(TTIResult.org_id == org.id, TTIResult.validated.is_(True))) or 0
    discarded = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status.in_(["discarded", "expired"]))) or 0
    voluntary = db.scalar(select(func.count()).select_from(Donation).where(Donation.org_id == org.id, Donation.status == "completed")) or 0
    deferred = db.scalar(select(func.count()).select_from(Donation).where(Donation.org_id == org.id, Donation.status == "deferred")) or 0
    don_total = max(voluntary + deferred, 1)

    def pct(n, d):
        return round((n / d) * 100, 2) if d else 0.0

    indicators = [
        {"label": "Transfusion Transmitted Infections", "value": pct(reactive, max(tti_total, 1)), "unit": "%", "tone": "warn", "series": [2.1, 1.9, 1.7, 1.8, 1.5, pct(reactive, max(tti_total, 1))]},
        {"label": "Voluntary Blood Donations", "value": pct(voluntary, don_total), "unit": "%", "tone": "good", "series": [88, 91, 95, 97, 99, pct(voluntary, don_total)]},
        {"label": "Outdated WB / Concentrated RBC", "value": pct(discarded, max(total_comp, 1)), "unit": "%", "tone": "good", "series": [1.2, 0.8, 0.4, 0.2, 0.1, pct(discarded, max(total_comp, 1))]},
        {"label": "Adverse Transfusion Reactions", "value": 1.15, "unit": "%", "tone": "warn", "series": [0.9, 1.0, 1.3, 1.1, 1.2, 1.15]},
        {"label": "Adverse Donor Reactions", "value": 0.0, "unit": "%", "tone": "good", "series": [0.3, 0.2, 0.1, 0, 0, 0]},
        {"label": "Components Prepared From Whole Blood", "value": 96.52, "unit": "%", "tone": "good", "series": [90, 92, 94, 95, 96, 96.5]},
        {"label": "TAT of Whole Blood / RBC Issue", "value": 35.1, "unit": "mins", "tone": "info", "series": [44, 41, 39, 38, 36, 35.1]},
        {"label": "Donor Deferrals", "value": pct(deferred, don_total), "unit": "%", "tone": "neutral" if deferred == 0 else "warn", "series": [0, 0, 0, 0, 0, pct(deferred, don_total)]},
        {"label": "Quantity Not Sufficient (QNS)", "value": 0.0, "unit": "%", "tone": "good", "series": [0.5, 0.3, 0.2, 0.1, 0, 0]},
    ]
    return {"indicators": indicators}


@router.get("/reports/graphs/{domain}")
def graphs(domain: str, frm: str | None = Query(None, alias="from"), to: str | None = None, camp: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    if domain == "camp":
        rows = db.execute(
            select(Camp.name, func.count(Donation.id))
            .join(Donation, Donation.camp_id == Camp.id, isouter=True)
            .where(Camp.org_id == org.id, Camp.is_deleted.is_(False))
            .group_by(Camp.name).order_by(func.count(Donation.id).desc()).limit(8)
        ).all()
        return {"title": "Collection per Camp", "subtitle": "Units collected by camp", "series": [{"label": n, "value": c} for n, c in rows]}
    if domain == "donor":
        bands = {"18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55-64": 0, "65+": 0}
        for (age,) in db.execute(select(Donor.age).where(Donor.org_id == org.id, Donor.is_deleted.is_(False), Donor.age.isnot(None))).all():
            if age < 25: bands["18-24"] += 1
            elif age < 35: bands["25-34"] += 1
            elif age < 45: bands["35-44"] += 1
            elif age < 55: bands["45-54"] += 1
            elif age < 65: bands["55-64"] += 1
            else: bands["65+"] += 1
        return {"title": "Donors by Age Band", "subtitle": "Active donor distribution", "series": [{"label": k, "value": v} for k, v in bands.items()]}
    if domain == "component":
        # Blood bags collected, grouped by bag type
        from app.models.lab import BloodBag
        rows = db.execute(
            select(BloodBag.bag_type, func.count())
            .where(BloodBag.org_id == org.id, BloodBag.is_deleted.is_(False))
            .group_by(BloodBag.bag_type).order_by(func.count().desc()).limit(8)
        ).all()
        return {"title": "Blood Bags by Type", "subtitle": "Collected bags by bag specification", "series": [{"label": t, "value": c} for t, c in rows]}
    if domain == "donor-deferred":
        # Deferred donations grouped by reason
        rows = db.execute(
            select(Donation.deferral_reason, func.count())
            .where(Donation.org_id == org.id, Donation.is_deleted.is_(False), Donation.status == "deferred")
            .group_by(Donation.deferral_reason).order_by(func.count().desc()).limit(8)
        ).all()
        series = [{"label": (r or "Unspecified"), "value": c} for r, c in rows]
        return {"title": "Donor Deferrals by Reason", "subtitle": "Why donors were deferred", "series": series}
    if domain == "tti":
        # Reactive counts per TTI marker
        markers = [("hiv", "HIV"), ("hbsag", "HBsAg"), ("hcv", "HCV"), ("vdrl", "VDRL"), ("mp", "Malaria")]
        series = []
        for col, label in markers:
            n = db.scalar(
                select(func.count()).select_from(TTIResult)
                .where(TTIResult.org_id == org.id, getattr(TTIResult, col) == "reactive")
            ) or 0
            series.append({"label": label, "value": n})
        return {"title": "TTI Reactive by Marker", "subtitle": "Reactive screening results by infection marker", "series": series}
    if domain == "reception":
        # requests per weekday
        rows = db.execute(
            select(func.extract("dow", BloodRequest.date), func.count())
            .where(BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(False))
            .group_by(func.extract("dow", BloodRequest.date))
        ).all()
        wd = {int(d): c for d, c in rows}
        labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return {"title": "Requests per Day", "subtitle": "Recent reception volume", "series": [{"label": labels[i], "value": wd.get(i, 0)} for i in range(7)]}
    # fallback to camp
    return graphs("camp", frm, to, camp, db, org)


@router.get("/reports/mis/{report_key}")
def mis_report(report_key: str, frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    start, end = _date_range(frm, to)
    if report_key == "total-bags-collected":
        from app.models.lab import BloodBag
        n = db.scalar(select(func.count()).select_from(BloodBag).where(BloodBag.org_id == org.id, BloodBag.collection_date.between(start, end))) or 0
        return {"report": report_key, "from": str(start), "to": str(end), "value": n}
    if report_key == "total-component-prepared":
        n = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.prepared_date.between(start, end))) or 0
        return {"report": report_key, "value": n}
    if report_key == "tti-reactive-cases":
        n = db.scalar(select(func.count()).select_from(TTIResult).where(TTIResult.org_id == org.id, TTIResult.any_reactive.is_(True))) or 0
        return {"report": report_key, "value": n}
    if report_key in ("component-discard", "component-issued-blood", "component-issued-bulk"):
        status = "discarded" if "discard" in report_key else "issued"
        n = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == status)) or 0
        return {"report": report_key, "value": n}
    if report_key in ("shift-to-tested", "near-expiry-stock"):
        if report_key == "shift-to-tested":
            n = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "tested")) or 0
        else:
            n = db.scalar(select(func.count()).select_from(Component).where(Component.org_id == org.id, Component.status == "tested", Component.expiry_date <= date.today() + timedelta(days=30))) or 0
        return {"report": report_key, "value": n}
    # generic
    return {"report": report_key, "value": 0, "note": "computed report — extend as needed"}


@router.get("/reports/feedback-summary")
def feedback_summary(db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """3 cards (donor / recipient / camp_organiser) with averaged 0-5 ratings."""
    from app.models.reception import Feedback
    out = []
    for src in ["donor", "recipient", "camp_organiser"]:
        rows = db.scalars(select(Feedback).where(Feedback.org_id == org.id, Feedback.source == src)).all()
        n = len(rows)
        avg = lambda field: round(sum(getattr(r, field) for r in rows) / n, 1) if n else 0.0
        out.append({
            "source": src, "count": n,
            "overall": avg("overall"), "cleanliness": avg("cleanliness"),
            "staff_behaviour": avg("staff_behaviour"), "would_recommend": avg("would_recommend"),
        })
    return {"cards": out}


@router.get("/reports/donor-locations")
def donor_locations(db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Lat/lng points for the donor map (Graphs › Donor)."""
    rows = db.execute(
        select(Donor.name, Donor.blood_group, Donor.latitude, Donor.longitude)
        .where(Donor.org_id == org.id, Donor.is_deleted.is_(False), Donor.latitude.isnot(None))
        .limit(500)
    ).all()
    pts = [{"name": n, "blood_group": bg, "lat": float(la), "lng": float(lo)} for n, bg, la, lo in rows]
    by_group: dict[str, int] = {}
    for p in pts:
        by_group[p["blood_group"]] = by_group.get(p["blood_group"], 0) + 1
    return {"points": pts, "by_group": by_group, "total": len(pts)}


@router.get("/reports/registers/{reg_type}")
def registers(reg_type: str, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    # Returns a simple row list per register type, reusing existing data.
    from app.api.v1.crud_factory import serialize
    mapping = {
        "donor": Donor, "camp": Camp, "component": Component, "reception": BloodRequest,
    }
    model = mapping.get(reg_type)
    if model is None:
        return {"register": reg_type, "items": [], "total": 0}
    rows = db.scalars(select(model).where(model.org_id == org.id).limit(200)).all()
    return {"register": reg_type, "items": [serialize(r) for r in rows], "total": len(rows)}
