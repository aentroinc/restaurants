from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.brand import Brand
from app.models.store import Store


async def build_system_prompt(tenant_id: str, db: AsyncSession, user_id: str | None = None) -> str:
    """Return system prompt as a single string (legacy compat)."""
    blocks = await build_system_blocks(tenant_id, db, user_id=user_id)
    return "\n\n".join(b["text"] for b in blocks)


async def build_system_blocks(tenant_id: str, db: AsyncSession, user_id: str | None = None) -> list[dict]:
    """Return system prompt as cacheable content blocks.

    現在の purpose-token で露出してよい列だけを ontology block に書くことで、
    LLM 側にも marking ACL の境界を知らせる。
    """
    ontology_text = await _build_ontology_schema(db, tenant_id)
    tool_text = _build_tool_instructions()
    tenant_text = await _build_tenant_context(db, tenant_id)
    purpose_text = await _build_purpose_block(db, tenant_id, user_id)

    return [
        {"type": "text", "text": ontology_text, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": tool_text, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": tenant_text, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": purpose_text},
        {"type": "text", "text": f"今日: {date.today().strftime('%Y年%m月%d日')}"},
    ]


async def _build_purpose_block(db: AsyncSession, tenant_id: str, user_id: str | None) -> str:
    from app.services.marking_engine import get_active_purpose, list_visible_columns
    purpose = await get_active_purpose(db, user_id)
    candidate_kpi_cols = [
        "net_sales", "customer_count", "avg_ticket", "cogs_rate",
        "labor_cost_rate", "fl_ratio", "operating_profit_rate",
        "review_score", "health_score", "improvement_opportunity_amount",
    ]
    visible = await list_visible_columns(db, tenant_id, user_id, "kpi", candidate_kpi_cols)
    masked = sorted(set(candidate_kpi_cols) - set(visible))
    return f"""## 現在のアクセス権限 (Marking ACL)
- purpose-token: {purpose.get('purpose_token') or '(none)'}
- 解放 markings: {', '.join(purpose.get('granted_markings') or []) or '(none)'}
- KPI で露出可能な列: {', '.join(visible) or '(なし)'}
- KPI で marking により mask される列: {', '.join(masked) or '(なし)'}
※ marking 付きデータは prompt に含まれません。`***` のフィールドは ACL によりマスクされたものです。"""


async def _build_ontology_schema(db: AsyncSession, tenant_id: str) -> str:
    return """## KPI定義
- net_sales: 純売上高 (円)
- customer_count: 来客数
- avg_ticket: 客単価 (円)
- cogs / cogs_rate: 原価 / 原価率 (%)
- labor_cost / labor_cost_rate: 人件費 / 人件費率 (%)
- fl_ratio: FL比率 (原価率+人件費率, %)
- sales_per_labor_hour: 人時売上高 (円/時間)
- gross_profit / gross_profit_rate: 粗利 / 粗利率 (%)
- operating_profit / operating_profit_rate: 営業利益 / 営業利益率 (%)
- review_score: 口コミスコア (1-5)
- health_score: 店舗ヘルススコア (0-100)
- improvement_opportunity_amount: 改善余地金額 (円/月)

## データの時間粒度
- KPIデータは月末日付で格納されています（例: 2026-04-30 = 2026年4月のデータ）
- 日次売上データ（daily_store_sales）は日別に格納されています"""


def _build_tool_instructions() -> str:
    return """あなたは外食チェーン経営支援AIアナリスト「AENTRO AI」です。

データに基づいた分析を行い、経営判断を支援します。

## 利用可能なツール
ツールを使って実データを取得してから回答してください。推測ではなく、データに基づいた回答を心がけてください。

## 回答ルール
1. 結論を最初に述べる
2. 根拠データを必ず示す
3. 推定と事実を明確に分ける
4. 改善アクションを具体的に提案する
5. 金額インパクトを可能な限り試算する"""


async def _build_tenant_context(db: AsyncSession, tenant_id: str) -> str:
    brands_q = await db.execute(
        select(Brand.id, Brand.name, Brand.service_model)
        .where(Brand.tenant_id == tenant_id)
    )
    brands = brands_q.all()
    brand_lines = []
    for b in brands:
        count_q = await db.execute(
            select(func.count(Store.id))
            .where(Store.brand_id == b[0], Store.status == "active")
        )
        cnt = count_q.scalar() or 0
        brand_lines.append(f"- {b[1]} ({b[2]}) : {cnt}店舗")

    brand_text = "\n".join(brand_lines) if brand_lines else "（ブランド情報なし）"

    store_count_q = await db.execute(
        select(func.count(Store.id))
        .where(Store.tenant_id == tenant_id, Store.status == "active")
    )
    total_stores = store_count_q.scalar() or 0

    return f"""## テナント情報
- 総店舗数: {total_stores}
- ブランド一覧:
{brand_text}"""
