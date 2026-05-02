"""IdempotencyMiddleware — `Idempotency-Key` ヘッダで POST を冪等化。

挙動:
  - POST のみ対象。GET/PUT/DELETE などはスルー。
  - `Idempotency-Key` ヘッダが無ければ通常通り処理。
  - 同じ key が 24h 以内に再送されたら、保存済みレスポンスを 200 で返す。
    レスポンスヘッダに `X-Idempotent-Replay: true` を付ける。
  - in-memory cache が一次キャッシュ。DB は複数 worker / 再起動越え用バックアップ。
  - 4xx/5xx は保存しない（リトライで成功する可能性があるため）。
  - keyの長さは 8〜64 文字、UUID 想定だが任意の英数+ハイフン可。

NOTE: ClockEvent には別途 `idempotency_key` カラムがあり、
そちらは「同 employee 60秒 ブロック + 同 key 重複は同 ClockEvent 返却」を
ハンドラ側で実装している。本ミドルウェアは汎用 POST 用の二段目防御。
"""
from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# in-memory cache: { key: (status_code, body_bytes, expires_at_ts) }
_CACHE: dict[str, tuple[int, bytes, float]] = {}
_TTL_SEC = 24 * 60 * 60  # 24h
_KEY_RE = re.compile(r"^[A-Za-z0-9_\-]{8,64}$")


def _now() -> float:
    return time.time()


def _purge_expired() -> None:
    now = _now()
    for k in [k for k, v in _CACHE.items() if v[2] < now]:
        _CACHE.pop(k, None)


async def _load_from_db(key: str) -> tuple[int, bytes] | None:
    """DB から過去レスポンスを引く（in-memory miss 時のフォールバック）。"""
    try:
        from app.database import async_session
        from app.models.idempotency import IdempotencyRecord
    except Exception:
        return None
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=_TTL_SEC)
    try:
        async with async_session() as db:
            res = await db.execute(
                select(IdempotencyRecord).where(
                    IdempotencyRecord.idempotency_key == key,
                    IdempotencyRecord.created_at >= cutoff,
                )
            )
            row = res.scalar_one_or_none()
            if row is None:
                return None
            return row.status_code, bytes(row.response_body)
    except Exception:
        return None


async def _save_to_db(
    key: str, method: str, path: str, status_code: int, body: bytes, tenant_id: str | None
) -> None:
    try:
        from app.database import async_session
        from app.models.idempotency import IdempotencyRecord
    except Exception:
        return
    try:
        async with async_session() as db:
            rec = IdempotencyRecord(
                idempotency_key=key,
                method=method,
                path=path[:255],
                status_code=status_code,
                response_body=body,
                tenant_id=tenant_id,
            )
            db.add(rec)
            try:
                await db.commit()
            except IntegrityError:
                # 並行リクエストで先に他 worker が書き込んだ場合は無視
                await db.rollback()
    except Exception:
        # ベストエフォート。DB 書き込み失敗は本リクエストを落とさない。
        pass


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """`Idempotency-Key` ヘッダ付き POST のレスポンスを 24h キャッシュ。"""

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        if request.method != "POST":
            return await call_next(request)
        key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
        if not key or not _KEY_RE.match(key):
            return await call_next(request)

        _purge_expired()

        # 1. in-memory hit
        hit = _CACHE.get(key)
        if hit and hit[2] >= _now():
            status, body, _ = hit
            return Response(
                content=body,
                status_code=status,
                media_type="application/json",
                headers={"X-Idempotent-Replay": "true"},
            )

        # 2. DB hit
        db_hit = await _load_from_db(key)
        if db_hit is not None:
            status, body = db_hit
            _CACHE[key] = (status, body, _now() + _TTL_SEC)
            return Response(
                content=body,
                status_code=status,
                media_type="application/json",
                headers={"X-Idempotent-Replay": "true"},
            )

        # 3. miss — 通常実行 + 成功時のみ保存
        response = await call_next(request)
        status_code = response.status_code
        if 200 <= status_code < 300:
            # call_next は基本 StreamingResponse を返すので iterate して再構築。
            body_bytes = b""
            iterator = getattr(response, "body_iterator", None)
            if iterator is not None:
                async for chunk in iterator:
                    if isinstance(chunk, str):
                        body_bytes += chunk.encode("utf-8")
                    else:
                        body_bytes += chunk
            else:
                # 通常 Response (body 属性) の場合
                raw = getattr(response, "body", b"")
                if isinstance(raw, str):
                    body_bytes = raw.encode("utf-8")
                else:
                    body_bytes = raw or b""
            _CACHE[key] = (status_code, body_bytes, _now() + _TTL_SEC)
            tenant_id = request.headers.get("x-tenant-id")
            await _save_to_db(key, request.method, request.url.path, status_code, body_bytes, tenant_id)
            new_resp = Response(
                content=body_bytes,
                status_code=status_code,
                media_type=response.media_type or "application/json",
                headers=dict(response.headers),
            )
            new_resp.headers["X-Idempotent-Stored"] = "true"
            return new_resp
        return response
