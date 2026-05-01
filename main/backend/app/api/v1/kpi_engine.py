import time
from datetime import date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db, SyncSession
from app.models.kpi import StoreDailyKPI
from app.services.kpi_engine import recalculate_kpis
from app.schemas.common import APIResponse
from app.middleware.audit import log_audit
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/kpi", tags=["kpi-engine"])


class RecalculateRequest(BaseModel):
    store_ids: list[UUID] | None = None
    start_date: date | None = None
    end_date: date | None = None


class RecalculateResponse(BaseModel):
    recalculated_stores: int
    recalculated_records: int
    duration_ms: int


class CalculationStatus(BaseModel):
    last_calculated_date: date | None
    earliest_kpi_date: date | None
    latest_kpi_date: date | None
    total_kpi_records: int


@router.post("/recalculate", response_model=APIResponse[RecalculateResponse])
async def recalculate(body: RecalculateRequest, tenant_id: str = Depends(get_tenant_id)):
    t0 = time.monotonic()

    session = SyncSession()
    try:
        result = recalculate_kpis(
            session=session,
            tenant_id=tenant_id,
            store_ids=[str(s) for s in body.store_ids] if body.store_ids else None,
            start_date=body.start_date,
            end_date=body.end_date,
        )
    finally:
        session.close()

    duration_ms = int((time.monotonic() - t0) * 1000)

    log_audit(
        tenant_id=tenant_id,
        user_id=None,
        action="recalculate_kpis",
        resource_type="kpi",
        metadata={
            "stores": result["recalculated_stores"],
            "records": result["recalculated_records"],
            "duration_ms": duration_ms,
            "start_date": str(body.start_date) if body.start_date else None,
            "end_date": str(body.end_date) if body.end_date else None,
        },
    )

    return APIResponse(data=RecalculateResponse(
        recalculated_stores=result["recalculated_stores"],
        recalculated_records=result["recalculated_records"],
        duration_ms=duration_ms,
    ))


@router.get("/calculation-status", response_model=APIResponse[CalculationStatus])
async def calculation_status(db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):

    result = await db.execute(
        select(
            func.max(StoreDailyKPI.updated_at),
            func.min(StoreDailyKPI.business_date),
            func.max(StoreDailyKPI.business_date),
            func.count(StoreDailyKPI.id),
        )
        .where(StoreDailyKPI.tenant_id == tenant_id)
    )
    row = result.one()

    last_calc = row[0].date() if row[0] else None

    return APIResponse(data=CalculationStatus(
        last_calculated_date=last_calc,
        earliest_kpi_date=row[1],
        latest_kpi_date=row[2],
        total_kpi_records=row[3] or 0,
    ))
