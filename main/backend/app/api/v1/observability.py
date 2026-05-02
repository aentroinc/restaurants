"""Observability API — SLO + extended health (DB / Anthropic / Vault)."""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.common import APIResponse

router = APIRouter(prefix="/api/v1/observability", tags=["observability"])


# --- SLO targets (defaults; override via env) ---
SLO_AVAILABILITY_TARGET = float(os.getenv("SLO_AVAILABILITY", "0.995"))   # 99.5%
SLO_LATENCY_P95_MS = float(os.getenv("SLO_LATENCY_P95_MS", "500"))
SLO_AI_DAILY_BUDGET_USD = float(os.getenv("SLO_AI_DAILY_BUDGET_USD", "50"))


def _read_metric_counter(metric, label_filter: dict | None = None) -> float:
    """Best-effort sum across labels for a prometheus_client Counter."""
    if metric is None:
        return 0.0
    total = 0.0
    try:
        for sample in metric.collect():
            for s in sample.samples:
                if not s.name.endswith("_total"):
                    continue
                if label_filter:
                    if not all(s.labels.get(k) == v for k, v in label_filter.items()):
                        continue
                total += s.value
    except Exception:
        return 0.0
    return total


def _histogram_quantile(metric, q: float) -> float:
    """Approximate quantile from prometheus_client Histogram buckets."""
    if metric is None:
        return 0.0
    try:
        # Build merged bucket counts across labels
        bucket_totals: dict[float, float] = {}
        total_count = 0.0
        for sample in metric.collect():
            for s in sample.samples:
                if s.name.endswith("_bucket"):
                    le = s.labels.get("le")
                    if le is None:
                        continue
                    le_f = float("inf") if le == "+Inf" else float(le)
                    bucket_totals[le_f] = bucket_totals.get(le_f, 0.0) + s.value
                elif s.name.endswith("_count"):
                    total_count += s.value
        if total_count <= 0:
            return 0.0
        target = total_count * q
        for le in sorted(bucket_totals.keys()):
            if bucket_totals[le] >= target:
                return le
        return 0.0
    except Exception:
        return 0.0


@router.get("/slo", response_model=APIResponse[dict])
async def slo():
    from app.middleware.metrics import (
        REQ_TOTAL, REQ_LATENCY, ERRORS_TOTAL, AI_COST, _PROM,
    )

    if not _PROM:
        return APIResponse(data={"enabled": False, "reason": "prometheus_client not installed"})

    total_req = _read_metric_counter(REQ_TOTAL)
    total_err = _read_metric_counter(ERRORS_TOTAL)
    success_rate = 1.0 if total_req == 0 else (total_req - total_err) / total_req

    p50 = _histogram_quantile(REQ_LATENCY, 0.5) * 1000
    p95 = _histogram_quantile(REQ_LATENCY, 0.95) * 1000
    p99 = _histogram_quantile(REQ_LATENCY, 0.99) * 1000

    ai_cost = _read_metric_counter(AI_COST)

    slos = [
        {
            "name": "availability",
            "target": SLO_AVAILABILITY_TARGET,
            "actual": round(success_rate, 6),
            "status": "ok" if success_rate >= SLO_AVAILABILITY_TARGET else "breach",
        },
        {
            "name": "latency_p95_ms",
            "target": SLO_LATENCY_P95_MS,
            "actual": round(p95, 2),
            "status": "ok" if p95 <= SLO_LATENCY_P95_MS else "breach",
        },
        {
            "name": "ai_cost_daily_usd",
            "target": SLO_AI_DAILY_BUDGET_USD,
            "actual": round(ai_cost, 4),
            "status": "ok" if ai_cost <= SLO_AI_DAILY_BUDGET_USD else "breach",
        },
    ]

    return APIResponse(data={
        "enabled": True,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {"requests": total_req, "errors": total_err},
        "latency_ms": {"p50": round(p50, 2), "p95": round(p95, 2), "p99": round(p99, 2)},
        "ai_cost_usd": round(ai_cost, 4),
        "slos": slos,
        "overall_status": "ok" if all(s["status"] == "ok" for s in slos) else "breach",
    })


async def _check_db(db: AsyncSession) -> dict:
    t0 = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        return {"name": "database", "status": "ok", "latency_ms": round((time.perf_counter() - t0) * 1000, 2)}
    except Exception as e:
        return {"name": "database", "status": "error", "error": str(e)[:200]}


def _check_anthropic() -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {"name": "anthropic", "status": "not_configured"}
    # Don't actually call API on every health check; just confirm key shape.
    key = settings.ANTHROPIC_API_KEY
    valid = key.startswith("sk-ant-") and len(key) > 20
    return {"name": "anthropic", "status": "ok" if valid else "misconfigured", "key_present": True}


def _check_vault() -> dict:
    if settings.SECRETS_BACKEND != "vault":
        return {"name": "vault", "status": "not_in_use", "backend": settings.SECRETS_BACKEND}
    if not settings.VAULT_ADDR or not settings.VAULT_TOKEN:
        return {"name": "vault", "status": "misconfigured"}
    try:
        import hvac  # type: ignore
        client = hvac.Client(url=settings.VAULT_ADDR, token=settings.VAULT_TOKEN)
        if client.is_authenticated():
            return {"name": "vault", "status": "ok"}
        return {"name": "vault", "status": "unauthenticated"}
    except Exception as e:
        return {"name": "vault", "status": "error", "error": str(e)[:200]}


@router.get("/health", response_model=APIResponse[dict])
async def health(db: AsyncSession = Depends(get_db)):
    deps = [
        await _check_db(db),
        _check_anthropic(),
        _check_vault(),
    ]
    bad = [d for d in deps if d["status"] not in ("ok", "not_in_use", "not_configured")]
    overall = "ok" if not bad else "degraded"
    return APIResponse(data={
        "status": overall,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "service": settings.OTEL_SERVICE_NAME,
        "environment": settings.ENVIRONMENT,
        "dependencies": deps,
    })
