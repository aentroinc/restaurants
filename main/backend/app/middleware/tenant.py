import contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import JWTError, jwt
from app.auth import SECRET_KEY, ALGORITHM, DEMO_TENANT_ID

tenant_var: contextvars.ContextVar[str] = contextvars.ContextVar("tenant_id", default=None)

SKIP_PATHS = {"/health", "/ready", "/docs", "/redoc", "/openapi.json", "/api/v1/auth/login"}


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in SKIP_PATHS or path.startswith("/docs") or path.startswith("/redoc"):
            tenant_var.set(DEMO_TENANT_ID)
            return await call_next(request)

        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                tenant_var.set(payload.get("tenant_id", DEMO_TENANT_ID))
            except JWTError:
                tenant_var.set(DEMO_TENANT_ID)
        else:
            tenant_var.set(DEMO_TENANT_ID)

        return await call_next(request)


def get_tenant_id_from_context() -> str:
    return tenant_var.get() or DEMO_TENANT_ID
