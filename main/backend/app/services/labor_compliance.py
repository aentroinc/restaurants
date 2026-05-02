from datetime import timedelta
from collections import defaultdict
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.shift import Shift, LaborLawProfile


async def check_shift_violations(
    db: AsyncSession, tenant_id: str, store_id: str = None
) -> list[dict]:
    profile_q = await db.execute(
        select(LaborLawProfile).where(LaborLawProfile.tenant_id == tenant_id).limit(1)
    )
    profile = profile_q.scalar_one_or_none()
    if not profile:
        profile_defaults = {
            "weekly_max_hours": 40,
            "daily_max_hours": 8,
            "rest_min_minutes_per_6h": 45,
            "rest_min_minutes_per_8h": 60,
            "rest_interval_min_hours": 11,
        }
    else:
        profile_defaults = {
            "weekly_max_hours": profile.weekly_max_hours,
            "daily_max_hours": profile.daily_max_hours,
            "rest_min_minutes_per_6h": profile.rest_min_minutes_per_6h,
            "rest_min_minutes_per_8h": profile.rest_min_minutes_per_8h,
            "rest_interval_min_hours": profile.rest_interval_min_hours,
        }

    q = select(Shift).where(Shift.tenant_id == tenant_id)
    if store_id:
        q = q.where(Shift.store_id == store_id)
    q = q.order_by(Shift.employee_id, Shift.start_at)
    rows = (await db.execute(q)).scalars().all()

    violations = []
    employee_shifts = defaultdict(list)
    for s in rows:
        employee_shifts[str(s.employee_id)].append(s)

    for emp_id, shifts in employee_shifts.items():
        weekly_hours = defaultdict(float)

        for i, s in enumerate(shifts):
            work_hours = (s.end_at - s.start_at).total_seconds() / 3600
            break_hours = s.break_minutes / 60 if s.break_minutes else 0
            net_hours = work_hours - break_hours

            # daily overtime check
            if net_hours > profile_defaults["daily_max_hours"]:
                violations.append({
                    "shift_id": str(s.id),
                    "store_id": str(s.store_id),
                    "employee_id": emp_id,
                    "violation_type": "daily_overtime_exceeded",
                    "details": f"{net_hours:.1f}h worked, max {profile_defaults['daily_max_hours']}h",
                    "date": s.start_at.date().isoformat(),
                })

            # break compliance check
            if work_hours >= 8 and s.break_minutes < profile_defaults["rest_min_minutes_per_8h"]:
                violations.append({
                    "shift_id": str(s.id),
                    "store_id": str(s.store_id),
                    "employee_id": emp_id,
                    "violation_type": "insufficient_break_8h",
                    "details": f"{s.break_minutes}min break for {work_hours:.1f}h shift, need {profile_defaults['rest_min_minutes_per_8h']}min",
                    "date": s.start_at.date().isoformat(),
                })
            elif work_hours >= 6 and s.break_minutes < profile_defaults["rest_min_minutes_per_6h"]:
                violations.append({
                    "shift_id": str(s.id),
                    "store_id": str(s.store_id),
                    "employee_id": emp_id,
                    "violation_type": "insufficient_break_6h",
                    "details": f"{s.break_minutes}min break for {work_hours:.1f}h shift, need {profile_defaults['rest_min_minutes_per_6h']}min",
                    "date": s.start_at.date().isoformat(),
                })

            # night hours check (22:00-05:00)
            night_start_hour = 22
            night_end_hour = 5
            start_h = s.start_at.hour + s.start_at.minute / 60
            end_h = s.end_at.hour + s.end_at.minute / 60
            if s.end_at.date() > s.start_at.date():
                end_h += 24
            if start_h >= night_start_hour or end_h <= night_end_hour or end_h > 24:
                if float(s.night_hours or 0) > 0:
                    pass  # recorded, not a violation per se

            # rest interval between shifts
            if i > 0:
                prev = shifts[i - 1]
                gap = (s.start_at - prev.end_at).total_seconds() / 3600
                if gap < profile_defaults["rest_interval_min_hours"]:
                    violations.append({
                        "shift_id": str(s.id),
                        "store_id": str(s.store_id),
                        "employee_id": emp_id,
                        "violation_type": "rest_interval_short",
                        "details": f"{gap:.1f}h rest between shifts, min {profile_defaults['rest_interval_min_hours']}h",
                        "date": s.start_at.date().isoformat(),
                    })

            # aggregate weekly hours
            iso_year, iso_week, _ = s.start_at.isocalendar()
            weekly_hours[(iso_year, iso_week)] += net_hours

        # weekly max check
        for (yr, wk), total in weekly_hours.items():
            if total > profile_defaults["weekly_max_hours"]:
                violations.append({
                    "shift_id": None,
                    "store_id": str(shifts[0].store_id) if shifts else None,
                    "employee_id": emp_id,
                    "violation_type": "weekly_overtime_exceeded",
                    "details": f"{total:.1f}h in week {yr}-W{wk:02d}, max {profile_defaults['weekly_max_hours']}h",
                    "date": f"{yr}-W{wk:02d}",
                })

    return violations
