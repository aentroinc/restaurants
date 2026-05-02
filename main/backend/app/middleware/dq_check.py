"""DataQualityCheckMiddleware.

Reads `DQ_BLOCKED_PATHS` env var (comma-separated `<path_prefix>:<dataset>:<mode>`)
and any in-memory policies registered via `register_policy()`.

For requests matching a configured prefix:
- mode='block' → if dataset has open critical/high issues → return 503
- mode='warn'  → request proceeds; response gets `X-DQ-Issues: <count>` header

Skip if the path is the metrics or docs route.
"""
from __future__ import annotations

import os
import json
import logging
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.auth import DEMO_TENANT_ID, SECRET_KEY, ALGORITHM
from app.database import async_session
from app.services.dq_enforcer import (
    DataQualityBlocked, check_dataset_health,
)

logger = logging.getLogger(__name__)


@dataclass
class DQPolicy:
    path_prefix: str
    dataset: str
    mode: str  # "block" | "warn"


_POLICIES: list[DQPolicy] = []


def register_policy(path_prefix: str, dataset: str, mode: str) -> DQPolicy:
    if mode not in ("block", "warn"):
        raise ValueError("mode must be 'block' or 'warn'")
    p = DQPolicy(path_prefix=path_prefix, dataset=dataset, mode=mode)
    # replace existing for same prefix
    for i, existing in enumerate(_POLICIES):
        if existing.path_prefix == path_prefix:
            _POLICIES[i] = p
            return p
    _POLICIES.append(p)
    return p


def remove_policy(path_prefix: str) -> bool:
    for i, p in enumerate(_POLICIES):
        if p.path_prefix == path_prefix:
            _POLICIES.pop(i)
            return True
    return False


def list_policies() -> list[DQPolicy]:
    return list(_POLICIES)


def _load_env_policies() -> list[DQPolicy]:
    raw = os.getenv("DQ_BLOCKED_PATHS", "").strip()
    if not raw:
        return []
    out: list[DQPolicy] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split(":")
        if len(parts) != 3:
            logger.warning("Skipping malformed DQ policy: %s", entry)
            continue
        prefix, dataset, mode = parts
        if mode not in ("block", "warn"):
            logger.warning("Skipping policy with bad mode: %s", entry)
            continue
        out.append(DQPolicy(path_prefix=prefix.strip(), dataset=dataset.strip(), mode=mode.strip()))
    return out


# load env on import
for _p in _load_env_policies():
    _POLICIES.append(_p)


def _resolve_tenant(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt, JWTError  # type: ignore
            try:
                payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
                return payload.get("tenant_id") or DEMO_TENANT_ID
            except JWTError:
                pass
        except ImportError:
            pass
    return DEMO_TENANT_ID


def _match(path: str) -> DQPolicy | None:
    for p in _POLICIES:
        if path.startswith(p.path_prefix):
            return p
    return None


SKIP_PREFIXES = ("/metrics", "/health", "/ready", "/docs", "/redoc", "/openapi.json")


class DataQualityCheckMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(s) for s in SKIP_PREFIXES):
            return await call_next(request)
        policy = _match(path)
        if policy is None:
            return await call_next(request)

        tenant_id = _resolve_tenant(request)
        try:
            async with async_session() as session:
                health = await check_dataset_health(session, tenant_id, policy.dataset)
        except Exception as e:
            logger.warning("DQ check failed (passing through): %s", e)
            return await call_next(request)

        if policy.mode == "block" and health.has_blocking:
            payload = {
                "errors": [{
                    "code": "data_quality_blocked",
                    "detail": f"Dataset '{policy.dataset}' is blocked by DQ policy",
                    "dataset": policy.dataset,
                    "critical": health.critical,
                    "high": health.high,
                }],
                "data": None,
                "meta": {},
            }
            return JSONResponse(
                payload, status_code=503,
                headers={
                    "X-DQ-Issues": str(health.critical + health.high),
                    "X-DQ-Mode": "block",
                    "X-DQ-Dataset": policy.dataset,
                },
            )

        response = await call_next(request)
        try:
            response.headers["X-DQ-Issues"] = str(health.total_open)
            response.headers["X-DQ-Mode"] = policy.mode
            response.headers["X-DQ-Dataset"] = policy.dataset
        except Exception:
            pass
        return response
