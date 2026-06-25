import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_org, get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.identity import Organisation, User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _org_brief(o: Organisation) -> dict:
    return {"id": str(o.id), "name": o.name, "id_prefix": o.id_prefix}


def _memberships(db: Session, user: User) -> list[dict]:
    # ASSUMPTION: for this multi-tenant demo every staff member may switch among all
    # (non-deleted) centres via the top-bar switcher. A production app would join a
    # user_org membership table here.
    orgs = db.scalars(
        select(Organisation).where(Organisation.is_deleted.is_(False)).order_by(Organisation.name)
    ).all()
    return [_org_brief(o) for o in orgs]


def _me_payload(db: Session, user: User, active_org_id: str | None) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "designation": user.designation,
        "role": "master_user" if user.is_master_user else user.designation,
        "is_master_user": user.is_master_user,
        "active_org_id": active_org_id or str(user.org_id),
        "memberships": _memberships(db, user),
    }


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email, User.is_deleted.is_(False)))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    token = create_access_token(str(user.id), str(user.org_id))
    return TokenOut(access_token=token)


@router.post("/refresh", response_model=TokenOut)
def refresh(user: User = Depends(get_current_user)):
    active = getattr(user, "_active_org_id", None) or str(user.org_id)
    return TokenOut(access_token=create_access_token(str(user.id), str(active)))


@router.get("/me")
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    active = getattr(user, "_active_org_id", None)
    return _me_payload(db, user, active)


@router.post("/switch-org/{org_id}", response_model=TokenOut)
def switch_org(org_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org = db.get(Organisation, org_id)
    if org is None or org.is_deleted:
        raise HTTPException(404, "Organisation not found")
    return TokenOut(access_token=create_access_token(str(user.id), str(org.id)))
