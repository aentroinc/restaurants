from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from datetime import date
from app.database import get_db
from app.models.store import Store
from app.models.kpi import StoreDailyKPI
from app.schemas.common import APIResponse
from app.auth import get_tenant_id

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


@router.get("/object/{object_id}", response_model=APIResponse[list[dict]])
async def get_object_lineage(object_id: UUID = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    events = [
        {
            "id": "e0000001-0000-0000-0000-000000000001",
            "object_id": str(object_id),
            "event_type": "created",
            "timestamp": "2025-01-15T09:00:00+09:00",
            "actor": "system",
            "actor_type": "system",
            "description": "初期データ投入により作成",
            "source": "seed_script",
            "details": {"method": "bulk_insert", "batch_id": "seed-2025-01"},
        },
        {
            "id": "e0000001-0000-0000-0000-000000000002",
            "object_id": str(object_id),
            "event_type": "data_ingested",
            "timestamp": "2026-04-30T02:00:00+09:00",
            "actor": "ingestion_pipeline",
            "actor_type": "pipeline",
            "description": "POS CSVデータ取り込み（日次バッチ）",
            "source": "pos_csv_import",
            "details": {"file": "pos_20260430.csv", "rows": 1248, "valid_rows": 1245, "invalid_rows": 3},
        },
        {
            "id": "e0000001-0000-0000-0000-000000000003",
            "object_id": str(object_id),
            "event_type": "data_ingested",
            "timestamp": "2026-04-30T02:15:00+09:00",
            "actor": "ingestion_pipeline",
            "actor_type": "pipeline",
            "description": "勤怠CSVデータ取り込み（日次バッチ）",
            "source": "labor_csv_import",
            "details": {"file": "labor_20260430.csv", "rows": 856, "valid_rows": 856, "invalid_rows": 0},
        },
        {
            "id": "e0000001-0000-0000-0000-000000000004",
            "object_id": str(object_id),
            "event_type": "kpi_calculated",
            "timestamp": "2026-04-30T06:00:00+09:00",
            "actor": "kpi_engine",
            "actor_type": "pipeline",
            "description": "日次KPI算出完了（全指標再計算）",
            "source": "kpi_calculation_pipeline",
            "details": {"kpis_calculated": ["net_sales", "cogs_rate", "labor_cost_rate", "fl_ratio", "health_score", "improvement_opportunity"]},
        },
        {
            "id": "e0000001-0000-0000-0000-000000000005",
            "object_id": str(object_id),
            "event_type": "ai_analysis",
            "timestamp": "2026-04-30T06:30:00+09:00",
            "actor": "ai_engine",
            "actor_type": "ai",
            "description": "AI分析により改善タスク2件自動生成",
            "source": "ai_task_generator",
            "details": {"tasks_generated": 2, "model": "aentro-insight-v2", "confidence": 0.85},
        },
        {
            "id": "e0000001-0000-0000-0000-000000000006",
            "object_id": str(object_id),
            "event_type": "field_updated",
            "timestamp": "2026-04-30T10:00:00+09:00",
            "actor": "sv_user_003",
            "actor_type": "user",
            "description": "SV訪問によりチェックリスト結果を記録",
            "source": "sv_visit_app",
            "details": {"visit_id": "visit-0430", "checklist_score": 82},
        },
    ]
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
        "data_pipeline": [
            {
                "step": 1,
                "name": "データ取得",
                "description": f"{meta['source']} からの生データ取得",
                "status": "completed",
                "timestamp": f"{as_of.isoformat()}T02:00:00+09:00",
            },
            {
                "step": 2,
                "name": "バリデーション",
                "description": "データ契約に基づくスキーマ・値域チェック",
                "status": "completed",
                "timestamp": f"{as_of.isoformat()}T02:30:00+09:00",
            },
            {
                "step": 3,
                "name": "KPI算出",
                "description": f"{meta['formula']} による算出",
                "status": "completed",
                "timestamp": f"{as_of.isoformat()}T06:00:00+09:00",
            },
            {
                "step": 4,
                "name": "ピア比較",
                "description": "同業態・同商圏タイプのピアグループとの比較",
                "status": "completed",
                "timestamp": f"{as_of.isoformat()}T06:10:00+09:00",
            },
        ],
        "ingestion_info": {
            "last_ingested": f"{as_of.isoformat()}T02:00:00+09:00",
            "source_system": "POS CSV / 勤怠CSV",
            "batch_id": f"batch-{as_of.isoformat().replace('-', '')}",
            "row_count": 1248,
            "quality_score": 0.98,
        },
    }
    return APIResponse(data=lineage)
