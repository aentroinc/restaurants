"""Prometheus metrics middleware.

Exports:
- aentro_requests_total{method, path, status} — request counter
- aentro_request_latency_seconds{method, path} — request latency histogram
- aentro_errors_total{method, path, status} — 5xx error counter
- aentro_ai_tokens_total{model, kind} — AI token consumption (input/output)
- aentro_ai_cost_usd_total{model} — estimated AI cost
- aentro_login_failures_total — login failures
- aentro_lockouts_total — account lockouts
- aentro_access_deny_total — RBAC denies
- aentro_pii_redactions_total — PII column-mask events
- aentro_db_connections_in_use — gauge
- aentro_pipeline_runs_total{status} — ingestion / pipeline runs

Soft-imports prometheus_client; if not installed, middleware is a no-op
and /metrics returns 503.
"""
from __future__ import annotations

import time
import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, PlainTextResponse

logger = logging.getLogger(__name__)

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, CollectorRegistry,
        CONTENT_TYPE_LATEST, generate_latest,
    )
    _PROM = True
except ImportError:
    _PROM = False
    CONTENT_TYPE_LATEST = "text/plain"
    generate_latest = None
    CollectorRegistry = None


# --- registry --------------------------------------------------------------
if _PROM:
    REGISTRY = CollectorRegistry()

    REQ_TOTAL = Counter(
        "aentro_requests_total", "Total HTTP requests",
        ["method", "path", "status"], registry=REGISTRY,
    )
    REQ_LATENCY = Histogram(
        "aentro_request_latency_seconds", "Request latency (s)",
        ["method", "path"],
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=REGISTRY,
    )
    ERRORS_TOTAL = Counter(
        "aentro_errors_total", "5xx HTTP errors",
        ["method", "path", "status"], registry=REGISTRY,
    )
    AI_TOKENS = Counter(
        "aentro_ai_tokens_total", "Anthropic tokens consumed",
        ["model", "kind"], registry=REGISTRY,
    )
    AI_COST = Counter(
        "aentro_ai_cost_usd_total", "Estimated AI cost USD",
        ["model"], registry=REGISTRY,
    )
    LOGIN_FAILS = Counter(
        "aentro_login_failures_total", "Login failures", [], registry=REGISTRY,
    )
    LOCKOUTS = Counter(
        "aentro_lockouts_total", "Account lockouts", [], registry=REGISTRY,
    )
    ACCESS_DENY = Counter(
        "aentro_access_deny_total", "RBAC denies", [], registry=REGISTRY,
    )
    PII_REDACT = Counter(
        "aentro_pii_redactions_total", "PII column-mask events", [], registry=REGISTRY,
    )
    DB_CONN_IN_USE = Gauge(
        "aentro_db_connections_in_use", "DB pool checkouts", [], registry=REGISTRY,
    )
    PIPELINE_RUNS = Counter(
        "aentro_pipeline_runs_total", "Ingestion/pipeline runs",
        ["status"], registry=REGISTRY,
    )
else:
    REQ_TOTAL = REQ_LATENCY = ERRORS_TOTAL = AI_TOKENS = AI_COST = None
    LOGIN_FAILS = LOCKOUTS = ACCESS_DENY = PII_REDACT = None
    DB_CONN_IN_USE = PIPELINE_RUNS = None
    REGISTRY = None


# --- helpers (callable from anywhere) --------------------------------------
def record_ai_tokens(model: str, input_tokens: int = 0, output_tokens: int = 0):
    if not _PROM:
        return
    if input_tokens:
        AI_TOKENS.labels(model=model, kind="input").inc(input_tokens)
    if output_tokens:
        AI_TOKENS.labels(model=model, kind="output").inc(output_tokens)
    # rough $/MTok estimates for sonnet/opus class models
    rate_in = 3.0 / 1_000_000
    rate_out = 15.0 / 1_000_000
    AI_COST.labels(model=model).inc(input_tokens * rate_in + output_tokens * rate_out)


def inc_login_failure():
    if _PROM:
        LOGIN_FAILS.inc()


def inc_lockout():
    if _PROM:
        LOCKOUTS.inc()


def inc_access_deny(resource: str | None = None, action: str | None = None):
    """Record an RBAC deny. resource/action are accepted for caller convenience
    but are not labels (label cardinality kept low for Prometheus)."""
    if _PROM:
        ACCESS_DENY.inc()


def inc_pii_redaction(n: int = 1):
    if _PROM:
        PII_REDACT.inc(n)


def inc_pipeline_run(status: str):
    if _PROM:
        PIPELINE_RUNS.labels(status=status).inc()


def set_db_connections(n: int):
    if _PROM:
        DB_CONN_IN_USE.set(n)


# --- path normalization ----------------------------------------------------
_UUID_RE = None


def _normalize_path(path: str) -> str:
    """Replace UUIDs / numeric ids with placeholders to keep cardinality low."""
    global _UUID_RE
    if _UUID_RE is None:
        import re
        _UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
    p = _UUID_RE.sub("{id}", path)
    parts = p.split("/")
    norm = []
    for part in parts:
        if part.isdigit():
            norm.append("{n}")
        else:
            norm.append(part)
    return "/".join(norm)


# --- middleware ------------------------------------------------------------
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _PROM:
            return await call_next(request)
        path = request.url.path
        if path == "/metrics":
            return await call_next(request)
        method = request.method
        norm = _normalize_path(path)
        start = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        except Exception:
            status = 500
            raise
        finally:
            dur = time.perf_counter() - start
            try:
                REQ_TOTAL.labels(method=method, path=norm, status=str(status)).inc()
                REQ_LATENCY.labels(method=method, path=norm).observe(dur)
                if status >= 500:
                    ERRORS_TOTAL.labels(method=method, path=norm, status=str(status)).inc()
            except Exception as e:
                logger.debug("metric record failed: %s", e)


# --- /metrics endpoint -----------------------------------------------------
async def metrics_endpoint(request: Request) -> Response:
    if not _PROM:
        return PlainTextResponse("prometheus_client not installed", status_code=503)
    try:
        # update DB pool gauge best-effort
        from app.database import engine as _async_engine
        pool = getattr(_async_engine.sync_engine.pool, "checkedout", None)
        if callable(pool):
            DB_CONN_IN_USE.set(pool())
    except Exception:
        pass
    output = generate_latest(REGISTRY)
    return Response(content=output, media_type=CONTENT_TYPE_LATEST)


def register_metrics(app) -> None:
    """Attach middleware + /metrics route. Idempotent."""
    if not _PROM:
        logger.warning("prometheus_client not installed; metrics disabled")
    app.add_middleware(MetricsMiddleware)
    app.add_route("/metrics", metrics_endpoint, methods=["GET"])
