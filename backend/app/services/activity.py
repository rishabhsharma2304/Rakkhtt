"""Audit-trail helper. Records who did what for the per-module History feed."""
from sqlalchemy.orm import Session

from app.models.audit import ActivityLog
from app.models.identity import Organisation, User


def log_activity(
    db: Session,
    org: Organisation,
    user: User | None,
    action: str,
    *,
    module: str = "reception",
    entity_ref: str | None = None,
) -> None:
    """Append an audit entry. Does NOT commit — the caller commits as part of
    the same transaction so the log is consistent with the action it records."""
    db.add(
        ActivityLog(
            org_id=org.id,
            module=module,
            user_name=getattr(user, "name", None),
            action=action,
            entity_ref=entity_ref,
        )
    )
