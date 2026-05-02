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
from app.models.face_auth import ClockEvent
from app.models.store import Store
from app.schemas.common import APIResponse
from app.schemas.face_auth import ClockEventCreate, ClockEventRead


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
    ev = ClockEvent(
        tenant_id=UUID(tenant_id),
        employee_id=body.employee_id,
        store_id=body.store_id,
        event_type=event_type,
        lat=body.lat,
        lon=body.lon,
        geofence_ok=geo_ok,
        auth_method=body.auth_method,
        confidence=body.confidence,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return ev


@router.post("/in", response_model=APIResponse[ClockEventRead])
async def clock_in(
    body: ClockEventCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ev = await _create_event(db, tenant_id, body, "in")
    return APIResponse(data=_to_read(ev))


@router.post("/out", response_model=APIResponse[ClockEventRead])
async def clock_out(
    body: ClockEventCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ev = await _create_event(db, tenant_id, body, "out")
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
