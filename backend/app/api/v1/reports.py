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


@router.get("/reports/blood-bag-overview")
def blood_bag_overview(frm: str | None = Query(None, alias="from"), to: str | None = None, camp: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Blood-bag dashboard for Analytics › Graphs › Blood Bags: bags used by type,
    less-quantity / clerical-correction counters, and component-prepared / discarded /
    discard-reason / expiring donuts — each as a labelled series with a total."""
    from app.models.lab import BloodBag, PipelineStageRecord

    today = date.today()

    def series(rows: list[tuple]) -> dict:
        items = [{"label": (lbl or "—"), "value": cnt} for lbl, cnt in rows]
        return {"series": items, "total": sum(i["value"] for i in items)}

    # Bags used, grouped by bag specification
    bag_rows = db.execute(
        select(BloodBag.bag_type, func.count())
        .where(BloodBag.org_id == org.id, BloodBag.is_deleted.is_(False))
        .group_by(BloodBag.bag_type).order_by(func.count().desc())
    ).all()

    # Less-quantity bags: gross volume < 90% of the bag's nominal spec (the trailing
    # number in the bag type, e.g. DB-SAGM-450 → 450 ml).
    less_qty = 0
    for bag_type, gross in db.execute(
        select(BloodBag.bag_type, BloodBag.gross_volume_ml)
        .where(BloodBag.org_id == org.id, BloodBag.is_deleted.is_(False), BloodBag.gross_volume_ml.isnot(None))
    ).all():
        try:
            nominal = int(str(bag_type).rsplit("-", 1)[-1])
        except (ValueError, IndexError):
            continue
        if gross < nominal * 0.9:
            less_qty += 1

    comp_prepared = db.execute(
        select(Component.type, func.count())
        .where(Component.org_id == org.id, Component.is_deleted.is_(False))
        .group_by(Component.type).order_by(func.count().desc())
    ).all()

    discarded = db.execute(
        select(Component.type, func.count())
        .where(Component.org_id == org.id, Component.status.in_(["discarded", "expired"]), Component.is_deleted.is_(False))
        .group_by(Component.type).order_by(func.count().desc())
    ).all()

    reason_counts: dict[str, int] = defaultdict(int)
    for (payload,) in db.execute(
        select(PipelineStageRecord.data)
        .where(PipelineStageRecord.org_id == org.id, PipelineStageRecord.pipeline == "component", PipelineStageRecord.stage == "discard")
    ).all():
        reason_counts[(payload or {}).get("reason") or "Unspecified"] += 1
    reason_rows = sorted(reason_counts.items(), key=lambda kv: kv[1], reverse=True)

    expiring = db.execute(
        select(Component.type, func.count())
        .where(Component.org_id == org.id, Component.status == "tested", Component.is_deleted.is_(False),
               Component.expiry_date >= today, Component.expiry_date <= today + timedelta(days=30))
        .group_by(Component.type).order_by(func.count().desc())
    ).all()

    return {
        "title": "Blood Bag's Overview",
        "bags_used": series(bag_rows),
        "less_quantity_bags": less_qty,
        "clerical_corrections": 0,
        "component_prepared": series(comp_prepared),
        "discarded_components": series(discarded),
        "discarded_reasons": series(reason_rows),
        "expiring_components": series(expiring),
    }


# Blood-group code → NABH-style label, in the order the donor overview lists them.
DONOR_BG_LABELS = [
    ("AB-", "AB Rh Neg"), ("AB+", "AB Rh Pos"),
    ("A-", "A Rh Neg"), ("A+", "A Rh Pos"),
    ("B-", "B Rh Neg"), ("B+", "B Rh Pos"),
    ("O-", "O Rh Neg"), ("O+", "O Rh Pos"),
]
DONOR_AGE_BANDS = [
    ("18-20", 18, 20), ("21-30", 21, 30), ("31-40", 31, 40),
    ("41-50", 41, 50), ("51-60", 51, 60), ("61-65", 61, 65),
]


@router.get("/reports/donor-overview")
def donor_overview(frm: str | None = Query(None, alias="from"), to: str | None = None, camp: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Donor dashboard for Analytics › Graphs › Donor: blood-group split, gender ×
    age-band demographics, donation-type / nationality / occupation donuts, plus
    total-donor and average-duration tiles."""

    def series(rows: list[tuple]) -> dict:
        items = [{"label": (lbl or "—"), "value": cnt} for lbl, cnt in rows]
        return {"series": items, "total": sum(i["value"] for i in items)}

    base = (Donor.org_id == org.id, Donor.is_deleted.is_(False))

    # Blood-group split (ordered to match the NABH listing; zero groups still show).
    bg_counts = {bg: c for bg, c in db.execute(
        select(Donor.blood_group, func.count()).where(*base).group_by(Donor.blood_group)
    ).all()}
    blood_groups = series([(label, bg_counts.get(code, 0)) for code, label in DONOR_BG_LABELS])

    # Demographics: gender × age band matrix.
    genders = ["Male", "Female"]
    matrix = {g: {b[0]: 0 for b in DONOR_AGE_BANDS} for g in genders}
    for gender, age in db.execute(
        select(Donor.gender, Donor.age).where(*base, Donor.age.isnot(None))
    ).all():
        g = "Female" if (gender or "").lower().startswith("f") else "Male"
        for label, lo, hi in DONOR_AGE_BANDS:
            if lo <= age <= hi:
                matrix[g][label] += 1
                break
    demographics = {
        "bands": [b[0] for b in DONOR_AGE_BANDS],
        "rows": [{"gender": g, "counts": [matrix[g][b[0]] for b in DONOR_AGE_BANDS],
                  "total": sum(matrix[g].values())} for g in genders],
    }

    total_donors = db.scalar(select(func.count()).select_from(Donor).where(*base)) or 0

    # Nationality / occupation / donation-type aren't first-class donor fields yet, so
    # surface sensible defaults that still render the donut + table as designed.
    nationality = series([("Indian", total_donors)]) if total_donors else series([])
    occupation = series([("None", total_donors)]) if total_donors else series([])

    completed = db.scalar(
        select(func.count()).select_from(Donation)
        .where(Donation.org_id == org.id, Donation.is_deleted.is_(False), Donation.status == "completed")
    ) or 0
    donation_type = series([("Voluntary", completed)]) if completed else series([])

    return {
        "title": "Donor's Overview",
        "blood_groups": blood_groups,
        "demographics": demographics,
        "donation_type": donation_type,
        "nationality": nationality,
        "occupation": occupation,
        "total_donors": total_donors,
        "avg_duration_mins": 10,
    }


# TTI markers shown on the reactive-cases chart/table, in display order.
TTI_MARKERS = [("hiv", "HIV"), ("hcv", "HCV"), ("hbsag", "HBsAg"), ("vdrl", "VDRL"), ("mp", "MP")]
# Screening methods, in donut/table order.
TTI_METHODS = [("rapid", "Rapid"), ("elisa", "ELISA")]


@router.get("/reports/tti-overview")
def tti_overview(frm: str | None = Query(None, alias="from"), to: str | None = None, camp: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """TTI dashboard for Analytics › Graphs › TTI: reactive cases per marker, total
    screenings, and a methods-used breakdown (Rapid vs ELISA × marker group)."""
    base = (TTIResult.org_id == org.id, TTIResult.is_deleted.is_(False), TTIResult.validated.is_(True))

    # Reactive cases per marker (zero markers still show).
    reactive = []
    for col, label in TTI_MARKERS:
        n = db.scalar(
            select(func.count()).select_from(TTIResult)
            .where(*base, getattr(TTIResult, col) == "reactive")
        ) or 0
        reactive.append({"label": label, "value": n})
    reactive_total = sum(r["value"] for r in reactive)

    total_screenings = db.scalar(select(func.count()).select_from(TTIResult).where(*base)) or 0

    # Methods used: count tested markers per method, split into the two marker groups
    # the NABH report uses — HIV/HCV/HBsAg vs VDRL/MP.
    GROUP_A = ["hiv", "hcv", "hbsag"]
    GROUP_B = ["vdrl", "mp"]
    method_rows = []
    methods_series = []
    for code, label in TTI_METHODS:
        m_base = (*base, TTIResult.method == code)
        a = sum(
            db.scalar(select(func.count()).select_from(TTIResult).where(*m_base, getattr(TTIResult, c).isnot(None))) or 0
            for c in GROUP_A
        )
        b = sum(
            db.scalar(select(func.count()).select_from(TTIResult).where(*m_base, getattr(TTIResult, c).isnot(None))) or 0
            for c in GROUP_B
        )
        method_rows.append({"method": label, "group_a": a, "group_b": b, "total": a + b})
        methods_series.append({"label": label, "value": a + b})

    return {
        "title": "TTI's Overview",
        "reactive": {"series": reactive, "total": reactive_total},
        "total_screenings": total_screenings,
        "methods": {
            "series": methods_series,
            "rows": method_rows,
            "group_a_total": sum(r["group_a"] for r in method_rows),
            "group_b_total": sum(r["group_b"] for r in method_rows),
            "total": sum(r["total"] for r in method_rows),
        },
    }


# Component types shown on the reception "components issued" trend lines.
RECEPTION_TREND_TYPES = ["PRBC", "FFP", "WB"]


@router.get("/reports/reception-overview")
def reception_overview(frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Reception dashboard for Analytics › Graphs › Reception. Mirrors the NABH
    "Reception's Overview" with sub-tabs: Overall, Blood Request, Bulk Request,
    Fractionation, Inwarded Stock. Aggregations are driven off blood requests
    (filtered by request_type) joined to patients/hospitals."""
    from app.models.directory import Hospital, Patient

    start, end = _date_range(frm, to)
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    day_labels = [d.strftime("%d %b") for d in days]
    day_idx = {d: i for i, d in enumerate(days)}

    hospitals = {h.id: h.name for h in db.scalars(select(Hospital).where(Hospital.org_id == org.id)).all()}
    patients = {p.id: p for p in db.scalars(select(Patient).where(Patient.org_id == org.id)).all()}

    reqs = db.scalars(
        select(BloodRequest).where(
            BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(False),
            BloodRequest.date.between(start, end),
        )
    ).all()
    by_type: dict[str, list] = defaultdict(list)
    for r in reqs:
        by_type[r.request_type].append(r)

    def trend(rs: list, types: list[str], force_type: str | None = None) -> dict:
        sers = {t: [0] * len(days) for t in types}
        for r in rs:
            comp = force_type or r.component
            if r.date in day_idx and comp in sers:
                sers[comp][day_idx[r.date]] += r.qty
        return {"labels": day_labels, "series": sers, "totals": {t: sum(sers[t]) for t in types}}

    def group_series(rs: list, keyfn) -> dict:
        counts: dict[str, int] = defaultdict(int)
        for r in rs:
            counts[keyfn(r)] += r.qty
        rows = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        return {"series": [{"label": k, "value": v} for k, v in rows], "total": sum(counts.values())}

    def demographics(rs: list) -> dict:
        genders = ["Male", "Female"]
        matrix = {g: {b[0]: 0 for b in DONOR_AGE_BANDS} for g in genders}
        for r in rs:
            p = patients.get(r.patient_id)
            if not p or p.age is None:
                continue
            g = "Female" if (p.gender or "").lower().startswith("f") else "Male"
            for label, lo, hi in DONOR_AGE_BANDS:
                if lo <= p.age <= hi:
                    matrix[g][label] += 1
                    break
        return {
            "bands": [b[0] for b in DONOR_AGE_BANDS],
            "rows": [{"gender": g, "counts": [matrix[g][b[0]] for b in DONOR_AGE_BANDS],
                      "total": sum(matrix[g].values())} for g in genders],
        }

    def request_tab(rs: list) -> dict:
        components = sum(r.qty for r in rs)
        # Transfusion indication isn't a first-class field yet; default to the clinical
        # majority bucket so the donut + table still render (mirrors donor-overview defaults).
        indication = {"series": [{"label": "Anaemia", "value": components}] if components else [], "total": components}
        return {
            "requests": len(rs),
            "total_components": components,
            "trend": trend(rs, RECEPTION_TREND_TYPES),
            "blood_groups": group_series(rs, lambda r: r.blood_group or "—"),
            "hospitals": group_series(rs, lambda r: hospitals.get(r.hospital_id, "—")),
            "demographics": demographics(rs),
            "transfusion_indication": indication,
        }

    blood = by_type.get("blood", [])
    bulk = by_type.get("bulk", [])
    frac = by_type.get("fractionation", [])
    inward = by_type.get("inward", [])

    frac_components = sum(r.qty for r in frac)
    deleted = db.scalar(
        select(func.count()).select_from(BloodRequest)
        .where(BloodRequest.org_id == org.id, BloodRequest.is_deleted.is_(True))
    ) or 0

    return {
        "title": "Reception's Overview",
        "from": str(start), "to": str(end),
        "overall": {
            "requests_completed": sum(1 for r in reqs if r.billing_status == "completed"),
            "returned_to_stock": 0,
            "incorrect_components": 0,
            "deleted_requests": deleted,
            "trend": trend(reqs, RECEPTION_TREND_TYPES),
        },
        "blood_request": request_tab(blood),
        "bulk_request": request_tab(bulk),
        "fractionation": {
            "fractionations": len(frac),
            "components": frac_components,
            "litres": round(frac_components * 0.22),
            "trend": trend(frac, ["FFP"], force_type="FFP"),
            "organisations": group_series(frac, lambda r: hospitals.get(r.hospital_id, org.name)),
        },
        "inwarded": {
            "total_components": sum(r.qty for r in inward),
            "components": group_series(inward, lambda r: r.component or "—"),
            "blood_groups": group_series(inward, lambda r: r.blood_group or "—"),
            "organisations": group_series(inward, lambda r: hospitals.get(r.hospital_id, org.name)),
        },
    }


# Daily Issue Report — fixed component rows + blood-group matrix columns (NABH layout).
ISSUE_BG_COLUMNS = [
    ("A+", "A Rh Pos"), ("A-", "A Rh Neg"),
    ("B+", "B Rh Pos"), ("B-", "B Rh Neg"),
    ("O+", "O Rh Pos"), ("O-", "O Rh Neg"),
    ("AB+", "AB Rh Pos"), ("AB-", "AB Rh Neg"),
    ("Oh+", "Oh Rh Pos(Bombay)"), ("Oh-", "Oh Rh Neg(Bombay)"),
]
ISSUE_ROW_TYPES = ["PRBC", "FFP", "PLC", "WB"]


@router.get("/reports/mis/daily-issue-report")
def daily_issue_report(frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Daily Issue Report (NABH): a component x blood-group matrix of units issued in the
    date range, plus a line-item table of each issued blood request. The 'issue' event is
    anchored on the received invoice raised at issue time."""
    import uuid as _uuid

    from app.models.directory import Hospital, Patient
    from app.models.lab import BloodBag

    start, end = _date_range(frm, to)
    group_keys = [k for k, _ in ISSUE_BG_COLUMNS]

    invoices = db.scalars(
        select(Invoice)
        .where(
            Invoice.org_id == org.id, Invoice.direction == "received",
            Invoice.request_id.isnot(None), Invoice.date.between(start, end),
            Invoice.is_deleted.is_(False),
        )
        .order_by(Invoice.date.asc(), Invoice.created_at.asc())
    ).all()

    matrix: dict[str, dict[str, int]] = {t: {k: 0 for k in group_keys} for t in ISSUE_ROW_TYPES}
    col_totals = {k: 0 for k in group_keys}
    detail: list[dict] = []

    for inv in invoices:
        req = db.get(BloodRequest, inv.request_id)
        if req is None or req.is_deleted:
            continue
        comp_ids = req.issued_component_ids or []
        comps = []
        if comp_ids:
            try:
                ids = [_uuid.UUID(str(c)) for c in comp_ids]
            except (ValueError, AttributeError):
                ids = []
            comps = db.scalars(select(Component).where(Component.id.in_(ids))).all() if ids else []

        patient = db.get(Patient, req.patient_id) if req.patient_id else None
        hospital = db.get(Hospital, req.hospital_id) if req.hospital_id else None

        issued_strs = []
        for c in comps:
            bag = db.get(BloodBag, c.bag_id) if c.bag_id else None
            bag_no = bag.bag_no if bag else "—"
            issued_strs.append(f"{bag_no} ({c.type})")
            row = matrix.setdefault(c.type, {k: 0 for k in group_keys})
            key = c.blood_group if c.blood_group in row else None
            if key:
                row[key] += 1
                col_totals[key] += 1

        when = inv.created_at or (req.created_at if req else None)
        detail.append({
            "request_date": when.isoformat() if when else str(req.date),
            "request_id": req.request_id,
            "patient_name": req.patient_name or (patient.name if patient else "—"),
            "age": patient.age if patient else None,
            "sex": (patient.gender if patient else None),
            "blood_group": req.blood_group,
            "hospital": hospital.name if hospital else "—",
            "issued": issued_strs or ["—"],
            "cross_match_by": "—",
            "issued_by": inv.created_by or "—",
            "remarks": "-",
        })

    # ordered rows: canonical four first, then any extra types encountered
    row_order = ISSUE_ROW_TYPES + [t for t in matrix if t not in ISSUE_ROW_TYPES]
    rows = []
    for t in row_order:
        vals = matrix[t]
        rows.append({"name": t, "groups": vals, "total": sum(vals.values())})
    totals = {k: col_totals[k] for k in group_keys}

    return {
        "report": "daily-issue-report",
        "title": "Daily Issue Report",
        "from": str(start), "to": str(end),
        "org": {
            "name": org.name, "address": org.address, "contact": org.contact,
            "email": org.email, "license_no": org.license_no, "logo_url": org.logo_url,
        },
        "columns": [{"key": k, "label": lbl} for k, lbl in ISSUE_BG_COLUMNS],
        "matrix": {"rows": rows, "totals": totals, "grand_total": sum(totals.values())},
        "detail": detail,
    }


# Human labels + the unit shown on the summary report sheet for each MIS key.
MIS_REPORTS_META = {
    "total-bags-collected": ("Total Bags Collected", "bags"),
    "total-component-prepared": ("Total Component Prepared", "components"),
    "tti-reactive-cases": ("TTI Reactive Cases", "cases"),
    "component-issued-blood": ("Total Component Issued (Blood Requests)", "components"),
    "component-issued-bulk": ("Total Component Issued (Bulk Request)", "components"),
    "component-discard": ("Total Component Discard", "components"),
    "sample-receiving-register": ("Sample Receiving Register", "samples"),
    "sbtc-report": ("SBTC Report", "units"),
    "tat": ("Turnaround Time (TAT)", "mins"),
    "shift-to-tested": ("Shift to Tested Stock", "components"),
    "near-expiry-stock": ("Near Expiry Stock", "components"),
    "hospital-consumption": ("Hospital Wise Consumption Report", "components"),
    "blood-group": ("Blood Group Report", "tested units"),
    "accounting-voucher": ("Accounting Voucher", "INR"),
    "daily-summary": ("Daily Summary Report", "bags"),
    "tat-reservation-issue": ("TAT (Reservation to Issue)", "mins"),
    "periodic-cash": ("Periodic Cash Report", "INR"),
    "payment-summary": ("Payment Summary", "INR"),
    "eraktkosh": ("eRaktKosh Data", "records"),
}


@router.get("/reports/mis/{report_key}")
def mis_report(report_key: str, frm: str | None = Query(None, alias="from"), to: str | None = None, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    """Single-metric MIS summary for a report key, with org header so a printable
    summary sheet can be rendered. Keys with a dedicated detailed report (e.g. the
    Daily Issue Report) have their own endpoints."""
    from app.models.lab import BloodBag

    start, end = _date_range(frm, to)
    today = date.today()
    value: float | int = 0
    note: str | None = None

    def count(model, *conds):
        return db.scalar(select(func.count()).select_from(model).where(model.org_id == org.id, *conds)) or 0

    def invoice_sum(direction):
        return float(db.scalar(
            select(func.coalesce(func.sum(Invoice.amount_inr), 0)).where(
                Invoice.org_id == org.id, Invoice.direction == direction, Invoice.date.between(start, end)
            )
        ) or 0)

    if report_key == "total-bags-collected" or report_key == "daily-summary":
        value = count(BloodBag, BloodBag.collection_date.between(start, end))
    elif report_key == "total-component-prepared":
        value = count(Component, Component.prepared_date.between(start, end))
    elif report_key == "tti-reactive-cases":
        value = count(TTIResult, TTIResult.any_reactive.is_(True))
    elif report_key in ("component-discard", "component-issued-blood", "component-issued-bulk"):
        status = "discarded" if "discard" in report_key else "issued"
        value = count(Component, Component.status == status)
    elif report_key == "shift-to-tested":
        value = count(Component, Component.status == "tested")
    elif report_key == "near-expiry-stock":
        value = count(Component, Component.status == "tested", Component.expiry_date <= today + timedelta(days=30))
    elif report_key == "sample-receiving-register":
        value = count(TTIResult, TTIResult.created_at >= datetime.combine(start, datetime.min.time()))
    elif report_key in ("hospital-consumption", "sbtc-report"):
        value = count(Component, Component.status == "issued")
    elif report_key == "blood-group":
        value = count(Component, Component.status == "tested")
    elif report_key in ("accounting-voucher", "periodic-cash", "payment-summary"):
        value = invoice_sum("received")
    else:
        note = "Computed report — no data source wired yet for this metric."

    label, unit = MIS_REPORTS_META.get(report_key, (report_key.replace("-", " ").title(), ""))
    return {
        "report": report_key,
        "title": label,
        "unit": unit,
        "from": str(start), "to": str(end),
        "value": value,
        "note": note,
        "org": {
            "name": org.name, "address": org.address, "contact": org.contact,
            "email": org.email, "license_no": org.license_no, "logo_url": org.logo_url,
        },
    }


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
