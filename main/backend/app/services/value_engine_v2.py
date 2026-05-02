"""Value Realization Engine v2 — 統計検定 + 円換算 + Difference-in-Differences"""
from __future__ import annotations
import math
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kpi import StoreDailyKPI
from app.models.daily_sales import DailyStoreSales


# どの KPI がどのテーブルから引けるか
KPI_SOURCES = {
    "waste_amount": ("daily_sales", "waste_amount"),
    "stockout_rate": ("kpi", "stockout_rate"),
    "gross_profit_rate": ("kpi", "gross_profit_rate"),
    "sales_per_labor_hour": ("kpi", "sales_per_labor_hour"),
    "labor_cost_rate": ("kpi", "labor_cost_rate"),
    "overtime_hours": ("kpi", "overtime_hours"),
    "health_score": ("kpi", "health_score"),
    "qsc_score": ("kpi", "qsc_score"),
    "haccp_compliance_rate": ("kpi", "haccp_compliance_rate"),
    "corrective_action_close_rate": ("kpi", "corrective_action_close_rate"),
    "sv_visit_effectiveness": ("kpi", "sv_visit_effectiveness"),
    "underperforming_store_count": ("kpi", "health_score"),  # health < 60 でカウント
    "data_integration_rate": ("kpi", "data_integration_rate"),
    "kpi_unification_rate": ("kpi", "kpi_unification_rate"),
}


async def _aggregate_samples(
    db: AsyncSession, tenant_id: str, store_ids: list[str], kpi_name: str,
    start: date, end: date,
) -> list[float]:
    """指定期間 × 指定店舗群の KPI 値を 1サンプル/(店舗,日) で返す"""
    src = KPI_SOURCES.get(kpi_name)
    if not src or not store_ids:
        return []
    table, col = src

    if table == "kpi":
        # StoreDailyKPI に column が無い場合は health_score にフォールバック
        if not hasattr(StoreDailyKPI, col):
            col = "health_score"
        attr = getattr(StoreDailyKPI, col)
        q = select(attr).where(
            StoreDailyKPI.tenant_id == tenant_id,
            StoreDailyKPI.store_id.in_(store_ids),
            StoreDailyKPI.business_date >= start,
            StoreDailyKPI.business_date <= end,
        )
    else:  # daily_sales
        if not hasattr(DailyStoreSales, col):
            return []
        attr = getattr(DailyStoreSales, col)
        q = select(attr).where(
            DailyStoreSales.tenant_id == tenant_id,
            DailyStoreSales.store_id.in_(store_ids),
            DailyStoreSales.business_date >= start,
            DailyStoreSales.business_date <= end,
        )

    rows = (await db.execute(q)).all()
    samples = [float(r[0]) for r in rows if r[0] is not None]
    return samples


async def compute_baseline(
    db, tenant_id, store_ids, kpi_name: str, start: date, end: date,
) -> dict:
    samples = await _aggregate_samples(db, tenant_id, store_ids, kpi_name, start, end)
    return {
        "samples": samples,
        "mean": sum(samples) / len(samples) if samples else 0,
        "n": len(samples),
        "stddev": _stddev(samples),
    }


async def compute_intervention(db, tenant_id, store_ids, kpi_name, start, end) -> dict:
    return await compute_baseline(db, tenant_id, store_ids, kpi_name, start, end)


def compute_did(baseline_t, intervention_t, baseline_c, intervention_c) -> float:
    """Difference-in-Differences"""
    bt = baseline_t["mean"] or 0
    it = intervention_t["mean"] or 0
    bc = baseline_c["mean"] or 0
    ic = intervention_c["mean"] or 0
    return (it - bt) - (ic - bc)


def welch_t_test(samples_a: list[float], samples_b: list[float]) -> float | None:
    """unequal-variance t-test, returns 2-sided p value"""
    if len(samples_a) < 2 or len(samples_b) < 2:
        return None
    try:
        from scipy import stats
        _, p = stats.ttest_ind(samples_a, samples_b, equal_var=False, nan_policy="omit")
        return float(p) if not math.isnan(p) else None
    except ImportError:
        return _welch_t_test_fallback(samples_a, samples_b)


def _welch_t_test_fallback(a: list[float], b: list[float]) -> float | None:
    """scipy 不在時の素朴な Welch's t-test 実装"""
    if len(a) < 2 or len(b) < 2:
        return None
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    if va == 0 and vb == 0:
        return 1.0 if ma == mb else 0.0
    se = math.sqrt(va / len(a) + vb / len(b))
    if se == 0:
        return 1.0
    t = (mb - ma) / se
    # df Welch-Satterthwaite
    df_num = (va / len(a) + vb / len(b)) ** 2
    df_den = (va / len(a)) ** 2 / (len(a) - 1) + (vb / len(b)) ** 2 / (len(b) - 1)
    if df_den == 0:
        return None
    df = df_num / df_den
    # student's t CDF approximation (Hill 1970)
    p = _t_cdf_2sided(t, df)
    return p


def _t_cdf_2sided(t: float, df: float) -> float:
    """Welch's t-test 2-sided p-value approximation (no scipy)"""
    if df <= 0:
        return 1.0
    x = df / (df + t * t)
    # incomplete beta function via continued fraction (simplified)
    a = df / 2.0
    b = 0.5
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
                  + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        cf = _betacf(x, a, b)
        ibeta = bt * cf / a
    else:
        cf = _betacf(1 - x, b, a)
        ibeta = 1 - bt * cf / b
    return min(1.0, max(0.0, ibeta))


def _betacf(x, a, b, max_iter=100):
    qab = a + b
    qap = a + 1
    qam = a - 1
    c = 1.0
    d = 1 - qab * x / qap
    if abs(d) < 1e-30:
        d = 1e-30
    d = 1 / d
    h = d
    for m in range(1, max_iter):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        if abs(d) < 1e-30:
            d = 1e-30
        c = 1 + aa / c
        if abs(c) < 1e-30:
            c = 1e-30
        d = 1 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        if abs(d) < 1e-30:
            d = 1e-30
        c = 1 + aa / c
        if abs(c) < 1e-30:
            c = 1e-30
        d = 1 / d
        h *= d * c
        if abs(d * c - 1) < 3e-7:
            break
    return h


def bootstrap_ci(samples_a: list[float], samples_b: list[float], n_iter: int = 500, alpha: float = 0.05) -> tuple[float, float]:
    """non-parametric bootstrap CI for mean difference (b - a)"""
    if not samples_a or not samples_b:
        return (0.0, 0.0)
    import random
    diffs = []
    rng = random.Random(42)
    for _ in range(n_iter):
        ra = [rng.choice(samples_a) for _ in range(len(samples_a))]
        rb = [rng.choice(samples_b) for _ in range(len(samples_b))]
        diffs.append(sum(rb) / len(rb) - sum(ra) / len(ra))
    diffs.sort()
    lo = diffs[int(n_iter * alpha / 2)]
    hi = diffs[int(n_iter * (1 - alpha / 2))]
    return (lo, hi)


def _stddev(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def compute_annualized_impact(
    kpi_name: str, delta: float, store_count: int, start: date, end: date,
) -> float:
    """KPI の delta を年間円換算"""
    from app.services.pilot_engine import KPI_VALUE_CONVERSION
    conv = KPI_VALUE_CONVERSION.get(kpi_name)
    if not conv:
        return 0.0

    period_days = max(1, (end - start).days + 1)
    unit = conv.get("unit")

    if unit == "yen_per_day":
        # delta は円/日(店)、年間 = -delta × 365 × 店舗数（廃棄なら正の改善）
        return -delta * 365 * store_count
    if unit == "pct" and "revenue_loss_per_pct" in conv:
        return -delta * conv["revenue_loss_per_pct"] * 12 * store_count
    if unit == "pct" and "monthly_revenue_per_store" in conv:
        return -delta / 100 * conv["monthly_revenue_per_store"] * 12 * store_count
    if unit == "yen_per_hour":
        return delta * conv["annual_factor"] * store_count
    if unit == "hours" and "cost_per_hour" in conv:
        return -delta * conv["cost_per_hour"] * conv["annual_factor"] * store_count
    if unit == "score":
        return delta * conv.get("monetary_per_point", 0) * store_count
    if unit == "count" and "loss_per_store" in conv:
        return -delta * conv["loss_per_store"]
    if unit == "pct" and "monetary_per_pct" in conv:
        return delta * conv["monetary_per_pct"] * store_count

    return 0.0


def calculation_explanation(kpi_name: str, delta: float, store_count: int, period_days: int) -> dict:
    """画面で「計算式と前提条件」表示用"""
    from app.services.pilot_engine import KPI_VALUE_CONVERSION
    conv = KPI_VALUE_CONVERSION.get(kpi_name, {})
    return {
        "kpi": kpi_name,
        "delta": delta,
        "store_count": store_count,
        "period_days": period_days,
        "conversion": conv,
        "formula": _format_formula(kpi_name, conv),
    }


def _format_formula(kpi_name: str, conv: dict) -> str:
    if conv.get("unit") == "yen_per_day":
        return "改善額 = -delta × 365 × 店舗数"
    if conv.get("unit") == "pct" and "revenue_loss_per_pct" in conv:
        return f"改善額 = -delta% × {conv['revenue_loss_per_pct']:,}円/月/% × 12 × 店舗数"
    if conv.get("unit") == "yen_per_hour":
        return "改善額 = delta × 8h × 365日 × 店舗数"
    if conv.get("unit") == "score":
        return f"改善額 = delta × {conv.get('monetary_per_point', 0):,}円/point × 店舗数"
    return "（KPI 種別ごとの換算式を適用）"
