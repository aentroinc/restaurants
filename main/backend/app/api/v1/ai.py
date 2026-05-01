from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from decimal import Decimal
from datetime import date
from app.database import get_db
from app.models.store import Store
from app.models.brand import Brand
from app.models.kpi import StoreDailyKPI
from app.models.daily_sales import DailyStoreSales
from app.schemas.common import APIResponse
from app.schemas.ai import AIQueryRequest, AIQueryResponse, ReferencedEntity, SuggestedQuestion

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

KEYWORD_MAP = {
    "売上": "sales",
    "sales": "sales",
    "人件費": "labor",
    "labor": "labor",
    "原価": "cogs",
    "cogs": "cogs",
    "利益": "profit",
    "profit": "profit",
    "悪化": "decline",
    "低下": "decline",
    "改善": "improvement",
    "口コミ": "review",
    "レビュー": "review",
    "割引": "discount",
    "FL": "fl_ratio",
    "健康": "health",
    "ヘルス": "health",
}


def parse_intent(question: str) -> list[str]:
    intents = []
    for kw, intent in KEYWORD_MAP.items():
        if kw in question:
            intents.append(intent)
    return list(set(intents)) or ["general"]


@router.post("/query", response_model=APIResponse[AIQueryResponse])
async def ai_query(body: AIQueryRequest, db: AsyncSession = Depends(get_db)):
    intents = parse_intent(body.question)
    as_of = date(2026, 4, 30)

    facts = []
    hypotheses = []
    actions = []
    referenced = []
    confidence = "medium"
    impact = None
    conclusion = ""

    if "sales" in intents or "general" in intents:
        sales_q = await db.execute(
            select(func.sum(DailyStoreSales.net_sales))
            .where(and_(
                DailyStoreSales.business_date >= as_of.replace(day=1),
                DailyStoreSales.business_date <= as_of,
            ))
        )
        total_sales = sales_q.scalar() or 0
        prev_q = await db.execute(
            select(func.sum(DailyStoreSales.net_sales))
            .where(and_(
                DailyStoreSales.business_date >= as_of.replace(day=1, year=as_of.year - 1),
                DailyStoreSales.business_date <= as_of.replace(year=as_of.year - 1),
            ))
        )
        prev_sales = prev_q.scalar() or 0
        yoy = ((total_sales - prev_sales) / prev_sales * 100) if prev_sales else 0
        facts.append(f"当月全店売上: {total_sales:,.0f}円 (前年同月比 {yoy:+.1f}%)")

    if "labor" in intents:
        labor_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.labor_cost_rate)
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.labor_cost_rate > 35))
            .order_by(StoreDailyKPI.labor_cost_rate.desc())
            .limit(5)
        )
        for r in labor_q.all():
            facts.append(f"{r[1]}: 人件費率 {r[2]:.1f}%")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
        hypotheses.append("シフト管理の不備、または売上減少に伴う相対的な人件費率上昇の可能性")
        actions.append("人件費率35%超の店舗に対し、シフト見直しと人時売上高改善計画を策定")

    if "cogs" in intents:
        cogs_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.cogs_rate)
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.cogs_rate > 35))
            .order_by(StoreDailyKPI.cogs_rate.desc())
            .limit(5)
        )
        for r in cogs_q.all():
            facts.append(f"{r[1]}: 原価率 {r[2]:.1f}%")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
        hypotheses.append("食材ロス増加、仕入れ価格高騰、またはポーション管理不備の可能性")
        actions.append("原価率異常店舗の発注量・廃棄量を確認し、理論原価との乖離を分析")

    if "decline" in intents:
        decline_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.health_score, StoreDailyKPI.issue_types)
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.health_score < 40))
            .order_by(StoreDailyKPI.health_score)
            .limit(5)
        )
        for r in decline_q.all():
            facts.append(f"{r[1]}: ヘルススコア {r[2]:.0f}")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
        hypotheses.append("複数指標の同時悪化が見られ、根本原因の特定が必要")
        actions.append("ヘルススコア低下店舗への優先的なSV訪問を計画")

    if "profit" in intents:
        profit_q = await db.execute(
            select(func.avg(StoreDailyKPI.operating_profit_rate))
            .where(StoreDailyKPI.business_date == as_of)
        )
        avg_profit = profit_q.scalar() or 0
        facts.append(f"全店平均営業利益率: {avg_profit:.1f}%")

    if "review" in intents:
        review_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.review_score)
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.review_score.isnot(None)))
            .order_by(StoreDailyKPI.review_score)
            .limit(5)
        )
        for r in review_q.all():
            facts.append(f"{r[1]}: 口コミスコア {r[2]:.2f}")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
        actions.append("口コミ低下店舗の最新レビュー内容を確認し、サービス品質課題を特定")

    if not facts:
        facts.append("該当するデータが見つかりませんでした")
        confidence = "low"

    if not conclusion:
        if "labor" in intents:
            conclusion = "人件費に関する分析結果をまとめました。人件費率が高い店舗を特定しています。"
        elif "cogs" in intents:
            conclusion = "原価に関する分析結果をまとめました。原価率が高い店舗を特定しています。"
        elif "decline" in intents:
            conclusion = "業績悪化が見られる店舗を特定しました。早急な対応が推奨されます。"
        elif "sales" in intents:
            conclusion = "売上に関する分析結果をまとめました。"
        else:
            conclusion = "ご質問に関連するデータを分析しました。"

    if not hypotheses:
        hypotheses.append("追加データが必要です。詳細な分析にはより具体的な質問をお試しください。")
    if not actions:
        actions.append("該当する店舗のKPI推移を確認し、課題の優先順位を検討してください。")

    return APIResponse(data=AIQueryResponse(
        conclusion=conclusion,
        facts=facts,
        hypotheses=hypotheses,
        recommended_actions=actions,
        estimated_impact_amount=impact,
        confidence=confidence,
        referenced_entities=referenced,
    ))


@router.get("/suggested-questions", response_model=APIResponse[list[SuggestedQuestion]])
async def suggested_questions():
    questions = [
        SuggestedQuestion(question="今月の売上状況を教えてください", category="売上"),
        SuggestedQuestion(question="人件費率が高い店舗はどこですか？", category="人件費"),
        SuggestedQuestion(question="原価率が悪化している店舗を教えてください", category="原価"),
        SuggestedQuestion(question="業績が悪化している店舗はありますか？", category="業績"),
        SuggestedQuestion(question="口コミスコアが低い店舗を教えてください", category="口コミ"),
        SuggestedQuestion(question="利益率の改善余地がある店舗はどこですか？", category="利益"),
        SuggestedQuestion(question="FL比率が高い店舗を特定してください", category="FL比率"),
        SuggestedQuestion(question="前年比で売上が低下している店舗はどこですか？", category="売上"),
    ]
    return APIResponse(data=questions)
