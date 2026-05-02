"""Per-tenant LLM cost guard.

Implements the budget-cap policy from roadmap doc 10:
  - default monthly budget per tenant (configurable)
  - soft alert at 80%, hard block at 100%
  - usage logged to AIUsageLog with token + cost breakdown
  - cost computed from a static price table (model -> per-token JPY)
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ai_budget import AIUsageLog, TenantAIBudget

# Model -> (input JPY/1k tokens, output JPY/1k tokens)
# Rough JPY values; update from latest pricing during ops.
PRICE_TABLE_JPY_PER_1K_TOKENS = {
    "claude-opus-4-7":          (Decimal("2.25"), Decimal("11.25")),
    "claude-opus-4-7[1m]":      (Decimal("3.00"), Decimal("15.00")),
    "claude-sonnet-4-6":        (Decimal("0.45"), Decimal("2.25")),
    "claude-haiku-4-5-20251001":(Decimal("0.12"), Decimal("0.60")),
}
DEFAULT_MODEL_PRICE = (Decimal("1.00"), Decimal("5.00"))

CACHE_READ_DISCOUNT = Decimal("0.10")  # 90% off input price
CACHE_WRITE_PREMIUM = Decimal("1.25")  # 25% over input price


@dataclass
class BudgetStatus:
    allowed: bool
    reason: Literal["ok", "soft_warning", "hard_limit"]
    used_jpy: Decimal
    budget_jpy: Decimal
    ratio: float


def compute_cost_jpy(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
) -> Decimal:
    in_price, out_price = PRICE_TABLE_JPY_PER_1K_TOKENS.get(model, DEFAULT_MODEL_PRICE)
    cost = (
        Decimal(input_tokens) * in_price / Decimal(1000)
        + Decimal(output_tokens) * out_price / Decimal(1000)
        + Decimal(cache_read_tokens) * in_price * CACHE_READ_DISCOUNT / Decimal(1000)
        + Decimal(cache_write_tokens) * in_price * CACHE_WRITE_PREMIUM / Decimal(1000)
    )
    return cost.quantize(Decimal("0.0001"))


async def get_or_create_budget(session: AsyncSession, tenant_id: str) -> TenantAIBudget:
    res = await session.execute(
        select(TenantAIBudget).where(TenantAIBudget.tenant_id == tenant_id)
    )
    b = res.scalar_one_or_none()
    if b:
        return b
    b = TenantAIBudget(
        tenant_id=tenant_id,
        monthly_budget_jpy=settings.AI_DEFAULT_MONTHLY_BUDGET_JPY,
        soft_limit_pct=Decimal(str(settings.AI_BUDGET_SOFT_LIMIT_PCT)),
    )
    session.add(b)
    await session.flush()
    return b


async def month_to_date_cost(session: AsyncSession, tenant_id: str) -> Decimal:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    res = await session.execute(
        select(func.coalesce(func.sum(AIUsageLog.cost_jpy), 0)).where(
            AIUsageLog.tenant_id == tenant_id,
            AIUsageLog.timestamp >= month_start,
        )
    )
    total = res.scalar_one()
    return Decimal(total or 0)


async def check_budget(session: AsyncSession, tenant_id: str) -> BudgetStatus:
    budget = await get_or_create_budget(session, tenant_id)
    used = await month_to_date_cost(session, tenant_id)
    cap = Decimal(budget.monthly_budget_jpy)
    if cap <= 0:
        return BudgetStatus(True, "ok", used, cap, 0.0)
    ratio = float(used / cap)
    if ratio >= float(budget.hard_limit_pct):
        if budget.overage_policy == "block":
            return BudgetStatus(False, "hard_limit", used, cap, ratio)
    if ratio >= float(budget.soft_limit_pct):
        return BudgetStatus(True, "soft_warning", used, cap, ratio)
    return BudgetStatus(True, "ok", used, cap, ratio)


async def log_usage(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str | None,
    session_id: str | None,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    tool_calls: list | None = None,
    purpose: str = "chat",
    request_id: str | None = None,
) -> AIUsageLog:
    cost = compute_cost_jpy(
        model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
    )
    log = AIUsageLog(
        tenant_id=tenant_id,
        user_id=user_id,
        session_id=session_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_read_tokens=cache_read_tokens,
        cache_write_tokens=cache_write_tokens,
        cost_jpy=cost,
        tool_calls=tool_calls or [],
        purpose=purpose,
        request_id=request_id,
    )
    session.add(log)
    await session.flush()
    return log
