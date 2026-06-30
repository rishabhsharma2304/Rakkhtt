from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings


def client_ip(request: Request) -> str:
    """Identify the rate-limit subject.

    Default: the socket peer (``get_remote_address``). When RATE_LIMIT_TRUST_FORWARDED
    is enabled — i.e. a trusted reverse proxy fronts the app and sets X-Forwarded-For —
    use the left-most forwarded address (the original client) so per-IP limits apply to
    real users instead of being collapsed onto the proxy's address.

    Only enable the flag behind a proxy you control; otherwise X-Forwarded-For is
    attacker-controlled and the limit becomes trivially bypassable.
    """
    if settings.RATE_LIMIT_TRUST_FORWARDED:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            first = fwd.split(",")[0].strip()
            if first:
                return first
    return get_remote_address(request)


# Shared limiter instance. Imported by main.py to register state + error handler,
# and by routers to apply per-endpoint limits.
limiter = Limiter(key_func=client_ip)
