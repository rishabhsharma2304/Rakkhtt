"""Generic org-scoped CRUD router factory.

Produces list (page/search/sort/filters) + get + create + update + soft-delete
for any SQLAlchemy model, keeping every module's REST surface consistent.
"""
import uuid
from typing import Any, Type

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_org, get_current_user
from app.core.rbac import require_write
from app.db.base import Base
from app.db.session import get_db
from app.models.identity import Organisation, User
from app.services.activity import log_activity

RESERVED_QS = {"page", "page_size", "search", "sort", "order"}


def serialize(obj: Base) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for col in obj.__table__.columns:  # type: ignore[attr-defined]
        val = getattr(obj, col.name)
        if isinstance(val, uuid.UUID):
            val = str(val)
        out[col.name] = val
    return out


def build_crud_router(
    *,
    model: Type[Base],
    prefix: str,
    tag: str,
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    search_fields: list[str] | None = None,
    default_sort: str = "created_at",
    default_order: str = "desc",
    activity_module: str | None = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])
    has_soft_delete = hasattr(model, "is_deleted")
    filterable = {c.name for c in model.__table__.columns}  # type: ignore[attr-defined]
    can_write = require_write(tag)

    @router.get("")
    def list_items(
        request: Request,
        page: int = Query(1, ge=1),
        page_size: int = Query(25, ge=1, le=500),
        search: str | None = None,
        sort: str = default_sort,
        order: str = default_order,
        db: Session = Depends(get_db),
        org: Organisation = Depends(get_current_org),
    ):
        stmt = select(model).where(model.org_id == org.id)
        if has_soft_delete:
            stmt = stmt.where(model.is_deleted.is_(False))

        # arbitrary ?field=value filters
        for key, value in request.query_params.items():
            if key in RESERVED_QS or key not in filterable or value == "":
                continue
            stmt = stmt.where(getattr(model, key) == value)

        if search and search_fields:
            like = f"%{search.lower()}%"
            clauses = [
                func.lower(cast(getattr(model, f), String)).like(like) for f in search_fields
            ]
            stmt = stmt.where(or_(*clauses))

        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        sort_col = getattr(model, sort, None) or getattr(model, default_sort)
        stmt = stmt.order_by(asc(sort_col) if order == "asc" else desc(sort_col))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        items = [serialize(o) for o in db.scalars(stmt).all()]
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    @router.get("/{item_id}")
    def get_item(
        item_id: uuid.UUID,
        db: Session = Depends(get_db),
        org: Organisation = Depends(get_current_org),
    ):
        obj = db.get(model, item_id)
        if obj is None or obj.org_id != org.id or (has_soft_delete and obj.is_deleted):
            raise HTTPException(404, f"{tag} not found")
        return serialize(obj)

    @router.post("", status_code=201)
    def create_item(
        payload: create_schema,  # type: ignore[valid-type]
        db: Session = Depends(get_db),
        org: Organisation = Depends(get_current_org),
        user: User = Depends(can_write),
    ):
        data = payload.model_dump(exclude_unset=True)
        obj = model(**data, org_id=org.id)
        db.add(obj)
        db.flush()
        if activity_module:
            label = getattr(obj, "name", None) or str(obj.id)
            date_str = f" ({getattr(obj, 'date', None)})" if hasattr(obj, "date") else ""
            log_activity(db, org, user, f"Added {label}{date_str} Camp",
                         module=activity_module, entity_ref=str(obj.id))
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.put("/{item_id}")
    @router.patch("/{item_id}")
    def update_item(
        item_id: uuid.UUID,
        payload: update_schema,  # type: ignore[valid-type]
        db: Session = Depends(get_db),
        org: Organisation = Depends(get_current_org),
        user: User = Depends(can_write),
    ):
        obj = db.get(model, item_id)
        if obj is None or obj.org_id != org.id or (has_soft_delete and obj.is_deleted):
            raise HTTPException(404, f"{tag} not found")
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        if activity_module:
            label = getattr(obj, "name", None) or str(obj.id)
            log_activity(db, org, user, f"Updated {label}",
                         module=activity_module, entity_ref=str(obj.id))
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.delete("/{item_id}", status_code=200)
    def delete_item(
        item_id: uuid.UUID,
        db: Session = Depends(get_db),
        org: Organisation = Depends(get_current_org),
        user: User = Depends(can_write),
    ):
        obj = db.get(model, item_id)
        if obj is None or obj.org_id != org.id:
            raise HTTPException(404, f"{tag} not found")
        if activity_module:
            label = getattr(obj, "name", None) or str(item_id)
            log_activity(db, org, user, f"Deleted {label}",
                         module=activity_module, entity_ref=str(item_id))
        if has_soft_delete:
            obj.is_deleted = True
        else:
            db.delete(obj)
        db.commit()
        return {"message": "deleted"}

    return router
