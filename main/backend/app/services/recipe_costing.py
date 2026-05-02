from datetime import date
from decimal import Decimal
from sqlalchemy import select, and_, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.recipe import Recipe, RecipeBOM, IngredientPriceHistory, Ingredient
from app.models.product import Product
from app.models.store_pl import StorePL


async def calculate_theoretical_food_cost(
    db: AsyncSession, tenant_id: str, product_id: str = None
) -> list[dict]:
    q = select(Recipe).where(
        and_(Recipe.tenant_id == tenant_id, Recipe.status == "active")
    )
    if product_id:
        q = q.where(Recipe.product_id == product_id)
    recipes = (await db.execute(q)).scalars().all()

    results = []
    for recipe in recipes:
        bom_q = await db.execute(
            select(RecipeBOM).where(RecipeBOM.recipe_id == recipe.id)
        )
        bom_entries = bom_q.scalars().all()

        total_cost = Decimal("0")
        ingredient_costs = []
        for bom in bom_entries:
            price_q = await db.execute(
                select(IngredientPriceHistory)
                .where(IngredientPriceHistory.ingredient_id == bom.ingredient_id)
                .order_by(IngredientPriceHistory.effective_date.desc())
                .limit(1)
            )
            latest_price = price_q.scalar_one_or_none()
            unit_price = latest_price.unit_price if latest_price else Decimal("0")
            line_cost = bom.quantity * unit_price
            total_cost += line_cost

            ing_q = await db.execute(
                select(Ingredient.name).where(Ingredient.id == bom.ingredient_id)
            )
            ing_name = ing_q.scalar_one_or_none() or "Unknown"
            ingredient_costs.append({
                "ingredient_id": str(bom.ingredient_id),
                "ingredient_name": ing_name,
                "quantity": float(bom.quantity),
                "unit": bom.unit,
                "unit_price": float(unit_price),
                "line_cost": float(line_cost),
            })

        per_serving = total_cost / recipe.yield_quantity if recipe.yield_quantity else total_cost

        prod_q = await db.execute(
            select(Product).where(Product.id == recipe.product_id)
        )
        product = prod_q.scalar_one_or_none()
        product_price = float(product.price) if product else 0
        recorded_cost = float(product.theoretical_cost) if product and product.theoretical_cost else None
        food_cost_ratio = float(per_serving) / product_price if product_price > 0 else None

        results.append({
            "product_id": str(recipe.product_id),
            "product_name": product.name if product else None,
            "recipe_id": str(recipe.id),
            "version": recipe.version,
            "yield_quantity": recipe.yield_quantity,
            "total_bom_cost": float(total_cost),
            "cost_per_serving": float(per_serving),
            "product_price": product_price,
            "recorded_theoretical_cost": recorded_cost,
            "variance": float(per_serving) - recorded_cost if recorded_cost else None,
            "food_cost_ratio": food_cost_ratio,
            "ingredients": ingredient_costs,
        })

    return results


async def calculate_actual_vs_theoretical_variance(
    db: AsyncSession, tenant_id: str, period_start: date, period_end: date
) -> dict:
    theoretical = await calculate_theoretical_food_cost(db, tenant_id)

    pl_q = await db.execute(
        select(
            sqlfunc.sum(StorePL.cogs).label("total_cogs"),
            sqlfunc.sum(StorePL.sales).label("total_revenue"),
        ).where(
            and_(
                StorePL.tenant_id == tenant_id,
                StorePL.period_start >= period_start,
                StorePL.period_start <= period_end,
            )
        )
    )
    row = pl_q.one_or_none()
    actual_cogs = float(row.total_cogs) if row and row.total_cogs else 0
    total_revenue = float(row.total_revenue) if row and row.total_revenue else 0

    total_theoretical = sum(r["cost_per_serving"] for r in theoretical) if theoretical else 0

    return {
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "actual_cogs": actual_cogs,
        "actual_cogs_ratio": actual_cogs / total_revenue if total_revenue > 0 else None,
        "theoretical_product_count": len(theoretical),
        "avg_theoretical_food_cost_ratio": (
            sum(r["food_cost_ratio"] for r in theoretical if r["food_cost_ratio"]) / len(theoretical)
            if theoretical else None
        ),
        "total_revenue": total_revenue,
        "products": theoretical,
    }
