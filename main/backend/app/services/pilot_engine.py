"""Zensho POC engine: theme テンプレ + 自動セットアップ + 効果計測"""
from __future__ import annotations
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pilot import PilotProject, PilotIntervention, PilotResult
from app.models.kpi import StoreDailyKPI
from app.models.daily_sales import DailyStoreSales
from app.models.store import Store
from app.services.value_engine_v2 import (
    compute_baseline, compute_intervention, compute_did, compute_annualized_impact,
    welch_t_test, bootstrap_ci,
)


# テーマ別の標準テンプレ — POC Wizard が参照
THEME_TEMPLATES = {
    "ZP-01": {
        "name": "欠品・廃棄削減 POC",
        "description": "需要予測精度向上 → 在庫補充タイミング最適化で廃棄/欠品を同時削減",
        "default_brands": ["都市型", "かっぱ寿司"],
        "primary_kpis": ["waste_amount", "stockout_rate", "gross_profit_rate"],
        "target_improvement_pct": {"waste_amount": -3.0, "stockout_rate": -5.0},
        "interventions": [
            {"intervention_type": "demand_optimization", "name": "需要予測モデル切替", "expected_impact_yen": 8_000_000},
            {"intervention_type": "replenishment_tuning", "name": "補充カットオフ調整", "expected_impact_yen": 5_000_000},
        ],
        "weekly_plan": [
            "W1: データ取り込み + DQ レビュー",
            "W2: ベースライン KPI 確定 + 介入店舗選定",
            "W3-4: 介入実施 + 日次モニタリング",
            "W5-6: 効果計測 + 仮説検証",
            "W7: 中間レポート",
            "W8: 最終報告書 + 本展開提案",
        ],
        "data_required": ["daily_sales", "product_sales", "inventory_snapshot"],
    },
    "ZP-02": {
        "name": "深夜帯人員配置最適化 POC",
        "description": "深夜帯のシフト過剰/過少を解消、人時売上を改善",
        "default_brands": ["かっぱ寿司"],
        "primary_kpis": ["sales_per_labor_hour", "labor_cost_rate", "overtime_hours"],
        "target_improvement_pct": {"sales_per_labor_hour": 3.0, "labor_cost_rate": -2.0},
        "interventions": [
            {"intervention_type": "shift_realignment", "name": "深夜帯シフト最適化", "expected_impact_yen": 12_000_000},
        ],
        "weekly_plan": [
            "W1: 勤怠データ取り込み + 法令違反検知",
            "W2: 深夜帯 KPI ベースライン",
            "W3-5: 介入店舗でシフトパターン適用",
            "W6-7: 人時売上 / 残業 / 機会損失 計測",
            "W8: 最終報告書",
        ],
        "data_required": ["labor_actual", "hourly_sales", "shift"],
    },
    "ZP-03": {
        "name": "SV 訪問優先順位最適化 POC",
        "description": "SV ミッションを improvement opportunity 順に再配分",
        "default_brands": ["郊外ロードサイド型", "都市型"],
        "primary_kpis": ["sv_visit_effectiveness", "underperforming_store_count", "health_score"],
        "target_improvement_pct": {"underperforming_store_count": -30.0, "health_score": 5.0},
        "interventions": [
            {"intervention_type": "sv_reprioritization", "name": "SV ミッション順序最適化", "expected_impact_yen": 6_000_000},
        ],
        "weekly_plan": [
            "W1: 全店 health_score ベースライン",
            "W2: SV mission 優先順位を AI で再生成",
            "W3-6: 新優先順位で訪問 + チェックリスト記録",
            "W7-8: 訪問効果計測 + 報告書",
        ],
        "data_required": ["sv_visit", "kpi", "store"],
    },
    "ZP-04": {
        "name": "QSC/HACCP 監査統合 POC",
        "description": "監査スコアと実 KPI 連動を可視化、是正完了率を改善",
        "default_brands": ["全ブランド"],
        "primary_kpis": ["qsc_score", "haccp_compliance_rate", "corrective_action_close_rate"],
        "target_improvement_pct": {"haccp_compliance_rate": 5.0, "corrective_action_close_rate": 10.0},
        "interventions": [
            {"intervention_type": "audit_integration", "name": "QSC/HACCP 統合ダッシュボード展開", "expected_impact_yen": 4_000_000},
        ],
        "weekly_plan": [
            "W1: QSC/HACCP データ取り込み",
            "W2: 既存監査と本部 KPI の相関分析",
            "W3-6: 統合監視運用",
            "W7-8: 効果計測 + 報告書",
        ],
        "data_required": ["qsc_audit", "haccp_monitoring"],
    },
    "ZP-05": {
        "name": "M&A ブランド可視化 POC",
        "description": "買収ブランドの KPI 統一・データ接続を進捗可視化",
        "default_brands": ["ロッテリア"],
        "primary_kpis": ["data_integration_rate", "kpi_unification_rate"],
        "target_improvement_pct": {"data_integration_rate": 100.0, "kpi_unification_rate": 80.0},
        "interventions": [
            {"intervention_type": "ma_onboarding", "name": "ブランド統合 onboarding", "expected_impact_yen": 3_000_000},
        ],
        "weekly_plan": [
            "W1-2: source system inventory + data contract 設計",
            "W3-5: connector 接続 + master 統合",
            "W6-7: KPI mapping + 統一レポート",
            "W8: PMI ダッシュボード稼働",
        ],
        "data_required": ["all"],
    },
}


def get_theme_template(theme: str) -> dict:
    return THEME_TEMPLATES.get(theme, THEME_TEMPLATES["ZP-01"])


def list_themes() -> list[dict]:
    return [
        {"theme_id": k, **{kk: vv for kk, vv in v.items() if kk in ["name", "description", "primary_kpis", "default_brands"]}}
        for k, v in THEME_TEMPLATES.items()
    ]


# KPI の単位 → 円換算係数（年間インパクト計算用）
KPI_VALUE_CONVERSION = {
    "waste_amount": {"unit": "yen_per_day", "annual_factor": 365},
    "stockout_rate": {"unit": "pct", "annual_factor": 365, "revenue_loss_per_pct": 1500000},  # 1%欠品=月150万損失/店舗
    "gross_profit_rate": {"unit": "pct", "annual_factor": 12, "monthly_revenue_per_store": 15000000},
    "sales_per_labor_hour": {"unit": "yen_per_hour", "annual_factor": 365 * 8},
    "labor_cost_rate": {"unit": "pct", "annual_factor": 12, "monthly_revenue_per_store": 15000000},
    "overtime_hours": {"unit": "hours", "annual_factor": 52, "cost_per_hour": 2500},
    "sv_visit_effectiveness": {"unit": "score", "annual_factor": 1, "monetary_per_point": 5000000},
    "underperforming_store_count": {"unit": "count", "annual_factor": 1, "loss_per_store": 24000000},
    "health_score": {"unit": "score", "annual_factor": 1, "monetary_per_point": 1500000},
    "qsc_score": {"unit": "score", "annual_factor": 1, "monetary_per_point": 800000},
    "haccp_compliance_rate": {"unit": "pct", "annual_factor": 1, "monetary_per_pct": 500000},
    "corrective_action_close_rate": {"unit": "pct", "annual_factor": 1, "monetary_per_pct": 300000},
}


async def create_pilot_from_template(
    db: AsyncSession,
    tenant_id: str,
    theme: str,
    target_brand_id: str | None = None,
    target_store_ids: list[str] | None = None,
    control_store_ids: list[str] | None = None,
    name_override: str | None = None,
    sponsor_name: str | None = None,
    baseline_start: date | None = None,
    overlay_mode: str = "read_only",
) -> PilotProject:
    """テーマテンプレを元に PilotProject + 標準 interventions を一括作成"""
    template = get_theme_template(theme)

    today = date.today()
    bs = baseline_start or (today - timedelta(days=90))
    be = bs + timedelta(days=29)
    iv_s = be + timedelta(days=1)
    iv_e = iv_s + timedelta(days=27)  # 4週介入

    pilot = PilotProject(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        name=name_override or template["name"],
        target_brand_id=uuid.UUID(target_brand_id) if target_brand_id else None,
        target_store_ids=[uuid.UUID(s) for s in (target_store_ids or [])],
        control_store_ids=[uuid.UUID(s) for s in (control_store_ids or [])],
        theme=theme,
        description=template["description"],
        baseline_start_date=bs,
        baseline_end_date=be,
        intervention_start_date=iv_s,
        intervention_end_date=iv_e,
        success_kpis=template["primary_kpis"],
        target_improvement_pct=template["target_improvement_pct"],
        sponsor_name=sponsor_name,
        status="planning",
        overlay_mode=overlay_mode,
    )
    db.add(pilot)
    await db.flush()

    for iv_def in template["interventions"]:
        db.add(PilotIntervention(
            id=uuid.uuid4(),
            pilot_project_id=pilot.id,
            intervention_type=iv_def["intervention_type"],
            name=iv_def["name"],
            target_store_ids=pilot.target_store_ids,
            start_date=iv_s,
            end_date=iv_e,
            expected_impact_yen=Decimal(iv_def["expected_impact_yen"]),
            status="planned",
        ))
    await db.commit()
    await db.refresh(pilot)
    return pilot


async def calculate_pilot_results(
    db: AsyncSession, tenant_id: str, pilot_id: str,
) -> list[PilotResult]:
    """target/control 各店舗 × success_kpis 全部について統計検定し PilotResult に保存"""
    pilot = (await db.execute(
        select(PilotProject).where(PilotProject.id == pilot_id, PilotProject.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not pilot:
        raise ValueError(f"PilotProject not found: {pilot_id}")

    # 既存結果削除
    existing = (await db.execute(
        select(PilotResult).where(PilotResult.pilot_project_id == pilot_id)
    )).scalars().all()
    for r in existing:
        await db.delete(r)

    results = []
    target_ids = [str(s) for s in pilot.target_store_ids]
    control_ids = [str(s) for s in pilot.control_store_ids]

    for kpi_name in pilot.success_kpis:
        baseline_target = await compute_baseline(db, tenant_id, target_ids, kpi_name,
                                                  pilot.baseline_start_date, pilot.baseline_end_date)
        intervention_target = await compute_intervention(db, tenant_id, target_ids, kpi_name,
                                                          pilot.intervention_start_date, pilot.intervention_end_date)

        if control_ids:
            baseline_ctrl = await compute_baseline(db, tenant_id, control_ids, kpi_name,
                                                    pilot.baseline_start_date, pilot.baseline_end_date)
            intervention_ctrl = await compute_intervention(db, tenant_id, control_ids, kpi_name,
                                                            pilot.intervention_start_date, pilot.intervention_end_date)
            delta = compute_did(baseline_target, intervention_target, baseline_ctrl, intervention_ctrl)
            method = "did"
            control_value = intervention_ctrl["mean"]
        else:
            delta = (intervention_target["mean"] or 0) - (baseline_target["mean"] or 0)
            method = "before_after"
            control_value = None

        # 統計検定
        baseline_samples = baseline_target["samples"]
        intervention_samples = intervention_target["samples"]
        p_value = welch_t_test(baseline_samples, intervention_samples) if len(baseline_samples) >= 5 and len(intervention_samples) >= 5 else None
        ci_low, ci_high = bootstrap_ci(baseline_samples, intervention_samples) if len(baseline_samples) >= 5 and len(intervention_samples) >= 5 else (None, None)

        sig = bool(p_value is not None and p_value < 0.05)
        annual = compute_annualized_impact(kpi_name, delta, len(target_ids), pilot.intervention_start_date, pilot.intervention_end_date)

        baseline_mean = baseline_target["mean"] or 0
        delta_pct = (delta / baseline_mean * 100) if baseline_mean else None

        result = PilotResult(
            id=uuid.uuid4(),
            pilot_project_id=pilot.id,
            kpi_name=kpi_name,
            baseline_value=Decimal(str(baseline_target["mean"] or 0)),
            intervention_value=Decimal(str(intervention_target["mean"] or 0)),
            control_value=Decimal(str(control_value)) if control_value is not None else None,
            delta_absolute=Decimal(str(delta)),
            delta_pct=Decimal(str(delta_pct)) if delta_pct is not None else None,
            p_value=Decimal(str(p_value)) if p_value is not None else None,
            confidence_interval_low=Decimal(str(ci_low)) if ci_low is not None else None,
            confidence_interval_high=Decimal(str(ci_high)) if ci_high is not None else None,
            sample_size=len(intervention_samples),
            significant=sig,
            annualized_impact_yen=Decimal(str(int(annual))) if annual is not None else None,
            calculation_method=method,
            assumptions={
                "baseline_n": len(baseline_samples),
                "intervention_n": len(intervention_samples),
                "control_n": len(control_ids),
                "kpi_conversion": KPI_VALUE_CONVERSION.get(kpi_name, {}),
            },
        )
        db.add(result)
        results.append(result)

    pilot.status = "completed" if pilot.intervention_end_date <= date.today() else "running"
    await db.commit()
    return results


async def generate_pilot_summary(db: AsyncSession, tenant_id: str, pilot_id: str) -> dict:
    """経営向け 1ページ summary 用に集計"""
    pilot = (await db.execute(
        select(PilotProject).where(PilotProject.id == pilot_id, PilotProject.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not pilot:
        return {}

    results = (await db.execute(
        select(PilotResult).where(PilotResult.pilot_project_id == pilot_id)
    )).scalars().all()

    total_annual = sum(int(r.annualized_impact_yen or 0) for r in results)
    significant_count = sum(1 for r in results if r.significant)

    template = get_theme_template(pilot.theme)
    return {
        "pilot_id": str(pilot.id),
        "name": pilot.name,
        "theme": pilot.theme,
        "theme_name": template["name"],
        "sponsor_name": pilot.sponsor_name,
        "status": pilot.status,
        "overlay_mode": pilot.overlay_mode,
        "target_store_count": len(pilot.target_store_ids),
        "control_store_count": len(pilot.control_store_ids),
        "baseline_period": f"{pilot.baseline_start_date} 〜 {pilot.baseline_end_date}",
        "intervention_period": f"{pilot.intervention_start_date} 〜 {pilot.intervention_end_date}",
        "results": [
            {
                "kpi_name": r.kpi_name,
                "baseline": float(r.baseline_value or 0),
                "intervention": float(r.intervention_value or 0),
                "delta_pct": float(r.delta_pct or 0),
                "p_value": float(r.p_value) if r.p_value else None,
                "significant": r.significant,
                "annualized_impact_yen": int(r.annualized_impact_yen or 0),
                "ci": [float(r.confidence_interval_low) if r.confidence_interval_low else None,
                       float(r.confidence_interval_high) if r.confidence_interval_high else None],
                "method": r.calculation_method,
            }
            for r in results
        ],
        "total_annualized_impact_yen": total_annual,
        "significant_kpi_count": significant_count,
        "kpi_count": len(results),
        "verdict": _make_verdict(results, total_annual),
        "next_actions": _next_actions(pilot, results),
    }


def _make_verdict(results, total_annual: int) -> str:
    if not results:
        return "未計算"
    sig = sum(1 for r in results if r.significant)
    if sig >= 2 and total_annual > 50_000_000:
        return f"成功: 統計的有意 {sig}/{len(results)} KPI、年間 {total_annual:,}円 改善見込み"
    if sig >= 1:
        return f"部分成功: {sig}/{len(results)} KPI で有意改善、横展開検討"
    if total_annual > 0:
        return f"効果検出: 統計的有意性は弱いが、{total_annual:,}円規模の改善傾向"
    return "効果不明: 介入条件 / 期間 / サンプルサイズの再設計が必要"


def _next_actions(pilot: PilotProject, results: list[PilotResult]) -> list[str]:
    sig = [r for r in results if r.significant]
    actions = []
    if sig:
        actions.append(f"有意改善が出た KPI（{', '.join(r.kpi_name for r in sig)}）について本契約スコープでの全店展開を提案")
    if any(r.annualized_impact_yen and int(r.annualized_impact_yen) < 0 for r in results):
        actions.append("逆効果が出た KPI について介入内容のレビューと中止判定")
    insig = [r for r in results if not r.significant and r.p_value]
    if insig:
        actions.append(f"非有意 {len(insig)} KPI: サンプルサイズまたは介入期間の延長で再検証")
    if pilot.overlay_mode == "read_only":
        actions.append("Read-only から writeback approved への移行を IT 部門と協議")
    return actions or ["次フェーズに進む前にスポンサーと再合意"]
