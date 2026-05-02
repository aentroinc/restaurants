"""Unit tests for the modules added in the pre-data-receive hardening pass."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200


def test_writeback_action_types_registered():
    from app.services.writeback_executor import list_action_types
    types = list_action_types()
    assert "task_create" in types
    assert "task_close" in types
    assert "kpi_target_update" in types
    assert "approval" in types


def test_ingestion_pipeline_stages():
    from app.services.ingestion_pipeline import STAGES
    assert STAGES == (
        "schema_map", "validate", "reconcile", "approve",
        "ingest", "qc", "archive", "notify",
    )


def test_role_fallback_admin_passes_all():
    from app.auth_rbac import ROLE_FALLBACK
    assert "*" in ROLE_FALLBACK["admin"]
    assert "read" in ROLE_FALLBACK["viewer"]
    assert "write" not in ROLE_FALLBACK["viewer"]


def test_secrets_encrypt_decrypt_roundtrip():
    from app.services.secrets import encrypt_value, decrypt_value
    plain = "secret-token-123"
    enc = encrypt_value(plain)
    assert enc != plain
    assert decrypt_value(enc) == plain


def test_observability_no_op_when_disabled():
    from app.observability import setup_observability
    # Should not raise even if OTEL deps not installed (default OTEL_ENABLED=False)
    setup_observability(app)


def test_tenant_middleware_imports():
    from app.middleware.tenant import (
        TenantMiddleware,
        get_tenant_id_from_context,
        get_user_id_from_context,
    )
    assert get_tenant_id_from_context() is not None


def test_audit_capture_middleware_imports():
    from app.middleware.audit_capture import AuditCaptureMiddleware, WRITE_METHODS
    assert "POST" in WRITE_METHODS
    assert "GET" not in WRITE_METHODS


def test_budget_target_model():
    from app.models.budget import BudgetTarget
    assert BudgetTarget.__tablename__ == "budget_targets"
    cols = {c.name for c in BudgetTarget.__table__.columns}
    assert {"target_sales", "target_cogs_rate", "target_labor_rate"} <= cols
