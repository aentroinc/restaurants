from fastapi import APIRouter, Depends, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.schemas.common import APIResponse
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/kpi-definitions", tags=["kpi-registry"])

KPI_DEFINITIONS = [
    {
        "id": "30000000-0000-0000-0000-000000000001",
        "code": "net_sales",
        "display_name": "純売上",
        "category": "売上",
        "formula": "gross_sales - discount_amount",
        "formula_display": "総売上 − 値引額",
        "unit": "円",
        "direction": "higher_is_better",
        "description": "値引き・クーポン適用後の実売上高。全KPIの基盤指標。",
        "inputs": ["gross_sales", "discount_amount"],
        "source_tables": ["daily_store_sales"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000002",
        "code": "cogs_rate",
        "display_name": "原価率",
        "category": "コスト",
        "formula": "theoretical_cogs / net_sales * 100",
        "formula_display": "理論原価 ÷ 純売上 × 100",
        "unit": "%",
        "direction": "lower_is_better",
        "description": "売上に対する食材原価の比率。業態別ベンチマークと比較して管理。",
        "inputs": ["theoretical_cogs", "net_sales"],
        "source_tables": ["daily_store_sales", "daily_product_sales"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000003",
        "code": "labor_cost_rate",
        "display_name": "人件費率",
        "category": "コスト",
        "formula": "labor_cost / net_sales * 100",
        "formula_display": "人件費 ÷ 純売上 × 100",
        "unit": "%",
        "direction": "lower_is_better",
        "description": "売上に対する人件費（社員+PA）の比率。シフト最適化の基準指標。",
        "inputs": ["labor_cost", "net_sales"],
        "source_tables": ["labor_actuals", "daily_store_sales"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000004",
        "code": "fl_ratio",
        "display_name": "FL比率",
        "category": "コスト",
        "formula": "cogs_rate + labor_cost_rate",
        "formula_display": "原価率 + 人件費率",
        "unit": "%",
        "direction": "lower_is_better",
        "description": "Food & Labor比率。飲食業の最重要コスト管理指標。60%以下が目安。",
        "inputs": ["cogs_rate", "labor_cost_rate"],
        "source_tables": ["store_daily_kpi"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000005",
        "code": "sales_per_labor_hour",
        "display_name": "人時売上",
        "category": "生産性",
        "formula": "net_sales / total_labor_hours",
        "formula_display": "純売上 ÷ 総労働時間",
        "unit": "円/時",
        "direction": "higher_is_better",
        "description": "従業員1時間あたりの売上。シフト効率の直接指標。",
        "inputs": ["net_sales", "total_labor_hours"],
        "source_tables": ["daily_store_sales", "labor_actuals"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000006",
        "code": "gross_profit_rate",
        "display_name": "粗利率",
        "category": "利益",
        "formula": "gross_profit / net_sales * 100",
        "formula_display": "粗利益 ÷ 純売上 × 100",
        "unit": "%",
        "direction": "higher_is_better",
        "description": "売上から原価を差し引いた粗利益の比率。",
        "inputs": ["gross_profit", "net_sales"],
        "source_tables": ["store_daily_kpi"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000007",
        "code": "operating_profit_rate",
        "display_name": "営業利益率",
        "category": "利益",
        "formula": "operating_profit / net_sales * 100",
        "formula_display": "営業利益 ÷ 純売上 × 100",
        "unit": "%",
        "direction": "higher_is_better",
        "description": "全経費控除後の営業利益率。店舗の最終的な収益性指標。",
        "inputs": ["operating_profit", "net_sales"],
        "source_tables": ["store_pl"],
        "granularity": "monthly",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000008",
        "code": "avg_ticket",
        "display_name": "客単価",
        "category": "売上",
        "formula": "net_sales / customer_count",
        "formula_display": "純売上 ÷ 客数",
        "unit": "円",
        "direction": "higher_is_better",
        "description": "来店客1人あたりの平均売上。メニューミックスとアップセル施策の効果を測定。",
        "inputs": ["net_sales", "customer_count"],
        "source_tables": ["daily_store_sales"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "システム管理者",
        "approved_at": "2025-01-01T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-000000000009",
        "code": "health_score",
        "display_name": "健全度スコア",
        "category": "総合",
        "formula": "weighted_composite(cogs_rate, labor_cost_rate, fl_ratio, review_score, task_completion_rate)",
        "formula_display": "加重合成（原価率, 人件費率, FL比率, 口コミ, タスク完了率）",
        "unit": "点",
        "direction": "higher_is_better",
        "description": "複数KPIの加重平均による店舗の総合健全度。0〜100点。ランキングとアラートの基準。",
        "inputs": ["cogs_rate", "labor_cost_rate", "fl_ratio", "review_score", "task_completion_rate"],
        "source_tables": ["store_daily_kpi"],
        "granularity": "daily",
        "status": "approved",
        "version": 2,
        "approved_by": "データ戦略部",
        "approved_at": "2025-03-15T00:00:00+09:00",
    },
    {
        "id": "30000000-0000-0000-0000-00000000000a",
        "code": "improvement_opportunity",
        "display_name": "改善余地",
        "category": "総合",
        "formula": "(peer_median - current_value) * revenue_scale_factor",
        "formula_display": "（同業態中央値 − 当店値）× 売上規模係数",
        "unit": "円/月",
        "direction": "higher_is_better",
        "description": "同業態ピアグループの中央値まで改善した場合に見込まれる月間利益増加額。",
        "inputs": ["peer_median", "current_kpi_values", "monthly_net_sales"],
        "source_tables": ["store_daily_kpi"],
        "granularity": "daily",
        "status": "approved",
        "version": 1,
        "approved_by": "データ戦略部",
        "approved_at": "2025-02-01T00:00:00+09:00",
    },
]

_custom_definitions: list[dict] = []


@router.get("", response_model=APIResponse[list[dict]])
async def list_kpi_definitions(
    category: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    data = KPI_DEFINITIONS + _custom_definitions
    if category:
        data = [d for d in data if d.get("category") == category]
    if status:
        data = [d for d in data if d.get("status") == status]
    return APIResponse(data=data, meta={"total": len(data)})


@router.get("/{definition_id}", response_model=APIResponse[dict])
async def get_kpi_definition(definition_id: str = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    for d in KPI_DEFINITIONS + _custom_definitions:
        if d["id"] == definition_id or d["code"] == definition_id:
            return APIResponse(data=d)
    return APIResponse(errors=[{"detail": "KPI definition not found"}])


@router.post("", response_model=APIResponse[dict])
async def create_kpi_definition(body: dict = Body(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    import uuid
    new_def = {
        "id": str(uuid.uuid4()),
        "code": body.get("code", "custom_kpi"),
        "display_name": body.get("display_name", "カスタムKPI"),
        "category": body.get("category", "カスタム"),
        "formula": body.get("formula", ""),
        "formula_display": body.get("formula_display", ""),
        "unit": body.get("unit", ""),
        "direction": body.get("direction", "higher_is_better"),
        "description": body.get("description", ""),
        "inputs": body.get("inputs", []),
        "source_tables": body.get("source_tables", []),
        "granularity": body.get("granularity", "daily"),
        "status": "draft",
        "version": 1,
        "approved_by": None,
        "approved_at": None,
    }
    _custom_definitions.append(new_def)
    return APIResponse(data=new_def)


@router.post("/{definition_id}/approve", response_model=APIResponse[dict])
async def approve_kpi_definition(definition_id: str = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    for d in _custom_definitions:
        if d["id"] == definition_id:
            d["status"] = "approved"
            d["approved_by"] = "管理者"
            d["approved_at"] = datetime.now().isoformat()
            return APIResponse(data=d)
    for d in KPI_DEFINITIONS:
        if d["id"] == definition_id:
            return APIResponse(data={**d, "status": "approved"})
    return APIResponse(errors=[{"detail": "KPI definition not found"}])


@router.post("/{definition_id}/simulate", response_model=APIResponse[dict])
async def simulate_kpi_definition(definition_id: str = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    target_def = None
    for d in KPI_DEFINITIONS + _custom_definitions:
        if d["id"] == definition_id or d["code"] == definition_id:
            target_def = d
            break

    if not target_def:
        return APIResponse(errors=[{"detail": "KPI definition not found"}])

    simulation = {
        "definition": target_def,
        "affected_stores": 42,
        "simulation_period": "2026-04-01 ~ 2026-04-30",
        "samples": [
            {"store_name": "松屋 新宿東口店", "before": 58.2, "after": 55.8, "delta": -2.4, "impact_amount": 124000},
            {"store_name": "松屋 渋谷センター街店", "before": 61.5, "after": 57.1, "delta": -4.4, "impact_amount": 218000},
            {"store_name": "松屋 池袋西口店", "before": 55.9, "after": 54.2, "delta": -1.7, "impact_amount": 89000},
        ],
        "total_estimated_impact": 4310000,
        "confidence": 0.78,
        "notes": "過去90日のトレンドデータに基づくシミュレーション。実際の効果は外部要因により変動します。",
    }
    return APIResponse(data=simulation)
