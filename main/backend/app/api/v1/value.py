from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID, uuid4
from app.database import get_db
from app.models.value_case import ValueCase, ValueCaseMetric
from app.schemas.common import APIResponse
from app.schemas.value import ValueCaseResponse, ValueCaseMetricResponse, ValueCaseCreate
from app.auth import get_tenant_id
from app.services.value_measurement import measure_value_case, measure_all_active

router = APIRouter(prefix="/api/v1/value-cases", tags=["value"])

DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000010"


@router.get("", response_model=APIResponse[list[ValueCaseResponse]])
async def list_value_cases(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(ValueCase).where(ValueCase.tenant_id == tenant_id).order_by(ValueCase.created_at.desc())
    )
    cases = []
    for vc in q.scalars().all():
        metrics_q = await db.execute(select(ValueCaseMetric).where(ValueCaseMetric.value_case_id == vc.id))
        metrics = [ValueCaseMetricResponse(
            metric_name=m.metric_name, baseline_value=m.baseline_value,
            measured_value=m.measured_value, peer_adjusted_value=m.peer_adjusted_value,
            estimated_impact_amount=m.estimated_impact_amount,
        ) for m in metrics_q.scalars().all()]

        cases.append(ValueCaseResponse(
            id=vc.id, name=vc.name, issue_type=vc.issue_type, status=vc.status,
            target_store_ids=vc.target_store_ids,
            baseline_start=vc.baseline_start, baseline_end=vc.baseline_end,
            measurement_start=vc.measurement_start, measurement_end=vc.measurement_end,
            expected_impact_amount=vc.expected_impact_amount,
            realized_impact_amount=vc.realized_impact_amount, metrics=metrics,
        ))
    return APIResponse(data=cases)


@router.get("/{vc_id}", response_model=APIResponse[ValueCaseResponse])
async def get_value_case(
    vc_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(ValueCase).where(and_(ValueCase.id == vc_id, ValueCase.tenant_id == tenant_id))
    )
    vc = q.scalar_one_or_none()
    if not vc:
        return APIResponse(errors=[{"detail": "Value case not found"}])

    metrics_q = await db.execute(select(ValueCaseMetric).where(ValueCaseMetric.value_case_id == vc.id))
    metrics = [ValueCaseMetricResponse(
        metric_name=m.metric_name, baseline_value=m.baseline_value,
        measured_value=m.measured_value, peer_adjusted_value=m.peer_adjusted_value,
        estimated_impact_amount=m.estimated_impact_amount,
    ) for m in metrics_q.scalars().all()]

    return APIResponse(data=ValueCaseResponse(
        id=vc.id, name=vc.name, issue_type=vc.issue_type, status=vc.status,
        target_store_ids=vc.target_store_ids,
        baseline_start=vc.baseline_start, baseline_end=vc.baseline_end,
        measurement_start=vc.measurement_start, measurement_end=vc.measurement_end,
        expected_impact_amount=vc.expected_impact_amount,
        realized_impact_amount=vc.realized_impact_amount, metrics=metrics,
    ))


@router.post("", response_model=APIResponse[ValueCaseResponse])
async def create_value_case(
    body: ValueCaseCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    vc = ValueCase(
        id=uuid4(), tenant_id=UUID(tenant_id), company_id=UUID(DEMO_COMPANY_ID),
        name=body.name, issue_type=body.issue_type,
        target_store_ids=body.target_store_ids,
        baseline_start=body.baseline_start, baseline_end=body.baseline_end,
        measurement_start=body.measurement_start,
        expected_impact_amount=body.expected_impact_amount, status="active",
    )
    db.add(vc)
    await db.commit()
    await db.refresh(vc)
    return APIResponse(data=ValueCaseResponse(
        id=vc.id, name=vc.name, issue_type=vc.issue_type, status=vc.status,
        target_store_ids=vc.target_store_ids,
        baseline_start=vc.baseline_start, baseline_end=vc.baseline_end,
        measurement_start=vc.measurement_start,
        expected_impact_amount=vc.expected_impact_amount,
    ))


@router.post("/measure-all", response_model=APIResponse[list[dict]])
async def trigger_measure_all(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    results = await measure_all_active(db, tenant_id)
    await db.commit()
    return APIResponse(data=results)


@router.post("/{vc_id}/measure", response_model=APIResponse[dict])
async def trigger_measurement(
    vc_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await measure_value_case(db, str(vc_id), tenant_id)
    if result.get("error"):
        return APIResponse(data=result, errors=[{"detail": result["error"]}])
    await db.commit()
    return APIResponse(data=result)
