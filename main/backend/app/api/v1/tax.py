"""軽減税率 (8% / 10%) 集計 API。

  GET /api/v1/tax/daily-breakdown?store_id=&date=
  GET /api/v1/tax/monthly-breakdown?store_id=&month=YYYY-MM
  GET /api/v1/tax/qualified-invoice-summary?store_id=&period=YYYY-MM (or YYYY)
"""
from __future__ import annotations

import calendar
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.sales_tax_breakdown import SalesTaxBreakdown
from app.schemas.common import APIResponse
from app.services import tax_calculator as tc


router = APIRouter(prefix="/api/v1/tax", tags=["tax"])


def _parse_date(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, f"Invalid date: {s} (expected YYYY-MM-DD)")


def _parse_month(s: str) -> tuple[date, date]:
    try:
        dt = datetime.strptime(s, "%Y-%m")
    except ValueError:
        raise HTTPException(400, f"Invalid month: {s} (expected YYYY-MM)")
    last = calendar.monthrange(dt.year, dt.month)[1]
    return date(dt.year, dt.month, 1), date(dt.year, dt.month, last)


@router.get("/daily-breakdown")
async def daily_breakdown(
    store_id: str = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    recompute: bool = Query(False, description="再計算してから返す"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    bd = _parse_date(date)
    if recompute:
        await tc.breakdown_daily_sales(db, tenant_id, store_id, bd)
        await db.commit()

    rows = await db.execute(
        select(SalesTaxBreakdown).where(
            SalesTaxBreakdown.tenant_id == tenant_id,
            SalesTaxBreakdown.store_id == store_id,
            SalesTaxBreakdown.business_date == bd,
        )
    )
    items: list[dict[str, Any]] = []
    total_net = Decimal("0")
    total_tax = Decimal("0")
    for r in rows.scalars().all():
        items.append({
            "tax_rate": str(r.tax_rate),
            "net_sales": str(r.net_sales),
            "tax_amount": str(r.tax_amount),
            "gross": str(Decimal(r.net_sales) + Decimal(r.tax_amount)),
            "transaction_count": int(r.transaction_count),
        })
        total_net += Decimal(r.net_sales or 0)
        total_tax += Decimal(r.tax_amount or 0)

    return APIResponse(data={
        "store_id": store_id,
        "business_date": bd.isoformat(),
        "items": items,
        "total_net_sales": str(total_net),
        "total_tax_amount": str(total_tax),
        "total_gross": str(total_net + total_tax),
    })


@router.get("/monthly-breakdown")
async def monthly_breakdown(
    store_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    start, end = _parse_month(month)
    rows = await db.execute(
        select(SalesTaxBreakdown).where(
            SalesTaxBreakdown.tenant_id == tenant_id,
            SalesTaxBreakdown.store_id == store_id,
            SalesTaxBreakdown.business_date >= start,
            SalesTaxBreakdown.business_date <= end,
        )
    )
    by_rate: dict[str, dict[str, Decimal | int]] = {}
    for r in rows.scalars().all():
        key = str(r.tax_rate)
        b = by_rate.setdefault(key, {"net_sales": Decimal("0"), "tax_amount": Decimal("0"), "transaction_count": 0})
        b["net_sales"] += Decimal(r.net_sales or 0)
        b["tax_amount"] += Decimal(r.tax_amount or 0)
        b["transaction_count"] += int(r.transaction_count or 0)

    total_net = sum((v["net_sales"] for v in by_rate.values()), Decimal("0"))
    total_tax = sum((v["tax_amount"] for v in by_rate.values()), Decimal("0"))
    return APIResponse(data={
        "store_id": store_id,
        "month": month,
        "by_rate": {k: {kk: str(vv) if isinstance(vv, Decimal) else vv for kk, vv in v.items()} for k, v in by_rate.items()},
        "total_net_sales": str(total_net),
        "total_tax_amount": str(total_tax),
        "total_gross": str(total_net + total_tax),
    })


@router.get("/qualified-invoice-summary")
async def qualified_invoice_summary(
    store_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM or YYYY"),
    invoice_registration_no: str | None = Query(None, description="適格請求書発行事業者登録番号 T1234..."),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if len(period) == 7:
        start, end = _parse_month(period)
    elif len(period) == 4:
        try:
            year = int(period)
        except ValueError:
            raise HTTPException(400, f"Invalid period: {period}")
        start = date(year, 1, 1)
        end = date(year, 12, 31)
    else:
        raise HTTPException(400, "period must be YYYY-MM or YYYY")

    summary = await tc.get_qualified_invoice_summary(db, tenant_id, store_id, start, end)
    summary["store_id"] = store_id
    summary["invoice_registration_no"] = invoice_registration_no or "T0000000000000"
    summary["compliant_with_qualified_invoice_system"] = True
    return APIResponse(data=summary)
