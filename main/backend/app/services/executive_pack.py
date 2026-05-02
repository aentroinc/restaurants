"""Executive Pack Generator — 経営/事業部/IT/店長 4 audience の構造化レポート"""
from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pilot import PilotProject, PilotResult, PilotIntervention
from app.models.brand import Brand
from app.models.store import Store
from app.models.kpi import StoreDailyKPI
from app.services.pilot_engine import generate_pilot_summary, get_theme_template


async def generate_pilot_report(
    db: AsyncSession, tenant_id: str, pilot_id: str, audience: str = "executive",
) -> dict:
    """audience に応じた構造化レポート（PDF/PPT 化前提の sections + charts + commentary）"""
    summary = await generate_pilot_summary(db, tenant_id, pilot_id)
    if not summary:
        return {"error": "pilot not found"}

    if audience == "executive":
        return _build_executive_pack(summary)
    if audience == "brand":
        return await _build_brand_pack(db, tenant_id, pilot_id, summary)
    if audience == "it":
        return _build_it_pack(summary)
    if audience == "store_manager":
        return _build_store_manager_brief(summary)
    return _build_executive_pack(summary)


def _build_executive_pack(summary: dict) -> dict:
    """社長 / CFO 向け 1ページサマリ"""
    total = summary["total_annualized_impact_yen"]
    return {
        "audience": "executive",
        "title": f"{summary['name']} — 経営報告",
        "subtitle": f"テーマ: {summary['theme_name']}",
        "verdict": summary["verdict"],
        "headline_metric": {
            "label": "年間改善見込み",
            "value": total,
            "value_display": f"¥{total:,}",
            "sub": f"対象 {summary['target_store_count']} 店舗、検証期間 {summary['intervention_period']}",
        },
        "sections": [
            {
                "id": "summary",
                "title": "エグゼクティブサマリ",
                "type": "text",
                "content": _build_executive_summary_text(summary),
            },
            {
                "id": "kpi_results",
                "title": "KPI 別効果",
                "type": "table",
                "columns": ["KPI", "ベースライン", "介入後", "変化率", "統計的有意", "年間換算"],
                "rows": [
                    [
                        r["kpi_name"],
                        f"{r['baseline']:.2f}",
                        f"{r['intervention']:.2f}",
                        f"{r['delta_pct']:+.2f}%",
                        "✓" if r["significant"] else "—",
                        f"¥{r['annualized_impact_yen']:,}",
                    ]
                    for r in summary["results"]
                ],
            },
            {
                "id": "next_actions",
                "title": "次アクション",
                "type": "list",
                "items": summary["next_actions"],
            },
            {
                "id": "investment_recommendation",
                "title": "本契約推奨",
                "type": "card",
                "content": _build_investment_recommendation(summary),
            },
        ],
        "charts": [
            {
                "id": "impact_by_kpi",
                "type": "bar",
                "title": "KPI 別年間改善額（円）",
                "data": [
                    {"kpi": r["kpi_name"], "value": r["annualized_impact_yen"]}
                    for r in summary["results"]
                ],
            },
        ],
        "footer": {
            "generated_at": datetime.now().isoformat(),
            "version": "v1",
            "data_method": "Difference-in-Differences (control 群あり) または Before/After",
        },
    }


def _build_executive_summary_text(summary: dict) -> str:
    sig = summary["significant_kpi_count"]
    total = summary["total_annualized_impact_yen"]
    return (
        f"本 POC は {summary['theme_name']} を {summary['target_store_count']} 店舗で実施。\n"
        f"主要 KPI {summary['kpi_count']} 本中 **{sig} 本で統計的に有意な改善** を確認。\n"
        f"年間 {total:,} 円の改善見込み。\n\n"
        f"判定: {summary['verdict']}"
    )


def _build_investment_recommendation(summary: dict) -> dict:
    total = summary["total_annualized_impact_yen"]
    poc_cost = 4_000_000  # 標準 POC 価格
    annual_license_estimate = max(total // 10, 24_000_000)  # 改善額の10% or 月200万
    payback_months = (annual_license_estimate / max(total, 1)) * 12 if total > 0 else None

    return {
        "estimated_full_rollout_value": total * 5,  # 全店展開時の見積もり倍数
        "annual_license_proposal_yen": annual_license_estimate,
        "payback_months": round(payback_months, 1) if payback_months else None,
        "recommendation": (
            "全社展開を強く推奨。投資回収期間は短期。"
            if total > 100_000_000
            else "対象ブランド全店への横展開を提案。"
            if total > 30_000_000
            else "より深い介入設計の上で再検証を推奨。"
        ),
    }


async def _build_brand_pack(db, tenant_id, pilot_id, summary: dict) -> dict:
    """事業責任者（ブランド長）向け詳細"""
    pilot_q = await db.execute(
        select(PilotProject).where(PilotProject.id == pilot_id)
    )
    pilot = pilot_q.scalar_one_or_none()

    brand_name = "全ブランド"
    if pilot and pilot.target_brand_id:
        brand = (await db.execute(
            select(Brand).where(Brand.id == pilot.target_brand_id)
        )).scalar_one_or_none()
        if brand:
            brand_name = brand.name

    # 店舗別ランキング（intervention_value 降順）
    store_rankings = []
    if pilot:
        store_q = await db.execute(
            select(Store).where(Store.id.in_(pilot.target_store_ids))
        )
        for store in store_q.scalars().all():
            store_rankings.append({
                "store_id": str(store.id),
                "store_name": store.name,
                "region": store.region if hasattr(store, "region") else None,
            })

    return {
        "audience": "brand",
        "title": f"{brand_name} — POC 詳細レポート",
        "subtitle": summary["theme_name"],
        "sections": [
            {"id": "verdict", "title": "判定", "type": "text", "content": summary["verdict"]},
            {
                "id": "kpi_detail",
                "title": "KPI 別詳細（信頼区間 + 計算法）",
                "type": "table",
                "columns": ["KPI", "ベースライン", "介入後", "Δ", "p値", "95%CI", "手法"],
                "rows": [
                    [
                        r["kpi_name"],
                        f"{r['baseline']:.3f}",
                        f"{r['intervention']:.3f}",
                        f"{r['delta_pct']:+.2f}%",
                        f"{r['p_value']:.4f}" if r["p_value"] else "n/a",
                        f"[{r['ci'][0]:.3f}, {r['ci'][1]:.3f}]" if r["ci"][0] is not None else "n/a",
                        r["method"],
                    ]
                    for r in summary["results"]
                ],
            },
            {
                "id": "store_rankings",
                "title": f"対象 {len(store_rankings)} 店舗",
                "type": "table",
                "columns": ["店舗", "地域"],
                "rows": [[s["store_name"], s["region"] or "-"] for s in store_rankings],
            },
            {"id": "next_actions", "title": "次アクション", "type": "list", "items": summary["next_actions"]},
        ],
    }


def _build_it_pack(summary: dict) -> dict:
    """情シス向け技術 / セキュリティレポート"""
    return {
        "audience": "it",
        "title": f"{summary['name']} — 技術評価レポート",
        "subtitle": "情シス / セキュリティ向け",
        "sections": [
            {
                "id": "data_overview",
                "title": "データ取り扱い",
                "type": "table",
                "columns": ["項目", "内容"],
                "rows": [
                    ["接続方式", summary.get("overlay_mode", "read_only")],
                    ["対象店舗数", str(summary["target_store_count"])],
                    ["対照店舗数", str(summary["control_store_count"])],
                    ["ベースライン期間", summary["baseline_period"]],
                    ["介入期間", summary["intervention_period"]],
                ],
            },
            {
                "id": "security",
                "title": "セキュリティ統制",
                "type": "list",
                "items": [
                    "全 API request を AccessLog に記録",
                    "個人情報列はColumn Policy に基づきマスキング",
                    "AI Analyst 送信前に PII 自動 redaction",
                    "MFA TOTP secret は Fernet 暗号化",
                    "tenant_id に基づく行レベル分離",
                ],
            },
            {
                "id": "calculation_method",
                "title": "効果測定方法",
                "type": "list",
                "items": [
                    "control 群あり: Difference-in-Differences",
                    "control 群なし: Before/After（季節性補正は今後）",
                    "p値は Welch's t-test (unequal variance)",
                    "95% CI は bootstrap (n=500)",
                    "p < 0.05 を統計的有意の閾値とする",
                ],
            },
            {
                "id": "data_lineage",
                "title": "データ系譜",
                "type": "text",
                "content": "全取り込みデータは IngestionRecord に源泉を保存、LineageEvent で source → KPI までトレース可能。",
            },
        ],
    }


def _build_store_manager_brief(summary: dict) -> dict:
    """店長向け：今日 / 今週やるべきこと"""
    return {
        "audience": "store_manager",
        "title": "今週の重点アクション",
        "sections": [
            {
                "id": "today",
                "title": "今日の重点 KPI",
                "type": "list",
                "items": [
                    f"{r['kpi_name']}: 目標達成中" if r["significant"] else f"{r['kpi_name']}: 改善余地あり"
                    for r in summary["results"][:3]
                ],
            },
            {
                "id": "actions",
                "title": "本部からの指示",
                "type": "list",
                "items": summary["next_actions"][:3],
            },
        ],
    }


async def generate_executive_dashboard_data(db: AsyncSession, tenant_id: str) -> dict:
    """Zensho 社長向け executive dashboard 用 — 全 pilot を集約"""
    pilots = (await db.execute(
        select(PilotProject).where(PilotProject.tenant_id == tenant_id)
    )).scalars().all()

    total_value = 0
    by_pilot = []
    for p in pilots:
        results = (await db.execute(
            select(PilotResult).where(PilotResult.pilot_project_id == p.id)
        )).scalars().all()
        pilot_value = sum(int(r.annualized_impact_yen or 0) for r in results)
        total_value += pilot_value
        by_pilot.append({
            "pilot_id": str(p.id),
            "name": p.name,
            "theme": p.theme,
            "status": p.status,
            "annual_value_yen": pilot_value,
            "significant_kpis": sum(1 for r in results if r.significant),
            "total_kpis": len(results),
        })

    return {
        "total_annual_value_yen": total_value,
        "active_pilot_count": sum(1 for p in pilots if p.status in ["planning", "running"]),
        "completed_pilot_count": sum(1 for p in pilots if p.status == "completed"),
        "pilots": by_pilot,
    }
