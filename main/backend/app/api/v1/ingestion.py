from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import io
import uuid

from app.database import get_db
from app.models.ingestion import IngestionBatch
from app.schemas.common import APIResponse
from app.services.ingestion import (
    process_csv_upload,
    promote_csv_upload,
    generate_csv_template,
    ENTITY_SCHEMAS,
)
from app.services.ingestion_pipeline import run_pipeline, STAGES
from app.middleware.audit import log_audit
from app.auth import get_tenant_id
from app.auth_rbac import require_permission

router = APIRouter(prefix="/api/v1/ingestion", tags=["ingestion"])


@router.post("/upload")
async def upload_csv(
    entity_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if entity_type not in ENTITY_SCHEMAS:
        raise HTTPException(400, f"Invalid entity_type. Valid: {list(ENTITY_SCHEMAS.keys())}")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    try:
        result = await process_csv_upload(
            db=db,
            tenant_id=tenant_id,
            entity_type=entity_type,
            file_content=content,
            file_name=file.filename or "unknown.csv",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    batch_id = result.get("batch_id") if isinstance(result, dict) else None
    log_audit(tenant_id, None, "upload_csv", "ingestion_batch", batch_id,
              {"entity_type": entity_type, "file_name": file.filename})

    return APIResponse(data=result)


@router.get("/batches")
async def list_batches(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    count_q = await db.execute(
        select(func.count(IngestionBatch.id)).where(
            IngestionBatch.tenant_id == uuid.UUID(tenant_id)
        )
    )
    total = count_q.scalar() or 0

    result = await db.execute(
        select(IngestionBatch)
        .where(IngestionBatch.tenant_id == uuid.UUID(tenant_id))
        .order_by(IngestionBatch.uploaded_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    data = []
    for b in result.scalars().all():
        data.append({
            "id": str(b.id),
            "source_system": b.source_system,
            "entity_type": b.entity_type,
            "file_name": b.file_name,
            "file_hash": b.file_hash,
            "status": b.status,
            "row_count": b.row_count,
            "valid_row_count": b.valid_row_count,
            "invalid_row_count": b.invalid_row_count,
            "uploaded_at": b.uploaded_at.isoformat() if b.uploaded_at else None,
            "validated_at": b.validated_at.isoformat() if b.validated_at else None,
            "promoted_at": b.promoted_at.isoformat() if b.promoted_at else None,
        })

    return APIResponse(
        data=data,
        meta={"total": total, "page": page, "page_size": page_size},
    )


@router.get("/batches/{batch_id}")
async def get_batch(batch_id: str, db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    result = await db.execute(
        select(IngestionBatch).where(
            IngestionBatch.id == uuid.UUID(batch_id),
            IngestionBatch.tenant_id == uuid.UUID(tenant_id),
        )
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Batch not found")

    data = {
        "id": str(b.id),
        "source_system": b.source_system,
        "entity_type": b.entity_type,
        "file_name": b.file_name,
        "file_hash": b.file_hash,
        "status": b.status,
        "row_count": b.row_count,
        "valid_row_count": b.valid_row_count,
        "invalid_row_count": b.invalid_row_count,
        "validation_errors": b.validation_errors,
        "uploaded_at": b.uploaded_at.isoformat() if b.uploaded_at else None,
        "validated_at": b.validated_at.isoformat() if b.validated_at else None,
        "promoted_at": b.promoted_at.isoformat() if b.promoted_at else None,
    }
    return APIResponse(data=data)


@router.post("/batches/{batch_id}/promote")
async def promote_batch(
    batch_id: str,
    entity_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    try:
        result = await promote_csv_upload(
            db=db,
            tenant_id=tenant_id,
            entity_type=entity_type,
            file_content=content,
            batch_id=batch_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    log_audit(tenant_id, None, "promote_batch", "ingestion_batch", batch_id,
              {"entity_type": entity_type})

    return APIResponse(data=result)


@router.post("/batches/{batch_id}/run-pipeline")
async def run_batch_pipeline(
    batch_id: str,
    auto_approve: bool = False,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("ingestion", "write")),
):
    """Run the 8-stage ingestion pipeline on a batch."""
    try:
        batch_uuid = uuid.UUID(batch_id)
    except ValueError:
        raise HTTPException(400, "Invalid batch_id")

    batch_q = await db.execute(
        select(IngestionBatch).where(
            IngestionBatch.id == batch_uuid,
            IngestionBatch.tenant_id == uuid.UUID(tenant_id),
        )
    )
    if not batch_q.scalar_one_or_none():
        raise HTTPException(404, "Batch not found")

    result = await run_pipeline(db, batch_uuid, auto_approve=auto_approve)
    log_audit(tenant_id, None, "run_pipeline", "ingestion_batch", batch_id,
              {"auto_approve": auto_approve})
    return APIResponse(data=result)


@router.get("/pipeline/stages")
async def pipeline_stages():
    return {"stages": list(STAGES)}


@router.get("/templates/{entity_type}")
async def download_template(entity_type: str):
    if entity_type not in ENTITY_SCHEMAS:
        raise HTTPException(400, f"Invalid entity_type. Valid: {list(ENTITY_SCHEMAS.keys())}")

    csv_content = generate_csv_template(entity_type)
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type}_template.csv"},
    )
