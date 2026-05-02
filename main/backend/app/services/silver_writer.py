"""Write canonical records into Silver-layer tables.

Idempotent upsert by (tenant_id + natural keys).

NOTE on store/product master upsert: the existing Store / Product schema
requires brand_id + area_id / brand_id which the source system rarely
provides. We therefore *update* existing rows by `code` but never create
new ones from a connector — onboarding assigns those FK rows separately.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import CanonicalRecord
from app.models.daily_sales import DailyStoreSales
from app.models.hourly_sales import HourlyStoreSales
from app.models.product import Product
from app.models.product_sales import DailyProductSales
from app.models.store import Store


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(value).date()


async def _resolve_store(session: AsyncSession, tenant_id: str, code: str) -> Store | None:
    res = await session.execute(
        select(Store).where(Store.tenant_id == tenant_id, Store.code == str(code))
    )
    return res.scalar_one_or_none()


async def _resolve_product(session: AsyncSession, tenant_id: str, code: str) -> Product | None:
    res = await session.execute(
        select(Product).where(Product.tenant_id == tenant_id, Product.code == str(code))
    )
    return res.scalar_one_or_none()


async def _upsert_store(session: AsyncSession, tenant_id: str, p: dict) -> None:
    code = str(p.get("store_id", ""))
    if not code:
        return
    s = await _resolve_store(session, tenant_id, code)
    if s and p.get("name"):
        s.name = p["name"]
    # Do not create new stores from connector data — needs brand/area FKs.


async def _upsert_product(session: AsyncSession, tenant_id: str, p: dict) -> None:
    code = str(p.get("product_id", ""))
    if not code:
        return
    pr = await _resolve_product(session, tenant_id, code)
    if pr is None:
        return
    if p.get("name"):
        pr.name = p["name"]
    if p.get("price"):
        pr.price = Decimal(str(p["price"]))


async def _upsert_daily_sales(session: AsyncSession, tenant_id: str, p: dict) -> None:
    store = await _resolve_store(session, tenant_id, p["store_id"])
    if not store:
        return
    d = _parse_date(p["date"])
    res = await session.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tenant_id,
            DailyStoreSales.store_id == store.id,
            DailyStoreSales.business_date == d,
        )
    )
    row = res.scalar_one_or_none()
    net_sales = Decimal(str(p.get("net_sales", 0)))
    if row is None:
        row = DailyStoreSales(
            tenant_id=tenant_id,
            store_id=store.id,
            business_date=d,
            gross_sales=net_sales,
            net_sales=net_sales,
            customer_count=int(p.get("customer_count", 0)),
            order_count=int(p.get("transactions", p.get("customer_count", 0))),
        )
        session.add(row)
    else:
        row.net_sales = net_sales
        row.gross_sales = net_sales
        row.customer_count = int(p.get("customer_count", row.customer_count))
        row.order_count = int(p.get("transactions", row.order_count))


async def _upsert_hourly_sales(session: AsyncSession, tenant_id: str, p: dict) -> None:
    store = await _resolve_store(session, tenant_id, p["store_id"])
    if not store:
        return
    d = _parse_date(p["date"])
    hour = int(p["hour"])
    res = await session.execute(
        select(HourlyStoreSales).where(
            HourlyStoreSales.tenant_id == tenant_id,
            HourlyStoreSales.store_id == store.id,
        )
    )
    # Some HourlyStoreSales schemas use `business_date` + `hour_of_day`; others
    # use `date` + `hour`. Reflect the column on the model dynamically.
    cols = HourlyStoreSales.__table__.c
    date_col = cols.get("business_date") or cols.get("date")
    hour_col = cols.get("hour_of_day") or cols.get("hour")
    if date_col is None or hour_col is None:
        return  # schema mismatch — skip silently
    matching = [
        row for row in res.scalars().all()
        if getattr(row, date_col.name) == d and getattr(row, hour_col.name) == hour
    ]
    row = matching[0] if matching else None
    net_sales = Decimal(str(p.get("net_sales", 0)))
    customer_count = int(p.get("customer_count", 0))
    if row is None:
        kwargs = {
            "tenant_id": tenant_id,
            "store_id": store.id,
            date_col.name: d,
            hour_col.name: hour,
        }
        # Best-effort populate other required columns
        if "net_sales" in cols:
            kwargs["net_sales"] = net_sales
        if "customer_count" in cols:
            kwargs["customer_count"] = customer_count
        if "order_count" in cols:
            kwargs["order_count"] = customer_count
        row = HourlyStoreSales(**kwargs)
        session.add(row)
    else:
        if "net_sales" in cols:
            setattr(row, "net_sales", net_sales)
        if "customer_count" in cols:
            setattr(row, "customer_count", customer_count)


async def _upsert_product_sales(session: AsyncSession, tenant_id: str, p: dict) -> None:
    store = await _resolve_store(session, tenant_id, p["store_id"])
    product = await _resolve_product(session, tenant_id, p["product_id"])
    if not store or not product:
        return
    d = _parse_date(p["date"])
    cols = DailyProductSales.__table__.c
    date_col = cols.get("business_date") or cols.get("date")
    if date_col is None:
        return
    res = await session.execute(
        select(DailyProductSales).where(
            DailyProductSales.tenant_id == tenant_id,
            DailyProductSales.store_id == store.id,
            DailyProductSales.product_id == product.id,
        )
    )
    matching = [
        row for row in res.scalars().all() if getattr(row, date_col.name) == d
    ]
    row = matching[0] if matching else None
    qty = int(p.get("quantity", 0))
    net_sales = Decimal(str(p.get("net_sales", 0)))
    if row is None:
        kwargs = {
            "tenant_id": tenant_id,
            "store_id": store.id,
            "product_id": product.id,
            date_col.name: d,
        }
        if "quantity" in cols:
            kwargs["quantity"] = qty
        if "net_sales" in cols:
            kwargs["net_sales"] = net_sales
        if "gross_sales" in cols:
            kwargs["gross_sales"] = net_sales
        row = DailyProductSales(**kwargs)
        session.add(row)
    else:
        if "quantity" in cols:
            setattr(row, "quantity", qty)
        if "net_sales" in cols:
            setattr(row, "net_sales", net_sales)


WRITERS = {
    "stores": _upsert_store,
    "products": _upsert_product,
    "daily_sales": _upsert_daily_sales,
    "hourly_sales": _upsert_hourly_sales,
    "product_sales": _upsert_product_sales,
}


async def write_canonical(
    session: AsyncSession, tenant_id: str, record: CanonicalRecord
) -> None:
    writer = WRITERS.get(record.target_table)
    if writer is None:
        return
    await writer(session, tenant_id, record.payload)
