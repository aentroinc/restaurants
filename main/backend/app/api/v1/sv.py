from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from decimal import Decimal
from datetime import date
from app.database import get_db
from app.models.store import Store
from app.models.brand import Brand
from app.models.area import Area
from app.models.kpi import StoreDailyKPI
from app.models.sv_visit import SVVisit
from app.models.task import Task as TaskModel
from app.schemas.common import APIResponse
from app.schemas.sv import SVMission, SuggestedAction
from app.services.sv_prioritizer import calculate_sv_priority
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/sv", tags=["sv"])


@router.get("/missions", response_model=APIResponse[list[SVMission]])
async def sv_missions(
    as_of: date | None = Query(None),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if as_of is None:
        as_of = date(2026, 4, 30)

    q = await db.execute(
        select(
            Store, Brand.name, Area.name, StoreDailyKPI,
        )
        .join(Brand, Brand.id == Store.brand_id)
        .outerjoin(Area, Area.id == Store.area_id)
        .outerjoin(StoreDailyKPI, and_(StoreDailyKPI.store_id == Store.id, StoreDailyKPI.business_date == as_of))
        .where(and_(Store.status == "active", Store.tenant_id == tenant_id))
    )

    missions = []
    for row in q.all():
        store, brand_name, area_name, kpi = row

        visit_q = await db.execute(
            select(func.max(SVVisit.visit_date)).where(and_(SVVisit.store_id == store.id, SVVisit.tenant_id == tenant_id))
        )
        last_visit = visit_q.scalar()
        days_since = (as_of - last_visit).days if last_visit else None

        task_q = await db.execute(
            select(func.count(TaskModel.id))
            .where(and_(TaskModel.store_id == store.id, TaskModel.tenant_id == tenant_id, TaskModel.status.in_(["open", "in_progress"])))
        )
        open_tasks = task_q.scalar() or 0

        health = float(kpi.health_score) if kpi and kpi.health_score else None
        improvement = float(kpi.improvement_opportunity_amount) if kpi and kpi.improvement_opportunity_amount else None

        priority = calculate_sv_priority(health, improvement, days_since, open_tasks)

        issue_types = []
        if kpi and kpi.issue_types:
            for i in kpi.issue_types:
                if isinstance(i, str):
                    issue_types.append(i)
                elif isinstance(i, dict):
                    issue_types.append(i.get("issue_type", ""))

        actions = []
        action_map = {
            "labor_overrun": ("シフト管理の見直しと人時売上高の改善計画を策定", "人件費率がピアグループ中央値を超過"),
            "cogs_overrun": ("発注量・ロス率の確認と原価管理改善", "原価率がピアグループ中央値を超過"),
            "sales_decline": ("客数・客単価の内訳を分析し集客施策を検討", "売上がYoYで減少"),
            "review_decline": ("口コミ内容を確認しサービス品質改善", "口コミスコアが低下"),
            "discount_overuse": ("割引キャンペーンの効果検証と適正化", "割引率が適正水準を超過"),
        }
        for it in issue_types:
            if it in action_map:
                actions.append(SuggestedAction(action=action_map[it][0], reason=action_map[it][1]))

        missions.append(SVMission(
            store_id=store.id, store_name=store.name, brand_name=brand_name,
            area_name=area_name, priority_score=priority,
            health_score=kpi.health_score if kpi else None,
            days_since_last_visit=days_since,
            open_task_count=open_tasks, issue_types=issue_types,
            improvement_opportunity=kpi.improvement_opportunity_amount if kpi else None,
            suggested_actions=actions,
        ))

    missions.sort(key=lambda m: m.priority_score, reverse=True)
    return APIResponse(data=missions[:limit])
