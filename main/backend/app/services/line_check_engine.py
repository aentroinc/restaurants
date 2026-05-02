"""Line Check engine.

Drives a checklist run lifecycle: start, submit answer (with NG detection),
and complete. NG answers (temperature out of range, missing photo, ok=false)
auto-create tasks via app.models.task.Task and flag the run as failed when
required photos are missing or required items fail.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4
from typing import Any
import math

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.line_check import (
    ChecklistTemplate, ChecklistItem, ChecklistRun, ChecklistAnswer,
)
from app.models.task import Task
from app.models.store import Store


# Default geofence radius in meters
GEOFENCE_RADIUS_M = 200.0


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def _check_geofence(db: AsyncSession, store_id: UUID, lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    r = await db.execute(select(Store).where(Store.id == store_id))
    store = r.scalar_one_or_none()
    if not store:
        return False
    s_lat = getattr(store, "lat", None) or getattr(store, "latitude", None)
    s_lon = getattr(store, "lng", None) or getattr(store, "lon", None) or getattr(store, "longitude", None)
    if s_lat is None or s_lon is None:
        # If store has no coords, accept any location (POC).
        return True
    try:
        d = _haversine_m(float(lat), float(lon), float(s_lat), float(s_lon))
    except Exception:
        return False
    return d <= GEOFENCE_RADIUS_M


async def start_run(
    db: AsyncSession,
    *,
    tenant_id: str,
    template_id: UUID,
    store_id: UUID,
    employee_id: UUID | None,
    lat: float | None,
    lon: float | None,
) -> ChecklistRun:
    geofence_ok = await _check_geofence(db, store_id, lat, lon)
    run = ChecklistRun(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        template_id=template_id,
        store_id=store_id,
        employee_id=employee_id,
        lat=lat,
        lon=lon,
        geofence_ok=geofence_ok,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


def evaluate_answer(
    *,
    requires_temperature: bool,
    requires_photo: bool,
    min_temp: float | None,
    max_temp: float | None,
    value_number: float | None,
    photo_url: str | None,
) -> tuple[bool, str | None]:
    """Pure helper: decide ok / NG reason for one answer. Mirrors submit_answer logic."""
    ok = True
    reason: str | None = None
    if requires_temperature:
        if value_number is None:
            ok = False
            reason = "温度未入力"
        else:
            if min_temp is not None and float(value_number) < float(min_temp):
                ok = False
                reason = f"温度下限割れ ({value_number}℃ < {min_temp}℃)"
            elif max_temp is not None and float(value_number) > float(max_temp):
                ok = False
                reason = f"温度上限超え ({value_number}℃ > {max_temp}℃)"
    if requires_photo and not photo_url:
        ok = False
        reason = reason or "写真欠落"
    return ok, reason


async def _create_ng_task(
    db: AsyncSession,
    *,
    tenant_id: str,
    run: ChecklistRun,
    item: ChecklistItem,
    reason: str,
) -> Task:
    task = Task(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=run.store_id,
        title=f"[NG] {item.text[:80]}",
        description=f"Line Check NG: {reason}\nrun_id={run.id}",
        issue_type="line_check_ng",
        status="open",
        priority="high",
        source="line_check",
    )
    db.add(task)
    return task


async def submit_answer(
    db: AsyncSession,
    *,
    tenant_id: str,
    run_id: UUID,
    item_id: UUID,
    value_text: str | None = None,
    value_number: float | None = None,
    photo_url: str | None = None,
    comment: str | None = None,
) -> tuple[ChecklistAnswer, Task | None]:
    run = (await db.execute(
        select(ChecklistRun).where(and_(ChecklistRun.id == run_id, ChecklistRun.tenant_id == tenant_id))
    )).scalar_one_or_none()
    if run is None:
        raise ValueError("run_not_found")
    item = (await db.execute(select(ChecklistItem).where(ChecklistItem.id == item_id))).scalar_one_or_none()
    if item is None:
        raise ValueError("item_not_found")

    ok, ng_reason = evaluate_answer(
        requires_temperature=item.requires_temperature,
        requires_photo=item.requires_photo,
        min_temp=float(item.min_temp) if item.min_temp is not None else None,
        max_temp=float(item.max_temp) if item.max_temp is not None else None,
        value_number=value_number,
        photo_url=photo_url,
    )

    answer = ChecklistAnswer(
        id=uuid4(),
        run_id=run.id,
        item_id=item.id,
        value_text=value_text,
        value_number=value_number,
        photo_url=photo_url,
        ok=ok,
        comment=comment,
    )
    db.add(answer)

    task: Task | None = None
    if not ok:
        task = await _create_ng_task(db, tenant_id=tenant_id, run=run, item=item, reason=ng_reason or "NG")

    await db.commit()
    await db.refresh(answer)
    return answer, task


async def complete_run(
    db: AsyncSession,
    *,
    tenant_id: str,
    run_id: UUID,
) -> ChecklistRun:
    run = (await db.execute(
        select(ChecklistRun).where(and_(ChecklistRun.id == run_id, ChecklistRun.tenant_id == tenant_id))
    )).scalar_one_or_none()
    if run is None:
        raise ValueError("run_not_found")

    items = (await db.execute(
        select(ChecklistItem).where(ChecklistItem.template_id == run.template_id).order_by(ChecklistItem.order)
    )).scalars().all()
    answers = (await db.execute(
        select(ChecklistAnswer).where(ChecklistAnswer.run_id == run.id)
    )).scalars().all()

    by_item: dict[UUID, ChecklistAnswer] = {a.item_id: a for a in answers}

    failed = False
    for it in items:
        a = by_item.get(it.id)
        if it.required and a is None:
            failed = True
            break
        if a is None:
            continue
        if it.requires_photo and not a.photo_url:
            failed = True
            break
        if not a.ok:
            failed = True
            # Don't break – keep walking so engine reports overall failure but
            # all NG tasks have already been created at submit time.

    run.completed_at = datetime.now(timezone.utc)
    run.status = "failed" if failed else "completed"
    await db.commit()
    await db.refresh(run)
    return run


def serialize_run(run: ChecklistRun) -> dict[str, Any]:
    return {
        "id": str(run.id),
        "template_id": str(run.template_id),
        "store_id": str(run.store_id),
        "employee_id": str(run.employee_id) if run.employee_id else None,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "status": run.status,
        "geofence_ok": run.geofence_ok,
        "lat": float(run.lat) if run.lat is not None else None,
        "lon": float(run.lon) if run.lon is not None else None,
    }


def serialize_template(t: ChecklistTemplate) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "name": t.name,
        "schedule_type": t.schedule_type,
        "brand_id": str(t.brand_id) if t.brand_id else None,
        "store_id": str(t.store_id) if t.store_id else None,
        "active": t.active,
        "items": [
            {
                "id": str(i.id),
                "order": i.order,
                "text": i.text,
                "required": i.required,
                "requires_photo": i.requires_photo,
                "requires_temperature": i.requires_temperature,
                "min_temp": float(i.min_temp) if i.min_temp is not None else None,
                "max_temp": float(i.max_temp) if i.max_temp is not None else None,
            }
            for i in (t.items or [])
        ],
    }


def serialize_answer(a: ChecklistAnswer) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "run_id": str(a.run_id),
        "item_id": str(a.item_id),
        "value_text": a.value_text,
        "value_number": float(a.value_number) if a.value_number is not None else None,
        "photo_url": a.photo_url,
        "ok": a.ok,
        "comment": a.comment,
    }
