"""Builds every generic CRUD router from the model + schema registry."""
from fastapi import APIRouter

from app.api.v1.crud_factory import build_crud_router
from app.models import camp, directory, inventory, lab, reception
from app.schemas import entities as s


def _spec(model, prefix, tag, create, update, search=None, sort="created_at", order="desc"):
    return dict(model=model, prefix=prefix, tag=tag, create_schema=create,
                update_schema=update, search_fields=search, default_sort=sort, default_order=order)


SPECS = [
    _spec(camp.Vehicle, "/vehicles", "vehicles", s.VehicleCreate, s.VehicleUpdate, ["name", "vehicle_no"]),
    _spec(camp.Camp, "/camps", "camps", s.CampCreate, s.CampUpdate, ["name", "location_text", "organiser"], "date"),
    _spec(camp.Donor, "/donors", "donors", s.DonorCreate, s.DonorUpdate, ["name", "contact", "blood_group", "address"]),
    _spec(camp.Donation, "/donations", "donations", s.DonationCreate, s.DonationUpdate, None, "date"),
    _spec(lab.BloodBag, "/bags", "bags", s.BagCreate, s.BagUpdate, ["bag_no", "bag_type", "segment_no"], "collection_date"),
    _spec(lab.Component, "/components", "components", s.ComponentCreate, s.ComponentUpdate, ["type", "blood_group"]),
    _spec(inventory.StoreItem, "/store-items", "store", s.StoreItemCreate, s.StoreItemUpdate, ["name", "supplier", "item_type"]),
    _spec(inventory.QCRecord, "/qc", "qc", s.QCCreate, s.QCUpdate, ["name", "qc_type", "done_by"], "date"),
    _spec(directory.Hospital, "/hospitals", "hospitals", s.HospitalCreate, s.HospitalUpdate, ["name", "address"]),
    _spec(directory.Patient, "/patients", "patients", s.PatientCreate, s.PatientUpdate, ["name", "contact"]),
    _spec(directory.ThalassemiaPatient, "/thalassemia-patients", "thalassemia", s.ThalassemiaCreate, s.ThalassemiaUpdate, ["name", "address"]),
    _spec(directory.TherapeuticDonation, "/therapeutic-donations", "therapeutic", s.TherapeuticCreate, s.TherapeuticUpdate, ["name", "doctor"]),
    _spec(directory.BloodInquiry, "/blood-inquiries", "inquiries", s.InquiryCreate, s.InquiryUpdate, ["patient_name", "blood_group", "component"]),
    _spec(reception.BloodRequest, "/blood-requests", "blood-requests", s.RequestCreate, s.RequestUpdate, ["request_id", "patient_name", "component", "blood_group"], "date"),
    _spec(reception.Invoice, "/invoices", "invoices", s.InvoiceCreate, s.InvoiceUpdate, ["invoice_no", "name"], "date"),
    _spec(reception.BarcodeBatch, "/barcode-batches", "barcodes", s.BarcodeBatchCreate, s.BarcodeBatchUpdate, ["prepend_text", "batch_type"]),
    _spec(reception.LabelJob, "/label-jobs", "labels", s.LabelJobCreate, s.LabelJobUpdate, ["component_type", "mode"]),
    _spec(reception.Reservation, "/reservations", "reservations", s.ReservationCreate, s.ReservationUpdate, ["id_range", "name"]),
    _spec(reception.Download, "/downloads", "downloads", s.DownloadCreate, s.DownloadUpdate, ["description", "created_by"], "generated_on"),
    _spec(reception.Feedback, "/feedback", "feedback", s.FeedbackCreate, s.FeedbackUpdate, ["source", "comment"], "date"),
    _spec(reception.CustomReport, "/custom-reports", "custom-reports", s.CustomReportCreate, s.CustomReportUpdate, ["name", "type"]),
    _spec(reception.CustomRegister, "/custom-registers", "custom-registers", s.CustomReportCreate, s.CustomReportUpdate, ["name", "type"]),
]


def build_all() -> list[APIRouter]:
    return [build_crud_router(**spec) for spec in SPECS]
