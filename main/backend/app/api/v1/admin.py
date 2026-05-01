from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.ingestion import IngestionBatch, DataContract, SchemaMapping
from app.schemas.common import APIResponse

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

DATA_SOURCES = [
    {
        "id": "60000000-0000-0000-0000-000000000001",
        "name": "POS CSV",
        "display_name": "POSレジ売上データ",
        "type": "csv_upload",
        "entity_types": ["daily_sales", "hourly_sales", "product_sales"],
        "frequency": "daily",
        "last_sync": "2026-04-30T02:00:00+09:00",
        "status": "active",
        "row_count_last": 1248,
        "quality_score": 0.98,
        "description": "各店舗のPOSレジから出力される日次売上CSV。日別・時間帯別・商品別の3種類を取り込み。",
    },
    {
        "id": "60000000-0000-0000-0000-000000000002",
        "name": "勤怠CSV",
        "display_name": "勤怠管理データ",
        "type": "csv_upload",
        "entity_types": ["labor_actual"],
        "frequency": "daily",
        "last_sync": "2026-04-30T02:15:00+09:00",
        "status": "active",
        "row_count_last": 856,
        "quality_score": 1.0,
        "description": "勤怠管理システムから出力されるシフト実績CSV。出退勤時刻・休憩・残業を含む。",
    },
    {
        "id": "60000000-0000-0000-0000-000000000003",
        "name": "会計CSV",
        "display_name": "会計・PL データ",
        "type": "csv_upload",
        "entity_types": ["store_pl"],
        "frequency": "monthly",
        "last_sync": "2026-04-05T10:00:00+09:00",
        "status": "active",
        "row_count_last": 42,
        "quality_score": 0.95,
        "description": "会計システムから出力される店舗別月次PLデータ。売上・原価・人件費・家賃・水光熱費等。",
    },
    {
        "id": "60000000-0000-0000-0000-000000000004",
        "name": "レビューAPI",
        "display_name": "口コミ・レビューデータ",
        "type": "api",
        "entity_types": ["review"],
        "frequency": "daily",
        "last_sync": "2026-04-30T04:00:00+09:00",
        "status": "active",
        "row_count_last": 23,
        "quality_score": 0.92,
        "description": "Googleビジネスプロフィール等からAPI経由で取得する口コミデータ。感情分析結果付き。",
    },
    {
        "id": "60000000-0000-0000-0000-000000000005",
        "name": "受発注CSV",
        "display_name": "受発注・仕入データ",
        "type": "csv_upload",
        "entity_types": ["purchase_order"],
        "frequency": "daily",
        "last_sync": "2026-04-30T03:00:00+09:00",
        "status": "active",
        "row_count_last": 312,
        "quality_score": 0.96,
        "description": "仕入先からの納品データ・発注データ。理論原価計算の入力データ。",
    },
    {
        "id": "60000000-0000-0000-0000-000000000006",
        "name": "SV訪問CSV",
        "display_name": "SV訪問記録データ",
        "type": "csv_upload",
        "entity_types": ["sv_visit"],
        "frequency": "weekly",
        "last_sync": "2026-04-28T18:00:00+09:00",
        "status": "active",
        "row_count_last": 15,
        "quality_score": 1.0,
        "description": "SVが店舗訪問時に記録するチェックリスト結果・指導内容のCSVエクスポート。",
    },
]

DEFAULT_DATA_CONTRACTS = [
    {
        "id": "61000000-0000-0000-0000-000000000001",
        "name": "POS日次売上契約 v3",
        "source_system": "POS CSV",
        "entity_type": "daily_sales",
        "version": 3,
        "status": "active",
        "required_columns": ["store_code", "business_date", "net_sales", "customer_count", "gross_sales"],
        "optional_columns": ["discount_amount", "takeout_sales", "delivery_sales"],
        "validation_rules": [
            {"field": "net_sales", "rule": "non_negative"},
            {"field": "customer_count", "rule": "positive_integer"},
            {"field": "business_date", "rule": "date_format_yyyy_mm_dd"},
        ],
        "approved_by": "データ戦略部",
        "approved_at": "2025-06-01T00:00:00+09:00",
    },
    {
        "id": "61000000-0000-0000-0000-000000000002",
        "name": "勤怠実績契約 v2",
        "source_system": "勤怠CSV",
        "entity_type": "labor_actual",
        "version": 2,
        "status": "active",
        "required_columns": ["store_code", "employee_code", "work_date", "clock_in", "clock_out"],
        "optional_columns": ["break_minutes", "overtime_minutes", "role"],
        "validation_rules": [
            {"field": "clock_in", "rule": "time_format_hhmm"},
            {"field": "clock_out", "rule": "time_format_hhmm"},
            {"field": "work_date", "rule": "date_format_yyyy_mm_dd"},
        ],
        "approved_by": "データ戦略部",
        "approved_at": "2025-06-01T00:00:00+09:00",
    },
    {
        "id": "61000000-0000-0000-0000-000000000003",
        "name": "月次PL契約 v1",
        "source_system": "会計CSV",
        "entity_type": "store_pl",
        "version": 1,
        "status": "active",
        "required_columns": ["store_code", "period_start", "period_end", "sales", "cogs", "labor_cost"],
        "optional_columns": ["rent", "utilities", "promotion_cost", "other_expenses"],
        "validation_rules": [
            {"field": "sales", "rule": "non_negative"},
            {"field": "period_start", "rule": "date_format_yyyy_mm_dd"},
        ],
        "approved_by": "データ戦略部",
        "approved_at": "2025-08-01T00:00:00+09:00",
    },
]

DEFAULT_SCHEMA_MAPPINGS = [
    {
        "id": "62000000-0000-0000-0000-000000000001",
        "source_system": "POS CSV",
        "entity_type": "daily_sales",
        "mapping_name": "POS標準マッピング v3",
        "version": 3,
        "status": "active",
        "source_columns": ["店舗コード", "営業日", "純売上", "客数", "総売上", "値引額"],
        "target_mappings": {
            "店舗コード": "store_code",
            "営業日": "business_date",
            "純売上": "net_sales",
            "客数": "customer_count",
            "総売上": "gross_sales",
            "値引額": "discount_amount",
        },
    },
    {
        "id": "62000000-0000-0000-0000-000000000002",
        "source_system": "勤怠CSV",
        "entity_type": "labor_actual",
        "mapping_name": "勤怠標準マッピング v2",
        "version": 2,
        "status": "active",
        "source_columns": ["店舗コード", "従業員コード", "勤務日", "出勤時刻", "退勤時刻", "休憩"],
        "target_mappings": {
            "店舗コード": "store_code",
            "従業員コード": "employee_code",
            "勤務日": "work_date",
            "出勤時刻": "clock_in",
            "退勤時刻": "clock_out",
            "休憩": "break_minutes",
        },
    },
]

DEFAULT_ID_MAPPINGS = [
    {"source_system": "POS CSV", "source_field": "店舗コード", "source_value": "S001", "target_field": "store_code", "target_value": "S001", "entity_type": "store", "status": "active"},
    {"source_system": "POS CSV", "source_field": "店舗コード", "source_value": "S002", "target_field": "store_code", "target_value": "S002", "entity_type": "store", "status": "active"},
    {"source_system": "勤怠CSV", "source_field": "店舗コード", "source_value": "MT-001", "target_field": "store_code", "target_value": "S001", "entity_type": "store", "status": "active"},
    {"source_system": "勤怠CSV", "source_field": "店舗コード", "source_value": "MT-002", "target_field": "store_code", "target_value": "S002", "entity_type": "store", "status": "active"},
    {"source_system": "会計CSV", "source_field": "拠点コード", "source_value": "ACCT-001", "target_field": "store_code", "target_value": "S001", "entity_type": "store", "status": "active"},
    {"source_system": "POS CSV", "source_field": "商品コード", "source_value": "P-1001", "target_field": "product_code", "target_value": "PRD001", "entity_type": "product", "status": "active"},
    {"source_system": "POS CSV", "source_field": "商品コード", "source_value": "P-1002", "target_field": "product_code", "target_value": "PRD002", "entity_type": "product", "status": "active"},
    {"source_system": "受発注CSV", "source_field": "品目コード", "source_value": "ORD-1001", "target_field": "product_code", "target_value": "PRD001", "entity_type": "product", "status": "active"},
]

AI_GOVERNANCE_CONFIG = {
    "model_registry": [
        {
            "id": "model-001",
            "name": "aentro-insight-v2",
            "display_name": "AENTRO Insight v2",
            "type": "anomaly_detection",
            "description": "KPI異常検知・改善提案生成モデル",
            "version": "2.1.0",
            "status": "active",
            "last_trained": "2026-03-01T00:00:00+09:00",
            "accuracy": 0.89,
            "input_features": ["net_sales", "cogs_rate", "labor_cost_rate", "fl_ratio", "customer_count", "review_score"],
        },
        {
            "id": "model-002",
            "name": "aentro-forecast-v1",
            "display_name": "AENTRO Forecast v1",
            "type": "time_series_forecast",
            "description": "売上・客数予測モデル（7日先まで）",
            "version": "1.3.0",
            "status": "active",
            "last_trained": "2026-04-01T00:00:00+09:00",
            "accuracy": 0.82,
            "input_features": ["net_sales_history", "day_of_week", "weather", "events", "seasonality"],
        },
        {
            "id": "model-003",
            "name": "aentro-nlp-review-v1",
            "display_name": "AENTRO Review NLP v1",
            "type": "sentiment_analysis",
            "description": "口コミテキストの感情分析・カテゴリ分類",
            "version": "1.1.0",
            "status": "active",
            "last_trained": "2026-02-15T00:00:00+09:00",
            "accuracy": 0.91,
            "input_features": ["review_text", "rating"],
        },
    ],
    "policies": {
        "human_in_the_loop": True,
        "max_auto_actions_per_day": 50,
        "require_explanation": True,
        "audit_all_decisions": True,
        "bias_check_enabled": True,
        "data_retention_days": 365,
        "model_retraining_frequency": "monthly",
    },
    "audit_summary": {
        "total_ai_decisions_30d": 1247,
        "auto_approved": 892,
        "human_reviewed": 355,
        "rejected": 18,
        "accuracy_30d": 0.87,
        "false_positive_rate": 0.08,
    },
}


@router.get("/data-sources", response_model=APIResponse[list[dict]])
async def list_data_sources(db: AsyncSession = Depends(get_db)):
    return APIResponse(data=DATA_SOURCES, meta={"total": len(DATA_SOURCES)})


@router.get("/data-contracts", response_model=APIResponse[list[dict]])
async def list_data_contracts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataContract).order_by(DataContract.created_at.desc()))
    db_contracts = result.scalars().all()

    if db_contracts:
        data = [{
            "id": str(c.id), "name": c.name, "source_system": c.source_system,
            "entity_type": c.entity_type, "version": c.version, "status": c.status,
            "required_columns": c.required_columns, "optional_columns": c.optional_columns,
            "validation_rules": c.validation_rules,
            "approved_by": str(c.approved_by) if c.approved_by else None,
            "approved_at": c.approved_at.isoformat() if c.approved_at else None,
        } for c in db_contracts]
    else:
        data = DEFAULT_DATA_CONTRACTS

    return APIResponse(data=data, meta={"total": len(data)})


@router.get("/ingestion-runs", response_model=APIResponse[list[dict]])
async def list_ingestion_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    count_q = await db.execute(select(func.count(IngestionBatch.id)))
    total = count_q.scalar() or 0

    if total > 0:
        result = await db.execute(
            select(IngestionBatch)
            .order_by(IngestionBatch.uploaded_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        data = [{
            "id": str(b.id), "source_system": b.source_system, "entity_type": b.entity_type,
            "file_name": b.file_name, "status": b.status,
            "row_count": b.row_count, "valid_row_count": b.valid_row_count, "invalid_row_count": b.invalid_row_count,
            "uploaded_at": b.uploaded_at.isoformat() if b.uploaded_at else None,
            "validated_at": b.validated_at.isoformat() if b.validated_at else None,
            "promoted_at": b.promoted_at.isoformat() if b.promoted_at else None,
        } for b in result.scalars().all()]
    else:
        data = [
            {"id": "ib-001", "source_system": "POS CSV", "entity_type": "daily_sales", "file_name": "pos_20260430.csv", "status": "promoted", "row_count": 1248, "valid_row_count": 1245, "invalid_row_count": 3, "uploaded_at": "2026-04-30T02:00:00+09:00", "validated_at": "2026-04-30T02:10:00+09:00", "promoted_at": "2026-04-30T02:15:00+09:00"},
            {"id": "ib-002", "source_system": "勤怠CSV", "entity_type": "labor_actual", "file_name": "labor_20260430.csv", "status": "promoted", "row_count": 856, "valid_row_count": 856, "invalid_row_count": 0, "uploaded_at": "2026-04-30T02:15:00+09:00", "validated_at": "2026-04-30T02:20:00+09:00", "promoted_at": "2026-04-30T02:25:00+09:00"},
            {"id": "ib-003", "source_system": "レビューAPI", "entity_type": "review", "file_name": None, "status": "promoted", "row_count": 23, "valid_row_count": 23, "invalid_row_count": 0, "uploaded_at": "2026-04-30T04:00:00+09:00", "validated_at": "2026-04-30T04:01:00+09:00", "promoted_at": "2026-04-30T04:02:00+09:00"},
            {"id": "ib-004", "source_system": "受発注CSV", "entity_type": "purchase_order", "file_name": "orders_20260430.csv", "status": "promoted", "row_count": 312, "valid_row_count": 310, "invalid_row_count": 2, "uploaded_at": "2026-04-30T03:00:00+09:00", "validated_at": "2026-04-30T03:05:00+09:00", "promoted_at": "2026-04-30T03:10:00+09:00"},
            {"id": "ib-005", "source_system": "会計CSV", "entity_type": "store_pl", "file_name": "pl_202604.csv", "status": "promoted", "row_count": 42, "valid_row_count": 42, "invalid_row_count": 0, "uploaded_at": "2026-04-05T10:00:00+09:00", "validated_at": "2026-04-05T10:05:00+09:00", "promoted_at": "2026-04-05T10:10:00+09:00"},
            {"id": "ib-006", "source_system": "POS CSV", "entity_type": "daily_sales", "file_name": "pos_20260429.csv", "status": "promoted", "row_count": 1195, "valid_row_count": 1195, "invalid_row_count": 0, "uploaded_at": "2026-04-29T02:00:00+09:00", "validated_at": "2026-04-29T02:10:00+09:00", "promoted_at": "2026-04-29T02:15:00+09:00"},
        ]
        total = len(data)

    from app.schemas.common import PaginationMeta
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=max(1, (total + page_size - 1) // page_size))
    return APIResponse(data=data, meta=meta.model_dump())


@router.get("/schema-mappings", response_model=APIResponse[list[dict]])
async def list_schema_mappings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SchemaMapping).order_by(SchemaMapping.created_at.desc()))
    db_mappings = result.scalars().all()

    if db_mappings:
        data = [{
            "id": str(m.id), "source_system": m.source_system, "entity_type": m.entity_type,
            "mapping_name": m.mapping_name, "version": m.mapping_version, "status": m.status,
            "source_columns": m.source_columns, "target_mappings": m.target_mappings,
            "transform_rules": m.transform_rules,
        } for m in db_mappings]
    else:
        data = DEFAULT_SCHEMA_MAPPINGS

    return APIResponse(data=data, meta={"total": len(data)})


@router.get("/id-mappings", response_model=APIResponse[list[dict]])
async def list_id_mappings(db: AsyncSession = Depends(get_db)):
    return APIResponse(data=DEFAULT_ID_MAPPINGS, meta={"total": len(DEFAULT_ID_MAPPINGS)})


@router.get("/ai-governance", response_model=APIResponse[dict])
async def get_ai_governance(db: AsyncSession = Depends(get_db)):
    return APIResponse(data=AI_GOVERNANCE_CONFIG)
