"""Manual-input API — 8 ontology objects of human-only data.

Each object exposes:
  POST   /api/v1/{plural}            create
  GET    /api/v1/{plural}            list (filter by store_id, paginate)
  GET    /api/v1/{plural}/{id}       fetch
  PATCH  /api/v1/{plural}/{id}       partial update
  DELETE /api/v1/{plural}/{id}       hard delete (with audit row)

Plural mapping:
  daily_reports / waste_logs / complaints / equipment_issues /
  allergy_responses / loss_reports / customer_voices / competitor_scans

Photo upload: re-uses the same multipart pattern as line-check.
  POST /api/v1/manual-input/photos -> {photo_url, size}
"""
from __future__ import annotations

import uuid as uuidlib
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.manual_input import (
    AllergyResponse, Complaint, CompetitorScan, CustomerVoice, DailyReport,
    EquipmentIssue, LossReport, WasteLog,
)
from app.schemas.common import APIResponse
from app.schemas.manual_input import (
    AllergyResponseCreate, AllergyResponseResponse, AllergyResponseUpdate,
    ComplaintCreate, ComplaintResponse, ComplaintUpdate,
    CompetitorScanCreate, CompetitorScanResponse, CompetitorScanUpdate,
    CustomerVoiceCreate, CustomerVoiceResponse, CustomerVoiceUpdate,
    DailyReportCreate, DailyReportResponse, DailyReportUpdate,
    EquipmentIssueCreate, EquipmentIssueResponse, EquipmentIssueUpdate,
    LossReportCreate, LossReportResponse, LossReportUpdate,
    WasteLogCreate, WasteLogResponse, WasteLogUpdate,
)
from app.services import manual_input_engine as mie

router = APIRouter(prefix="/api/v1", tags=["manual-input"])

UPLOAD_DIR = Path("./uploads/manual_input")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# helpers — serialize ORM rows for response
# ---------------------------------------------------------------------------

def _to_payload(model_response_cls, obj) -> dict[str, Any]:
    return model_response_cls.model_validate(obj, from_attributes=True).model_dump(mode="json")


# ---------------------------------------------------------------------------
# 1. DailyReport — /daily-reports
# ---------------------------------------------------------------------------

@router.post("/daily-reports", response_model=APIResponse[dict[str, Any]])
async def create_daily_report(
    body: DailyReportCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie.create_daily_report(db, tenant_id=tenant_id, payload=body.model_dump())
    return APIResponse(data=_to_payload(DailyReportResponse, obj))


@router.get("/daily-reports", response_model=APIResponse[list[dict[str, Any]]])
async def list_daily_reports(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=DailyReport, store_id=store_id,
        limit=limit, offset=offset, order_by=DailyReport.report_date.desc(),
    )
    return APIResponse(data=[_to_payload(DailyReportResponse, r) for r in rows])


@router.get("/daily-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_daily_report(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=DailyReport, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(DailyReportResponse, obj))


@router.patch("/daily-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_daily_report(
    obj_id: UUID,
    body: DailyReportUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=DailyReport, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="daily_report",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(DailyReportResponse, obj))


@router.delete("/daily-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_daily_report(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=DailyReport, obj_id=obj_id, resource_type="daily_report",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 2. WasteLog — /waste-logs (cross-side-effect: cost_variance hint)
# ---------------------------------------------------------------------------

@router.post("/waste-logs", response_model=APIResponse[dict[str, Any]])
async def create_waste_log(
    body: WasteLogCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj, cv = await mie.create_waste_log(db, tenant_id=tenant_id, payload=body.model_dump())
    payload = _to_payload(WasteLogResponse, obj)
    payload["variance_hint_id"] = str(cv.id) if cv else None
    return APIResponse(data=payload)


@router.get("/waste-logs", response_model=APIResponse[list[dict[str, Any]]])
async def list_waste_logs(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=WasteLog, store_id=store_id,
        limit=limit, offset=offset, order_by=WasteLog.waste_date.desc(),
    )
    return APIResponse(data=[_to_payload(WasteLogResponse, r) for r in rows])


@router.get("/waste-logs/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_waste_log(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=WasteLog, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(WasteLogResponse, obj))


@router.patch("/waste-logs/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_waste_log(
    obj_id: UUID,
    body: WasteLogUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=WasteLog, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="waste_log",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(WasteLogResponse, obj))


@router.delete("/waste-logs/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_waste_log(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=WasteLog, obj_id=obj_id, resource_type="waste_log",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 3. Complaint — /complaints (cross-side-effect: high → Task)
# ---------------------------------------------------------------------------

@router.post("/complaints", response_model=APIResponse[dict[str, Any]])
async def create_complaint(
    body: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj, task = await mie.create_complaint(db, tenant_id=tenant_id, payload=body.model_dump())
    payload = _to_payload(ComplaintResponse, obj)
    payload["task_id"] = str(task.id) if task else None
    return APIResponse(data=payload)


@router.get("/complaints", response_model=APIResponse[list[dict[str, Any]]])
async def list_complaints(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=Complaint, store_id=store_id,
        limit=limit, offset=offset, order_by=Complaint.complaint_date.desc(),
    )
    return APIResponse(data=[_to_payload(ComplaintResponse, r) for r in rows])


@router.get("/complaints/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_complaint(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=Complaint, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(ComplaintResponse, obj))


@router.patch("/complaints/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_complaint(
    obj_id: UUID,
    body: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=Complaint, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="complaint",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(ComplaintResponse, obj))


@router.delete("/complaints/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_complaint(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=Complaint, obj_id=obj_id, resource_type="complaint",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 4. EquipmentIssue — /equipment-issues (cross-side-effect: critical → AIP logic)
# ---------------------------------------------------------------------------

@router.post("/equipment-issues", response_model=APIResponse[dict[str, Any]])
async def create_equipment_issue(
    body: EquipmentIssueCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj, aip_result = await mie.create_equipment_issue(
        db, tenant_id=tenant_id, payload=body.model_dump(),
    )
    payload = _to_payload(EquipmentIssueResponse, obj)
    payload["aip_logic_result"] = aip_result
    return APIResponse(data=payload)


@router.get("/equipment-issues", response_model=APIResponse[list[dict[str, Any]]])
async def list_equipment_issues(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=EquipmentIssue, store_id=store_id,
        limit=limit, offset=offset, order_by=EquipmentIssue.requested_at.desc(),
    )
    return APIResponse(data=[_to_payload(EquipmentIssueResponse, r) for r in rows])


@router.get("/equipment-issues/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_equipment_issue(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=EquipmentIssue, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(EquipmentIssueResponse, obj))


@router.patch("/equipment-issues/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_equipment_issue(
    obj_id: UUID,
    body: EquipmentIssueUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=EquipmentIssue, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="equipment_issue",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(EquipmentIssueResponse, obj))


@router.delete("/equipment-issues/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_equipment_issue(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=EquipmentIssue, obj_id=obj_id, resource_type="equipment_issue",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 5. AllergyResponse — /allergy-responses
# ---------------------------------------------------------------------------

@router.post("/allergy-responses", response_model=APIResponse[dict[str, Any]])
async def create_allergy_response(
    body: AllergyResponseCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj, task = await mie.create_allergy_response(db, tenant_id=tenant_id, payload=body.model_dump())
    payload = _to_payload(AllergyResponseResponse, obj)
    payload["task_id"] = str(task.id) if task else None
    return APIResponse(data=payload)


@router.get("/allergy-responses", response_model=APIResponse[list[dict[str, Any]]])
async def list_allergy_responses(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=AllergyResponse, store_id=store_id,
        limit=limit, offset=offset, order_by=AllergyResponse.response_date.desc(),
    )
    return APIResponse(data=[_to_payload(AllergyResponseResponse, r) for r in rows])


@router.get("/allergy-responses/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_allergy_response(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=AllergyResponse, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(AllergyResponseResponse, obj))


@router.patch("/allergy-responses/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_allergy_response(
    obj_id: UUID,
    body: AllergyResponseUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=AllergyResponse, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="allergy_response",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(AllergyResponseResponse, obj))


@router.delete("/allergy-responses/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_allergy_response(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=AllergyResponse, obj_id=obj_id, resource_type="allergy_response",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 6. LossReport — /loss-reports
# ---------------------------------------------------------------------------

@router.post("/loss-reports", response_model=APIResponse[dict[str, Any]])
async def create_loss_report(
    body: LossReportCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie.create_loss_report(db, tenant_id=tenant_id, payload=body.model_dump())
    return APIResponse(data=_to_payload(LossReportResponse, obj))


@router.get("/loss-reports", response_model=APIResponse[list[dict[str, Any]]])
async def list_loss_reports(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=LossReport, store_id=store_id,
        limit=limit, offset=offset, order_by=LossReport.occurred_at.desc(),
    )
    return APIResponse(data=[_to_payload(LossReportResponse, r) for r in rows])


@router.get("/loss-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_loss_report(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=LossReport, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(LossReportResponse, obj))


@router.patch("/loss-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_loss_report(
    obj_id: UUID,
    body: LossReportUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=LossReport, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="loss_report",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(LossReportResponse, obj))


@router.delete("/loss-reports/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_loss_report(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=LossReport, obj_id=obj_id, resource_type="loss_report",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 7. CustomerVoice — /customer-voices
# ---------------------------------------------------------------------------

@router.post("/customer-voices", response_model=APIResponse[dict[str, Any]])
async def create_customer_voice(
    body: CustomerVoiceCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie.create_customer_voice(db, tenant_id=tenant_id, payload=body.model_dump())
    return APIResponse(data=_to_payload(CustomerVoiceResponse, obj))


@router.get("/customer-voices", response_model=APIResponse[list[dict[str, Any]]])
async def list_customer_voices(
    store_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=CustomerVoice, store_id=store_id,
        limit=limit, offset=offset, order_by=CustomerVoice.recorded_at.desc(),
    )
    return APIResponse(data=[_to_payload(CustomerVoiceResponse, r) for r in rows])


@router.get("/customer-voices/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_customer_voice(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=CustomerVoice, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(CustomerVoiceResponse, obj))


@router.patch("/customer-voices/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_customer_voice(
    obj_id: UUID,
    body: CustomerVoiceUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=CustomerVoice, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="customer_voice",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(CustomerVoiceResponse, obj))


@router.delete("/customer-voices/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_customer_voice(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=CustomerVoice, obj_id=obj_id, resource_type="customer_voice",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# 8. CompetitorScan — /competitor-scans
# ---------------------------------------------------------------------------

@router.post("/competitor-scans", response_model=APIResponse[dict[str, Any]])
async def create_competitor_scan(
    body: CompetitorScanCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie.create_competitor_scan(db, tenant_id=tenant_id, payload=body.model_dump())
    return APIResponse(data=_to_payload(CompetitorScanResponse, obj))


@router.get("/competitor-scans", response_model=APIResponse[list[dict[str, Any]]])
async def list_competitor_scans(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await mie._list_objects(
        db, tenant_id=tenant_id, model=CompetitorScan, store_id=None,
        limit=limit, offset=offset, order_by=CompetitorScan.visited_at.desc(),
    )
    return APIResponse(data=[_to_payload(CompetitorScanResponse, r) for r in rows])


@router.get("/competitor-scans/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def get_competitor_scan(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._get_object(db, tenant_id=tenant_id, model=CompetitorScan, obj_id=obj_id)
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(CompetitorScanResponse, obj))


@router.patch("/competitor-scans/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def patch_competitor_scan(
    obj_id: UUID,
    body: CompetitorScanUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await mie._patch_object(
        db, tenant_id=tenant_id, model=CompetitorScan, obj_id=obj_id,
        patch=body.model_dump(exclude_unset=True), resource_type="competitor_scan",
    )
    if obj is None:
        return APIResponse(errors=[{"detail": "not_found"}])
    return APIResponse(data=_to_payload(CompetitorScanResponse, obj))


@router.delete("/competitor-scans/{obj_id}", response_model=APIResponse[dict[str, Any]])
async def delete_competitor_scan(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await mie._delete_object(
        db, tenant_id=tenant_id, model=CompetitorScan, obj_id=obj_id, resource_type="competitor_scan",
    )
    return APIResponse(data={"deleted": ok})


# ---------------------------------------------------------------------------
# Photo upload (shared) — /manual-input/photos
# ---------------------------------------------------------------------------

@router.post("/manual-input/photos", response_model=APIResponse[dict[str, Any]])
async def upload_manual_input_photo(
    file: UploadFile = File(...),
    object_kind: Optional[str] = Form(None),
    tenant_id: str = Depends(get_tenant_id),
):
    """Local-disk upload for POC. Production: stream to S3 and return signed URL."""
    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    name = f"{tenant_id}_{uuidlib.uuid4().hex}{ext}"
    out_path = UPLOAD_DIR / name
    contents = await file.read()
    out_path.write_bytes(contents)
    url = f"/uploads/manual_input/{name}"
    return APIResponse(data={"photo_url": url, "size": len(contents), "object_kind": object_kind})
