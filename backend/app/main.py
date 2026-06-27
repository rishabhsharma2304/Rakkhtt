import time
import uuid

import structlog
from fastapi import APIRouter, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1 import auth, meta, orgs, reception_actions, reports, staff, workflows
from app.api.v1.registry import build_all
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter

# Configure structured (JSON) logging to stdout before anything logs.
configure_logging(level=settings.LOG_LEVEL, json=settings.LOG_JSON)
logger = get_logger("app")

app = FastAPI(title=f"{settings.BRAND_NAME} API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Emit one structured record per request (method, path, status, duration_ms)
    and bind a request_id onto the context so every log line within a request is
    correlatable."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client=request.client.host if request.client else None,
        )
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception("request.error", duration_ms=duration_ms)
            structlog.contextvars.clear_contextvars()
            raise
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info("request", status=response.status_code, duration_ms=duration_ms)
        response.headers["x-request-id"] = request_id
        structlog.contextvars.clear_contextvars()
        return response


@app.on_event("startup")
def validate_environment() -> None:
    """Reject startup if required env vars are missing or hold insecure defaults."""
    settings.validate_runtime()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error", method=request.method, path=request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
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
