from decimal import Decimal, ROUND_HALF_UP


def calculate_sv_priority(
    health_score: float | None,
    improvement_opportunity: float | None,
    days_since_visit: int | None,
    open_task_count: int = 0,
) -> Decimal:
    """Score stores for SV priority. Higher = more urgent to visit.

    Components:
    - Inverse health (0-40): lower health = higher priority
    - Improvement opportunity (0-25): normalized
    - Days since visit (0-20): more days = higher priority
    - Open tasks (0-15): more open tasks = higher priority
    """
    score = 0.0

    if health_score is not None:
        score += max(0, min(40, (100 - health_score) * 0.4))

    if improvement_opportunity is not None:
        score += max(0, min(25, improvement_opportunity / 1_000_000 * 25))

    if days_since_visit is not None:
        score += max(0, min(20, days_since_visit / 45 * 20))
    else:
        score += 20

    score += max(0, min(15, open_task_count * 3))

    return Decimal(str(score)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
