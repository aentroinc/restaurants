"""Line Check engine tests — pure-logic coverage of temperature NG and missing-photo
failure modes plus seed payload sanity. DB-bound flows are exercised via the
existing ASGI smoke tests (test_api.py) once a DB is wired in CI.
"""
from __future__ import annotations

import pytest


# ---- Seed payload ----

def test_seed_payload_counts_match_spec():
    from app.services.line_check_seeds import (
        SUKIYA_OPENING_ITEMS, SUKIYA_CLOSING_ITEMS, SUKIYA_4H_ITEMS,
    )
    assert len(SUKIYA_OPENING_ITEMS) == 12
    assert len(SUKIYA_CLOSING_ITEMS) == 10
    assert len(SUKIYA_4H_ITEMS) == 8


def test_seed_opening_has_temperature_items():
    from app.services.line_check_seeds import SUKIYA_OPENING_ITEMS
    temp_items = [i for i in SUKIYA_OPENING_ITEMS if i.get("requires_temperature")]
    assert len(temp_items) >= 3
    fridge = next(i for i in temp_items if "冷蔵" in i["text"])
    assert fridge["max_temp"] == 5


# ---- Geofence helper ----

def test_haversine_zero_for_same_point():
    from app.services.line_check_engine import _haversine_m
    assert _haversine_m(35.6895, 139.6917, 35.6895, 139.6917) == pytest.approx(0.0, abs=1e-6)


def test_haversine_tokyo_to_osaka_about_400km():
    from app.services.line_check_engine import _haversine_m
    d = _haversine_m(35.6895, 139.6917, 34.6937, 135.5023)
    assert 380000 < d < 420000


def test_geofence_radius_constant_is_reasonable():
    from app.services.line_check_engine import GEOFENCE_RADIUS_M
    assert 50 <= GEOFENCE_RADIUS_M <= 1000


# ---- Pure NG-detection logic ----

def test_temperature_above_max_is_ng():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=True, requires_photo=False,
        min_temp=0, max_temp=5, value_number=12.0, photo_url=None,
    )
    assert ok is False
    assert reason and "上限" in reason


def test_temperature_below_min_is_ng():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=True, requires_photo=False,
        min_temp=70, max_temp=95, value_number=55.0, photo_url=None,
    )
    assert ok is False
    assert reason and "下限" in reason


def test_temperature_in_range_is_ok():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=True, requires_photo=False,
        min_temp=0, max_temp=5, value_number=3.0, photo_url=None,
    )
    assert ok is True
    assert reason is None


def test_temperature_required_but_missing_is_ng():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=True, requires_photo=False,
        min_temp=0, max_temp=5, value_number=None, photo_url=None,
    )
    assert ok is False
    assert reason and "温度" in reason


def test_missing_photo_is_ng():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=False, requires_photo=True,
        min_temp=None, max_temp=None, value_number=None, photo_url=None,
    )
    assert ok is False
    assert reason and "写真" in reason


def test_photo_present_is_ok():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=False, requires_photo=True,
        min_temp=None, max_temp=None, value_number=None,
        photo_url="/uploads/line_check/abc.jpg",
    )
    assert ok is True
    assert reason is None


def test_photo_and_temperature_both_required_temperature_ng_takes_precedence():
    from app.services.line_check_engine import evaluate_answer
    ok, reason = evaluate_answer(
        requires_temperature=True, requires_photo=True,
        min_temp=0, max_temp=5, value_number=20.0,
        photo_url="/x.jpg",
    )
    assert ok is False
    assert reason and "温度" in reason


# ---- Serializers ----

def test_serialize_run_handles_none_fields():
    from types import SimpleNamespace
    from app.services.line_check_engine import serialize_run
    run = SimpleNamespace(
        id="r1", template_id="t1", store_id="s1", employee_id=None,
        started_at=None, completed_at=None, status="in_progress",
        geofence_ok=False, lat=None, lon=None,
    )
    payload = serialize_run(run)
    assert payload["status"] == "in_progress"
    assert payload["lat"] is None
    assert payload["geofence_ok"] is False


# ---- Router & router include in main ----

def test_line_check_router_registered_in_main():
    from app.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert any(p.startswith("/api/v1/line-check") for p in paths)


def test_line_check_router_has_expected_endpoints():
    from app.api.v1.line_check import router
    paths = {f"{router.prefix}{r.path}" for r in router.routes if hasattr(r, "path")}
    assert "/api/v1/line-check/templates" in paths
    assert "/api/v1/line-check/runs" in paths
    assert "/api/v1/line-check/photos" in paths
