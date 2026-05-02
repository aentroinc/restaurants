"""Unit tests for the cost-variance engine.

Covers:
- classify_variance heuristic
- end-to-end synthetic flow on in-memory SQLite:
    seed Tenant + Brand + Area + Store + Product + Recipe + RecipeBOM + Ingredient +
    DailyProductSales + InventoryCount, then run compute_theoretical + compute_variance
    and assert that:
      * theoretical row matches qty_sold * (bom.qty / yield) per ingredient
      * over_portion (actual_used > theoretical by >10%) is flagged
      * theft (actual_used < theoretical by >15%) is flagged
- router smoke check (paths registered)
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest


# ---------------------------------------------------------------------------
# unit: classify_variance
# ---------------------------------------------------------------------------

def test_classify_variance_ok_band():
    from app.services.cost_variance_engine import classify_variance
    hint, sev = classify_variance(0.01, 0.1)
    assert hint == "ok"
    assert sev == "low"


def test_classify_variance_over_portion_high():
    from app.services.cost_variance_engine import classify_variance
    # actual far exceeds theoretical -> negative pct big -> over_portion / high
    hint, sev = classify_variance(-0.30, -10)
    assert hint == "over_portion"
    assert sev == "high"


def test_classify_variance_theft_high():
    from app.services.cost_variance_engine import classify_variance
    # actual much less than theoretical -> positive pct big -> theft
    hint, sev = classify_variance(0.30, 5)
    assert hint == "theft"
    assert sev == "high"


def test_classify_variance_waste_medium():
    from app.services.cost_variance_engine import classify_variance
    hint, sev = classify_variance(-0.08, -2)
    assert hint == "waste"
    assert sev == "medium"


def test_classify_variance_recipe_drift():
    from app.services.cost_variance_engine import classify_variance
    hint, sev = classify_variance(0.08, 1)
    assert hint == "recipe_drift"


# ---------------------------------------------------------------------------
# router registration
# ---------------------------------------------------------------------------

def test_cost_variance_router_registered():
    from app.api.v1.cost_variance import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/cost-variance/inventory-count" in paths
    assert "/api/v1/cost-variance/compute" in paths
    assert "/api/v1/cost-variance/heatmap" in paths
    assert "/api/v1/cost-variance/store/{store_id}/details" in paths
    assert "/api/v1/cost-variance/alerts" in paths


# ---------------------------------------------------------------------------
# integration on in-memory SQLite
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_compute_variance_detects_over_portion_and_theft():
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    from app.services.cost_variance_engine import (
        compute_theoretical, compute_variance,
    )

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)

    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    brand_id = uuid.uuid4()
    area_id = uuid.uuid4()
    region_id = uuid.uuid4()
    store_id = uuid.uuid4()
    product_id = uuid.uuid4()
    recipe_id = uuid.uuid4()
    ing_a = uuid.uuid4()  # over-portion ingredient
    ing_b = uuid.uuid4()  # theft ingredient

    period_end = date(2026, 4, 30)
    period_start = period_end - timedelta(days=6)

    async with Session() as db:
        # Minimal seed: tenant, region, brand, area, store
        from app.models.area import Area
        from app.models.brand import Brand
        from app.models.product import Product
        from app.models.product_sales import DailyProductSales
        from app.models.recipe import Ingredient, Recipe, RecipeBOM
        from app.models.region import Region
        from app.models.store import Store
        from app.models.tenant import Tenant
        from app.models.cost_variance import InventoryCount

        try:
            db.add(Tenant(id=tenant_id, name="t"))
            await db.flush()
        except Exception:
            pass
        db.add(Region(id=region_id, tenant_id=tenant_id, name="region", code="R1"))
        db.add(Brand(id=brand_id, tenant_id=tenant_id, name="brand", code="B1"))
        await db.flush()
        db.add(Area(id=area_id, tenant_id=tenant_id, region_id=region_id, name="area", code="A1"))
        await db.flush()
        db.add(Store(
            id=store_id, tenant_id=tenant_id, brand_id=brand_id, area_id=area_id,
            code="S001", name="store-1", prefecture="東京都", city="千代田区",
            address="x", trade_area_type="urban", status="active",
        ))
        db.add(Product(
            id=product_id, tenant_id=tenant_id, brand_id=brand_id,
            code="P1", name="prod", category_l1="main", price=Decimal("1000"),
        ))
        db.add(Ingredient(
            id=ing_a, tenant_id=tenant_id, name="beef", unit="g",
            standard_cost_per_unit=Decimal("2.00"),
        ))
        db.add(Ingredient(
            id=ing_b, tenant_id=tenant_id, name="rice", unit="g",
            standard_cost_per_unit=Decimal("0.50"),
        ))
        await db.flush()

        db.add(Recipe(
            id=recipe_id, tenant_id=tenant_id, product_id=product_id,
            version=1, yield_quantity=1, status="active",
        ))
        await db.flush()
        # 100g beef + 200g rice per portion
        db.add(RecipeBOM(
            id=uuid.uuid4(), tenant_id=tenant_id, recipe_id=recipe_id,
            ingredient_id=ing_a, quantity=Decimal("100"), unit="g",
        ))
        db.add(RecipeBOM(
            id=uuid.uuid4(), tenant_id=tenant_id, recipe_id=recipe_id,
            ingredient_id=ing_b, quantity=Decimal("200"), unit="g",
        ))

        # Sold 50 portions in window -> theoretical: 5000g beef, 10000g rice
        db.add(DailyProductSales(
            id=uuid.uuid4(), tenant_id=tenant_id, store_id=store_id, product_id=product_id,
            business_date=period_end, quantity=50,
            net_sales=Decimal("50000"),
        ))
        await db.flush()

        # opening counts BEFORE period_start
        db.add(InventoryCount(
            id=uuid.uuid4(), tenant_id=tenant_id, store_id=store_id,
            count_date=period_start - timedelta(days=1),
            ingredient_id=ing_a, qty_actual=Decimal("10000"), unit_cost=Decimal("2.00"),
        ))
        db.add(InventoryCount(
            id=uuid.uuid4(), tenant_id=tenant_id, store_id=store_id,
            count_date=period_start - timedelta(days=1),
            ingredient_id=ing_b, qty_actual=Decimal("20000"), unit_cost=Decimal("0.50"),
        ))
        # closing on period_end
        # ing_a: opening 10000 - closing 4000 = 6000 used (theoretical 5000)
        #   -> actual > theoretical by 20% -> over_portion
        db.add(InventoryCount(
            id=uuid.uuid4(), tenant_id=tenant_id, store_id=store_id,
            count_date=period_end,
            ingredient_id=ing_a, qty_actual=Decimal("4000"), unit_cost=Decimal("2.00"),
        ))
        # ing_b: opening 20000 - closing 13000 = 7000 used (theoretical 10000)
        #   -> actual << theoretical -> theft / unrecorded
        db.add(InventoryCount(
            id=uuid.uuid4(), tenant_id=tenant_id, store_id=store_id,
            count_date=period_end,
            ingredient_id=ing_b, qty_actual=Decimal("13000"), unit_cost=Decimal("0.50"),
        ))
        await db.flush()

        theoretical = await compute_theoretical(
            db, str(tenant_id), store_id, period_start, period_end, persist=True
        )
        # Expect 2 ingredients
        assert len(theoretical) == 2
        by_ing = {r["ingredient_id"]: r for r in theoretical}
        assert by_ing[str(ing_a)]["qty_theoretical"] == pytest.approx(5000.0)
        assert by_ing[str(ing_b)]["qty_theoretical"] == pytest.approx(10000.0)

        variance = await compute_variance(
            db, str(tenant_id), store_id, period_end, period_start
        )
        await db.commit()

        by_var = {r["ingredient_id"]: r for r in variance}
        # ing_a: theoretical 5000 - actual_used 6000 = -1000 -> pct -0.20 -> over_portion / high
        assert by_var[str(ing_a)]["root_cause_hint"] == "over_portion"
        assert by_var[str(ing_a)]["severity"] == "high"
        # ing_b: theoretical 10000 - actual_used 7000 = +3000 -> pct +0.30 -> theft / high
        assert by_var[str(ing_b)]["root_cause_hint"] == "theft"
        assert by_var[str(ing_b)]["severity"] == "high"
