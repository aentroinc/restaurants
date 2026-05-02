"""Recipe / BOM / theoretical-cost API.

CRUD on Recipe + RecipeBOM + Ingredient + IngredientPriceHistory.
Theoretical food cost is computed live from BOM × latest ingredient
price.
"""
from __future__ import annotations

from datetime import date as date_type
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.product import Product
from app.models.recipe import Ingredient, IngredientPriceHistory, Recipe, RecipeBOM
from app.services.recipe_costing import calculate_theoretical_food_cost

router = APIRouter(prefix="/api/v1/recipes", tags=["recipes"])


class IngredientIn(BaseModel):
    name: str
    unit: str
    standard_cost_per_unit: Decimal
    allergen_codes: list[str] = []
    storage_temperature: str = "常温"
    shelf_life_days: int | None = None


class IngredientOut(IngredientIn):
    id: str


class BOMItemIn(BaseModel):
    ingredient_id: str
    quantity: Decimal
    unit: str
    notes: str | None = None


class RecipeIn(BaseModel):
    product_id: str
    version: int = 1
    yield_quantity: int = 1
    cooking_time_minutes: int | None = None
    instructions: str | None = None
    bom: list[BOMItemIn] = []


class RecipeOut(BaseModel):
    id: str
    product_id: str
    version: int
    yield_quantity: int
    status: str
    bom_count: int
    theoretical_food_cost: Decimal | None = None


# ---- ingredients ----

@router.get("/ingredients", response_model=list[IngredientOut])
async def list_ingredients(db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    res = await db.execute(select(Ingredient).where(Ingredient.tenant_id == tenant_id).order_by(Ingredient.name))
    return [
        IngredientOut(
            id=str(i.id), name=i.name, unit=i.unit,
            standard_cost_per_unit=i.standard_cost_per_unit,
            allergen_codes=i.allergen_codes or [],
            storage_temperature=i.storage_temperature,
            shelf_life_days=i.shelf_life_days,
        )
        for i in res.scalars().all()
    ]


@router.post("/ingredients", response_model=IngredientOut)
async def create_ingredient(
    body: IngredientIn,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ing = Ingredient(
        tenant_id=tenant_id,
        name=body.name,
        unit=body.unit,
        standard_cost_per_unit=body.standard_cost_per_unit,
        allergen_codes=body.allergen_codes,
        storage_temperature=body.storage_temperature,
        shelf_life_days=body.shelf_life_days,
    )
    db.add(ing)
    await db.commit()
    await db.refresh(ing)
    log_audit(tenant_id, None, "create", "ingredient", str(ing.id))
    return IngredientOut(
        id=str(ing.id), name=ing.name, unit=ing.unit,
        standard_cost_per_unit=ing.standard_cost_per_unit,
        allergen_codes=ing.allergen_codes or [],
        storage_temperature=ing.storage_temperature,
        shelf_life_days=ing.shelf_life_days,
    )


# ---- recipes ----

@router.get("", response_model=list[RecipeOut])
async def list_recipes(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    res = await db.execute(select(Recipe).where(Recipe.tenant_id == tenant_id))
    out = []
    for r in res.scalars().all():
        bom_q = await db.execute(
            select(RecipeBOM).where(RecipeBOM.recipe_id == r.id)
        )
        bom_rows = list(bom_q.scalars().all())
        out.append(RecipeOut(
            id=str(r.id), product_id=str(r.product_id),
            version=r.version, yield_quantity=r.yield_quantity,
            status=r.status, bom_count=len(bom_rows),
        ))
    return out


@router.post("", response_model=RecipeOut)
async def create_recipe(
    body: RecipeIn,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p_q = await db.execute(
        select(Product).where(Product.id == body.product_id, Product.tenant_id == tenant_id)
    )
    if not p_q.scalar_one_or_none():
        raise HTTPException(404, "product not found")

    r = Recipe(
        tenant_id=tenant_id,
        product_id=body.product_id,
        version=body.version,
        yield_quantity=body.yield_quantity,
        cooking_time_minutes=body.cooking_time_minutes,
        instructions=body.instructions,
        status="active",
    )
    db.add(r)
    await db.flush()

    for item in body.bom:
        db.add(RecipeBOM(
            recipe_id=r.id,
            ingredient_id=item.ingredient_id,
            quantity=item.quantity,
            unit=item.unit,
            notes=item.notes,
        ))
    await db.commit()
    await db.refresh(r)
    log_audit(tenant_id, None, "create", "recipe", str(r.id), {"bom_size": len(body.bom)})
    return RecipeOut(
        id=str(r.id), product_id=str(r.product_id),
        version=r.version, yield_quantity=r.yield_quantity,
        status=r.status, bom_count=len(body.bom),
    )


@router.get("/{recipe_id}/cost")
async def recipe_cost(
    recipe_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Compute theoretical food cost for one recipe at the latest ingredient prices."""
    r_q = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.tenant_id == tenant_id)
    )
    r = r_q.scalar_one_or_none()
    if not r:
        raise HTTPException(404)
    results = await calculate_theoretical_food_cost(db, tenant_id, str(r.product_id))
    if not results:
        return {"recipe_id": recipe_id, "theoretical_food_cost": None}
    item = next((x for x in results if str(x.get("recipe_id")) == recipe_id), results[0])
    return {
        "recipe_id": recipe_id,
        "theoretical_food_cost": item.get("total_cost"),
        "ingredients": item.get("ingredients", []),
    }
