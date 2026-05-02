from uuid import UUID
from datetime import date
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.store import Store
from app.models.brand import Brand
from app.models.area import Area
from app.models.region import Region
from app.models.kpi import StoreDailyKPI


async def evaluate_cohort(
    db: AsyncSession,
    tenant_id: str,
    filter_spec: dict,
    as_of: date | None = None,
) -> list[str]:
    if as_of is None:
        as_of = date(2026, 4, 30)

    q = select(Store.id).select_from(Store)
    q = q.join(Brand, Brand.id == Store.brand_id)
    q = q.join(Area, Area.id == Store.area_id)
    q = q.join(Region, Region.id == Area.region_id)

    conditions = [Store.tenant_id == tenant_id, Store.status == "active"]

    if "brand" in filter_spec:
        conditions.append(Brand.name == filter_spec["brand"])
    if "region" in filter_spec:
        conditions.append(Region.name == filter_spec["region"])
    if "area" in filter_spec:
        conditions.append(Area.name == filter_spec["area"])
    if "trade_area_type" in filter_spec:
        conditions.append(Store.trade_area_type == filter_spec["trade_area_type"])
    if "prefecture" in filter_spec:
        conditions.append(Store.prefecture == filter_spec["prefecture"])

    kpi_filters = {k: v for k, v in filter_spec.items()
                   if k.endswith("_lt") or k.endswith("_gt") or k.endswith("_lte") or k.endswith("_gte")}

    if kpi_filters:
        kpi_sub = (
            select(StoreDailyKPI.store_id)
            .where(and_(
                StoreDailyKPI.tenant_id == tenant_id,
                StoreDailyKPI.business_date == as_of,
            ))
        )

        for key, val in kpi_filters.items():
            if key.endswith("_lt"):
                col_name = key[:-3]
                col = getattr(StoreDailyKPI, col_name, None)
                if col is not None:
                    kpi_sub = kpi_sub.where(col < val)
            elif key.endswith("_gt"):
                col_name = key[:-3]
                col = getattr(StoreDailyKPI, col_name, None)
                if col is not None:
                    kpi_sub = kpi_sub.where(col > val)
            elif key.endswith("_lte"):
                col_name = key[:-4]
                col = getattr(StoreDailyKPI, col_name, None)
                if col is not None:
                    kpi_sub = kpi_sub.where(col <= val)
            elif key.endswith("_gte"):
                col_name = key[:-4]
                col = getattr(StoreDailyKPI, col_name, None)
                if col is not None:
                    kpi_sub = kpi_sub.where(col >= val)

        conditions.append(Store.id.in_(kpi_sub))

    q = q.where(and_(*conditions))
    result = await db.execute(q)
    return [str(row[0]) for row in result.all()]
