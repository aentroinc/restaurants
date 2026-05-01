from decimal import Decimal, ROUND_HALF_UP


def calculate_health_score(
    sales_trend: float | None = None,
    profit_margin: float | None = None,
    labor_efficiency: float | None = None,
    cogs_control: float | None = None,
    review_score: float | None = None,
    task_completion: float | None = None,
) -> Decimal:
    """Calculate store health score (0-100).

    Weights:
    - sales_trend: 20% (0-100 sub-score based on YoY growth)
    - profit_margin: 20% (0-100 based on operating profit rate)
    - labor_efficiency: 15% (0-100 based on labor cost rate vs target)
    - cogs_control: 15% (0-100 based on cogs rate vs target)
    - review_score: 15% (0-100 from review ratings)
    - task_completion: 15% (0-100 based on task completion ratio)
    """
    weights = {
        "sales_trend": 0.20,
        "profit_margin": 0.20,
        "labor_efficiency": 0.15,
        "cogs_control": 0.15,
        "review_score": 0.15,
        "task_completion": 0.15,
    }

    scores = {
        "sales_trend": sales_trend if sales_trend is not None else 50.0,
        "profit_margin": profit_margin if profit_margin is not None else 50.0,
        "labor_efficiency": labor_efficiency if labor_efficiency is not None else 50.0,
        "cogs_control": cogs_control if cogs_control is not None else 50.0,
        "review_score": review_score if review_score is not None else 50.0,
        "task_completion": task_completion if task_completion is not None else 50.0,
    }

    total = sum(scores[k] * weights[k] for k in weights)
    return Decimal(str(min(100.0, max(0.0, total)))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def sales_trend_score(yoy_growth_pct: float) -> float:
    """Convert YoY growth % to 0-100 score. 0% growth = 50, +10% = 80, -10% = 20."""
    return max(0, min(100, 50 + yoy_growth_pct * 3))


def profit_margin_score(operating_profit_rate: float) -> float:
    """Convert operating profit rate to 0-100 score. 10% = 70, 0% = 30, -5% = 10."""
    return max(0, min(100, 30 + operating_profit_rate * 4))


def labor_efficiency_score(labor_cost_rate: float, target: float = 30.0) -> float:
    """Score based on deviation from target labor cost rate."""
    deviation = labor_cost_rate - target
    return max(0, min(100, 70 - deviation * 5))


def cogs_control_score(cogs_rate: float, target: float = 30.0) -> float:
    """Score based on deviation from target cogs rate."""
    deviation = cogs_rate - target
    return max(0, min(100, 70 - deviation * 5))


def review_score_to_health(avg_rating: float) -> float:
    """Convert avg rating (1-5) to 0-100 score."""
    return max(0, min(100, (avg_rating - 1) * 25))


def task_completion_score(completed: int, total: int) -> float:
    """Convert task completion ratio to 0-100 score."""
    if total == 0:
        return 50.0
    return (completed / total) * 100
