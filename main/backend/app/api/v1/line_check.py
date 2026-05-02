"""Line Check API — opening / closing / 4h checklists with photos and geofence."""
from __future__ import annotations

import os
import uuid as uuidlib
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Path as PathParam, Query, UploadFile
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_tenant_id, require_role
from app.database import get_db
from app.models.line_check import (
    ChecklistAnswer, ChecklistItem, ChecklistRun, ChecklistTemplate,
)
from app.schemas.common import APIResponse
from app.services.line_check_engine import (
    complete_run, serialize_answer, serialize_run, serialize_template,
    start_run, submit_answer,
)
from app.services.line_check_seeds import seed_line_check_templates

router = APIRouter(prefix="/api/v1/line-check", tags=["line-check"])


# Local upload dir. Production: swap for S3 — see line_check.photos endpoint.
UPLOAD_DIR = Path("./uploads/line_check")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------- Templates ----------

@router.get("/templates", response_model=APIResponse[list[dict[str, Any]]])
async def list_templates(
    schedule_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(ChecklistTemplate)
        .options(selectinload(ChecklistTemplate.items))
        .where(ChecklistTemplate.tenant_id == tenant_id, ChecklistTemplate.active == True)  # noqa: E712
    )
    if schedule_type:
        q = q.where(ChecklistTemplate.schedule_type == schedule_type)
    q = q.order_by(ChecklistTemplate.created_at.desc())
    rows = (await db.execute(q)).scalars().all()

    if not rows:
        # Auto-seed for the tenant on first call (POC convenience).
        try:
            await seed_line_check_templates(db, UUID(tenant_id))
        except Exception:
            pass
        rows = (await db.execute(q)).scalars().all()

    return APIResponse(data=[serialize_template(t) for t in rows])


@router.post("/templates", response_model=APIResponse[dict[str, Any]])
async def create_template(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user=Depends(require_role("admin", "director", "sv")),
):
    tpl = ChecklistTemplate(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        name=body.get("name", "新規チェックリスト"),
        schedule_type=body.get("schedule_type", "opening"),
        brand_id=UUID(body["brand_id"]) if body.get("brand_id") else None,
        store_id=UUID(body["store_id"]) if body.get("store_id") else None,
        active=body.get("active", True),
    )
    for idx, item in enumerate(body.get("items", [])):
        tpl.items.append(ChecklistItem(
            id=uuid4(),
            template_id=tpl.id,
            order=item.get("order", idx),
            text=item["text"],
            required=item.get("required", True),
            requires_photo=item.get("requires_photo", False),
            requires_temperature=item.get("requires_temperature", False),
            min_temp=item.get("min_temp"),
            max_temp=item.get("max_temp"),
        ))
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    # Re-load with items
    tpl = (await db.execute(
        select(ChecklistTemplate).options(selectinload(ChecklistTemplate.items))
        .where(ChecklistTemplate.id == tpl.id)
    )).scalar_one()
    return APIResponse(data=serialize_template(tpl))


# ---------- Runs ----------

@router.post("/runs", response_model=APIResponse[dict[str, Any]])
async def create_run(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    run = await start_run(
        db,
        tenant_id=tenant_id,
        template_id=UUID(body["template_id"]),
        store_id=UUID(body["store_id"]),
        employee_id=UUID(body["employee_id"]) if body.get("employee_id") else None,
        lat=body.get("lat"),
        lon=body.get("lon"),
    )
    return APIResponse(data=serialize_run(run))


@router.get("/runs/{run_id}", response_model=APIResponse[dict[str, Any]])
async def get_run(
    run_id: UUID = PathParam(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    run = (await db.execute(
        select(ChecklistRun).where(and_(ChecklistRun.id == run_id, ChecklistRun.tenant_id == tenant_id))
    )).scalar_one_or_none()
    if run is None:
        return APIResponse(errors=[{"detail": "run_not_found"}])
    answers = (await db.execute(
        select(ChecklistAnswer).where(ChecklistAnswer.run_id == run.id)
    )).scalars().all()
    payload = serialize_run(run)
    payload["answers"] = [serialize_answer(a) for a in answers]
    return APIResponse(data=payload)


@router.post("/runs/{run_id}/answers", response_model=APIResponse[dict[str, Any]])
async def post_answer(
    body: dict[str, Any],
    run_id: UUID = PathParam(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        answer, task = await submit_answer(
            db,
            tenant_id=tenant_id,
            run_id=run_id,
            item_id=UUID(body["item_id"]),
            value_text=body.get("value_text"),
            value_number=body.get("value_number"),
            photo_url=body.get("photo_url"),
            comment=body.get("comment"),
        )
    except ValueError as e:
        return APIResponse(errors=[{"detail": str(e)}])
    out = serialize_answer(answer)
    out["task_id"] = str(task.id) if task else None
    return APIResponse(data=out)


@router.post("/runs/{run_id}/complete", response_model=APIResponse[dict[str, Any]])
async def post_complete(
    run_id: UUID = PathParam(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        run = await complete_run(db, tenant_id=tenant_id, run_id=run_id)
    except ValueError as e:
        return APIResponse(errors=[{"detail": str(e)}])
    return APIResponse(data=serialize_run(run))


@router.get("/runs", response_model=APIResponse[list[dict[str, Any]]])
async def list_runs(
    store_id: UUID | None = Query(None),
    date_str: str | None = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(ChecklistRun).where(ChecklistRun.tenant_id == tenant_id)
    if store_id:
        q = q.where(ChecklistRun.store_id == store_id)
    if date_str:
        try:
            d = date.fromisoformat(date_str)
            start = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
            end = start + timedelta(days=1)
            q = q.where(and_(ChecklistRun.started_at >= start, ChecklistRun.started_at < end))
        except ValueError:
            pass
    q = q.order_by(ChecklistRun.started_at.desc()).limit(200)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[serialize_run(r) for r in rows])


# ---------- Photo upload (multipart, local disk; replace with S3 in prod) ----------

@router.post("/photos", response_model=APIResponse[dict[str, Any]])
async def upload_photo(
    file: UploadFile = File(...),
    run_id: str | None = Form(None),
    tenant_id: str = Depends(get_tenant_id),
):
    """Local disk upload for POC. Production: stream to S3 via boto3 and return signed URL."""
    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    name = f"{tenant_id}_{uuidlib.uuid4().hex}{ext}"
    out_path = UPLOAD_DIR / name
    contents = await file.read()
    out_path.write_bytes(contents)
    url = f"/uploads/line_check/{name}"
    return APIResponse(data={"photo_url": url, "size": len(contents)})
