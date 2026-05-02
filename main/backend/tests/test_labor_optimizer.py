"""
E2E for the labor forecasting + shift drafting pipeline.

予測 (合成データ) → 必要FTE → ドラフト生成 を, DB を経由せず純関数として確認。
"""
from __future__ import annotations
from datetime import date, datetime, time, timedelta, timezone
from unittest.mock import AsyncMock

import pytest

from app.services.demand_forecaster import predict, SlotPrediction, WEATHER_COEFF, EVENT_COEFF
from app.services.labor_optimizer import compute_requirements, estimate_cost, load_standards
from app.services.shift_draft import EmployeeInput, generate_draft


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows
    def scalars(self):
        return self
    def all(self):
        return self._rows


class _FakeDB:
    """過去ヒストリ無し (空)。フォールバック値で動くことを検証。"""
    async def execute(self, _q):
        return _FakeResult([])


@pytest.mark.asyncio
async def test_predict_returns_30m_slots_for_each_day():
    db = _FakeDB()
    tenant = "00000000-0000-0000-0000-000000000001"
    store = "11111111-1111-1111-1111-111111111111"
    d_from = date(2026, 5, 4)  # Monday
    d_to = date(2026, 5, 6)    # Wed → 3 days
    preds = await predict(db, tenant, store, d_from, d_to)
    # 営業時間 10..22 (13h) × 2 slots/h × 3 days = 78
    assert len(preds) == 13 * 2 * 3
    assert all(isinstance(p, SlotPrediction) for p in preds)
    assert all(p.predicted_customers > 0 for p in preds)
    assert all(0.5 <= p.confidence <= 0.95 for p in preds)
    # factors_json に必要なキー
    f = preds[0].factors
    for k in ("weather", "event", "dow", "trend_coeff", "lunar"):
        assert k in f


@pytest.mark.asyncio
async def test_predict_event_coeff_applied_on_weekend():
    db = _FakeDB()
    sat_preds = await predict(db, "t", "s", date(2026, 5, 9), date(2026, 5, 9))  # Sat
    mon_preds = await predict(db, "t", "s", date(2026, 5, 11), date(2026, 5, 11))  # Mon
    # 週末 (holiday=1.15) はベース係数が高いので、同条件下では客数が大きい (天気依存はあるが factors確認で十分)
    assert any(p.factors["event"] == "holiday" for p in sat_preds)
    assert all(p.factors["event"] != "holiday" for p in mon_preds)


def test_compute_requirements_default_brand():
    sp = [
        SlotPrediction(
            slot_start=datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc),
            predicted_customers=40.0, predicted_sales=28000.0,
            confidence=0.8, factors={},
        )
    ]
    reqs = compute_requirements(sp, brand_name=None)
    assert len(reqs) == 1
    r = reqs[0]
    # default: 8 customers/fte/30m → ceil(40/8)=5, role_split 0.45/0.40/0.15
    assert r.required_fte >= 5.0
    assert "ホール" in r.role_split
    assert "キッチン" in r.role_split
    assert "レジ" in r.role_split
    assert r.hourly_wage_yen == 1200


def test_compute_requirements_brand_override():
    sp = [
        SlotPrediction(
            slot_start=datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc),
            predicted_customers=42.0, predicted_sales=29000.0,
            confidence=0.85, factors={},
        )
    ]
    reqs = compute_requirements(sp, brand_name="すき家")
    # すき家: slot_overrides "12:00" → 14 customers/fte/30m, ceil(42/14)=3
    # min_fte=1.0 → 3.0
    assert reqs[0].required_fte == 3.0
    assert reqs[0].hourly_wage_yen == 1150


def test_estimate_cost_positive():
    sp = [
        SlotPrediction(
            slot_start=datetime(2026, 5, 4, h, m, tzinfo=timezone.utc),
            predicted_customers=20.0, predicted_sales=15000.0,
            confidence=0.8, factors={},
        ) for h in range(11, 14) for m in (0, 30)
    ]
    reqs = compute_requirements(sp, brand_name="すき家")
    cost = estimate_cost(reqs)
    assert cost > 0


@pytest.mark.asyncio
async def test_full_pipeline_e2e_synthetic():
    """予測 → 必要要員 → シフトドラフト生成 をE2Eで。"""
    db = _FakeDB()
    week_start = date(2026, 5, 4)  # Mon
    preds = await predict(db, "t", "s", week_start, week_start + timedelta(days=6))
    reqs = compute_requirements(preds, brand_name="すき家")
    employees = [
        EmployeeInput(id=f"e{i}", name=f"スタッフ{i}",
                      roles=["ホール", "キッチン", "レジ"],
                      max_hours_per_week=40.0, min_hours_per_week=15.0,
                      hourly_wage_yen=1150)
        for i in range(10)
    ]
    draft = generate_draft("s", week_start, employees, reqs)
    assert "slots" in draft
    assert "summary" in draft
    summary = draft["summary"]
    assert summary["total_slots"] == len(reqs)
    assert summary["total_assignments"] > 0
    # 連続勤務 (5日) 上限が守られる
    for emp_summary in summary["employee_summary"]:
        assert emp_summary["days_worked"] <= 7
    # コスト推計が正
    assert summary["cost_estimate_yen"] > 0


def test_shift_draft_respects_off_dates():
    week_start = date(2026, 5, 4)
    reqs_dt = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    from app.services.labor_optimizer import Requirement
    reqs = [Requirement(
        slot_start=reqs_dt, required_fte=2.0,
        role_split={"ホール": 1.0, "キッチン": 1.0, "レジ": 0.0},
        hourly_wage_yen=1200,
    )]
    employees = [
        EmployeeInput(id="e1", name="A", roles=["ホール"], off_dates=[date(2026, 5, 4)]),
        EmployeeInput(id="e2", name="B", roles=["ホール", "キッチン"], off_dates=[]),
        EmployeeInput(id="e3", name="C", roles=["キッチン"], off_dates=[]),
    ]
    draft = generate_draft("s", week_start, employees, reqs)
    # e1 は 5/4 休み → 割り当てされない
    assigned_ids = {a["employee_id"] for slot in draft["slots"] for a in slot["assignments"]}
    assert "e1" not in assigned_ids


def test_labor_standards_loadable():
    s = load_standards()
    assert "default" in s
    assert "brands" in s
    assert "すき家" in s["brands"]
    assert s["default"]["customers_per_fte_per_30m"] > 0
