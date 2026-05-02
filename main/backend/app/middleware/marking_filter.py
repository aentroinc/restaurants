"""MarkingFilterMiddleware.

レスポンス JSON を marking ACL で deny=列削除 / mask=*** にフィルタする。
- 既存 column_mask.py の PII マスクの後段として動く（重ね掛け）。
- API 系パス (/api/v1/) のみ。docs / health はスキップ。
- パスから resource_type を推定する（例: /api/v1/stores → "store"）。
- evaluate_access はテナント + user_id + resource_type で行うため、
  tenant 解決は AccessLog と同じ方針で JWT から行う。
"""
from __future__ import annotations
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from jose import JWTError, jwt
from app.auth import SECRET_KEY, ALGORITHM, DEMO_TENANT_ID
from app.database import async_session

logger = logging.getLogger(__name__)

SKIP_PREFIXES = (
    "/metrics", "/health", "/ready", "/docs", "/redoc", "/openapi.json",
    # 自分自身を呼ぶと無限ループの恐れ
    "/api/v1/markings",
    # SSE / streaming は触らない
    "/api/v1/ai/chat",
)
ONLY_PREFIXES = ("/api/v1/",)


# パスセグメント → marking 上の resource_type
_RESOURCE_MAP = {
    "stores": "store",
    "store-pl": "store_pl",
    "employees": "employee",
    "labor": "labor",
    "haccp": "haccp",
    "executive": "kpi",
    "kpi-engine": "kpi",
    "kpi": "kpi",
    "franchise": "store_pl",
}


def _infer_resource_type(path: str) -> str | None:
    parts = path.strip("/").split("/")
    # /api/v1/<segment>/...
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        return _RESOURCE_MAP.get(parts[2])
    return None


def _resolve_auth(request: Request) -> tuple[str, str | None]:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
            return payload.get("tenant_id") or DEMO_TENANT_ID, payload.get("sub")
        except JWTError:
            pass
    return DEMO_TENANT_ID, None


async def _filter_payload(payload, tenant_id: str, user_id: str | None, resource_type: str):
    """marking_engine を使って payload を再帰フィルタ."""
    from app.services.marking_engine import filter_for_llm
    async with async_session() as session:
        return await filter_for_llm(session, tenant_id, user_id, resource_type, payload)


class MarkingFilterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(s) for s in SKIP_PREFIXES):
            return await call_next(request)
        if not any(path.startswith(p) for p in ONLY_PREFIXES):
            return await call_next(request)

        resource_type = _infer_resource_type(path)
        if not resource_type:
            return await call_next(request)

        response = await call_next(request)

        # JSON 以外はそのまま返す
        ctype = response.headers.get("content-type", "")
        if "application/json" not in ctype:
            return response
        if response.status_code >= 400:
            return response

        # body を集約
        body_bytes = b""
        try:
            async for chunk in response.body_iterator:
                body_bytes += chunk
        except Exception as e:
            logger.warning("MarkingFilter body read failed: %s", e)
            return response

        if not body_bytes:
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        try:
            data = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        tenant_id, user_id = _resolve_auth(request)

        try:
            filtered = await _filter_payload(data, tenant_id, user_id, resource_type)
        except Exception as e:
            logger.warning("MarkingFilter eval failed (passthrough): %s", e)
            filtered = data

        new_body = json.dumps(filtered, ensure_ascii=False, default=str).encode("utf-8")
        headers = dict(response.headers)
        # 元 content-length を上書き
        headers.pop("content-length", None)
        headers["x-marking-filtered"] = "1"
        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json",
        )
