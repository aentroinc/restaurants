"""Response-level PII redaction middleware.

Applies role-based redaction to JSON responses. Designed to be defensive:
- only modifies application/json responses
- never raises; on parse error, leaves body untouched
- skips streaming responses (SSE) by mime check
"""
from __future__ import annotations

import json

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.pii import redact_payload_for_role
from app.core.tenant_context import get_user


class PIIRedactionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        ct = response.headers.get("content-type", "")
        if "application/json" not in ct:
            return response
        if response.status_code >= 500:
            return response

        # Skip admin endpoints — they need raw data
        if request.url.path.startswith("/api/v1/admin/"):
            return response

        try:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            data = json.loads(body)
        except Exception:
            return response

        user = get_user()
        role = user.get("role") if user else None
        redacted = redact_payload_for_role(data, role)

        new_body = json.dumps(redacted, default=str, ensure_ascii=False).encode()
        # Preserve headers minus content-length
        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json",
        )
