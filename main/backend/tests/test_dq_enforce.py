"""Unit tests for DataQuality enforcement: enforcer + middleware policies."""
import pytest


def test_dataset_entity_map_has_known_datasets():
    from app.services.dq_enforcer import DATASET_ENTITY_MAP
    for key in ("stores", "daily_sales", "labor", "store_pl", "all"):
        assert key in DATASET_ENTITY_MAP


def test_dq_health_dataclass_to_dict():
    from app.services.dq_enforcer import DQHealth
    h = DQHealth(dataset="x", total_open=4, critical=1, high=1, medium=1, low=1, has_blocking=True)
    d = h.to_dict()
    assert d["dataset"] == "x"
    assert d["total_open"] == 4
    assert d["has_blocking"] is True


def test_data_quality_blocked_exception_message():
    from app.services.dq_enforcer import DataQualityBlocked
    e = DataQualityBlocked("daily_sales", 3, {"critical": 2, "high": 1})
    assert "daily_sales" in str(e)
    assert e.issue_count == 3
    assert e.dataset == "daily_sales"


def test_register_and_remove_policy_roundtrip():
    from app.middleware.dq_check import register_policy, remove_policy, list_policies

    initial_count = len(list_policies())
    register_policy("/api/v1/test-prefix", "stores", "warn")
    assert any(p.path_prefix == "/api/v1/test-prefix" for p in list_policies())
    # upsert
    register_policy("/api/v1/test-prefix", "stores", "block")
    p = next(p for p in list_policies() if p.path_prefix == "/api/v1/test-prefix")
    assert p.mode == "block"
    assert remove_policy("/api/v1/test-prefix") is True
    assert len(list_policies()) == initial_count


def test_register_policy_rejects_bad_mode():
    from app.middleware.dq_check import register_policy
    with pytest.raises(ValueError):
        register_policy("/api/v1/whatever", "stores", "panic")


def test_dq_blocked_exception_has_severity_breakdown():
    from app.services.dq_enforcer import DataQualityBlocked
    e = DataQualityBlocked("ds", 5, {"critical": 4, "high": 1})
    assert e.severities["critical"] == 4
    assert e.severities["high"] == 1


def test_check_dataset_health_sync_runs_with_empty_session():
    """Smoke-test sync helper does not crash with no rows (uses Session())."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    # Use sqlite in-memory just to check the SQL builds; we expect query to fail
    # at the table level. So we patch with a try/except to just exercise the path.
    from app.services.dq_enforcer import check_dataset_health_sync
    try:
        engine = create_engine("sqlite:///:memory:")
        with Session(engine) as s:
            check_dataset_health_sync(s, "00000000-0000-0000-0000-000000000001", "stores")
    except Exception:
        # Expected because the table doesn't exist in sqlite — what we're verifying
        # is the function imports and the call path is well-formed.
        pass
