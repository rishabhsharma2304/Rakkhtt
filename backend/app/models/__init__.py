"""Import all models here so Alembic autogenerate and Base.metadata see them."""
from app.models.identity import Organisation, User  # noqa: F401
from app.models.camp import Vehicle, Camp, Donor, Donation  # noqa: F401
from app.models.lab import (  # noqa: F401
    BloodBag,
    Component,
    GroupingResult,
    TTIResult,
    PipelineStageRecord,
)
from app.models.inventory import StoreItem, QCRecord  # noqa: F401
from app.models.directory import (  # noqa: F401
    Hospital,
    Patient,
    ThalassemiaPatient,
    TherapeuticDonation,
    BloodInquiry,
)
from app.models.reception import (  # noqa: F401
    BloodRequest,
    Invoice,
    BarcodeBatch,
    LabelJob,
    Reservation,
    Download,
    Feedback,
    CustomReport,
    CustomRegister,
)
