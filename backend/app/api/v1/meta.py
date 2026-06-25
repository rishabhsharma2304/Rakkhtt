from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.deps import get_current_org
from app.models.identity import Organisation

router = APIRouter(tags=["meta"])


@router.get("/settings")
def get_settings_endpoint(org: Organisation = Depends(get_current_org)):
    """Org-level settings: details, blood pricing, compliance flags, customisations."""
    return {
        "brand": settings.BRAND_NAME,
        "org": {
            "id": str(org.id),
            "name": org.name,
            "license_no": org.license_no,
            "address": org.address,
            "contact": org.contact,
            "email": org.email,
            "website": org.website,
            "id_prefix": org.id_prefix,
            "billing_prefix": org.billing_prefix,
        },
        "blood_pricing": org.blood_pricing,
        "compliance_flags": org.compliance_flags,
        "customisations": org.settings,
    }
