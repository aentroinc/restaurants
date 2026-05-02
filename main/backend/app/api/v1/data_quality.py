from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db, SyncSession
from app.models.data_quality import DataQualityIssue
from app.schemas.common import APIResponse
from app.schemas.data_quality import DataQualityResponse, DataQualitySummary
from app.auth import get_tenant_id
from app.services.dq_engine import run_quality_checks
from app.services.dq_enforcer import check_dataset_health, DATASET_ENTITY_MAP
from app.middleware.dq_check import register_policy, remove_policy, list_policies

router = APIRouter(prefix="/api/v1/data-quality", tags=["data_quality"])


@router.get("/issues", response_model=APIResponse[list[DataQualityResponse]])
async def list_issues(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(DataQualityIssue).where(DataQualityIssue.tenant_id == tenant_id)
    if severity:
        q = q.where(DataQualityIssue.severity == severity)
    if status:
        q = q.where(DataQualityIssue.status == status)
    q = q.order_by(DataQualityIssue.detected_at.desc()).limit(limit)

    result = await db.execute(q)
    items = [DataQualityResponse(
        id=i.id, entity_type=i.entity_type, entity_id=i.entity_id,
        field_name=i.field_name, severity=i.severity, rule_key=i.rule_key,
        description=i.description, status=i.status,
        detected_at=i.detected_at, resolved_at=i.resolved_at,
    ) for i in result.scalars().all()]
    return APIResponse(data=items)


@router.get("/summary", response_model=APIResponse[DataQualitySummary])
async def summary(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    base = DataQualityIssue.tenant_id == tenant_id

    total_q = await db.execute(select(func.count(DataQualityIssue.id)).where(base))
    total = total_q.scalar() or 0

    severity_q = await db.execute(
        select(DataQualityIssue.severity, func.count(DataQualityIssue.id))
        .where(base)
        .group_by(DataQualityIssue.severity)
    )
    sev_counts = {r[0]: r[1] for r in severity_q.all()}

    status_q = await db.execute(
        select(DataQualityIssue.status, func.count(DataQualityIssue.id))
        .where(base)
        .group_by(DataQualityIssue.status)
    )
    status_counts = {r[0]: r[1] for r in status_q.all()}

    return APIResponse(data=DataQualitySummary(
        total=total,
        critical=sev_counts.get("critical", 0),
        high=sev_counts.get("high", 0),
        medium=sev_counts.get("medium", 0),
        low=sev_counts.get("low", 0),
        open=status_counts.get("open", 0),
        resolved=status_counts.get("resolved", 0),
    ))


@router.post("/run-checks", response_model=APIResponse[dict])
async def run_checks(
    entity_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    with SyncSession() as sync_session:
        result = run_quality_checks(sync_session, tenant_id, entity_type)
    return APIResponse(data=result)


@router.get("/policies", response_model=APIResponse[list[dict]])
async def get_policies(tenant_id: str = Depends(get_tenant_id)):
    return APIResponse(data=[
        {"path_prefix": p.path_prefix, "dataset": p.dataset, "mode": p.mode}
        for p in list_policies()
    ])


@router.post("/policies", response_model=APIResponse[dict])
async def upsert_policy(
    body: dict = Body(..., examples=[{"path_prefix": "/api/v1/executive", "dataset": "daily_sales", "mode": "warn"}]),
    tenant_id: str = Depends(get_tenant_id),
):
    """Register/replace a DQ enforcement policy.

    body = {path_prefix: str, dataset: str, mode: 'block'|'warn'}
    """
    path_prefix = body.get("path_prefix")
    dataset = body.get("dataset")
    mode = body.get("mode", "warn")
    if not path_prefix or not dataset:
        return APIResponse(errors=[{"detail": "path_prefix and dataset are required"}])
    if mode not in ("block", "warn"):
        return APIResponse(errors=[{"detail": "mode must be 'block' or 'warn'"}])
    if dataset not in DATASET_ENTITY_MAP:
        return APIResponse(errors=[{
            "detail": f"unknown dataset; valid options: {sorted(DATASET_ENTITY_MAP.keys())}"
        }])
    p = register_policy(path_prefix, dataset, mode)
    return APIResponse(data={
        "path_prefix": p.path_prefix, "dataset": p.dataset, "mode": p.mode,
    })


@router.delete("/policies", response_model=APIResponse[dict])
async def delete_policy(
    path_prefix: str = Query(...),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = remove_policy(path_prefix)
    return APIResponse(data={"removed": ok, "path_prefix": path_prefix})


@router.get("/dashboard", response_model=APIResponse[dict])
async def dashboard(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Per-dataset DQ summary across the current tenant."""
    datasets = {}
    for ds_name in DATASET_ENTITY_MAP:
        if ds_name == "all":
            continue
        h = await check_dataset_health(db, tenant_id, ds_name)
        datasets[ds_name] = h.to_dict()

    overall_q = await db.execute(
        select(DataQualityIssue.severity, func.count(DataQualityIssue.id))
        .where(DataQualityIssue.tenant_id == tenant_id)
        .where(DataQualityIssue.status == "open")
        .group_by(DataQualityIssue.severity)
    )
    overall = {row[0]: int(row[1]) for row in overall_q.all()}

    return APIResponse(data={
        "tenant_id": tenant_id,
        "datasets": datasets,
        "open_by_severity": {
            "critical": overall.get("critical", 0),
            "high": overall.get("high", 0),
            "medium": overall.get("medium", 0),
            "low": overall.get("low", 0),
        },
        "policies": [
            {"path_prefix": p.path_prefix, "dataset": p.dataset, "mode": p.mode}
            for p in list_policies()
        ],
    })
