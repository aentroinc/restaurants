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
from app.models.sv_visit import SVVisit
from app.models.task import Task
from app.schemas.common import APIResponse
from app.schemas.ai import AIQueryRequest, AIQueryResponse, ReferencedEntity, SuggestedQuestion
from app.auth import get_tenant_id
from app.middleware.audit import log_audit

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
    "施策": "improvement",
    "口コミ": "review",
    "レビュー": "review",
    "割引": "discount",
    "FL": "fl_ratio",
    "健康": "health",
    "ヘルス": "health",
    "SV": "sv_visit",
    "訪問": "sv_visit",
    "エリア": "sv_visit",
}


def parse_intent(question: str) -> list[str]:
    intents = []
    for kw, intent in KEYWORD_MAP.items():
        if kw in question:
            intents.append(intent)
    return list(set(intents)) or ["general"]


@router.post("/query", response_model=APIResponse[AIQueryResponse])
async def ai_query(body: AIQueryRequest, db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    intents = parse_intent(body.question)
    as_of = date(2026, 4, 30)

    facts = []
    hypotheses = []
    actions = []
    referenced = []
    confidence = "medium"
    impact = None
    conclusion = ""

    # --- SALES ---
    if "sales" in intents or "general" in intents:
        sales_q = await db.execute(
            select(func.sum(DailyStoreSales.net_sales))
            .where(and_(
                DailyStoreSales.business_date >= as_of.replace(day=1),
                DailyStoreSales.business_date <= as_of,
                DailyStoreSales.tenant_id == tenant_id,
            ))
        )
        total_sales = sales_q.scalar() or 0
        prev_q = await db.execute(
            select(func.sum(DailyStoreSales.net_sales))
            .where(and_(
                DailyStoreSales.business_date >= as_of.replace(day=1, year=as_of.year - 1),
                DailyStoreSales.business_date <= as_of.replace(year=as_of.year - 1),
                DailyStoreSales.tenant_id == tenant_id,
            ))
        )
        prev_sales = prev_q.scalar() or 0
        yoy = ((total_sales - prev_sales) / prev_sales * 100) if prev_sales else 0
        facts.append(f"当月全店売上: {total_sales:,.0f}円 (前年同月比 {yoy:+.1f}%)")

        # top and bottom stores by sales
        top_sales_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.net_sales, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
            .order_by(StoreDailyKPI.net_sales.desc())
            .limit(3)
        )
        for r in top_sales_q.all():
            facts.append(f"売上上位: {r[1]}({r[3]}) {r[2]:,.0f}円")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        bottom_sales_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.net_sales, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
            .order_by(StoreDailyKPI.net_sales)
            .limit(3)
        )
        for r in bottom_sales_q.all():
            facts.append(f"売上下位: {r[1]}({r[3]}) {r[2]:,.0f}円")

        hypotheses.append("売上下位店舗は立地条件や競合出店の影響を受けている可能性があります")
        actions.append("売上下位店舗の立地・商圏分析を実施し、集客施策の優先度を決定してください")

    # --- LABOR ---
    if "labor" in intents:
        avg_labor_q = await db.execute(
            select(func.avg(StoreDailyKPI.labor_cost_rate))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        avg_labor = avg_labor_q.scalar() or 0
        facts.append(f"全店平均人件費率: {avg_labor:.1f}%")

        labor_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.labor_cost_rate,
                   StoreDailyKPI.sales_per_labor_hour, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.labor_cost_rate > 35))
            .order_by(StoreDailyKPI.labor_cost_rate.desc())
            .limit(5)
        )
        overrun_count = 0
        for r in labor_q.all():
            facts.append(f"{r[1]}({r[4]}): 人件費率 {r[2]:.1f}% / 人時売上高 {r[3]:,}円")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
            overrun_count += 1

        if overrun_count > 0:
            facts.append(f"人件費率35%超の店舗数: {overrun_count}店舗")
        hypotheses.append("シフト管理の不備、または売上減少に伴う相対的な人件費率上昇の可能性があります。特に人時売上高が低い店舗は、シフト時間の過剰投入が疑われます")
        actions.append("人件費率35%超の店舗に対し、曜日・時間帯別のシフト最適化と人時売上高4,500円以上を目標にした改善計画を策定してください")
        impact = overrun_count * 200000 if overrun_count else None

    # --- COGS ---
    if "cogs" in intents:
        avg_cogs_q = await db.execute(
            select(func.avg(StoreDailyKPI.cogs_rate))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        avg_cogs = avg_cogs_q.scalar() or 0
        facts.append(f"全店平均原価率: {avg_cogs:.1f}%")

        cogs_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.cogs_rate,
                   StoreDailyKPI.cogs, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.cogs_rate > 35))
            .order_by(StoreDailyKPI.cogs_rate.desc())
            .limit(5)
        )
        overrun_count = 0
        for r in cogs_q.all():
            facts.append(f"{r[1]}({r[4]}): 原価率 {r[2]:.1f}% (原価額 {r[3]:,}円)")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
            overrun_count += 1

        if overrun_count > 0:
            facts.append(f"原価率35%超の店舗数: {overrun_count}店舗")
        hypotheses.append("食材ロス増加、仕入れ価格高騰、またはポーション管理の不備が考えられます。ブランド別の理論原価との乖離も確認が必要です")
        actions.append("原価率異常店舗の発注量・廃棄量を確認し、理論原価との乖離を分析。メニューミックスの見直しも検討してください")
        impact = overrun_count * 300000 if overrun_count else None

    # --- PROFIT ---
    if "profit" in intents:
        profit_q = await db.execute(
            select(func.avg(StoreDailyKPI.operating_profit_rate))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        avg_profit = profit_q.scalar() or 0
        facts.append(f"全店平均営業利益率: {avg_profit:.1f}%")

        # top profit stores
        top_profit_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.operating_profit_rate,
                   StoreDailyKPI.fl_ratio, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(StoreDailyKPI.business_date == as_of)
            .order_by(StoreDailyKPI.operating_profit_rate.desc())
            .limit(3)
        )
        for r in top_profit_q.all():
            facts.append(f"利益率上位: {r[1]}({r[4]}) 営業利益率 {r[2]:.1f}% / FL比率 {r[3]:.1f}%")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        # bottom profit stores
        bottom_profit_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.operating_profit_rate,
                   StoreDailyKPI.fl_ratio, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(StoreDailyKPI.business_date == as_of)
            .order_by(StoreDailyKPI.operating_profit_rate)
            .limit(3)
        )
        for r in bottom_profit_q.all():
            facts.append(f"利益率下位: {r[1]}({r[4]}) 営業利益率 {r[2]:.1f}% / FL比率 {r[3]:.1f}%")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        hypotheses.append("利益率下位店舗はFL比率が高く、人件費または原価のコントロールに課題がある可能性が高いです")
        actions.append("利益率下位店舗のFL比率を分解し、人件費・原価それぞれの改善優先度を決定してください")

    # --- IMPROVEMENT / 施策 ---
    if "improvement" in intents:
        # completed tasks with realized impact
        task_q = await db.execute(
            select(Task.store_id, Store.name, Task.title, Task.issue_type,
                   Task.expected_impact_amount, Task.realized_impact_amount)
            .join(Store, Store.id == Task.store_id)
            .where(and_(Task.status == "done", Task.realized_impact_amount.isnot(None), Task.tenant_id == tenant_id))
            .order_by(Task.realized_impact_amount.desc())
            .limit(5)
        )
        for r in task_q.all():
            realization_rate = (r[5] / r[4] * 100) if r[4] and r[4] > 0 else 0
            facts.append(f"{r[1]}: {r[2]} — 期待効果 {r[4]:,.0f}円 → 実現 {r[5]:,.0f}円 (達成率 {realization_rate:.0f}%)")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        # open/in-progress tasks count
        open_q = await db.execute(
            select(Task.status, func.count(Task.id))
            .where(and_(Task.status.in_(["open", "in_progress", "done"]), Task.tenant_id == tenant_id))
            .group_by(Task.status)
        )
        status_counts = {r[0]: r[1] for r in open_q.all()}
        facts.append(f"タスク状況: 完了 {status_counts.get('done', 0)}件 / 進行中 {status_counts.get('in_progress', 0)}件 / 未着手 {status_counts.get('open', 0)}件")

        # total improvement opportunity
        opp_q = await db.execute(
            select(func.sum(StoreDailyKPI.improvement_opportunity_amount))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        total_opp = opp_q.scalar() or 0
        facts.append(f"全店改善余地の合計: {total_opp:,.0f}円/月")

        hypotheses.append("改善施策の効果実現率にばらつきがあり、実行品質の差が影響しています。SV訪問頻度と施策達成率に相関が見られます")
        actions.append("効果実現率が高い施策パターンを横展開し、未着手タスクの優先順位を改善余地額ベースで見直してください")
        impact = int(total_opp * 0.3) if total_opp else None

    # --- DECLINE ---
    if "decline" in intents:
        decline_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.health_score,
                   StoreDailyKPI.issue_types, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.health_score < 40))
            .order_by(StoreDailyKPI.health_score)
            .limit(5)
        )
        for r in decline_q.all():
            issue_summary = ""
            if r[3] and isinstance(r[3], list):
                types = [i.get("issue_type", i) if isinstance(i, dict) else i for i in r[3]]
                issue_summary = f" (課題: {', '.join(types)})"
            facts.append(f"{r[1]}({r[4]}): ヘルススコア {r[2]:.0f}{issue_summary}")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))
        hypotheses.append("複数指標の同時悪化が見られ、根本原因の特定が必要です。特にFL比率の悪化が利益を圧迫している可能性があります")
        actions.append("ヘルススコア低下店舗への優先的なSV訪問を計画し、課題タイプ別の改善タスクを発行してください")

    # --- REVIEW ---
    if "review" in intents:
        avg_review_q = await db.execute(
            select(func.avg(StoreDailyKPI.review_score))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.review_score.isnot(None)))
        )
        avg_review = avg_review_q.scalar() or 0
        facts.append(f"全店平均口コミスコア: {avg_review:.2f}")

        review_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.review_score, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.review_score.isnot(None)))
            .order_by(StoreDailyKPI.review_score)
            .limit(5)
        )
        for r in review_q.all():
            facts.append(f"{r[1]}({r[3]}): 口コミスコア {r[2]:.2f}")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        # best review stores for comparison
        best_review_q = await db.execute(
            select(Store.name, StoreDailyKPI.review_score)
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.review_score.isnot(None)))
            .order_by(StoreDailyKPI.review_score.desc())
            .limit(3)
        )
        best = best_review_q.all()
        if best:
            facts.append(f"口コミ上位: {', '.join(f'{r[0]}({r[1]:.2f})' for r in best)}")

        hypotheses.append("口コミスコアが低い店舗は、接客品質や清潔さに課題がある可能性が高く、人手不足による対応品質低下も考えられます")
        actions.append("口コミ低下店舗の最新レビュー内容を確認し、「接客」「清潔さ」「待ち時間」などカテゴリ別に課題を特定してください")

    # --- SV VISIT ---
    if "sv_visit" in intents:
        visit_count_q = await db.execute(
            select(func.count(SVVisit.id))
            .where(and_(
                SVVisit.visit_date >= as_of.replace(day=1),
                SVVisit.visit_date <= as_of,
                SVVisit.tenant_id == tenant_id,
            ))
        )
        visit_count = visit_count_q.scalar() or 0
        facts.append(f"当月SV訪問回数: {visit_count}回")

        avg_score_q = await db.execute(
            select(func.avg(SVVisit.checklist_score))
            .where(and_(
                SVVisit.visit_date >= as_of.replace(day=1),
                SVVisit.visit_date <= as_of,
                SVVisit.tenant_id == tenant_id,
            ))
        )
        avg_checklist = avg_score_q.scalar() or 0
        facts.append(f"平均チェックリストスコア: {avg_checklist:.1f}点")

        # stores with low checklist scores
        low_visit_q = await db.execute(
            select(SVVisit.store_id, Store.name, SVVisit.checklist_score, SVVisit.visit_date)
            .join(Store, Store.id == SVVisit.store_id)
            .where(and_(
                SVVisit.visit_date >= as_of.replace(day=1),
                SVVisit.visit_date <= as_of,
                SVVisit.tenant_id == tenant_id,
            ))
            .order_by(SVVisit.checklist_score)
            .limit(5)
        )
        for r in low_visit_q.all():
            facts.append(f"{r[1]}: チェックリスト {r[2]:.0f}点 ({r[3]})")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        hypotheses.append("チェックリストスコアが低い店舗はオペレーション品質に課題があり、口コミスコアや人件費率にも悪影響を与えている可能性があります")
        actions.append("チェックリスト低スコア店舗へのフォローアップ訪問を計画し、改善タスクの発行・進捗管理を強化してください")

    # --- FL RATIO ---
    if "fl_ratio" in intents:
        avg_fl_q = await db.execute(
            select(func.avg(StoreDailyKPI.fl_ratio))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        avg_fl = avg_fl_q.scalar() or 0
        facts.append(f"全店平均FL比率: {avg_fl:.1f}%")

        high_fl_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, StoreDailyKPI.fl_ratio,
                   StoreDailyKPI.cogs_rate, StoreDailyKPI.labor_cost_rate, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.fl_ratio > 65))
            .order_by(StoreDailyKPI.fl_ratio.desc())
            .limit(5)
        )
        for r in high_fl_q.all():
            facts.append(f"{r[1]}({r[5]}): FL比率 {r[2]:.1f}% (原価率 {r[3]:.1f}% + 人件費率 {r[4]:.1f}%)")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        hypotheses.append("FL比率65%超の店舗は利益確保が困難な水準であり、原価・人件費のどちらが主因かを分解して対処する必要があります")
        actions.append("FL比率65%超の店舗を原価主因・人件費主因に分類し、それぞれに適切な改善施策を実施してください")

    # --- DISCOUNT ---
    if "discount" in intents:
        discount_q = await db.execute(
            select(StoreDailyKPI.store_id, Store.name, DailyStoreSales.discount_amount,
                   DailyStoreSales.gross_sales, Brand.name.label("brand_name"))
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .join(DailyStoreSales, and_(
                DailyStoreSales.store_id == StoreDailyKPI.store_id,
                DailyStoreSales.business_date == StoreDailyKPI.business_date,
            ))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
            .order_by(DailyStoreSales.discount_amount.desc())
            .limit(5)
        )
        for r in discount_q.all():
            rate = (r[2] / r[3] * 100) if r[3] else 0
            facts.append(f"{r[1]}({r[4]}): 割引額 {r[2]:,}円 (割引率 {rate:.1f}%)")
            referenced.append(ReferencedEntity(entity_type="store", entity_id=str(r[0]), entity_name=r[1]))

        hypotheses.append("割引率が高い店舗はキャンペーンの過剰利用や値引き対応が常態化している可能性があります")
        actions.append("割引率8%超の店舗のキャンペーン適用ルールを見直し、適正水準に是正してください")

    # --- HEALTH ---
    if "health" in intents:
        avg_health_q = await db.execute(
            select(func.avg(StoreDailyKPI.health_score))
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        avg_health = avg_health_q.scalar() or 0
        facts.append(f"全店平均ヘルススコア: {avg_health:.0f}")

        health_dist_q = await db.execute(
            select(
                func.count(StoreDailyKPI.id).filter(StoreDailyKPI.health_score >= 80),
                func.count(StoreDailyKPI.id).filter(and_(StoreDailyKPI.health_score >= 50, StoreDailyKPI.health_score < 80)),
                func.count(StoreDailyKPI.id).filter(StoreDailyKPI.health_score < 50),
            )
            .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        )
        dist = health_dist_q.one_or_none()
        if dist:
            facts.append(f"スコア分布: 良好(80+) {dist[0]}店 / 注意(50-79) {dist[1]}店 / 要対応(50未満) {dist[2]}店")

        hypotheses.append("ヘルススコアが低い店舗は複数のKPI指標で課題を抱えており、個別対応ではなく包括的な改善計画が必要です")
        actions.append("ヘルススコア50未満の店舗に対してSV訪問を優先配置し、課題の根本原因を特定してください")

    if not facts:
        facts.append("該当するデータが見つかりませんでした")
        confidence = "low"

    if not conclusion:
        intent_conclusions = {
            "labor": "人件費に関する分析結果をまとめました。人件費率超過店舗を特定し、改善の方向性を提示しています。",
            "cogs": "原価に関する分析結果をまとめました。原価率超過店舗とその改善アクションを提示しています。",
            "decline": "業績悪化が見られる店舗を特定しました。課題タイプ別の早急な対応が推奨されます。",
            "sales": "売上に関する分析結果をまとめました。上位・下位店舗を特定し、改善の方向性を提示しています。",
            "profit": "利益に関する分析結果をまとめました。利益率の上位・下位店舗を比較し、FL比率の改善ポイントを提示しています。",
            "improvement": "改善施策の進捗と効果実現状況をまとめました。横展開可能な成功パターンを特定しています。",
            "review": "口コミに関する分析結果をまとめました。スコアが低い店舗のサービス品質改善が急務です。",
            "sv_visit": "SV訪問状況をまとめました。チェックリストスコアに基づく優先訪問計画の策定を推奨します。",
            "fl_ratio": "FL比率に関する分析結果をまとめました。原価・人件費の内訳を分解し改善余地を特定しています。",
            "discount": "割引状況を分析しました。過剰割引が見られる店舗に対して適正化を推奨します。",
            "health": "全店のヘルススコア状況をまとめました。要対応店舗への優先的な介入を推奨します。",
        }
        for intent in intents:
            if intent in intent_conclusions:
                conclusion = intent_conclusions[intent]
                break
        if not conclusion:
            conclusion = "ご質問に関連するデータを分析しました。"

    if not hypotheses:
        hypotheses.append("追加データが必要です。詳細な分析にはより具体的な質問をお試しください。")
    if not actions:
        actions.append("該当する店舗のKPI推移を確認し、課題の優先順位を検討してください。")

    log_audit(
        tenant_id, None, "ai_query", "ai", None,
        {"question": body.question, "intents": intents},
    )

    response_data = AIQueryResponse(
        conclusion=conclusion,
        facts=facts,
        hypotheses=hypotheses,
        recommended_actions=actions,
        estimated_impact_amount=impact,
        confidence=confidence,
        referenced_entities=referenced,
    )

    # Log query to DB
    try:
        from uuid import UUID as UUIDType
        from app.database import SyncSession
        from app.models.ai_query import AIQueryLog
        sync_session = SyncSession()
        log_entry = AIQueryLog(
            tenant_id=UUIDType(tenant_id),
            question=body.question,
            answer=response_data.model_dump(mode="json"),
            referenced_entities=[r.model_dump(mode="json") for r in referenced] if referenced else [],
            confidence=confidence,
        )
        sync_session.add(log_entry)
        sync_session.commit()
        sync_session.close()
    except Exception:
        pass

    return APIResponse(data=response_data)


@router.get("/suggested-questions", response_model=APIResponse[list[SuggestedQuestion]])
async def suggested_questions():
    questions = [
        SuggestedQuestion(question="客数が最も減少している店舗はどこ？", category="売上"),
        SuggestedQuestion(question="原価率48%を下回っている店舗は？", category="原価"),
        SuggestedQuestion(question="食べ放題型の廃棄率が高い店舗を教えて", category="廃棄"),
        SuggestedQuestion(question="都市型出店（南池袋、吉祥寺）の立ち上がり状況は？", category="出店"),
        SuggestedQuestion(question="スシローとの客単価差は？", category="競争"),
        SuggestedQuestion(question="全業態のFL比率を比較して", category="経営"),
        SuggestedQuestion(question="デリカ事業の赤字原因を分析して", category="事業"),
        SuggestedQuestion(question="不祥事後のブランド回復状況は？", category="ブランド"),
    ]
    return APIResponse(data=questions)
