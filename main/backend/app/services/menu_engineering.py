"""Menu engineering matrix — Star / Plowhorse / Puzzle / Dog classification."""
from datetime import date
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.product_sales import DailyProductSales


async def menu_engineering_matrix(
    session: AsyncSession,
    tenant_id: str,
    brand_id: str,
    period_start: date,
    period_end: date,
) -> list[dict]:
    """Classify products into Star/Plowhorse/Puzzle/Dog quadrants."""
    # Get products with aggregated sales
    result = await session.execute(
        select(
            Product.id,
            Product.name,
            Product.code,
            Product.category_l1,
            Product.price,
            Product.theoretical_cost,
            func.sum(DailyProductSales.quantity).label("total_quantity"),
            func.sum(DailyProductSales.revenue).label("total_revenue"),
        )
        .outerjoin(DailyProductSales, and_(
            DailyProductSales.product_id == Product.id,
            DailyProductSales.business_date >= period_start,
            DailyProductSales.business_date <= period_end,
        ))
        .where(
            Product.tenant_id == tenant_id,
            Product.brand_id == brand_id,
            Product.active == True,
        )
        .group_by(Product.id, Product.name, Product.code, Product.category_l1, Product.price, Product.theoretical_cost)
    )
    rows = result.all()

    if not rows:
        return []

    products = []
    for r in rows:
        price = float(r.price) if r.price else 0
        cost = float(r.theoretical_cost) if r.theoretical_cost else price * 0.35
        margin_pct = ((price - cost) / price * 100) if price > 0 else 0
        sales_count = int(r.total_quantity or 0)
        revenue = float(r.total_revenue or 0)

        products.append({
            "product_id": str(r.id),
            "name": r.name,
            "code": r.code,
            "category": r.category_l1,
            "price": price,
            "cost": cost,
            "margin_pct": round(margin_pct, 1),
            "sales_count": sales_count,
            "revenue": revenue,
        })

    if not products:
        return []

    # Calculate medians
    sales_counts = sorted([p["sales_count"] for p in products])
    margins = sorted([p["margin_pct"] for p in products])

    n = len(sales_counts)
    median_sales = (sales_counts[n // 2] + sales_counts[(n - 1) // 2]) / 2
    median_margin = (margins[n // 2] + margins[(n - 1) // 2]) / 2

    # Classify
    for p in products:
        if p["sales_count"] >= median_sales and p["margin_pct"] >= median_margin:
            p["quadrant"] = "star"
        elif p["sales_count"] >= median_sales:
            p["quadrant"] = "plowhorse"
        elif p["margin_pct"] >= median_margin:
            p["quadrant"] = "puzzle"
        else:
            p["quadrant"] = "dog"

    return products
