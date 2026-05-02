"""Audit logging middleware + helper.

Two integration points:
  - log_audit(): call from API handlers for explicit events
  - AuditMiddleware: wraps every mutating request and records the action

Async-safe: writes go through SyncSession on a daemon thread to avoid
blocking the request loop. Failures are logged but never raised.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.tenant_context import get_tenant_or_demo, get_user
from app.database import SyncSession
from app.models.audit import AuditLog


def _emit(
    tenant_id: str,
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
):
    def _write():
        session = SyncSession()
        try:
            log = AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                metadata_=metadata or {},
            )
            session.add(log)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    t = threading.Thread(target=_write, daemon=True)
    t.start()


def log_audit(
    tenant_id: str,
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
):
    _emit(tenant_id, user_id, action, resource_type, resource_id, metadata)


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PREFIXES = ("/health", "/ready", "/docs", "/redoc", "/openapi.json")


class AuditMiddleware(BaseHTTPMiddleware):
    """Records every mutating HTTP request.

    Captures method/path/status/duration/user/tenant; body is *not* logged
    by default (to avoid storing PII or huge payloads).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in SKIP_PREFIXES):
            return await call_next(request)

        method = request.method
        if method not in MUTATING_METHODS:
            return await call_next(request)

        started = datetime.now(timezone.utc)
        response = await call_next(request)
        duration_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000

        try:
            user = get_user()
            tenant_id = get_tenant_or_demo()
            user_id = user.get("sub") if user else None
            _emit(
                tenant_id=tenant_id,
                user_id=user_id,
                action=f"{method}",
                resource_type=path,
                resource_id=None,
                metadata={
                    "status": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "user_role": user.get("role") if user else None,
                },
            )
        except Exception:
            pass
        return response
