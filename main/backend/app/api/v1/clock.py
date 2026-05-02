"""打刻 API: in / out / break_start / break_end + 当日履歴。"""
from __future__ import annotations

import math
from datetime import datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.compliance_violation import ComplianceViolation
from app.models.employee import Employee
from app.models.face_auth import ClockEvent
from app.models.store import Store
from app.schemas.common import APIResponse
from app.schemas.face_auth import ClockEventCreate, ClockEventRead
from app.services.consent_engine import ConsentRequiredError, check_required_consents
from app.services.face_auth_engine import DoublePunchError, clock_in as engine_clock_in
from app.services.labor_compliance_engine import (
    check_break_taken,
    evaluate_minor_night,
    _calc_age,
)


router = APIRouter(prefix="/api/v1/clock", tags=["clock"])

DEFAULT_GEOFENCE_RADIUS_M = 200.0


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def _check_geofence(db: AsyncSession, store_id: UUID, lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    res = await db.execute(select(Store.lat, Store.lng).where(Store.id == store_id))
    row = res.first()
    if not row or row[0] is None or row[1] is None:
        return False
    return _haversine_m(float(lat), float(lon), float(row[0]), float(row[1])) <= DEFAULT_GEOFENCE_RADIUS_M


def _to_read(ev: ClockEvent) -> ClockEventRead:
    return ClockEventRead(
        id=ev.id, employee_id=ev.employee_id, store_id=ev.store_id,
        event_type=ev.event_type, lat=float(ev.lat) if ev.lat is not None else None,
        lon=float(ev.lon) if ev.lon is not None else None, geofence_ok=ev.geofence_ok,
        auth_method=ev.auth_method, confidence=float(ev.confidence) if ev.confidence is not None else None,
        occurred_at=ev.occurred_at,
    )


async def _create_event(
    db: AsyncSession, tenant_id: str, body: ClockEventCreate, event_type: str,
) -> ClockEvent:
    geo_ok = await _check_geofence(db, body.store_id, body.lat, body.lon)
    try:
        return await engine_clock_in(
            db,
            tenant_id=UUID(tenant_id),
            employee_id=body.employee_id,
            store_id=body.store_id,
            event_type=event_type,
            auth_method=body.auth_method,
            lat=body.lat,
            lon=body.lon,
            geofence_ok=geo_ok,
            confidence=body.confidence,
            idempotency_key=body.idempotency_key,
            accuracy_m=body.accuracy_m,
        )
    except DoublePunchError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "double_punch",
                "message": str(e),
                "last_event_id": str(e.last_event_id) if e.last_event_id else None,
            },
        )


async def _block_minor_night(db: AsyncSession, tenant_id: str, body: ClockEventCreate) -> None:
    """未成年(<18) は 22:00-05:00 の clock_in を禁止 (deep_night_allowed フラグで除外可)。"""
    res = await db.execute(
        select(Employee).where(
            Employee.tenant_id == UUID(tenant_id),
            Employee.id == body.employee_id,
        )
    )
    emp = res.scalar_one_or_none()
    if not emp:
        return
    birth = getattr(emp, "birth_date", None)
    deep_ok = bool(getattr(emp, "deep_night_allowed", False))
    now = datetime.now(timezone.utc)
    age = _calc_age(birth, now.date())
    r = evaluate_minor_night(age, now, deep_night_allowed=deep_ok)
    if r.status == "block":
        # 違反を永続化してから拒否
        db.add(ComplianceViolation(
            tenant_id=UUID(tenant_id),
            employee_id=body.employee_id,
            store_id=body.store_id,
            rule_code=r.rule_code,
            severity="block",
            detail_json={"message": r.message, **r.detail},
        ))
        await db.commit()
        raise HTTPException(status_code=403, detail={
            "code": "minor_night_forbidden",
            "message": r.message,
            "rule_code": r.rule_code,
        })


async def _maybe_emit_break_task(db: AsyncSession, tenant_id: str, employee_id: UUID, store_id: UUID) -> None:
    """6h超 で休憩取得記録がない場合、Task を自動発行 (重複作成を避ける best-effort)。"""
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)
    res = await db.execute(
        select(ClockEvent).where(
            ClockEvent.tenant_id == UUID(tenant_id),
            ClockEvent.employee_id == employee_id,
            ClockEvent.occurred_at >= today_start,
        ).order_by(ClockEvent.occurred_at.asc())
    )
    evs = [{"event_type": e.event_type, "occurred_at": e.occurred_at} for e in res.scalars().all()]
    r = check_break_taken(evs)
    if r.status in ("warn", "block") and r.rule_code in ("BREAK_6H", "BREAK_8H"):
        # 違反 / 警告として記録
        db.add(ComplianceViolation(
            tenant_id=UUID(tenant_id),
            employee_id=employee_id,
            store_id=store_id,
            rule_code=r.rule_code,
            severity=r.status,
            detail_json={"message": r.message, **r.detail},
        ))
        await db.commit()


@router.post("/in", response_model=APIResponse[ClockEventRead])
async def clock_in(
    body: ClockEventCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # 個人情報保護法: 位置情報取得 + 打刻記録保管の同意を確認
    try:
        await check_required_consents(
            db, UUID(tenant_id), body.employee_id, ["gps", "clock_retention"],
        )
    except ConsentRequiredError as e:
        raise HTTPException(
            status_code=403,
            detail={"error": "consent_required", "missing": e.missing, "message": "GPS / 打刻記録保管の同意が必要です"},
        )
    await _block_minor_night(db, tenant_id, body)
    ev = await _create_event(db, tenant_id, body, "in")
    return APIResponse(data=_to_read(ev))


@router.post("/out", response_model=APIResponse[ClockEventRead])
async def clock_out(
    body: ClockEventCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ev = await _create_event(db, tenant_id, body, "out")
    # 6h超で休憩なしの場合は ComplianceViolation を自動記録
    try:
        await _maybe_emit_break_task(db, tenant_id, body.employee_id, body.store_id)
    except Exception:
        pass
    return APIResponse(data=_to_read(ev))


@router.post("/break/{kind}", response_model=APIResponse[ClockEventRead])
async def clock_break(
    body: ClockEventCreate,
    kind: str = Path(..., pattern="^(start|end)$"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    event_type = "break_start" if kind == "start" else "break_end"
    ev = await _create_event(db, tenant_id, body, event_type)
    return APIResponse(data=_to_read(ev))


@router.get("/today/{employee_id}", response_model=APIResponse[list[ClockEventRead]])
async def today_events(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    res = await db.execute(
        select(ClockEvent)
        .where(
            ClockEvent.tenant_id == UUID(tenant_id),
            ClockEvent.employee_id == employee_id,
            ClockEvent.occurred_at >= start,
        )
        .order_by(ClockEvent.occurred_at.asc())
    )
    rows = res.scalars().all()
    return APIResponse(data=[_to_read(r) for r in rows])
