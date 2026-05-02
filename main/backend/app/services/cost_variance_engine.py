"""Cost-variance engine.

Workflow:
  1) compute_theoretical(store_id, date_from, date_to)
        DailyProductSales x active Recipe x RecipeBOM
        -> per-ingredient theoretical qty + cost (using latest IngredientPriceHistory
           or Ingredient.standard_cost_per_unit fallback)
        -> persists rows in `theoretical_costs` for period_date == date_to
  2) compute_variance(store_id, period)
        For each ingredient with theoretical row at `period`, find the InventoryCount
        delta (count_at(period_start-1) - count_at(period)) -> qty_used_actual.
        Without a prior count we treat the latest count as the actual usage proxy.
        variance_qty = theoretical - actual_used (positive => more should have been used,
        negative => actual exceeded theoretical = over-portion / waste / theft).
  3) classify_variance: heuristic -> waste/theft/over_portion/recipe_drift/ok + severity.

The implementation is intentionally simple and deterministic so that demo data
produces a clear heatmap without external dependencies.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select, and_, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost_variance import CostVariance, InventoryCount, TheoreticalCost
from app.models.product_sales import DailyProductSales
from app.models.recipe import Ingredient, IngredientPriceHistory, Recipe, RecipeBOM


# ---------------------------------------------------------------------------
# classification
# ---------------------------------------------------------------------------

def classify_variance(variance_pct: float, qty_diff: float) -> tuple[str, str]:
    """Return (root_cause_hint, severity) for a single ingredient row.

    Sign convention: variance_pct = (theoretical - actual_used) / theoretical
      - large NEGATIVE pct  (actual > theoretical by >10%) -> over_portion
      - large POSITIVE pct  (actual < theoretical by >15%) -> theft (or unrecorded sale)
      - moderate +/- swings (5-10%) -> waste / recipe_drift
      - tiny abs(pct) < 0.03 -> ok
    """
    pct = float(variance_pct or 0)
    abs_pct = abs(pct)

    if abs_pct < 0.03:
        return "ok", "low"

    if pct < -0.10:
        sev = "high" if abs_pct >= 0.20 else "medium"
        return "over_portion", sev
    if pct > 0.15:
        sev = "high" if abs_pct >= 0.25 else "medium"
        return "theft", sev
    if pct < 0:
        # actual slightly above theoretical: most often waste / spillage
        return "waste", "medium" if abs_pct >= 0.07 else "low"
    # pct > 0 but <= 0.15: chronic under-portion or recipe drift
    return "recipe_drift", "medium" if abs_pct >= 0.07 else "low"


# ---------------------------------------------------------------------------
# theoretical computation
# ---------------------------------------------------------------------------

async def _latest_ingredient_price(
    db: AsyncSession, ingredient_id: UUID, as_of: date
) -> Decimal:
    q = await db.execute(
        select(IngredientPriceHistory.unit_price)
        .where(
            and_(
                IngredientPriceHistory.ingredient_id == ingredient_id,
                IngredientPriceHistory.effective_date <= as_of,
            )
        )
        .order_by(IngredientPriceHistory.effective_date.desc())
        .limit(1)
    )
    row = q.scalar_one_or_none()
    if row is not None:
        return Decimal(row)
    fallback = await db.execute(
        select(Ingredient.standard_cost_per_unit).where(Ingredient.id == ingredient_id)
    )
    return Decimal(fallback.scalar_one_or_none() or 0)


async def compute_theoretical(
    db: AsyncSession,
    tenant_id: str,
    store_id: UUID,
    date_from: date,
    date_to: date,
    persist: bool = True,
) -> list[dict]:
    """Compute theoretical ingredient usage (qty + cost) for [date_from, date_to].

    Returns one dict per ingredient. If `persist=True`, also writes one row per
    ingredient into `theoretical_costs` keyed at period_date == date_to.
    """
    # Sum quantity sold per product over the window.
    sales_q = await db.execute(
        select(
            DailyProductSales.product_id,
            sqlfunc.sum(DailyProductSales.quantity).label("qty_sold"),
        )
        .where(
            and_(
                DailyProductSales.tenant_id == tenant_id,
                DailyProductSales.store_id == store_id,
                DailyProductSales.business_date >= date_from,
                DailyProductSales.business_date <= date_to,
            )
        )
        .group_by(DailyProductSales.product_id)
    )
    sales_rows = sales_q.all()

    # Aggregate per-ingredient theoretical quantity.
    per_ingredient: dict[UUID, Decimal] = {}
    for product_id, qty_sold in sales_rows:
        if not qty_sold:
            continue
        recipe_q = await db.execute(
            select(Recipe).where(
                and_(
                    Recipe.tenant_id == tenant_id,
                    Recipe.product_id == product_id,
                    Recipe.status == "active",
                )
            ).limit(1)
        )
        recipe = recipe_q.scalar_one_or_none()
        if recipe is None:
            continue
        bom_q = await db.execute(
            select(RecipeBOM).where(RecipeBOM.recipe_id == recipe.id)
        )
        for bom in bom_q.scalars().all():
            yield_q = recipe.yield_quantity or 1
            per_serving = Decimal(bom.quantity) / Decimal(yield_q)
            add = per_serving * Decimal(qty_sold)
            per_ingredient[bom.ingredient_id] = (
                per_ingredient.get(bom.ingredient_id, Decimal(0)) + add
            )

    # Resolve ingredient name + price -> cost.
    out: list[dict] = []
    if persist:
        # Wipe previous rows for this period to keep idempotency.
        await db.execute(
            TheoreticalCost.__table__.delete().where(
                and_(
                    TheoreticalCost.tenant_id == tenant_id,
                    TheoreticalCost.store_id == store_id,
                    TheoreticalCost.period_date == date_to,
                )
            )
        )

    for ingredient_id, qty in per_ingredient.items():
        unit_price = await _latest_ingredient_price(db, ingredient_id, date_to)
        cost = (qty * unit_price).quantize(Decimal("0.01"))
        ing_q = await db.execute(
            select(Ingredient.name, Ingredient.unit).where(Ingredient.id == ingredient_id)
        )
        row = ing_q.first()
        out.append({
            "ingredient_id": str(ingredient_id),
            "ingredient_name": row[0] if row else "Unknown",
            "unit": row[1] if row else "",
            "qty_theoretical": float(qty),
            "unit_price": float(unit_price),
            "cost_theoretical": float(cost),
        })
        if persist:
            db.add(TheoreticalCost(
                id=uuid4(),
                tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                store_id=store_id,
                period_date=date_to,
                ingredient_id=ingredient_id,
                qty_theoretical=qty,
                cost_theoretical=cost,
            ))
    if persist:
        await db.flush()
    return out


# ---------------------------------------------------------------------------
# variance computation
# ---------------------------------------------------------------------------

async def compute_variance(
    db: AsyncSession,
    tenant_id: str,
    store_id: UUID,
    period: date,
    period_start: date | None = None,
) -> list[dict]:
    """Compare TheoreticalCost rows at `period` against InventoryCount-derived actual
    usage and persist new CostVariance rows.

    actual_used estimation:
      - opening = qty_actual at the latest InventoryCount BEFORE period_start
      - closing = qty_actual at the latest InventoryCount within [period_start, period]
      - if `purchases` are unknown we set actual_used = max(opening - closing, 0)
        (this matches the simplified Crunchtime-style demo: we read the count we have
        and treat the delta to opening as physical usage). When opening is missing,
        we fall back to: actual_used = theoretical_qty * (1 + observed_ratio) where
        observed_ratio defaults to 0 -> variance is 0.
    """
    if period_start is None:
        period_start = period - timedelta(days=6)  # default rolling 7-day window

    # Drop previous variance rows for this period
    await db.execute(
        CostVariance.__table__.delete().where(
            and_(
                CostVariance.tenant_id == tenant_id,
                CostVariance.store_id == store_id,
                CostVariance.period_date == period,
            )
        )
    )

    th_q = await db.execute(
        select(TheoreticalCost).where(
            and_(
                TheoreticalCost.tenant_id == tenant_id,
                TheoreticalCost.store_id == store_id,
                TheoreticalCost.period_date == period,
            )
        )
    )
    theoretical_rows = th_q.scalars().all()

    results: list[dict] = []
    for th in theoretical_rows:
        # opening: latest count strictly before period_start
        opening_q = await db.execute(
            select(InventoryCount.qty_actual)
            .where(
                and_(
                    InventoryCount.tenant_id == tenant_id,
                    InventoryCount.store_id == store_id,
                    InventoryCount.ingredient_id == th.ingredient_id,
                    InventoryCount.count_date < period_start,
                )
            )
            .order_by(InventoryCount.count_date.desc())
            .limit(1)
        )
        opening = opening_q.scalar_one_or_none()

        # closing: latest count within [period_start, period]
        closing_q = await db.execute(
            select(InventoryCount.qty_actual)
            .where(
                and_(
                    InventoryCount.tenant_id == tenant_id,
                    InventoryCount.store_id == store_id,
                    InventoryCount.ingredient_id == th.ingredient_id,
                    InventoryCount.count_date >= period_start,
                    InventoryCount.count_date <= period,
                )
            )
            .order_by(InventoryCount.count_date.desc())
            .limit(1)
        )
        closing = closing_q.scalar_one_or_none()

        unit_price_q = await db.execute(
            select(Ingredient.standard_cost_per_unit).where(Ingredient.id == th.ingredient_id)
        )
        unit_price = Decimal(unit_price_q.scalar_one_or_none() or 0)

        if opening is not None and closing is not None:
            actual_used = max(Decimal(opening) - Decimal(closing), Decimal(0))
        elif closing is not None:
            # treat the standalone count as a deviation reference: assume actual_used
            # equals closing (interpreted as the measured usage in that count).
            actual_used = Decimal(closing)
        else:
            # No counts at all -> no variance signal yet.
            actual_used = Decimal(th.qty_theoretical)

        qty_diff = Decimal(th.qty_theoretical) - actual_used
        cost_diff = (qty_diff * unit_price).quantize(Decimal("0.01"))
        if Decimal(th.qty_theoretical) > 0:
            pct = float(qty_diff / Decimal(th.qty_theoretical))
        else:
            pct = 0.0

        hint, severity = classify_variance(pct, float(qty_diff))

        cv = CostVariance(
            id=uuid4(),
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            store_id=store_id,
            period_date=period,
            ingredient_id=th.ingredient_id,
            qty_diff=qty_diff,
            cost_diff=cost_diff,
            variance_pct=pct,
            root_cause_hint=hint,
            severity=severity,
        )
        db.add(cv)
        results.append({
            "ingredient_id": str(th.ingredient_id),
            "qty_theoretical": float(th.qty_theoretical),
            "qty_actual_used": float(actual_used),
            "qty_diff": float(qty_diff),
            "cost_diff": float(cost_diff),
            "variance_pct": pct,
            "root_cause_hint": hint,
            "severity": severity,
        })

    await db.flush()
    return results


# ---------------------------------------------------------------------------
# read helpers
# ---------------------------------------------------------------------------

async def heatmap_data(
    db: AsyncSession,
    tenant_id: str,
    period: date,
    brand_id: UUID | None = None,
) -> dict:
    """Return store x ingredient grid of variance_pct + cost_diff for `period`."""
    from app.models.store import Store

    store_q = select(Store.id, Store.name, Store.code, Store.brand_id).where(
        Store.tenant_id == tenant_id
    )
    if brand_id:
        store_q = store_q.where(Store.brand_id == brand_id)
    stores = (await db.execute(store_q)).all()
    store_ids = [s.id for s in stores]
    if not store_ids:
        return {"stores": [], "ingredients": [], "cells": []}

    var_q = await db.execute(
        select(
            CostVariance.store_id,
            CostVariance.ingredient_id,
            CostVariance.variance_pct,
            CostVariance.cost_diff,
            CostVariance.root_cause_hint,
            CostVariance.severity,
            Ingredient.name.label("ingredient_name"),
        )
        .join(Ingredient, Ingredient.id == CostVariance.ingredient_id)
        .where(
            and_(
                CostVariance.tenant_id == tenant_id,
                CostVariance.period_date == period,
                CostVariance.store_id.in_(store_ids),
            )
        )
    )
    rows = var_q.all()

    ing_lookup: dict[UUID, str] = {r.ingredient_id: r.ingredient_name for r in rows}
    cells = [
        {
            "store_id": str(r.store_id),
            "ingredient_id": str(r.ingredient_id),
            "variance_pct": float(r.variance_pct),
            "cost_diff": float(r.cost_diff),
            "root_cause_hint": r.root_cause_hint,
            "severity": r.severity,
        }
        for r in rows
    ]

    return {
        "period": period.isoformat(),
        "stores": [
            {"id": str(s.id), "name": s.name, "code": s.code} for s in stores
        ],
        "ingredients": [
            {"id": str(iid), "name": name} for iid, name in ing_lookup.items()
        ],
        "cells": cells,
    }


async def store_details(
    db: AsyncSession, tenant_id: str, store_id: UUID, period: date
) -> dict:
    """Return per-ingredient waterfall (theoretical -> actual -> diff)."""
    from app.models.store import Store

    store = (
        await db.execute(select(Store).where(Store.id == store_id))
    ).scalar_one_or_none()
    th = (
        await db.execute(
            select(TheoreticalCost).where(
                and_(
                    TheoreticalCost.tenant_id == tenant_id,
                    TheoreticalCost.store_id == store_id,
                    TheoreticalCost.period_date == period,
                )
            )
        )
    ).scalars().all()
    th_map = {t.ingredient_id: t for t in th}

    var = (
        await db.execute(
            select(CostVariance).where(
                and_(
                    CostVariance.tenant_id == tenant_id,
                    CostVariance.store_id == store_id,
                    CostVariance.period_date == period,
                )
            )
        )
    ).scalars().all()

    ing_ids = list({*(t.ingredient_id for t in th), *(v.ingredient_id for v in var)})
    names: dict[UUID, str] = {}
    if ing_ids:
        ing_rows = (
            await db.execute(
                select(Ingredient.id, Ingredient.name, Ingredient.unit).where(
                    Ingredient.id.in_(ing_ids)
                )
            )
        ).all()
        names = {r.id: (r.name, r.unit) for r in ing_rows}

    items = []
    total_theoretical = 0.0
    total_diff = 0.0
    for v in var:
        t = th_map.get(v.ingredient_id)
        name, unit = names.get(v.ingredient_id, ("?", ""))
        cost_th = float(t.cost_theoretical) if t else 0.0
        total_theoretical += cost_th
        total_diff += float(v.cost_diff)
        items.append({
            "ingredient_id": str(v.ingredient_id),
            "ingredient_name": name,
            "unit": unit,
            "qty_theoretical": float(t.qty_theoretical) if t else 0.0,
            "cost_theoretical": cost_th,
            "qty_diff": float(v.qty_diff),
            "cost_diff": float(v.cost_diff),
            "variance_pct": float(v.variance_pct),
            "root_cause_hint": v.root_cause_hint,
            "severity": v.severity,
        })
    items.sort(key=lambda r: abs(r["cost_diff"]), reverse=True)

    return {
        "store": {
            "id": str(store_id),
            "name": store.name if store else None,
            "code": store.code if store else None,
        },
        "period": period.isoformat(),
        "total_cost_theoretical": total_theoretical,
        "total_cost_diff": total_diff,
        "items": items,
    }


async def list_alerts(
    db: AsyncSession,
    tenant_id: str,
    severity: str = "high",
    limit: int = 50,
) -> list[dict]:
    """Top severity alerts across all stores."""
    from app.models.store import Store

    q = await db.execute(
        select(
            CostVariance,
            Store.name.label("store_name"),
            Store.code.label("store_code"),
            Ingredient.name.label("ingredient_name"),
        )
        .join(Store, Store.id == CostVariance.store_id)
        .join(Ingredient, Ingredient.id == CostVariance.ingredient_id)
        .where(
            and_(
                CostVariance.tenant_id == tenant_id,
                CostVariance.severity == severity,
            )
        )
        .order_by(sqlfunc.abs(CostVariance.cost_diff).desc())
        .limit(limit)
    )
    rows = q.all()
    return [
        {
            "id": str(cv.id),
            "store_id": str(cv.store_id),
            "store_name": store_name,
            "store_code": store_code,
            "ingredient_name": ingredient_name,
            "period_date": cv.period_date.isoformat(),
            "variance_pct": float(cv.variance_pct),
            "cost_diff": float(cv.cost_diff),
            "root_cause_hint": cv.root_cause_hint,
            "severity": cv.severity,
        }
        for cv, store_name, store_code, ingredient_name in rows
    ]
