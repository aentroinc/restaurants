"""Test that the FastAPI app can be imported and exposes expected routes."""
import pytest


def test_app_importable():
    from app.main import app
    assert app.title == "AENTRO Restaurant OS"


def test_critical_routes_registered():
    from app.main import app

    paths = {r.path for r in app.routes}
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/data-sources" in paths
    assert "/api/v1/data-sources/{source_id}/sync" in paths
    assert "/api/v1/workspace-engine/preview-formula" in paths
    assert "/api/v1/workspace-engine/run-cohort" in paths
    assert "/api/v1/ai-governance/budget" in paths
    assert "/api/v1/data-quality/run-reconciliation" in paths


def test_middleware_stack_registered():
    from app.main import app

    middleware_classes = {type(m.cls).__name__ if hasattr(m, "cls") else m.cls.__name__ for m in app.user_middleware}
    # MiddlewareSpec has .cls — it's the class. Names should include our three.
    names = {m.cls.__name__ for m in app.user_middleware}
    assert "TenantMiddleware" in names
    assert "AuditMiddleware" in names
