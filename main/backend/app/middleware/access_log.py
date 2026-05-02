import uuid
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import JWTError, jwt
from app.auth import SECRET_KEY, ALGORITHM, DEMO_TENANT_ID
from app.database import async_session
from app.models.auth_enterprise import AccessLog

SKIP_PREFIXES = ("/health", "/ready", "/docs", "/redoc", "/openapi.json")
LOG_PREFIXES = ("/api/v1/",)


def _should_log(path: str) -> bool:
    for p in SKIP_PREFIXES:
        if path.startswith(p):
            return False
    for p in LOG_PREFIXES:
        if path.startswith(p):
            return True
    return False


def _infer_resource(path: str) -> str:
    parts = path.strip("/").split("/")
    if len(parts) >= 3:
        return parts[2]
    return "unknown"


def _infer_action(method: str) -> str:
    return {
        "GET": "read",
        "POST": "write",
        "PUT": "write",
        "PATCH": "write",
        "DELETE": "delete",
    }.get(method, "read")


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)

        if not _should_log(request.url.path):
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

        result = "allow" if response.status_code < 400 else "deny"

        try:
            async with async_session() as session:
                session.add(AccessLog(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    timestamp=datetime.now(timezone.utc),
                    method=request.method,
                    path=str(request.url.path),
                    resource=_infer_resource(request.url.path),
                    action=_infer_action(request.method),
                    object_ids=[],
                    columns_accessed=[],
                    result=result,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    request_id=request_id,
                ))
                await session.commit()
        except Exception:
            pass  # Don't break request on logging failure

        return response
