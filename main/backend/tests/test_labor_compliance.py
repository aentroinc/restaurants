"""労務コンプライアンス純ロジックのテスト。

DB を介さない evaluate_* / check_* 関数の境界条件を確認:
  - 36協定: 月46h で warn / 月101h で block / 年721h で block / 複数月平均81h で block
  - 休憩: 8.5h労働で休憩30分 → block / 6.5h労働で打刻終了済 → block / 6.5h で打刻継続中 → warn
  - 未成年深夜: 17歳 23時 → block / 17歳 14時 → ok / 18歳 23時 → ok
  - 連続勤務: 13日 → warn / 14日 → block / 11日 → ok
  - インターバル: 9h ギャップ → warn / 12h → ok
  - 最低賃金: 東京1100円 → block / 東京1163円 → ok
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone


# ============================================================================
# 1. 36協定
# ============================================================================
def test_art36_monthly_46h_warns():
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(monthly_overtime_hours=46.0, yearly_overtime_hours=200.0)
    assert r.status == "warn"
    assert r.rule_code == "ART36_MONTHLY"


def test_art36_monthly_101h_blocks():
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(monthly_overtime_hours=101.0, yearly_overtime_hours=400.0)
    assert r.status == "block"
    assert r.rule_code == "ART36_SPECIAL"


def test_art36_monthly_100h_exactly_blocks():
    """100h "未満" が要件なので 100h ちょうども block。"""
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(monthly_overtime_hours=100.0, yearly_overtime_hours=400.0)
    assert r.status == "block"


def test_art36_yearly_721h_blocks():
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(monthly_overtime_hours=40.0, yearly_overtime_hours=721.0)
    assert r.status == "block"


def test_art36_multi_month_avg_81h_blocks():
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(
        monthly_overtime_hours=44.0,
        yearly_overtime_hours=300.0,
        multi_month_avg_overtime=81.0,
    )
    assert r.status == "block"


def test_art36_within_limits_ok():
    from app.services.labor_compliance_engine import evaluate_36_agreement
    r = evaluate_36_agreement(monthly_overtime_hours=20.0, yearly_overtime_hours=200.0)
    assert r.status == "ok"


# ============================================================================
# 2. 休憩取得
# ============================================================================
def test_break_8_5h_with_30min_blocks():
    from app.services.labor_compliance_engine import check_break_taken
    # 9:00 in, 12:00-12:30 break (30min), 17:30 out → 8.5h労働 / 30分休憩
    base = datetime(2026, 5, 2, tzinfo=timezone.utc)
    evs = [
        {"event_type": "in", "occurred_at": base.replace(hour=9)},
        {"event_type": "break_start", "occurred_at": base.replace(hour=12)},
        {"event_type": "break_end", "occurred_at": base.replace(hour=12, minute=30)},
        {"event_type": "out", "occurred_at": base.replace(hour=17, minute=30)},
    ]
    r = check_break_taken(evs)
    assert r.status == "block"
    assert r.rule_code == "BREAK_8H"


def test_break_6_5h_completed_no_break_blocks():
    from app.services.labor_compliance_engine import check_break_taken
    # 9:00 in, 15:30 out — 6.5h, 休憩 0
    base = datetime(2026, 5, 2, tzinfo=timezone.utc)
    evs = [
        {"event_type": "in", "occurred_at": base.replace(hour=9)},
        {"event_type": "out", "occurred_at": base.replace(hour=15, minute=30)},
    ]
    r = check_break_taken(evs)
    assert r.status == "block"  # 退勤済みなので確定違反
    assert r.rule_code == "BREAK_6H"


def test_break_8h_with_60min_ok():
    from app.services.labor_compliance_engine import check_break_taken
    base = datetime(2026, 5, 2, tzinfo=timezone.utc)
    evs = [
        {"event_type": "in", "occurred_at": base.replace(hour=9)},
        {"event_type": "break_start", "occurred_at": base.replace(hour=12)},
        {"event_type": "break_end", "occurred_at": base.replace(hour=13)},
        {"event_type": "out", "occurred_at": base.replace(hour=18)},
    ]
    r = check_break_taken(evs)
    assert r.status == "ok"


def test_break_in_progress_warns_not_blocks():
    """退勤打刻なしで 6h 超 + 休憩なし → warn (まだ取得余地あり)。"""
    from app.services.labor_compliance_engine import check_break_taken
    in_at = datetime.now(timezone.utc) - timedelta(hours=7)
    evs = [{"event_type": "in", "occurred_at": in_at}]
    r = check_break_taken(evs)
    assert r.status == "warn"
    assert r.rule_code == "BREAK_6H"


# ============================================================================
# 3. 未成年深夜
# ============================================================================
def test_minor_17_at_23_blocks():
    from app.services.labor_compliance_engine import evaluate_minor_night
    r = evaluate_minor_night(age=17, slot_at=datetime(2026, 5, 2, 23, 0, tzinfo=timezone.utc))
    assert r.status == "block"
    assert r.rule_code == "MINOR_NIGHT"


def test_minor_17_at_14_ok():
    from app.services.labor_compliance_engine import evaluate_minor_night
    r = evaluate_minor_night(age=17, slot_at=datetime(2026, 5, 2, 14, 0, tzinfo=timezone.utc))
    assert r.status == "ok"


def test_adult_at_23_ok():
    from app.services.labor_compliance_engine import evaluate_minor_night
    r = evaluate_minor_night(age=18, slot_at=datetime(2026, 5, 2, 23, 0, tzinfo=timezone.utc))
    assert r.status == "ok"


def test_minor_with_deep_night_allowed_warns():
    """例外許可済みフラグONなら block でなく warn。"""
    from app.services.labor_compliance_engine import evaluate_minor_night
    r = evaluate_minor_night(
        age=17,
        slot_at=datetime(2026, 5, 2, 23, 0, tzinfo=timezone.utc),
        deep_night_allowed=True,
    )
    assert r.status == "warn"


def test_minor_at_4am_blocks():
    """22:00-翌05:00 の深夜帯。4時もアウト。"""
    from app.services.labor_compliance_engine import evaluate_minor_night
    r = evaluate_minor_night(age=17, slot_at=datetime(2026, 5, 2, 4, 0, tzinfo=timezone.utc))
    assert r.status == "block"


# ============================================================================
# 4. 連続勤務日数
# ============================================================================
def test_consecutive_13_days_warns():
    from app.services.labor_compliance_engine import evaluate_consecutive_days
    r = evaluate_consecutive_days(13)
    assert r.status == "warn"


def test_consecutive_14_days_blocks():
    from app.services.labor_compliance_engine import evaluate_consecutive_days
    r = evaluate_consecutive_days(14)
    assert r.status == "block"


def test_consecutive_11_days_ok():
    from app.services.labor_compliance_engine import evaluate_consecutive_days
    r = evaluate_consecutive_days(11)
    assert r.status == "ok"


# ============================================================================
# 5. インターバル
# ============================================================================
def test_interval_9h_warns():
    from app.services.labor_compliance_engine import check_interval
    out = datetime(2026, 5, 1, 22, 0, tzinfo=timezone.utc)
    nin = datetime(2026, 5, 2, 7, 0, tzinfo=timezone.utc)  # 9h gap
    r = check_interval(out, nin)
    assert r.status == "warn"


def test_interval_12h_ok():
    from app.services.labor_compliance_engine import check_interval
    out = datetime(2026, 5, 1, 19, 0, tzinfo=timezone.utc)
    nin = datetime(2026, 5, 2, 7, 0, tzinfo=timezone.utc)  # 12h gap
    r = check_interval(out, nin)
    assert r.status == "ok"


def test_interval_no_prev_ok():
    from app.services.labor_compliance_engine import check_interval
    r = check_interval(None, datetime(2026, 5, 2, 9, 0, tzinfo=timezone.utc))
    assert r.status == "ok"


# ============================================================================
# 6. 最低賃金
# ============================================================================
def test_min_wage_tokyo_1100_blocks():
    from app.services.labor_compliance_engine import evaluate_minimum_wage
    r = evaluate_minimum_wage(hourly_rate_jpy=1100, prefecture_code="13")
    assert r.status == "block"
    assert r.detail["minimum_wage"] == 1163


def test_min_wage_tokyo_1163_ok():
    from app.services.labor_compliance_engine import evaluate_minimum_wage
    r = evaluate_minimum_wage(hourly_rate_jpy=1163, prefecture_code="13")
    assert r.status == "ok"


def test_min_wage_osaka():
    from app.services.labor_compliance_engine import evaluate_minimum_wage
    # 大阪 1114 円 / 1100 円なら違反
    r = evaluate_minimum_wage(hourly_rate_jpy=1100, prefecture_code="27")
    assert r.status == "block"
    assert r.detail["minimum_wage"] == 1114


def test_min_wage_aichi():
    from app.services.labor_compliance_engine import evaluate_minimum_wage
    r = evaluate_minimum_wage(hourly_rate_jpy=1140, prefecture_code="23")
    assert r.status == "ok"


def test_min_wage_unknown_pref_uses_avg():
    from app.services.labor_compliance_engine import evaluate_minimum_wage
    r = evaluate_minimum_wage(hourly_rate_jpy=900, prefecture_code="99")
    assert r.status == "block"  # 全国加重平均 1055 を下回る


# ============================================================================
# 全47都道府県データ存在確認
# ============================================================================
def test_all_47_prefectures_have_min_wage():
    from app.services.labor_law_data import PREFECTURE_MIN_WAGE_JPY
    assert len(PREFECTURE_MIN_WAGE_JPY) == 47
    # すべて 900〜1300円 の範囲内
    for code, wage in PREFECTURE_MIN_WAGE_JPY.items():
        assert 900 <= wage <= 1300, f"Pref {code}: {wage}"


# ============================================================================
# 年齢計算
# ============================================================================
def test_calc_age_basic():
    from app.services.labor_compliance_engine import _calc_age
    assert _calc_age(date(2009, 5, 1), date(2026, 5, 2)) == 17
    assert _calc_age(date(2009, 5, 3), date(2026, 5, 2)) == 16  # 誕生日前
    assert _calc_age(None, date(2026, 5, 2)) is None
