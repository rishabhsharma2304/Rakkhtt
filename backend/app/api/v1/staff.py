import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.v1.crud_factory import serialize
from app.core.deps import get_current_org, require_master_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models.identity import Organisation, User
from app.schemas.entities import StaffCreate, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


def _ser(u: User) -> dict:
    d = serialize(u)
    d.pop("password_hash", None)
    return d


@router.get("")
def list_staff(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    search: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    org: Organisation = Depends(get_current_org),
):
    stmt = select(User).where(User.org_id == org.id, User.is_deleted.is_(False))
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.name).like(like),
                func.lower(cast(User.email, String)).like(like),
                func.lower(User.designation).like(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    sort_col = getattr(User, sort, User.created_at)
    stmt = stmt.order_by(asc(sort_col) if order == "asc" else desc(sort_col))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    return {
        "items": [_ser(u) for u in db.scalars(stmt).all()],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{user_id}")
def get_staff(user_id: uuid.UUID, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org)):
    u = db.get(User, user_id)
    if u is None or u.org_id != org.id or u.is_deleted:
        raise HTTPException(404, "Staff not found")
    return _ser(u)


@router.post("", status_code=201)
def create_staff(payload: StaffCreate, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), _: User = Depends(require_master_user)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(409, "Email already in use")
    data = payload.model_dump()
    pw = data.pop("password")
    u = User(**data, password_hash=hash_password(pw), org_id=org.id)
    db.add(u)
    db.commit()
    db.refresh(u)
    return _ser(u)


@router.put("/{user_id}")
@router.patch("/{user_id}")
def update_staff(user_id: uuid.UUID, payload: StaffUpdate, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), _: User = Depends(require_master_user)):
    u = db.get(User, user_id)
    if u is None or u.org_id != org.id or u.is_deleted:
        raise HTTPException(404, "Staff not found")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        u.password_hash = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return _ser(u)


@router.delete("/{user_id}")
def delete_staff(user_id: uuid.UUID, db: Session = Depends(get_db), org: Organisation = Depends(get_current_org), me: User = Depends(require_master_user)):
    u = db.get(User, user_id)
    if u is None or u.org_id != org.id:
        raise HTTPException(404, "Staff not found")
    if u.id == me.id:
        raise HTTPException(400, "You cannot delete yourself")
    u.is_deleted = True
    db.commit()
    return {"message": "deleted"}
