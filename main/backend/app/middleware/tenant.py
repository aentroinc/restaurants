"""Tenant context middleware.

Extracts tenant_id and full user payload from JWT and binds them to context
vars accessible via app.core.tenant_context.

When STRICT_TENANT_MODE=True, requests without a valid bearer token to any
non-skip path receive HTTP 401.
"""
from __future__ import annotations

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.auth import ALGORITHM, DEMO_TENANT_ID, SECRET_KEY
from app.config import settings
from app.core.tenant_context import set_tenant, set_user

SKIP_PATHS = {
    "/health",
    "/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
}

# Backwards-compat re-export for legacy imports
import contextvars as _ctx
tenant_var: _ctx.ContextVar[str | None] = _ctx.ContextVar("tenant_id_legacy", default=None)


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        is_skipped = path in SKIP_PATHS or any(
            path.startswith(p) for p in ("/docs", "/redoc")
        )

        auth = request.headers.get("authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else None

        payload: dict | None = None
        if token:
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            except JWTError:
                payload = None

        if payload:
            set_tenant(payload.get("tenant_id", DEMO_TENANT_ID))
            set_user(payload)
            tenant_var.set(payload.get("tenant_id", DEMO_TENANT_ID))
        else:
            if is_skipped:
                set_tenant(DEMO_TENANT_ID)
                set_user(None)
                tenant_var.set(DEMO_TENANT_ID)
            elif settings.STRICT_TENANT_MODE:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required (strict tenant mode)"},
                )
            else:
                # Demo mode: allow anonymous access bound to DEMO tenant
                set_tenant(DEMO_TENANT_ID)
                set_user(None)
                tenant_var.set(DEMO_TENANT_ID)

        return await call_next(request)


def get_tenant_id_from_context() -> str:
    from app.core.tenant_context import get_tenant_or_demo
    return get_tenant_or_demo()
