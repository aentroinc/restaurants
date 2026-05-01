from decimal import Decimal, ROUND_HALF_UP


ISSUE_DEFINITIONS = {
    "labor_overrun": {
        "label": "人件費超過",
        "metric": "labor_cost_rate",
        "threshold_pts": 5.0,
        "direction": "above",
    },
    "cogs_overrun": {
        "label": "原価超過",
        "metric": "cogs_rate",
        "threshold_pts": 3.0,
        "direction": "above",
    },
    "sales_decline": {
        "label": "売上減少",
        "metric": "yoy_growth",
        "threshold_pts": -20.0,
        "direction": "below",
    },
    "review_decline": {
        "label": "口コミ悪化",
        "metric": "review_score_delta",
        "threshold_pts": -0.5,
        "direction": "below",
    },
    "discount_overuse": {
        "label": "割引過多",
        "metric": "discount_rate",
        "threshold_pts": 8.0,
        "direction": "above",
    },
}


def identify_issues(
    store_metrics: dict,
    peer_medians: dict,
) -> list[dict]:
    issues = []

    labor_rate = store_metrics.get("labor_cost_rate")
    peer_labor = peer_medians.get("labor_cost_rate")
    if labor_rate is not None and peer_labor is not None:
        gap = float(labor_rate) - float(peer_labor)
        if gap >= ISSUE_DEFINITIONS["labor_overrun"]["threshold_pts"]:
            monthly_sales = float(store_metrics.get("monthly_sales", 0))
            impact = monthly_sales * gap / 100 * 12
            issues.append({
                "issue_type": "labor_overrun",
                "gap": round(gap, 2),
                "impact_amount": round(impact),
                "severity": "high" if gap >= 8 else "medium",
            })

    cogs_rate = store_metrics.get("cogs_rate")
    peer_cogs = peer_medians.get("cogs_rate")
    if cogs_rate is not None and peer_cogs is not None:
        gap = float(cogs_rate) - float(peer_cogs)
        if gap >= ISSUE_DEFINITIONS["cogs_overrun"]["threshold_pts"]:
            monthly_sales = float(store_metrics.get("monthly_sales", 0))
            impact = monthly_sales * gap / 100 * 12
            issues.append({
                "issue_type": "cogs_overrun",
                "gap": round(gap, 2),
                "impact_amount": round(impact),
                "severity": "high" if gap >= 5 else "medium",
            })

    yoy = store_metrics.get("yoy_growth")
    if yoy is not None and float(yoy) <= ISSUE_DEFINITIONS["sales_decline"]["threshold_pts"]:
        monthly_sales = float(store_metrics.get("monthly_sales", 0))
        impact = monthly_sales * abs(float(yoy)) / 100 * 12
        issues.append({
            "issue_type": "sales_decline",
            "gap": round(float(yoy), 2),
            "impact_amount": round(impact),
            "severity": "high" if float(yoy) <= -30 else "medium",
        })

    review_delta = store_metrics.get("review_score_delta")
    if review_delta is not None and float(review_delta) <= ISSUE_DEFINITIONS["review_decline"]["threshold_pts"]:
        issues.append({
            "issue_type": "review_decline",
            "gap": round(float(review_delta), 2),
            "impact_amount": 0,
            "severity": "medium",
        })

    discount_rate = store_metrics.get("discount_rate")
    if discount_rate is not None and float(discount_rate) >= ISSUE_DEFINITIONS["discount_overuse"]["threshold_pts"]:
        monthly_sales = float(store_metrics.get("monthly_sales", 0))
        excess = float(discount_rate) - 5.0
        impact = monthly_sales * excess / 100 * 12
        issues.append({
            "issue_type": "discount_overuse",
            "gap": round(float(discount_rate), 2),
            "impact_amount": round(impact),
            "severity": "medium",
        })

    return issues


def calculate_improvement_opportunity(issues: list[dict]) -> Decimal:
    total = sum(i.get("impact_amount", 0) for i in issues)
    return Decimal(str(total)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
