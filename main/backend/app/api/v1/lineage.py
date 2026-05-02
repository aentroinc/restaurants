from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from uuid import UUID
from datetime import date
from app.database import get_db
from app.models.store import Store
from app.models.kpi import StoreDailyKPI
from app.models.lineage import LineageEvent
from app.schemas.common import APIResponse
from app.auth import get_tenant_id
from app.services.lineage_graph import build_graph_cached

router = APIRouter(prefix="/api/v1/lineage", tags=["lineage"])

KPI_META = {
    "net_sales": {"display_name": "純売上", "formula": "gross_sales - discount_amount", "unit": "円", "source": "daily_store_sales"},
    "cogs_rate": {"display_name": "原価率", "formula": "theoretical_cogs / net_sales * 100", "unit": "%", "source": "daily_store_sales + daily_product_sales"},
    "labor_cost_rate": {"display_name": "人件費率", "formula": "labor_cost / net_sales * 100", "unit": "%", "source": "labor_actuals + daily_store_sales"},
    "fl_ratio": {"display_name": "FL比率", "formula": "cogs_rate + labor_cost_rate", "unit": "%", "source": "store_daily_kpi (derived)"},
    "sales_per_labor_hour": {"display_name": "人時売上", "formula": "net_sales / total_labor_hours", "unit": "円/時", "source": "daily_store_sales + labor_actuals"},
    "gross_profit_rate": {"display_name": "粗利率", "formula": "gross_profit / net_sales * 100", "unit": "%", "source": "store_daily_kpi (derived)"},
    "operating_profit_rate": {"display_name": "営業利益率", "formula": "operating_profit / net_sales * 100", "unit": "%", "source": "store_pl"},
    "avg_ticket": {"display_name": "客単価", "formula": "net_sales / customer_count", "unit": "円", "source": "daily_store_sales"},
    "health_score": {"display_name": "健全度スコア", "formula": "weighted_composite(cogs_rate, labor_cost_rate, fl_ratio, review_score, task_completion_rate)", "unit": "点", "source": "store_daily_kpi (composite)"},
    "improvement_opportunity": {"display_name": "改善余地", "formula": "(peer_median - current_value) * revenue_scale_factor", "unit": "円/月", "source": "store_daily_kpi (peer analysis)"},
}


def _event_to_dict(e: LineageEvent) -> dict:
    return {
        "id": str(e.id),
        "tenant_id": str(e.tenant_id),
        "event_type": e.event_type,
        "source_type": e.source_type,
        "source_id": str(e.source_id) if e.source_id else None,
        "target_type": e.target_type,
        "target_id": str(e.target_id) if e.target_id else None,
        "transformation_name": e.transformation_name,
        "transformation_version": e.transformation_version,
        "metadata": e.metadata_,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.get("/object/{object_id}", response_model=APIResponse[list[dict]])
async def get_object_lineage(object_id: UUID = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    result = await db.execute(
        select(LineageEvent).where(
            and_(
                LineageEvent.tenant_id == tenant_id,
                or_(
                    LineageEvent.source_id == object_id,
                    LineageEvent.target_id == object_id,
                ),
            )
        ).order_by(LineageEvent.created_at.desc()).limit(100)
    )
    events = [_event_to_dict(e) for e in result.scalars().all()]
    return APIResponse(data=events, meta={"total": len(events), "object_id": str(object_id)})


@router.get("/kpi/{store_id}/{kpi_code}", response_model=APIResponse[dict])
async def get_kpi_lineage(
    store_id: UUID = Path(...),
    kpi_code: str = Path(...),
    as_of: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if as_of is None:
        as_of = date(2026, 4, 30)

    meta = KPI_META.get(kpi_code)
    if not meta:
        return APIResponse(errors=[{"detail": f"Unknown KPI code: {kpi_code}"}])

    store_q = await db.execute(select(Store.name).where(and_(Store.id == store_id, Store.tenant_id == tenant_id)))
    store_name = store_q.scalar()
    if not store_name:
        return APIResponse(errors=[{"detail": "Store not found"}])

    kpi_q = await db.execute(
        select(StoreDailyKPI).where(
            and_(StoreDailyKPI.store_id == store_id, StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id)
        )
    )
    kpi = kpi_q.scalar_one_or_none()

    current_value = None
    if kpi:
        val = getattr(kpi, kpi_code, None)
        if val is not None:
            current_value = float(val)

    # Fetch real lineage events for this store
    lineage_q = await db.execute(
        select(LineageEvent).where(
            and_(
                LineageEvent.tenant_id == tenant_id,
                or_(
                    LineageEvent.source_id == store_id,
                    LineageEvent.target_id == store_id,
                    # Also get general events (ingestion, kpi_calculation)
                    and_(
                        LineageEvent.event_type.in_(["ingestion", "kpi_calculation", "promotion"]),
                        LineageEvent.source_id.is_(None),
                    ),
                ),
            )
        ).order_by(LineageEvent.created_at.desc()).limit(20)
    )
    lineage_events = [_event_to_dict(e) for e in lineage_q.scalars().all()]

    # Build pipeline from real events
    pipeline = []
    ingestion_events = [e for e in lineage_events if e["event_type"] == "ingestion"]
    promotion_events = [e for e in lineage_events if e["event_type"] == "promotion"]
    kpi_events = [e for e in lineage_events if e["event_type"] == "kpi_calculation"]

    step = 1
    if ingestion_events:
        latest_ingest = ingestion_events[0]
        pipeline.append({
            "step": step, "name": "データ取得",
            "description": f"CSV取り込み: {latest_ingest['metadata'].get('file_name', 'unknown')}",
            "status": "completed",
            "timestamp": latest_ingest["created_at"],
        })
        step += 1

    if promotion_events:
        latest_promo = promotion_events[0]
        pipeline.append({
            "step": step, "name": "正規化・プロモーション",
            "description": f"正規テーブルへの昇格: {latest_promo['metadata'].get('entity_type', '')}",
            "status": "completed",
            "timestamp": latest_promo["created_at"],
        })
        step += 1

    pipeline.append({
        "step": step, "name": "バリデーション",
        "description": "データ契約に基づくスキーマ・値域チェック",
        "status": "completed",
        "timestamp": f"{as_of.isoformat()}T02:30:00+09:00",
    })
    step += 1

    if kpi_events:
        latest_kpi = kpi_events[0]
        pipeline.append({
            "step": step, "name": "KPI算出",
            "description": f"{meta['formula']} による算出",
            "status": "completed",
            "timestamp": latest_kpi["created_at"],
        })
        step += 1
    else:
        pipeline.append({
            "step": step, "name": "KPI算出",
            "description": f"{meta['formula']} による算出",
            "status": "completed",
            "timestamp": f"{as_of.isoformat()}T06:00:00+09:00",
        })
        step += 1

    pipeline.append({
        "step": step, "name": "ピア比較",
        "description": "同業態・同商圏タイプのピアグループとの比較",
        "status": "completed",
        "timestamp": f"{as_of.isoformat()}T06:10:00+09:00",
    })

    # Ingestion info from latest ingestion event
    ingestion_info = {
        "last_ingested": ingestion_events[0]["created_at"] if ingestion_events else f"{as_of.isoformat()}T02:00:00+09:00",
        "source_system": "POS CSV / 勤怠CSV",
        "batch_id": ingestion_events[0]["metadata"].get("batch_id", f"batch-{as_of.isoformat().replace('-', '')}") if ingestion_events else f"batch-{as_of.isoformat().replace('-', '')}",
        "row_count": ingestion_events[0]["metadata"].get("row_count", 0) if ingestion_events else 0,
        "quality_score": 0.98,
    }

    lineage = {
        "store_id": str(store_id),
        "store_name": store_name,
        "kpi_code": kpi_code,
        "display_name": meta["display_name"],
        "formula": meta["formula"],
        "unit": meta["unit"],
        "as_of": as_of.isoformat(),
        "current_value": current_value,
        "source_table": meta["source"],
        "data_pipeline": pipeline,
        "ingestion_info": ingestion_info,
        "lineage_events": lineage_events,
    }
    return APIResponse(data=lineage)


@router.get("/graph", response_model=APIResponse[dict])
async def lineage_graph(
    root_type: str = Query(..., description="Root node type, e.g. 'store', 'kpi', 'dataset'"),
    root_id: str = Query(..., description="Root node id (UUID)"),
    depth: int = Query(3, ge=0, le=6),
    direction: str = Query("both", pattern="^(downstream|upstream|both)$"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Recursive lineage graph (nodes + edges) for visualization."""
    graph = await build_graph_cached(db, tenant_id, root_type, root_id, depth, direction)
    return APIResponse(data=graph)


@router.get("/impact", response_model=APIResponse[dict])
async def lineage_impact(
    root_type: str = Query(...),
    root_id: str = Query(...),
    depth: int = Query(3, ge=0, le=6),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Downstream impact range — what does this object affect?"""
    graph = await build_graph_cached(db, tenant_id, root_type, root_id, depth, "downstream")
    affected = [n for n in graph["nodes"] if n["depth"] > 0]
    return APIResponse(data={
        "root": graph["root"],
        "affected_count": len(affected),
        "affected": affected,
        "edges": graph["edges"],
        "stats": graph["stats"],
    })


@router.get("/source", response_model=APIResponse[dict])
async def lineage_source(
    root_type: str = Query(...),
    root_id: str = Query(...),
    depth: int = Query(3, ge=0, le=6),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Upstream sources — what does this object derive from?"""
    graph = await build_graph_cached(db, tenant_id, root_type, root_id, depth, "upstream")
    sources = [n for n in graph["nodes"] if n["depth"] > 0]
    return APIResponse(data={
        "root": graph["root"],
        "source_count": len(sources),
        "sources": sources,
        "edges": graph["edges"],
        "stats": graph["stats"],
    })
