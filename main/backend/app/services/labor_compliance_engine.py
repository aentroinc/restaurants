"""日本労働基準法 6ルール 判定エンジン (純ロジック中心 + 任意でDB問合せ)。

公開関数:
  - check_36_agreement(employee_id, period, *, db, tenant_id) -> ComplianceResult
  - check_break_taken(clock_events) -> ComplianceResult
  - check_minor_night_shift(employee_id, slot, *, db, tenant_id, deep_night_allowed) -> ComplianceResult
  - check_consecutive_days(employee_id, ref_date, *, db, tenant_id) -> ComplianceResult
  - check_interval(prev_clock_out, next_clock_in) -> ComplianceResult
  - check_minimum_wage(employee_id, prefecture, *, db, tenant_id) -> ComplianceResult
  - evaluate_all(employee_id, *, db, tenant_id, store_id, prefecture, ref_date)
        -> list[ComplianceResult]

ComplianceResult.status: "ok" | "warn" | "block"
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Iterable
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.labor_law_data import (
    ART36_MONTHLY_LIMIT_HOURS,
    ART36_YEARLY_LIMIT_HOURS,
    ART36_SPECIAL_MONTHLY_HARD_CAP,
    ART36_SPECIAL_MULTI_MONTH_AVG,
    ART36_SPECIAL_YEARLY_LIMIT,
    BREAK_REQUIRED_OVER_6H_MIN,
    BREAK_REQUIRED_OVER_8H_MIN,
    MINOR_NIGHT_FORBIDDEN_START,
    MINOR_NIGHT_FORBIDDEN_END,
    MINOR_AGE_THRESHOLD,
    CONSECUTIVE_DAYS_WARN,
    CONSECUTIVE_DAYS_BLOCK,
    INTERVAL_MIN_HOURS,
    get_min_wage,
)


@dataclass
class ComplianceResult:
    rule_code: str
    status: str  # ok | warn | block
    message: str
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ----------------------------------------------------------------------------
# 1. 36協定: 月45h / 年360h, 特別条項 月100h未満 + 複数月平均80h以下 + 年720h
# ----------------------------------------------------------------------------
def evaluate_36_agreement(
    monthly_overtime_hours: float,
    yearly_overtime_hours: float,
    multi_month_avg_overtime: float | None = None,
) -> ComplianceResult:
    """純ロジック版。DB呼び出さない。

    - 月45h超 → warn (原則を超えた)
    - 月100h以上 → block (特別条項のハードキャップ違反)
    - 年360h超 → warn
    - 年720h超 → block
    - 複数月平均80h超 → block
    """
    detail = {
        "monthly_overtime_hours": round(monthly_overtime_hours, 2),
        "yearly_overtime_hours": round(yearly_overtime_hours, 2),
        "multi_month_avg_overtime": (
            round(multi_month_avg_overtime, 2) if multi_month_avg_overtime is not None else None
        ),
        "monthly_limit": ART36_MONTHLY_LIMIT_HOURS,
        "monthly_hard_cap": ART36_SPECIAL_MONTHLY_HARD_CAP,
        "yearly_limit": ART36_YEARLY_LIMIT_HOURS,
        "yearly_hard_cap": ART36_SPECIAL_YEARLY_LIMIT,
        "multi_month_cap": ART36_SPECIAL_MULTI_MONTH_AVG,
    }

    if monthly_overtime_hours >= ART36_SPECIAL_MONTHLY_HARD_CAP:
        return ComplianceResult(
            rule_code="ART36_SPECIAL",
            status="block",
            message=(
                f"月時間外 {monthly_overtime_hours:.1f}h は特別条項上限 "
                f"{ART36_SPECIAL_MONTHLY_HARD_CAP}h 未満に違反"
            ),
            detail=detail,
        )
    if yearly_overtime_hours > ART36_SPECIAL_YEARLY_LIMIT:
        return ComplianceResult(
            rule_code="ART36_YEARLY",
            status="block",
            message=f"年時間外 {yearly_overtime_hours:.1f}h は上限 {ART36_SPECIAL_YEARLY_LIMIT}h 超過",
            detail=detail,
        )
    if multi_month_avg_overtime is not None and multi_month_avg_overtime > ART36_SPECIAL_MULTI_MONTH_AVG:
        return ComplianceResult(
            rule_code="ART36_SPECIAL",
            status="block",
            message=(
                f"複数月平均時間外 {multi_month_avg_overtime:.1f}h は "
                f"{ART36_SPECIAL_MULTI_MONTH_AVG}h を超過"
            ),
            detail=detail,
        )
    if monthly_overtime_hours > ART36_MONTHLY_LIMIT_HOURS:
        return ComplianceResult(
            rule_code="ART36_MONTHLY",
            status="warn",
            message=f"月時間外 {monthly_overtime_hours:.1f}h は原則上限 {ART36_MONTHLY_LIMIT_HOURS}h 超過 (特別条項適用)",
            detail=detail,
        )
    if yearly_overtime_hours > ART36_YEARLY_LIMIT_HOURS:
        return ComplianceResult(
            rule_code="ART36_YEARLY",
            status="warn",
            message=f"年時間外 {yearly_overtime_hours:.1f}h は原則上限 {ART36_YEARLY_LIMIT_HOURS}h 超過",
            detail=detail,
        )
    return ComplianceResult(
        rule_code="ART36_MONTHLY", status="ok",
        message="36協定 範囲内", detail=detail,
    )


async def check_36_agreement(
    employee_id: UUID,
    period: tuple[date, date],
    *,
    db: AsyncSession,
    tenant_id: str,
) -> ComplianceResult:
    """DB から Shift / ClockEvent を集計して 36協定判定。

    時間外 = 1日8h超の労働 + 週40h超分 をシンプルに 1日8h超のみで近似。
    """
    from app.models.shift import Shift

    start, end = period
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.max, tzinfo=timezone.utc)

    res = await db.execute(
        select(Shift).where(
            and_(
                Shift.tenant_id == UUID(tenant_id),
                Shift.employee_id == employee_id,
                Shift.start_at >= start_dt,
                Shift.start_at <= end_dt,
            )
        )
    )
    shifts = res.scalars().all()

    monthly_ot = defaultdict(float)
    yearly_ot = 0.0
    for s in shifts:
        work_h = (s.end_at - s.start_at).total_seconds() / 3600
        break_h = (s.break_minutes or 0) / 60
        net = max(0.0, work_h - break_h)
        ot = max(0.0, net - 8.0)
        ym = (s.start_at.year, s.start_at.month)
        monthly_ot[ym] += ot
        yearly_ot += ot

    cur_month = max(monthly_ot.keys()) if monthly_ot else (start.year, start.month)
    monthly = monthly_ot.get(cur_month, 0.0)

    # 直近6ヶ月平均
    sorted_months = sorted(monthly_ot.keys(), reverse=True)
    recent = [monthly_ot[m] for m in sorted_months[:6]]
    multi_avg = (sum(recent) / len(recent)) if len(recent) >= 2 else None

    return evaluate_36_agreement(monthly, yearly_ot, multi_avg)


# ----------------------------------------------------------------------------
# 2. 休憩取得義務
# ----------------------------------------------------------------------------
def check_break_taken(clock_events: list[dict]) -> ComplianceResult:
    """1日分の打刻イベント (event_type, occurred_at) から休憩判定。

    入力例: [{"event_type":"in", "occurred_at": dt}, {"event_type":"break_start",...}, ...]
    return:
      - ok: 規定通り
      - warn: 6h超で休憩45分未満 (まだ取得余地あり)
      - block: 8h超で60分未満 (実績ベース確定違反)
    """
    if not clock_events:
        return ComplianceResult(
            rule_code="BREAK_6H", status="ok", message="打刻なし",
            detail={"work_hours": 0.0, "break_minutes": 0},
        )

    sorted_evs = sorted(clock_events, key=lambda e: e["occurred_at"])
    clock_in = next((e for e in sorted_evs if e["event_type"] == "in"), None)
    clock_out = next((e for e in reversed(sorted_evs) if e["event_type"] == "out"), None)
    if not clock_in:
        return ComplianceResult(
            rule_code="BREAK_6H", status="ok", message="出勤打刻なし",
            detail={"work_hours": 0.0, "break_minutes": 0},
        )
    end_time = clock_out["occurred_at"] if clock_out else datetime.now(timezone.utc)
    work_seconds = (end_time - clock_in["occurred_at"]).total_seconds()
    work_h = max(0.0, work_seconds / 3600)

    # break_start ↔ break_end ペア
    break_seconds = 0.0
    pending_start: datetime | None = None
    for e in sorted_evs:
        if e["event_type"] == "break_start":
            pending_start = e["occurred_at"]
        elif e["event_type"] == "break_end" and pending_start:
            break_seconds += (e["occurred_at"] - pending_start).total_seconds()
            pending_start = None
    break_min = break_seconds / 60

    detail = {
        "work_hours": round(work_h, 2),
        "break_minutes": round(break_min, 1),
        "required_min": 0,
    }

    if work_h > 8.0:
        detail["required_min"] = BREAK_REQUIRED_OVER_8H_MIN
        if break_min < BREAK_REQUIRED_OVER_8H_MIN:
            return ComplianceResult(
                rule_code="BREAK_8H", status="block",
                message=f"労働 {work_h:.1f}h に対し休憩 {break_min:.0f}分 (必要 {BREAK_REQUIRED_OVER_8H_MIN}分)",
                detail=detail,
            )
    elif work_h > 6.0:
        detail["required_min"] = BREAK_REQUIRED_OVER_6H_MIN
        if break_min < BREAK_REQUIRED_OVER_6H_MIN:
            severity = "block" if clock_out else "warn"
            return ComplianceResult(
                rule_code="BREAK_6H", status=severity,
                message=f"労働 {work_h:.1f}h に対し休憩 {break_min:.0f}分 (必要 {BREAK_REQUIRED_OVER_6H_MIN}分)",
                detail=detail,
            )
    return ComplianceResult(
        rule_code="BREAK_6H", status="ok",
        message="休憩取得 規定内", detail=detail,
    )


# ----------------------------------------------------------------------------
# 3. 未成年深夜禁止
# ----------------------------------------------------------------------------
def is_in_night_window(t: datetime | time) -> bool:
    """22:00-翌05:00 の範囲内か。"""
    h = t.hour if hasattr(t, "hour") else t.hour
    return h >= MINOR_NIGHT_FORBIDDEN_START or h < MINOR_NIGHT_FORBIDDEN_END


def evaluate_minor_night(
    age: int | None,
    slot_at: datetime,
    deep_night_allowed: bool = False,
) -> ComplianceResult:
    """純ロジック版。年齢と時刻 → 違反判定。"""
    detail = {
        "age": age,
        "slot_hour": slot_at.hour,
        "deep_night_allowed": deep_night_allowed,
    }
    if age is None or age >= MINOR_AGE_THRESHOLD:
        return ComplianceResult(rule_code="MINOR_NIGHT", status="ok", message="成人", detail=detail)
    if not is_in_night_window(slot_at):
        return ComplianceResult(rule_code="MINOR_NIGHT", status="ok", message="深夜時間帯外", detail=detail)
    if deep_night_allowed:
        return ComplianceResult(
            rule_code="MINOR_NIGHT", status="warn",
            message=f"{age}歳の深夜勤務 (例外許可済み)", detail=detail,
        )
    return ComplianceResult(
        rule_code="MINOR_NIGHT", status="block",
        message=f"{age}歳は 22:00-05:00 の労働禁止 (労基法第61条)",
        detail=detail,
    )


def _calc_age(birth_date: date | None, ref: date) -> int | None:
    if not birth_date:
        return None
    years = ref.year - birth_date.year
    if (ref.month, ref.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


async def check_minor_night_shift(
    employee_id: UUID,
    slot: datetime,
    *,
    db: AsyncSession,
    tenant_id: str,
    deep_night_allowed: bool = False,
) -> ComplianceResult:
    from app.models.employee import Employee
    res = await db.execute(
        select(Employee).where(
            and_(Employee.tenant_id == UUID(tenant_id), Employee.id == employee_id)
        )
    )
    emp = res.scalar_one_or_none()
    birth = getattr(emp, "birth_date", None) if emp else None
    age = _calc_age(birth, slot.date())
    return evaluate_minor_night(age, slot, deep_night_allowed)


# ----------------------------------------------------------------------------
# 4. 連続勤務日数
# ----------------------------------------------------------------------------
def evaluate_consecutive_days(consecutive: int) -> ComplianceResult:
    detail = {
        "consecutive_days": consecutive,
        "warn_threshold": CONSECUTIVE_DAYS_WARN,
        "block_threshold": CONSECUTIVE_DAYS_BLOCK,
    }
    if consecutive >= CONSECUTIVE_DAYS_BLOCK:
        return ComplianceResult(
            rule_code="CONSECUTIVE_DAYS", status="block",
            message=f"{consecutive}日連続勤務 ({CONSECUTIVE_DAYS_BLOCK}日超は違反)",
            detail=detail,
        )
    if consecutive >= CONSECUTIVE_DAYS_WARN:
        return ComplianceResult(
            rule_code="CONSECUTIVE_DAYS", status="warn",
            message=f"{consecutive}日連続勤務 ({CONSECUTIVE_DAYS_WARN}日以上で警告)",
            detail=detail,
        )
    return ComplianceResult(
        rule_code="CONSECUTIVE_DAYS", status="ok",
        message="連続勤務日数 範囲内", detail=detail,
    )


async def check_consecutive_days(
    employee_id: UUID,
    *,
    db: AsyncSession,
    tenant_id: str,
    ref_date: date | None = None,
) -> ComplianceResult:
    from app.models.shift import Shift
    ref = ref_date or datetime.now(timezone.utc).date()
    earliest = datetime.combine(ref - timedelta(days=30), time.min, tzinfo=timezone.utc)
    res = await db.execute(
        select(Shift.start_at).where(
            and_(
                Shift.tenant_id == UUID(tenant_id),
                Shift.employee_id == employee_id,
                Shift.start_at >= earliest,
            )
        )
    )
    days = sorted({r[0].date() for r in res.all()})
    consecutive = 0
    d = ref
    while d in days:
        consecutive += 1
        d -= timedelta(days=1)
    return evaluate_consecutive_days(consecutive)


# ----------------------------------------------------------------------------
# 5. インターバル (努力義務)
# ----------------------------------------------------------------------------
def check_interval(prev_clock_out: datetime | None, next_clock_in: datetime) -> ComplianceResult:
    detail = {
        "min_hours": INTERVAL_MIN_HOURS,
        "interval_hours": None,
    }
    if prev_clock_out is None:
        return ComplianceResult(
            rule_code="INTERVAL_11H", status="ok",
            message="前回退勤なし", detail=detail,
        )
    gap_h = (next_clock_in - prev_clock_out).total_seconds() / 3600
    detail["interval_hours"] = round(gap_h, 2)
    if gap_h < INTERVAL_MIN_HOURS:
        return ComplianceResult(
            rule_code="INTERVAL_11H", status="warn",
            message=f"勤務間インターバル {gap_h:.1f}h (努力義務 {INTERVAL_MIN_HOURS}h未満)",
            detail=detail,
        )
    return ComplianceResult(
        rule_code="INTERVAL_11H", status="ok",
        message="インターバル 確保", detail=detail,
    )


# ----------------------------------------------------------------------------
# 6. 最低賃金
# ----------------------------------------------------------------------------
def evaluate_minimum_wage(hourly_rate_jpy: int | None, prefecture_code: str) -> ComplianceResult:
    min_wage = get_min_wage(prefecture_code)
    detail = {
        "hourly_rate": hourly_rate_jpy,
        "prefecture": prefecture_code,
        "minimum_wage": min_wage,
    }
    if hourly_rate_jpy is None:
        return ComplianceResult(
            rule_code="MIN_WAGE", status="warn",
            message="時給データ未登録", detail=detail,
        )
    if hourly_rate_jpy < min_wage:
        return ComplianceResult(
            rule_code="MIN_WAGE", status="block",
            message=f"時給 {hourly_rate_jpy}円 < 最低賃金 {min_wage}円",
            detail=detail,
        )
    return ComplianceResult(
        rule_code="MIN_WAGE", status="ok",
        message=f"時給 {hourly_rate_jpy}円 ≥ 最低賃金 {min_wage}円",
        detail=detail,
    )


async def check_minimum_wage(
    employee_id: UUID,
    prefecture: str,
    *,
    db: AsyncSession,
    tenant_id: str,
) -> ComplianceResult:
    from app.models.employee import Employee
    res = await db.execute(
        select(Employee).where(
            and_(Employee.tenant_id == UUID(tenant_id), Employee.id == employee_id)
        )
    )
    emp = res.scalar_one_or_none()
    rate = getattr(emp, "hourly_rate", None) if emp else None
    return evaluate_minimum_wage(int(rate) if rate else None, prefecture)


# ----------------------------------------------------------------------------
# 全6ルール集約
# ----------------------------------------------------------------------------
async def evaluate_all(
    employee_id: UUID,
    *,
    db: AsyncSession,
    tenant_id: str,
    store_id: UUID | None = None,
    prefecture: str = "13",
    ref_date: date | None = None,
    deep_night_allowed: bool = False,
) -> list[ComplianceResult]:
    """6ルール一括評価。order: 36協定 → 連続勤務 → 最低賃金 → 深夜 → 休憩 → インターバル。"""
    from app.models.face_auth import ClockEvent
    ref = ref_date or datetime.now(timezone.utc).date()
    period = (date(ref.year, 1, 1), ref)

    results: list[ComplianceResult] = []

    # 1. 36協定
    try:
        results.append(await check_36_agreement(employee_id, period, db=db, tenant_id=tenant_id))
    except Exception as e:
        results.append(ComplianceResult("ART36_MONTHLY", "ok", f"skip: {e}"))

    # 4. 連続勤務日数
    try:
        results.append(await check_consecutive_days(employee_id, db=db, tenant_id=tenant_id, ref_date=ref))
    except Exception as e:
        results.append(ComplianceResult("CONSECUTIVE_DAYS", "ok", f"skip: {e}"))

    # 6. 最低賃金
    try:
        results.append(await check_minimum_wage(employee_id, prefecture, db=db, tenant_id=tenant_id))
    except Exception as e:
        results.append(ComplianceResult("MIN_WAGE", "ok", f"skip: {e}"))

    # 3. 深夜禁止 (現在時刻判定)
    now = datetime.now(timezone.utc)
    try:
        results.append(await check_minor_night_shift(
            employee_id, now, db=db, tenant_id=tenant_id, deep_night_allowed=deep_night_allowed,
        ))
    except Exception as e:
        results.append(ComplianceResult("MINOR_NIGHT", "ok", f"skip: {e}"))

    # 2. 休憩 (本日打刻ベース)
    try:
        day_start = datetime.combine(ref, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(ref, time.max, tzinfo=timezone.utc)
        ev_q = await db.execute(
            select(ClockEvent).where(
                and_(
                    ClockEvent.tenant_id == UUID(tenant_id),
                    ClockEvent.employee_id == employee_id,
                    ClockEvent.occurred_at >= day_start,
                    ClockEvent.occurred_at <= day_end,
                )
            )
        )
        evs = [{"event_type": e.event_type, "occurred_at": e.occurred_at} for e in ev_q.scalars().all()]
        results.append(check_break_taken(evs))
    except Exception as e:
        results.append(ComplianceResult("BREAK_6H", "ok", f"skip: {e}"))

    # 5. インターバル (直近2回の clock in/out)
    try:
        ev_q = await db.execute(
            select(ClockEvent).where(
                and_(
                    ClockEvent.tenant_id == UUID(tenant_id),
                    ClockEvent.employee_id == employee_id,
                )
            ).order_by(ClockEvent.occurred_at.desc()).limit(20)
        )
        evs = list(ev_q.scalars().all())
        last_out = next((e for e in evs if e.event_type == "out"), None)
        last_in = next((e for e in evs if e.event_type == "in"), None)
        if last_out and last_in and last_in.occurred_at > last_out.occurred_at:
            # 退勤 → 出勤 の順序で
            prev_out = last_out.occurred_at
            cur_in = last_in.occurred_at
            results.append(check_interval(prev_out, cur_in))
        else:
            results.append(ComplianceResult("INTERVAL_11H", "ok", "判定対象データ不足"))
    except Exception as e:
        results.append(ComplianceResult("INTERVAL_11H", "ok", f"skip: {e}"))

    return results


def has_blocking_violation(results: Iterable[ComplianceResult]) -> bool:
    return any(r.status == "block" for r in results)
