"""
週次シフトドラフト生成。greedy + 制約 (連続勤務日上限・週labor法・希望休)。

入力:
  - store_id, week_start (月曜想定)
  - employees: [{id, name, role, max_hours_per_week, off_dates: [date], min_hours_per_week, hourly_wage_yen}]
  - requirements: 7日分 × slot 数の必要FTE (role別)
出力:
  - draft_json: { "slots": [{slot_start, assignments:[{employee_id, role}]}], "summary": {...} }
"""
from __future__ import annotations
import math
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from typing import Any

from app.services.labor_optimizer import Requirement


MAX_CONSECUTIVE_DAYS = 5
DEFAULT_MIN_REST_HOURS = 11


@dataclass
class EmployeeInput:
    id: str
    name: str
    roles: list[str]  # 担当可能ロール ["ホール", "キッチン", ...]
    max_hours_per_week: float = 40.0
    min_hours_per_week: float = 20.0
    off_dates: list[date] = field(default_factory=list)
    hourly_wage_yen: int = 1200


def _slot_hours() -> float:
    return 0.5


def _emp_can_work(
    emp: EmployeeInput,
    slot: datetime,
    role: str,
    state: dict[str, Any],
) -> bool:
    if role not in emp.roles:
        return False
    if slot.date() in emp.off_dates:
        return False
    s = state[emp.id]
    if s["hours"] + _slot_hours() > emp.max_hours_per_week:
        return False
    # 連続勤務日チェック
    today = slot.date()
    if today not in s["worked_days"]:
        # 5日連続で働いていたら拒否
        consec = 0
        d = today - timedelta(days=1)
        while d in s["worked_days"]:
            consec += 1
            d -= timedelta(days=1)
        if consec >= MAX_CONSECUTIVE_DAYS:
            return False
    # 11h インターバル
    last_end = s.get("last_end")
    if last_end and (slot - last_end).total_seconds() < DEFAULT_MIN_REST_HOURS * 3600:
        # 同日連続シフトは許容 (intervalは前日との関係でのみ厳しく見る)
        if last_end.date() != slot.date():
            return False
    return True


def generate_draft(
    store_id: str,
    week_start: date,
    employees: list[EmployeeInput],
    requirements: list[Requirement],
) -> dict[str, Any]:
    """greedy 割当。slot ごとに必要role量を埋める。"""
    # state: per employee
    state: dict[str, dict[str, Any]] = {
        e.id: {"hours": 0.0, "worked_days": set(), "last_end": None, "role_count": defaultdict(int)}
        for e in employees
    }
    emp_by_id = {e.id: e for e in employees}

    slot_records: list[dict[str, Any]] = []
    unfilled = 0
    total_assignments = 0

    # role 必要量(0.5刻み) を slot ごとに展開
    for req in requirements:
        # role別必要人数 = ceil(role_split値 → 整数)
        role_targets: dict[str, int] = {}
        for role, ft in req.role_split.items():
            role_targets[role] = max(0, math.ceil(ft))

        assignments: list[dict[str, Any]] = []
        for role, need in role_targets.items():
            if need <= 0:
                continue
            # 候補者: そのroleが可能、まだ最大時間に達していない、min_hours下回ってる人優先
            candidates = [e for e in employees if _emp_can_work(e, req.slot_start, role, state)]
            # スコア: 残りmin_hours未達 を優先 (最低稼働確保)
            def score(e: EmployeeInput) -> tuple[int, float]:
                s = state[e.id]
                under_min = max(0.0, e.min_hours_per_week - s["hours"])
                return (-1 if under_min > 0 else 0, s["hours"])
            candidates.sort(key=score)
            picked = candidates[:need]
            for e in picked:
                assignments.append({"employee_id": e.id, "employee_name": e.name, "role": role})
                s = state[e.id]
                s["hours"] += _slot_hours()
                s["worked_days"].add(req.slot_start.date())
                s["last_end"] = req.slot_start + timedelta(minutes=30)
                s["role_count"][role] += 1
                total_assignments += 1
            shortage = need - len(picked)
            if shortage > 0:
                unfilled += shortage
                for _ in range(shortage):
                    assignments.append({"employee_id": None, "employee_name": "（要員不足）", "role": role})

        slot_records.append({
            "slot_start": req.slot_start.isoformat(),
            "required_fte": req.required_fte,
            "role_split": req.role_split,
            "assignments": assignments,
        })

    # コスト計算
    cost = 0
    for emp in employees:
        h = state[emp.id]["hours"]
        cost += int(h * emp.hourly_wage_yen)

    employee_summary = []
    for e in employees:
        s = state[e.id]
        employee_summary.append({
            "employee_id": e.id,
            "name": e.name,
            "scheduled_hours": round(s["hours"], 2),
            "days_worked": len(s["worked_days"]),
            "role_distribution": {k: v for k, v in s["role_count"].items()},
            "warnings": (
                ["min_hours_unmet"] if s["hours"] < e.min_hours_per_week else []
            ),
        })

    return {
        "slots": slot_records,
        "summary": {
            "store_id": store_id,
            "week_start": week_start.isoformat(),
            "total_slots": len(slot_records),
            "total_assignments": total_assignments,
            "unfilled_slots": unfilled,
            "fill_rate_pct": round(100 * (1 - unfilled / max(1, total_assignments + unfilled)), 1),
            "cost_estimate_yen": cost,
            "employee_summary": employee_summary,
        },
    }
