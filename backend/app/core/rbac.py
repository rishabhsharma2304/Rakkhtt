"""Role-based access control (Section 9).

Roles: admin / master_user (full), technical_supervisor (validate + discard + all
technician), technician (data entry on pipelines / QC / bags / donors / camps),
motivation (donor & camp outreach, recall, feedback), general (read everything +
reception). Reads are open to any authenticated user; writes are gated per resource.
"""
from fastapi import Depends, HTTPException

from app.core.deps import get_current_user
from app.models.identity import User

FULL = {"admin", "master_user"}
SUPERVISOR = FULL | {"technical_supervisor"}
TECH = SUPERVISOR | {"technician"}
OUTREACH = FULL | {"motivation"}
RECEPTION = TECH | {"general"}

# resource tag -> set of designations allowed to mutate it
WRITE_ROLES: dict[str, set[str]] = {
    # identity / config — master only
    "orgs": FULL,
    "staff": FULL,
    "settings": FULL,
    # data entry — technician and up
    "bags": TECH,
    "components": TECH,
    "qc": TECH,
    "store": TECH,
    "vehicles": TECH,
    "hospitals": TECH,
    "patients": TECH,
    "thalassemia": TECH,
    "therapeutic": TECH,
    "inquiries": TECH,
    # outreach
    "donors": TECH | {"motivation"},
    "donations": TECH | {"motivation"},
    "camps": TECH | {"motivation"},
    "feedback": OUTREACH,
    # reception
    "blood-requests": RECEPTION,
    "invoices": RECEPTION,
    # tools
    "barcodes": TECH,
    "labels": TECH,
    "reservations": TECH,
    "downloads": TECH,
    "custom-reports": SUPERVISOR,
    "custom-registers": SUPERVISOR,
}
DEFAULT_WRITE = TECH


def role_of(user: User) -> str:
    return "master_user" if user.is_master_user else user.designation


def require_write(resource: str):
    allowed = WRITE_ROLES.get(resource, DEFAULT_WRITE)

    def _dep(user: User = Depends(get_current_user)) -> User:
        if role_of(user) not in allowed:
            raise HTTPException(403, f"Your role ({role_of(user)}) cannot modify {resource}")
        return user

    return _dep


def require_roles(*roles: str):
    allowed = set(roles) | FULL

    def _dep(user: User = Depends(get_current_user)) -> User:
        if role_of(user) not in allowed:
            raise HTTPException(403, "Insufficient role for this action")
        return user

    return _dep
