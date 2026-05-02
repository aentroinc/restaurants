import contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from jose import JWTError, jwt
from app.auth import SECRET_KEY, ALGORITHM, DEMO_TENANT_ID
from app.config import settings

tenant_var: contextvars.ContextVar[str] = contextvars.ContextVar("tenant_id", default=None)
user_var: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default=None)

PUBLIC_PATHS = {
    "/health",
    "/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/login",
    "/api/v1/auth/login/mfa",
    "/api/v1/auth/login_v2",
    "/api/v1/auth/mfa/verify_token",
    "/api/v1/identity-providers/oidc/callback",
}

PUBLIC_PREFIXES = (
    "/docs",
    "/redoc",
    "/api/v1/identity-providers/oidc/",
    "/api/v1/identity-providers/saml/",
    "/api/v1/sso/oidc/",
    "/api/v1/sso/saml/",
    "/scim/v2/",
)


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        is_public = path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES)

        strict = getattr(settings, "STRICT_AUTH", False)
        auth = request.headers.get("authorization", "")
        tenant_id = None
        user_id = None

        if auth.startswith("Bearer "):
            token = auth[7:]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                tenant_id = payload.get("tenant_id")
                user_id = payload.get("sub")
            except JWTError:
                if strict and not is_public:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid or expired token"},
                    )

        if tenant_id is None:
            if strict and not is_public:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required"},
                )
            tenant_id = DEMO_TENANT_ID

        tenant_var.set(tenant_id)
        user_var.set(user_id)
        request.state.tenant_id = tenant_id
        request.state.user_id = user_id

        return await call_next(request)


def get_tenant_id_from_context() -> str:
    return tenant_var.get() or DEMO_TENANT_ID


def get_user_id_from_context() -> str | None:
    return user_var.get()
