import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_user, require_master_user
from app.db.session import get_db
from app.models.identity import Organisation, User
from app.schemas.entities import OrgCreate, OrgUpdate

router = APIRouter(prefix="/orgs", tags=["orgs"])


@router.get("")
def list_orgs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orgs = db.scalars(
        select(Organisation).where(Organisation.is_deleted.is_(False)).order_by(Organisation.name)
    ).all()
    return {"items": [serialize(o) for o in orgs], "total": len(orgs), "page": 1, "page_size": len(orgs)}


@router.get("/{org_id}")
def get_org(org_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    o = db.get(Organisation, org_id)
    if o is None or o.is_deleted:
        raise HTTPException(404, "Organisation not found")
    return serialize(o)


@router.post("", status_code=201)
def create_org(payload: OrgCreate, db: Session = Depends(get_db), _: User = Depends(require_master_user)):
    o = Organisation(**payload.model_dump())
    db.add(o)
    db.commit()
    db.refresh(o)
    return serialize(o)


@router.put("/{org_id}")
@router.patch("/{org_id}")
def update_org(org_id: uuid.UUID, payload: OrgUpdate, db: Session = Depends(get_db), _: User = Depends(require_master_user)):
    o = db.get(Organisation, org_id)
    if o is None or o.is_deleted:
        raise HTTPException(404, "Organisation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return serialize(o)
