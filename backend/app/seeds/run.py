"""Synthetic seed data — 100% generated with Faker.

Never hardcodes real phone numbers, government IDs, or real-world person names. Indian
locale names/addresses are synthetic via Faker('en_IN'). Run as `python -m app.seeds.run`.

Idempotent-ish: when SEED_ON_START and data already exists, it wipes and reseeds so a
fresh `docker compose up` always yields a known, working dataset.
"""
import random
from datetime import date, datetime, timedelta, timezone

from faker import Faker

from app.core.config import settings
from app.core.security import hash_password
# Seeds run privileged: DDL (drop_all/create_all) and cross-tenant bulk inserts must
# bypass RLS, so use the admin engine/session bound to DATABASE_URL, not the (possibly
# RLS-restricted) runtime engine.
from app.db.session import AdminSessionLocal as SessionLocal, admin_engine as engine
from app.db.base import Base
from app.models.audit import ActivityLog
from app.models.camp import Camp, Donation, Donor, Vehicle
from app.models.directory import (BloodInquiry, Hospital, Patient,
                                   TherapeuticDonation, ThalassemiaPatient)
from app.models.identity import Organisation, User, UserOrg
from app.models.inventory import QCRecord, StoreItem
from app.models.lab import (BloodBag, Component, GroupingResult,
                            PipelineStageRecord, TTIResult)
from app.models.reception import (BarcodeBatch, BloodRequest, Download, Feedback,
                                  Invoice, LabelJob, Reservation)

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
GROUP_WEIGHTS = [25, 4, 38, 3, 30, 4, 9, 2]  # India-ish distribution
BAG_TYPES = ["DB-SAGM-350", "DB-SAGM-450", "TB-SAGM-350", "TB-SAGM-450", "SB-350"]
COMPONENT_RECIPE = {"SB": ["WB"], "DB": ["PRBC", "FFP"], "TB": ["PRBC", "FFP", "PLC"]}
SHELF = {"WB": 35, "PRBC": 42, "FFP": 365, "PLC": 5}
CAMP_NAMES = ["Mahaveer Farm Balaji", "Income Tax Office", "Village Dahaur Khat",
              "Prathmik Vidyalay", "Village Madkarimpur", "Civil Lines South"]


def wipe():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def rgroup() -> str:
    return random.choices(GROUPS, weights=GROUP_WEIGHTS, k=1)[0]


# Cluster synthetic donors/camps around a region so the donor map looks realistic.
# ASSUMPTION: Agra region (synthetic — not tied to any real centre).
REGION_LAT, REGION_LNG = 27.1767, 78.0081


def cluster() -> tuple[float, float]:
    return (round(REGION_LAT + random.uniform(-0.18, 0.18), 5),
            round(REGION_LNG + random.uniform(-0.18, 0.18), 5))


def make_org(db, name, prefix) -> Organisation:
    org = Organisation(
        name=name, license_no=f"{prefix}/BB/{random.randint(1000,9999)}",
        address=fake.address().replace("\n", ", "), contact=fake.phone_number(),
        email=fake.company_email(), website=f"https://{prefix.lower()}.example.in",
        id_prefix=prefix, billing_prefix=prefix,
        compliance_flags={"nabh": True, "nbtc": True, "erakt_kosh": True,
                          "drugs_cosmetics_act_1940": True},
        blood_pricing={"WB": 1450, "PRBC": 1450, "FFP": 400, "PLC": 400, "SDP": 11000, "CRYO": 600},
        settings={"dark_mode": False, "timezone": "Asia/Kolkata"},
    )
    db.add(org)
    db.flush()
    return org


def seed_org(db, org: Organisation, *, is_primary: bool):
    # ---- Staff ----
    designations = [
        ("Master User", "master_user", True),
        ("Technician", "technician", False),
        ("Technical Supervisor", "technical_supervisor", False),
        ("Motivation Officer", "motivation", False),
        ("General Staff", "general", False),
    ]
    first_email = None
    for i, (role_label, desig, master) in enumerate(designations):
        name = fake.name()
        email = (f"admin@{org.id_prefix.lower()}.in" if (is_primary and i == 0)
                 else f"{desig}.{org.id_prefix.lower()}@example.in")
        if i == 0:
            first_email = email
        db.add(User(
            name=name, email=email, phone=fake.phone_number(),
            password_hash=hash_password("password123"), designation=desig,
            is_master_user=master, org_id=org.id,
            permissions={"role_label": role_label},
        ))
    db.flush()
    # Every staff member is a member of their home centre.
    for u in db.query(User).filter(User.org_id == org.id).all():
        db.add(UserOrg(user_id=u.id, org_id=org.id))
    db.flush()

    # ---- Vehicles ----
    vehicles = []
    for _ in range(3):
        v = Vehicle(name=f"Mobile Van {fake.random_uppercase_letter()}",
                    vehicle_no=fake.license_plate(), org_id=org.id)
        db.add(v)
        vehicles.append(v)
    db.flush()

    # ---- Camps (this month, June 2026) + a few in-house ----
    camps = []
    camp_days = [3, 7, 14, 14, 21, 23]
    for idx, cname in enumerate(CAMP_NAMES):
        day = camp_days[idx] if idx < len(camp_days) else random.randint(1, 25)
        c = Camp(
            name=cname, location_text=fake.city(),
            latitude=cluster()[0], longitude=cluster()[1],
            date=date(2026, 6, day), start_time=random.choice(["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"]),
            type="camp", organiser=fake.name(), vehicle_id=random.choice(vehicles).id,
            org_id=org.id,
        )
        db.add(c)
        camps.append(c)
    inhouse = Camp(name="In-house Walk-in", location_text="Blood Centre",
                   date=date(2026, 6, 24), type="inhouse", org_id=org.id)
    db.add(inhouse)
    camps.append(inhouse)
    db.flush()

    # ---- Donors ----
    donor_count = 90 if is_primary else 45
    donors = []
    for _ in range(donor_count):
        age = random.randint(18, 68)
        last = date.today() - timedelta(days=random.randint(10, 500)) if random.random() > 0.15 else None
        d = Donor(
            name=fake.name(), age=age, dob=date.today() - timedelta(days=age * 365),
            gender=random.choice(["Male", "Female"]), contact=fake.phone_number(),
            govt_id=f"XXXX-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            address=fake.address().replace("\n", ", "),
            latitude=cluster()[0], longitude=cluster()[1],
            blood_group=rgroup(), last_donation_date=last,
            total_donations=random.randint(0, 12),
            deferral_status=random.choices(["none", "temporary", "permanent"], weights=[88, 9, 3])[0],
            org_id=org.id,
        )
        db.add(d)
        donors.append(d)
    db.flush()

    # ---- Hospitals + Patients ----
    hospitals = []
    for _ in range(6):
        h = Hospital(name=f"{fake.last_name()} {random.choice(['Hospital','Medical Centre','Nursing Home','Multispeciality'])}",
                     address=fake.address().replace("\n", ", "), contact=fake.phone_number(), org_id=org.id)
        db.add(h)
        hospitals.append(h)
    db.flush()
    patients = []
    for _ in range(40 if is_primary else 20):
        p = Patient(name=fake.name(), age=random.randint(1, 85), gender=random.choice(["Male", "Female"]),
                    contact=fake.phone_number(), hospital_id=random.choice(hospitals).id, org_id=org.id)
        db.add(p)
        patients.append(p)
    db.flush()

    # ---- Donations + Bags + full lab pipeline for primary org so stock looks real ----
    bag_target = 320 if is_primary else 120
    for bag_i in range(bag_target):
        donor = random.choice(donors)
        camp = random.choice(camps)
        bag_type = random.choice(BAG_TYPES)
        coll = camp.date
        donation = Donation(
            donor_id=donor.id, camp_id=camp.id,
            date=datetime.combine(coll, datetime.min.time()).replace(tzinfo=timezone.utc),
            status="completed",
            screening_json={"hb": round(random.uniform(12.5, 16.5), 1), "bp": "120/80",
                            "weight": random.randint(50, 90), "pulse": random.randint(60, 90)},
            org_id=org.id,
        )
        db.add(donation)
        bag = BloodBag(
            bag_no=f"{org.id_prefix}26-D{1000 + bag_i:04d}", bag_type=bag_type,
            donor_id=donor.id, camp_id=camp.id, collection_date=coll,
            gross_volume_ml=random.choice([350, 450]),
            segment_no=f"SEG{random.randint(100,999)}", status="processed", org_id=org.id,
        )
        db.add(bag)
        db.flush()

        bg = donor.blood_group
        abo, rh = bg[:-1], ("positive" if bg.endswith("+") else "negative")
        grp_validated = random.random() > 0.1
        db.add(GroupingResult(org_id=org.id, bag_id=bag.id, forward_result=abo, reverse_result=abo,
                              abo=abo, rh=rh, discrepancy=False, validated=grp_validated,
                              validated_by=fake.name() if grp_validated else None))

        # ~3% reactive
        reactive = random.random() < 0.03
        tti_validated = random.random() > 0.1
        db.add(TTIResult(org_id=org.id, bag_id=bag.id, donor_id=donor.id,
                         hiv="reactive" if reactive and random.random() < 0.4 else "nonreactive",
                         hbsag="reactive" if reactive and random.random() < 0.4 else "nonreactive",
                         hcv="reactive" if reactive else "nonreactive",
                         vdrl="nonreactive", mp="nonreactive", method=random.choice(["rapid", "elisa"]),
                         validated=tti_validated, any_reactive=reactive))

        prefix = bag_type.split("-")[0]
        for ctype in COMPONENT_RECIPE.get(prefix, ["WB"]):
            if reactive:
                status = "quarantine"
            elif grp_validated and tti_validated:
                # "allotted" = reserved/cross-matched for a request, awaiting issue.
                status = random.choices(["tested", "untested", "issued", "allotted"], weights=[60, 16, 12, 12])[0]
            else:
                status = "untested"
            prepared = coll + timedelta(days=1)
            db.add(Component(
                org_id=org.id, bag_id=bag.id, type=ctype, blood_group=bg,
                volume_ml={"WB": 450, "PRBC": 280, "FFP": 220, "PLC": 50}.get(ctype, 250),
                prepared_date=prepared,
                expiry_date=prepared + timedelta(days=SHELF.get(ctype, 35)),
                status=status,
            ))
    db.flush()

    # ---- In-flight bags so EVERY lab-pipeline stage queue is populated and a
    # bag can be walked end-to-end (Phase 4). The bags above are all fully
    # processed, which would leave the early stepper stages showing "All
    # Completed!" with nothing to advance. Here we leave fresh bags parked at
    # each entry stage:
    #   - `collected`           -> Component › Segment Grouping queue
    #   - `in_processing` (bare) -> Component › Processing, Grouping › F/R, TTI › screening
    #   - `processed` + volumeless components -> Component › Volume
    inflight = 10 if is_primary else 5
    w_seq = 0
    for grp_idx in range(inflight):
        for kind in ("collected", "in_processing", "volumeless"):
            w_seq += 1
            donor = random.choice(donors)
            camp = random.choice(camps)
            bag_type = random.choice(BAG_TYPES)
            coll = date(2026, 6, 24) - timedelta(days=grp_idx % 3)
            bag = BloodBag(
                bag_no=f"{org.id_prefix}26-W{1000 + w_seq:04d}", bag_type=bag_type,
                donor_id=donor.id, camp_id=camp.id, collection_date=coll,
                gross_volume_ml=random.choice([350, 450]),
                status="collected" if kind == "collected" else (
                    "in_processing" if kind == "in_processing" else "processed"),
                org_id=org.id,
            )
            db.add(bag)
            db.flush()
            # `volumeless` bags are already processed and have components awaiting
            # volume measurement (but no grouping/TTI yet, so they also surface in
            # the F/R and screening queues — exactly like a real in-flight unit).
            if kind == "volumeless":
                bag.segment_no = f"SEG{random.randint(100,999)}"
                prepared = coll + timedelta(days=1)
                for ctype in COMPONENT_RECIPE.get(bag_type.split("-")[0], ["WB"]):
                    db.add(Component(
                        org_id=org.id, bag_id=bag.id, type=ctype, blood_group=donor.blood_group,
                        volume_ml=None, prepared_date=prepared,
                        expiry_date=prepared + timedelta(days=SHELF.get(ctype, 35)),
                        status="untested",
                    ))
    db.flush()

    # ---- Discarded components (with TTI / physical reasons) so the Blood Bag
    # overview discard donuts populate. Reactive (quarantined) units are discarded
    # with a serology reason; a few tested units fail QC for physical reasons.
    tti_reasons = ["HCVAb Positive", "HIV I & II Reactive", "HBsAg Positive"]
    phys_reasons = ["Lipemic", "Clotted Unit", "Less Quantity"]
    quarantined = db.query(Component).filter(
        Component.org_id == org.id, Component.status == "quarantine").all()
    tested_comps = db.query(Component).filter(
        Component.org_id == org.id, Component.status == "tested").all()
    random.shuffle(tested_comps)

    def _discard(comp, reason):
        comp.status = "discarded"
        db.add(PipelineStageRecord(
            org_id=org.id, subject_id=comp.id, pipeline="component", stage="discard",
            completed_at=datetime.now(timezone.utc), done_by=fake.name(),
            data={"reason": reason}))

    for c in quarantined[: (8 if is_primary else 4)]:
        _discard(c, random.choice(tti_reasons))
    for c in tested_comps[: (4 if is_primary else 2)]:
        _discard(c, random.choice(phys_reasons))
    db.flush()

    # ---- Extra donation registrations with mixed statuses so the donor
    # dashboard tabs (Pending / Completed / Deferrals) are all populated.
    # These represent walk-in / camp registrations not yet processed into bags.
    deferral_reasons = [
        "Low haemoglobin (< 12.5 g/dL)", "Recent fever / illness",
        "Blood pressure out of range", "Donated within last 3 months",
        "Underweight (< 45 kg)", "On antibiotics",
    ]
    upcoming = [c for c in camps if c.date >= date(2026, 6, 23)] or camps
    for _ in range(16 if is_primary else 7):
        donor = random.choice(donors)
        camp = random.choice(upcoming)
        db.add(Donation(
            donor_id=donor.id, camp_id=camp.id,
            date=datetime.combine(camp.date, datetime.min.time()).replace(tzinfo=timezone.utc),
            status="pending",
            screening_json={"hb": round(random.uniform(12.5, 16.0), 1), "bp": "120/80",
                            "weight": random.randint(50, 90), "pulse": random.randint(60, 90)},
            org_id=org.id,
        ))
    for _ in range(9 if is_primary else 4):
        donor = random.choice(donors)
        camp = random.choice(upcoming)
        donor.deferral_status = "temporary"
        db.add(Donation(
            donor_id=donor.id, camp_id=camp.id,
            date=datetime.combine(camp.date, datetime.min.time()).replace(tzinfo=timezone.utc),
            status="deferred", deferral_reason=random.choice(deferral_reasons),
            screening_json={"hb": round(random.uniform(9.0, 12.4), 1), "bp": "110/70",
                            "weight": random.randint(42, 60), "pulse": random.randint(60, 95)},
            org_id=org.id,
        ))
    db.flush()

    # ---- Store items ----
    item_specs = [
        ("Blood Bag DB-SAGM-450", "blood_bag"), ("Blood Bag TB-SAGM-450", "blood_bag"),
        ("Anti-A Reagent", "reagent"), ("Anti-B Reagent", "reagent"), ("Anti-D Reagent", "reagent"),
        ("HIV ELISA Kit", "reagent"), ("HBsAg Rapid Kit", "reagent"), ("HCV ELISA Kit", "reagent"),
        ("Sterile Gloves", "consumable"), ("Cotton Swabs", "consumable"), ("Sodium Citrate", "consumable"),
    ]
    for name, itype in item_specs:
        db.add(StoreItem(name=name, item_type=itype, supplier=fake.company(),
                         quantity=random.randint(5, 400),
                         expiry_date=date.today() + timedelta(days=random.choice([12, 25, 60, 120, 300])),
                         org_id=org.id))

    # ---- QC (≥3 of each type so all four QC tabs populate) ----
    qc_plan = ["blood_component", "reagent", "abo_pooled_suspension", "other"] * 3
    random.shuffle(qc_plan)
    for qtype in qc_plan:
        db.add(QCRecord(qc_type=qtype,
                        name=fake.bs().title(), done_by=fake.name(),
                        date=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 20)),
                        status=random.choice(["pass", "pass", "pass", "fail", "pending"]),
                        parameters_json={"ph": round(random.uniform(6.5, 7.4), 2)}, org_id=org.id))

    # ---- Blood requests (reception) ----
    # Guarantee ≥3 of each non-blood type so all four Reception tabs populate.
    components_pool = ["PRBC", "FFP", "WB", "PLC"]
    n_reqs = 24 if is_primary else 12
    type_plan = ["bulk", "fractionation", "inward"] * 3 + ["blood"] * (n_reqs - 9)
    random.shuffle(type_plan)
    for i, n in enumerate(range(620, 620 - n_reqs, -1)):
        req_date = date(2026, 6, random.randint(18, 24))
        p = random.choice(patients)
        serology = random.choice(["completed", "completed", "pending"])
        # Pending requests sit at one of the in-flight serology stages so the
        # "Show Pending Only" view shows varied Blood Grouping / Crossmatch / Issue actions.
        stage = "done" if serology == "completed" else random.choice(["grouping", "crossmatch", "issue"])
        # A crossmatch must be on file (and compatible) before a request reaches issue,
        # so seed one for any request that has already passed the crossmatch stage.
        crossmatch = "compatible" if stage in ("issue", "done") else None
        db.add(BloodRequest(
            request_id=f"{org.id_prefix}26-R{n:05d}", date=req_date,
            request_type=type_plan[i],
            patient_id=p.id, patient_name=f"{random.choice(['Mr.','Mrs.','Ms.'])} {p.name.split()[0].upper()}",
            hospital_id=p.hospital_id, blood_group=rgroup(), component=random.choice(components_pool),
            qty=random.randint(1, 3),
            billing_status=random.choice(["completed", "completed", "pending"]),
            serology_status=serology,
            serology_stage=stage,
            crossmatch_result=crossmatch,
            crossmatch_at=datetime.now(timezone.utc) if crossmatch else None,
            org_id=org.id,
        ))
    db.flush()

    # ---- Invoices ----
    reqs = db.query(BloodRequest).filter(BloodRequest.org_id == org.id).all()
    for i, r in enumerate(reqs[:18]):
        db.add(Invoice(invoice_no=str(2968 + i), date=r.date, name=r.patient_name,
                       direction=random.choice(["received", "received", "sent"]),
                       amount_inr=random.choice([400, 1450, 600, 11000]) * r.qty,
                       created_by=fake.name(), request_id=r.id, org_id=org.id))

    # ---- Activity log / History (camps) — backfill so the Camp History feed is populated.
    staff_names = [u.name for u in db.query(User).filter(User.org_id == org.id).all()] or ["System"]
    for c in camps:
        base = (datetime.combine(c.date, datetime.min.time()).replace(tzinfo=timezone.utc)
                + timedelta(hours=random.randint(8, 18), minutes=random.randint(0, 59)))
        db.add(ActivityLog(org_id=org.id, module="camp", user_name=random.choice(staff_names),
                           action=f"Added {c.name} {c.location_text or ''} Camp ({c.date.strftime('%d %b %Y')})",
                           entity_ref=str(c.id), created_at=base))
    db.flush()

    # ---- Activity log / History (reception) — backfill so the History feed is
    # populated for existing requests (newest entries appear first in the modal).
    for r in reqs:
        base = (datetime.combine(r.date, datetime.min.time()).replace(tzinfo=timezone.utc)
                + timedelta(hours=random.randint(8, 20), minutes=random.randint(0, 59)))
        db.add(ActivityLog(org_id=org.id, module="reception", user_name=random.choice(staff_names),
                           action=f"Added {r.request_id}", entity_ref=r.request_id, created_at=base))
        if r.billing_status == "completed" and r.serology_status == "completed":
            db.add(ActivityLog(org_id=org.id, module="reception", user_name=random.choice(staff_names),
                               action=f"Issued {r.qty} unit(s) for {r.request_id}", entity_ref=r.request_id,
                               created_at=base + timedelta(hours=1)))
    db.flush()

    # ---- Misc directory / tools ----
    for _ in range(5):
        db.add(ThalassemiaPatient(name=fake.name(), address=fake.address().replace("\n", ", "),
                                  contact=fake.phone_number(), blood_group=rgroup(), org_id=org.id))
        db.add(TherapeuticDonation(name=fake.name(), phone=fake.phone_number(), doctor=f"Dr. {fake.name()}",
                                   hospital_id=random.choice(hospitals).id, date=date.today(), org_id=org.id))
        db.add(BloodInquiry(hospital_id=random.choice(hospitals).id, patient_name=fake.name(),
                            contact=fake.phone_number(), blood_group=rgroup(),
                            component=random.choice(components_pool), qty=random.randint(1, 4), org_id=org.id))
        db.add(Reservation(id_range=f"{org.id_prefix}26-D{random.randint(800,900)} - {org.id_prefix}26-D{random.randint(900,999)}",
                           name=fake.name(), date=date.today(), org_id=org.id))
        db.add(Feedback(source=random.choice(["donor", "recipient", "camp_organiser"]),
                        overall=random.randint(3, 5), cleanliness=random.randint(3, 5),
                        staff_behaviour=random.randint(3, 5), would_recommend=random.randint(3, 5),
                        date=date.today() - timedelta(days=random.randint(0, 30)),
                        name=fake.name(), contact=fake.phone_number(),
                        comment=fake.sentence(),
                        action_taken=random.choice([None, "Acknowledged", "Resolved", "Forwarded to staff"]),
                        org_id=org.id))
    db.add(BarcodeBatch(batch_type="blood_bag", bag_type="DB-SAGM-450", prepend_text=f"{org.id_prefix}26-D",
                        range_start=801, range_end=860, copies=2, generated_by=fake.name(), org_id=org.id))
    db.add(Download(description=f"Barcodes, {org.id_prefix}26-D0801 - {org.id_prefix}26-D0860",
                    generated_on=datetime.now(timezone.utc), created_by=fake.name(), org_id=org.id))
    db.add(LabelJob(component_type="PRBC", mode="range", org_id=org.id))
    db.flush()
    return first_email


def main():
    # Respect SEED_ON_START: when disabled, never wipe or seed — regardless of
    # whether data exists. The wipe() below does drop_all + create_all, so a fresh
    # DB (tables migrated by alembic but no rows yet) must NOT fall through to it.
    if not settings.SEED_ON_START:
        print("[seed] SEED_ON_START=false — skipping seed (no wipe).")
        return
    wipe()
    db = SessionLocal()
    try:
        primary = make_org(db, "Arogya City Blood Centre", "ACBC")
        secondary = make_org(db, "Jeevan Dhara Blood Bank", "JDBB")
        login_email = seed_org(db, primary, is_primary=True)
        seed_org(db, secondary, is_primary=False)

        # Master users belong to both centres so the top-bar switcher demo works;
        # regular staff stay scoped to their home centre (switch-org enforces this).
        all_orgs = [primary, secondary]
        for masteruser in db.query(User).filter(User.is_master_user.is_(True)).all():
            for o in all_orgs:
                if o.id != masteruser.org_id:
                    db.add(UserOrg(user_id=masteruser.id, org_id=o.id))
        db.flush()
        db.commit()
        print(f"[seed] done. Brand={settings.BRAND_NAME}")
        print(f"[seed] login -> {login_email} / password123")
        print(f"[seed] orgs: {primary.name} (ACBC), {secondary.name} (JDBB)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
