"""Structured logging setup.

Configures structlog to emit one JSON object per line to stdout so the Docker
log driver (and any downstream log shipper) gets machine-parseable records.
The stdlib ``logging`` module is routed through structlog as well, so logs from
uvicorn, sqlalchemy, and third-party libs share the same format and level.
"""

import logging
import sys

import structlog

_configured = False


def configure_logging(level: str = "INFO", json: bool = True) -> None:
    """Configure structlog + stdlib logging. Idempotent."""
    global _configured
    if _configured:
        return

    log_level = getattr(logging, level.upper(), logging.INFO)

    # Processors shared between structlog-native and stdlib log records.
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer = (
        structlog.processors.JSONRenderer()
        if json
        else structlog.dev.ConsoleRenderer()
    )

    # Route stdlib logging (uvicorn, sqlalchemy, ...) through structlog.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(log_level)

    # uvicorn installs its own handlers; clear them so records propagate to root
    # and aren't double-printed in a different format.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers.clear()
        lg.propagate = True

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )

    _configured = True


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
