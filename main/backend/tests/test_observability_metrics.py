"""Unit tests for observability metrics + endpoints."""
import pytest


def test_metrics_module_imports():
    from app.middleware import metrics
    assert hasattr(metrics, "MetricsMiddleware")
    assert hasattr(metrics, "metrics_endpoint")
    assert hasattr(metrics, "register_metrics")


def test_helper_functions_callable_without_prom_client():
    """Helpers are no-ops when prometheus_client is not installed; they
    must never raise regardless of install state."""
    from app.middleware.metrics import (
        record_ai_tokens, inc_login_failure, inc_lockout,
        inc_access_deny, inc_pii_redaction, inc_pipeline_run, set_db_connections,
    )
    # None of these should raise
    record_ai_tokens("claude-3-5-sonnet", 100, 50)
    inc_login_failure()
    inc_lockout()
    inc_access_deny()
    inc_pii_redaction(2)
    inc_pipeline_run("ok")
    set_db_connections(7)


def test_normalize_path_replaces_uuids_and_numbers():
    from app.middleware.metrics import _normalize_path
    p = _normalize_path("/api/v1/stores/00000000-0000-0000-0000-000000000001/kpi/123")
    assert "{id}" in p
    assert "{n}" in p


def test_observability_init_returns_status_dict():
    from app.observability import init_observability
    # OTEL_ENABLED defaults to False → all instrumentations should be False
    status = init_observability(app=None, engine=None)
    assert "otel_enabled" in status
    assert "fastapi" in status
    assert "sqlalchemy" in status
    assert "httpx" in status


def test_setup_observability_existing_function_unchanged():
    """The original setup_observability(app) entry point still exists."""
    from app.observability import setup_observability
    assert callable(setup_observability)


@pytest.mark.asyncio
async def test_metrics_endpoint_returns_response_or_503():
    """If prometheus_client is installed, /metrics returns 200 text/plain.
    If not, 503. Either is acceptable."""
    from starlette.requests import Request
    from app.middleware.metrics import metrics_endpoint, _PROM
    # Build a minimal scope
    scope = {"type": "http", "method": "GET", "path": "/metrics", "headers": []}
    req = Request(scope)
    resp = await metrics_endpoint(req)
    if _PROM:
        assert resp.status_code == 200
    else:
        assert resp.status_code == 503


def test_slo_module_imports():
    from app.api.v1 import observability as obs_api
    assert hasattr(obs_api, "router")
    assert hasattr(obs_api, "slo")
    assert hasattr(obs_api, "health")


def test_observability_router_paths():
    from app.api.v1.observability import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/observability/slo" in paths
    assert "/api/v1/observability/health" in paths
