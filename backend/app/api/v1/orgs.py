import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.auth import _is_member
from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_user, require_master_user
from app.db.session import get_db
from app.models.identity import Organisation, User, UserOrg
from app.schemas.entities import OrgCreate, OrgUpdate

router = APIRouter(prefix="/orgs", tags=["orgs"])


def _member_org_ids(db: Session, user: User) -> set[uuid.UUID]:
    """The centres the caller may see/act in: their home org plus explicit memberships."""
    return {user.org_id} | set(
        db.scalars(select(UserOrg.org_id).where(UserOrg.user_id == user.id)).all()
    )


@router.get("")
def list_orgs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Only the organisations the caller is a member of — never the whole system.
    Returns full records (the Directory table + edit form need every field)."""
    org_ids = _member_org_ids(db, user)
    orgs = db.scalars(
        select(Organisation)
        .where(Organisation.id.in_(org_ids), Organisation.is_deleted.is_(False))
        .order_by(Organisation.name)
    ).all()
    items = [serialize(o) for o in orgs]
    return {"items": items, "total": len(items), "page": 1, "page_size": len(items)}


@router.get("/{org_id}")
def get_org(org_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    o = db.get(Organisation, org_id)
    # Same response whether the org is absent or simply not the caller's — don't let
    # an outsider distinguish "no such centre" from "not your centre".
    if o is None or o.is_deleted or not _is_member(db, user, o.id):
        raise HTTPException(404, "Organisation not found")
    return serialize(o)


@router.post("", status_code=201)
def create_org(payload: OrgCreate, db: Session = Depends(get_db), user: User = Depends(require_master_user)):
    """Create a sister centre. The creating master user is enrolled as a member so the
    new org shows up in their switcher (and is never an orphan only they can't reach)."""
    o = Organisation(**payload.model_dump())
    db.add(o)
    db.flush()
    db.add(UserOrg(user_id=user.id, org_id=o.id))
    db.commit()
    db.refresh(o)
    return serialize(o)


@router.put("/{org_id}")
@router.patch("/{org_id}")
def update_org(
    org_id: uuid.UUID,
    payload: OrgUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_master_user),
):
    o = db.get(Organisation, org_id)
    # A master user may only edit a centre they belong to — the role check alone is not
    # enough, or a master of centre A could rewrite centre B.
    if o is None or o.is_deleted or not _is_member(db, user, o.id):
        raise HTTPException(404, "Organisation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return serialize(o)
