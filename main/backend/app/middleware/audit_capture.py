"""AuditCaptureMiddleware — automatically writes an AuditLog row for every
mutation (POST / PUT / PATCH / DELETE) on the /api/v1/* surface.

Read operations are covered by AccessLogMiddleware. AuditLog is the
'business action' log used by compliance / SOC2 review.
"""
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import JWTError, jwt

from app.auth import SECRET_KEY, ALGORITHM, DEMO_TENANT_ID
from app.middleware.audit import log_audit


WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PREFIXES = (
    "/api/v1/auth/login",
    "/api/v1/auth/login/mfa",
    "/api/v1/ai-chat/chat",  # high volume, logged in AIQueryLog separately
)


def _resource_action(method: str, path: str) -> tuple[str, str]:
    parts = [p for p in path.strip("/").split("/") if p]
    resource = parts[2] if len(parts) >= 3 else "unknown"
    action_map = {
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }
    return resource, action_map.get(method, "write")


class AuditCaptureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method not in WRITE_METHODS:
            return response
        path = request.url.path
        if not path.startswith("/api/v1/"):
            return response
        if any(path.startswith(p) for p in SKIP_PREFIXES):
            return response
        if response.status_code >= 400:
            return response

        tenant_id = DEMO_TENANT_ID
        user_id = None
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
                tenant_id = payload.get("tenant_id", DEMO_TENANT_ID)
                user_id = payload.get("sub")
            except JWTError:
                pass

        resource, action = _resource_action(request.method, path)

        # Resource id is parts[3] when present, e.g. /api/v1/stores/{id}
        parts = [p for p in path.strip("/").split("/") if p]
        resource_id = parts[3] if len(parts) >= 4 and len(parts[3]) >= 8 else None

        try:
            log_audit(
                tenant_id=str(tenant_id),
                user_id=str(user_id) if user_id else None,
                action=action,
                resource_type=resource,
                resource_id=resource_id,
                metadata={
                    "method": request.method,
                    "path": path,
                    "status_code": response.status_code,
                },
            )
        except Exception:
            pass

        return response
