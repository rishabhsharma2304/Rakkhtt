"""Create/Update schemas for every CRUD entity.

Convention: *Create has the required fields for a sensible new row; *Update makes
everything optional (partial update). org_id is never accepted from the client — the
router injects it from the JWT's active org.
"""
from datetime import date as Date, datetime as DateTime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore")


# ---------- Identity ----------
class OrgCreate(_Base):
    name: str
    license_no: str | None = None
    address: str | None = None
    contact: str | None = None
    email: str | None = None
    website: str | None = None
    id_prefix: str = "ACBC"
    billing_prefix: str = "ACBC"
    logo_url: str | None = None
    compliance_flags: dict = {}
    blood_pricing: dict = {}
    settings: dict = {}


class OrgUpdate(_Base):
    name: str | None = None
    license_no: str | None = None
    address: str | None = None
    contact: str | None = None
    email: str | None = None
    website: str | None = None
    id_prefix: str | None = None
    billing_prefix: str | None = None
    logo_url: str | None = None
    compliance_flags: dict | None = None
    blood_pricing: dict | None = None
    settings: dict | None = None


class StaffCreate(_Base):
    name: str
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8)
    designation: str = "general"
    permissions: dict = {}
    is_master_user: bool = False


class StaffUpdate(_Base):
    name: str | None = None
    phone: str | None = None
    designation: str | None = None
    permissions: dict | None = None
    is_master_user: bool | None = None
    password: str | None = Field(default=None, min_length=8)


# ---------- Camp ----------
class VehicleCreate(_Base):
    name: str
    vehicle_no: str | None = None


class VehicleUpdate(_Base):
    name: str | None = None
    vehicle_no: str | None = None


class CampCreate(_Base):
    name: str
    location_text: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    date: Date
    start_time: str | None = None
    type: str = "camp"
    organiser: str | None = None
    vehicle_id: str | None = None
    eligibility_flag: bool = True


class CampUpdate(_Base):
    name: str | None = None
    location_text: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    date: Date | None = None
    start_time: str | None = None
    type: str | None = None
    organiser: str | None = None
    vehicle_id: str | None = None
    eligibility_flag: bool | None = None


class DonorCreate(_Base):
    name: str
    dob: Date | None = None
    age: int | None = None
    gender: str | None = None
    contact: str | None = None
    govt_id: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    blood_group: str | None = None
    last_donation_date: Date | None = None
    total_donations: int = 0
    deferral_status: str = "none"


class DonorUpdate(_Base):
    name: str | None = None
    dob: Date | None = None
    age: int | None = None
    gender: str | None = None
    contact: str | None = None
    govt_id: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    blood_group: str | None = None
    last_donation_date: Date | None = None
    total_donations: int | None = None
    deferral_status: str | None = None


class DonationCreate(_Base):
    donor_id: str
    camp_id: str | None = None
    date: DateTime
    status: str = "pending"
    deferral_reason: str | None = None
    screening_json: dict = {}


class DonationUpdate(_Base):
    camp_id: str | None = None
    date: DateTime | None = None
    status: str | None = None
    deferral_reason: str | None = None
    screening_json: dict | None = None


# ---------- Lab ----------
class BagCreate(_Base):
    bag_no: str
    bag_type: str
    donor_id: str | None = None
    camp_id: str | None = None
    collection_date: Date
    gross_volume_ml: int | None = None
    segment_no: str | None = None
    status: str = "collected"


class BagUpdate(_Base):
    bag_no: str | None = None
    bag_type: str | None = None
    donor_id: str | None = None
    camp_id: str | None = None
    collection_date: Date | None = None
    gross_volume_ml: int | None = None
    segment_no: str | None = None
    status: str | None = None


class ComponentCreate(_Base):
    bag_id: str
    type: str
    volume_ml: int | None = None
    blood_group: str | None = None
    prepared_date: Date | None = None
    expiry_date: Date | None = None
    status: str = "untested"


class ComponentUpdate(_Base):
    type: str | None = None
    volume_ml: int | None = None
    blood_group: str | None = None
    prepared_date: Date | None = None
    expiry_date: Date | None = None
    status: str | None = None


# ---------- Inventory ----------
class StoreItemCreate(_Base):
    name: str
    item_type: str
    supplier: str | None = None
    quantity: int = 0
    expiry_date: Date | None = None


class StoreItemUpdate(_Base):
    name: str | None = None
    item_type: str | None = None
    supplier: str | None = None
    quantity: int | None = None
    expiry_date: Date | None = None


class QCCreate(_Base):
    qc_type: str
    donor_id: str | None = None
    name: str
    done_by: str | None = None
    date: DateTime
    status: str = "pending"
    parameters_json: dict = {}


class QCUpdate(_Base):
    qc_type: str | None = None
    name: str | None = None
    done_by: str | None = None
    date: DateTime | None = None
    status: str | None = None
    parameters_json: dict | None = None


# ---------- Directory ----------
class HospitalCreate(_Base):
    name: str
    address: str | None = None
    contact: str | None = None


class HospitalUpdate(_Base):
    name: str | None = None
    address: str | None = None
    contact: str | None = None


class PatientCreate(_Base):
    name: str
    age: int | None = None
    gender: str | None = None
    contact: str | None = None
    hospital_id: str | None = None


class PatientUpdate(_Base):
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    contact: str | None = None
    hospital_id: str | None = None


class ThalassemiaCreate(_Base):
    name: str
    address: str | None = None
    contact: str | None = None
    blood_group: str | None = None


class ThalassemiaUpdate(_Base):
    name: str | None = None
    address: str | None = None
    contact: str | None = None
    blood_group: str | None = None


class TherapeuticCreate(_Base):
    name: str
    phone: str | None = None
    doctor: str | None = None
    hospital_id: str | None = None
    date: Date | None = None


class TherapeuticUpdate(_Base):
    name: str | None = None
    phone: str | None = None
    doctor: str | None = None
    hospital_id: str | None = None
    date: Date | None = None


class InquiryCreate(_Base):
    hospital_id: str | None = None
    patient_name: str | None = None
    contact: str | None = None
    blood_group: str | None = None
    component: str | None = None
    qty: int = 1


class InquiryUpdate(_Base):
    hospital_id: str | None = None
    patient_name: str | None = None
    contact: str | None = None
    blood_group: str | None = None
    component: str | None = None
    qty: int | None = None


# ---------- Reception ----------
class RequestCreate(_Base):
    request_id: str | None = None  # auto-generated if omitted
    date: Date
    request_type: str = "blood"
    patient_id: str | None = None
    patient_name: str | None = None
    hospital_id: str | None = None
    blood_group: str | None = None
    component: str | None = None
    qty: int = 1
    billing_status: str = "pending"
    serology_status: str = "pending"
    serology_stage: str = "grouping"
    issued_component_ids: list = []


class RequestUpdate(_Base):
    date: Date | None = None
    request_type: str | None = None
    patient_id: str | None = None
    patient_name: str | None = None
    hospital_id: str | None = None
    blood_group: str | None = None
    component: str | None = None
    qty: int | None = None
    billing_status: str | None = None
    serology_status: str | None = None
    serology_stage: str | None = None
    issued_component_ids: list | None = None


class InvoiceCreate(_Base):
    invoice_no: str | None = None
    date: Date
    name: str | None = None
    direction: str = "received"
    amount_inr: float = 0
    created_by: str | None = None
    request_id: str | None = None


class InvoiceUpdate(_Base):
    invoice_no: str | None = None
    date: Date | None = None
    name: str | None = None
    direction: str | None = None
    amount_inr: float | None = None
    created_by: str | None = None


class BarcodeBatchCreate(_Base):
    batch_type: str
    bag_type: str | None = None
    prepend_text: str | None = None
    range_start: int | None = None
    range_end: int | None = None
    copies: int = 1
    generated_by: str | None = None
    file_url: str | None = None


class BarcodeBatchUpdate(_Base):
    batch_type: str | None = None
    bag_type: str | None = None
    prepend_text: str | None = None
    range_start: int | None = None
    range_end: int | None = None
    copies: int | None = None
    file_url: str | None = None


class LabelJobCreate(_Base):
    donor_id: str | None = None
    component_type: str | None = None
    mode: str = "single"
    file_url: str | None = None


class LabelJobUpdate(_Base):
    donor_id: str | None = None
    component_type: str | None = None
    mode: str | None = None
    file_url: str | None = None


class ReservationCreate(_Base):
    id_range: str
    name: str | None = None
    date: Date | None = None


class ReservationUpdate(_Base):
    id_range: str | None = None
    name: str | None = None
    date: Date | None = None


class DownloadCreate(_Base):
    description: str
    generated_on: DateTime
    created_by: str | None = None
    file_url: str | None = None


class DownloadUpdate(_Base):
    description: str | None = None
    file_url: str | None = None


class FeedbackCreate(_Base):
    source: str
    overall: int = 0
    cleanliness: int = 0
    staff_behaviour: int = 0
    would_recommend: int = 0
    date: Date | None = None
    name: str | None = None
    contact: str | None = None
    comment: str | None = None
    action_taken: str | None = None


class FeedbackUpdate(_Base):
    overall: int | None = None
    cleanliness: int | None = None
    staff_behaviour: int | None = None
    would_recommend: int | None = None
    name: str | None = None
    contact: str | None = None
    comment: str | None = None
    action_taken: str | None = None


class CustomReportCreate(_Base):
    name: str
    type: str | None = None
    columns_json: list = []


class CustomReportUpdate(_Base):
    name: str | None = None
    type: str | None = None
    columns_json: list | None = None
