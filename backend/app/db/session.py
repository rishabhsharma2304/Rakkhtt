from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Runtime engine used by request handlers. When APP_DATABASE_URL points at the
# restricted rakkhtt_app role, Row-Level Security is enforced for these connections;
# otherwise it falls back to the privileged URL (RLS present but owner-bypassed).
engine = create_engine(
    settings.APP_DATABASE_URL or settings.DATABASE_URL, pool_pre_ping=True, future=True
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)

# Privileged engine for migrations-adjacent / admin work (seeds). Always the owner
# connection so DDL and cross-tenant bulk operations bypass RLS.
admin_engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
AdminSessionLocal = sessionmaker(
    bind=admin_engine, autocommit=False, autoflush=False, class_=Session
)


def get_db() -> Generator[Session, None, None]:
    # Importing rls here (not at module top) registers the RLS after_begin event while
    # avoiding a circular import — rls imports SessionLocal from this module. The tenant
    # GUC is stashed on session.info and is SET LOCAL, so it dies with the session /
    # transaction; nothing to clear on the way out.
    import app.db.rls  # noqa: F401

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
