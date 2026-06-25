from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, meta, orgs, reception_actions, reports, staff, workflows
from app.api.v1.registry import build_all
from app.core.config import settings

app = FastAPI(title=f"{settings.BRAND_NAME} API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/v1")

# Core / custom routers
api.include_router(auth.router)
api.include_router(orgs.router)
api.include_router(staff.router)
api.include_router(workflows.router)
api.include_router(reception_actions.router)
api.include_router(reports.router)
api.include_router(meta.router)

# Generic CRUD routers (donors, camps, bags, components, store, requests, ...)
for r in build_all():
    api.include_router(r)

app.include_router(api)


@app.get("/health")
def health():
    return {"status": "ok", "brand": settings.BRAND_NAME}
