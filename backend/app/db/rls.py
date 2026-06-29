"""Row-Level Security tenant context.

RLS policies on the org-scoped tables gate rows on
``current_setting('app.current_org', true)::uuid``. This module puts the active
organisation into that GUC for the life of each request.

Mechanism — and why it's keyed on ``Session.info`` rather than a ContextVar:

* FastAPI runs each sync dependency and the path operation in *separate* threadpool
  tasks, each receiving a fresh copy of the request's context. A ``ContextVar`` set
  inside one dependency therefore does NOT reach the endpoint body. The one object
  genuinely shared across the whole request is the ``Session`` injected via ``Depends``,
  so we stash the org on ``session.info`` and read it back in the transaction event.

* ``set_config(..., is_local => true)`` (i.e. ``SET LOCAL``) is transaction-scoped, so
  it is safe under connection pooling — it can never leak onto another tenant's request
  the way a session-level ``SET`` would. Because COMMIT clears it, and many endpoints do
  ``db.commit()`` then ``db.refresh(obj)`` (a SELECT in a fresh transaction), the
  ``after_begin`` listener re-applies it at the start of every transaction.
"""
from sqlalchemy import event, text

from app.db.session import SessionLocal

_INFO_KEY = "current_org"
_SET_ORG = text("SELECT set_config('app.current_org', :v, true)")


@event.listens_for(SessionLocal, "after_begin")
def _apply_org_on_begin(session, transaction, connection):
    """Re-assert the tenant GUC whenever a transaction starts (e.g. after the
    db.commit() + db.refresh() pattern, since SET LOCAL is cleared by COMMIT)."""
    org = session.info.get(_INFO_KEY)
    if org:
        # set_config takes a bind parameter (unlike SET ... = ...), so this is injection
        # safe. is_local=true → scoped to this transaction only.
        connection.execute(_SET_ORG, {"v": org})


def apply_org(db, org_id) -> None:
    """Bind ``org_id`` as the tenant context for this request's session.

    Records it on ``session.info`` (so every later transaction picks it up via the
    event) and applies it to the *already-open* transaction immediately, since the first
    transaction may have begun during auth before the org was known."""
    value = str(org_id)
    db.info[_INFO_KEY] = value
    db.execute(_SET_ORG, {"v": value})
