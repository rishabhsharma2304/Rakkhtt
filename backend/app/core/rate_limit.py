from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance. Imported by main.py to register state + error handler,
# and by routers to apply per-endpoint limits.
limiter = Limiter(key_func=get_remote_address)
