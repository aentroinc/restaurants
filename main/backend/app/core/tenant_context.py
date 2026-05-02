"""Tenant scoping primitives shared by middleware, services, and DB session.

Two modes are supported via settings.STRICT_TENANT_MODE:
- False (default for demo / dev): unauthenticated requests get DEMO_TENANT_ID
- True  (production): unauthenticated requests are rejected upstream by the
  middleware, and any code path that calls require_tenant_strict() while no
  tenant has been set raises TenantContextNotSetError -> HTTP 500.
"""
from __future__ import annotations

import contextvars
from uuid import UUID

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"

_tenant_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "tenant_id", default=None
)
_user_var: contextvars.ContextVar[dict | None] = contextvars.ContextVar(
    "user_payload", default=None
)


class TenantContextNotSetError(RuntimeError):
    """Raised when tenant context is required but missing — fail closed."""


def set_tenant(tenant_id: str | UUID | None) -> None:
    _tenant_var.set(str(tenant_id) if tenant_id is not None else None)


def set_user(payload: dict | None) -> None:
    _user_var.set(payload)


def get_tenant() -> str | None:
    """Return the currently bound tenant id, or None if not set."""
    return _tenant_var.get()


def get_tenant_or_demo() -> str:
    """Return tenant id if set, otherwise the DEMO tenant id (lenient)."""
    return _tenant_var.get() or DEMO_TENANT_ID


def require_tenant_strict() -> str:
    """Return tenant id; raise if not set. Use in production paths."""
    tid = _tenant_var.get()
    if tid is None:
        raise TenantContextNotSetError(
            "Tenant context not set. Likely an unauthenticated request reached a "
            "tenant-scoped code path with strict mode enabled."
        )
    return tid


def get_user() -> dict | None:
    return _user_var.get()


def get_user_role() -> str | None:
    u = _user_var.get()
    return u.get("role") if u else None
