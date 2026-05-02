"""帳票 PDF API — 4 種の帳票をストリームで配信。

  GET /api/v1/reports/daily-report.pdf?store_id=&date=
  GET /api/v1/reports/sales-daily.pdf?store_id=&date=
  GET /api/v1/reports/labor-monthly.pdf?store_id=&month=YYYY-MM
  GET /api/v1/reports/haccp-monitoring.pdf?store_id=&month=YYYY-MM

Content-Disposition: attachment で download 強制。
"""
from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.daily_sales import DailyStoreSales
from app.models.hourly_sales import HourlyStoreSales
from app.models.product_sales import DailyProductSales
from app.models.product import Product
from app.models.sales_tax_breakdown import SalesTaxBreakdown
from app.models.store import Store
from app.services.pdf import daily_report, sales_daily_summary, labor_monthly, haccp_monitoring


router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


def _parse_date(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, f"Invalid date: {s} (YYYY-MM-DD)")


def _parse_month(s: str) -> tuple[date, date]:
    try:
        dt = datetime.strptime(s, "%Y-%m")
    except ValueError:
        raise HTTPException(400, f"Invalid month: {s} (YYYY-MM)")
    last = calendar.monthrange(dt.year, dt.month)[1]
    return date(dt.year, dt.month, 1), date(dt.year, dt.month, last)


def _stream(content: bytes, filename: str) -> StreamingResponse:
    import io
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Length": str(len(content)),
    }
    return StreamingResponse(io.BytesIO(content), media_type="application/pdf", headers=headers)


async def _get_store(db: AsyncSession, tenant_id: str, store_id: str) -> Store | None:
    r = await db.execute(
        select(Store).where(Store.tenant_id == tenant_id, Store.id == store_id)
    )
    return r.scalar_one_or_none()


@router.get("/daily-report.pdf")
async def daily_report_pdf(
    store_id: str = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    bd = _parse_date(date)
    store = await _get_store(db, tenant_id, store_id)

    sales = await db.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tenant_id,
            DailyStoreSales.store_id == store_id,
            DailyStoreSales.business_date == bd,
        )
    )
    s = sales.scalar_one_or_none()

    payload: dict[str, Any] = {
        "store_name": store.name if store else f"店舗 {store_id}",
        "business_date": bd.isoformat(),
        "manager_name": "—",
        "weather": "—",
    }
    if s:
        gross = Decimal(s.gross_sales or 0)
        net = Decimal(s.net_sales or 0)
        cust = int(s.customer_count or 0)
        avg = (gross / cust) if cust else Decimal(0)
        payload.update({
            "gross_sales": gross,
            "net_sales": net,
            "customer_count": cust,
            "avg_check": avg,
            "labor_hours": "—",
            "sales_per_hour": "—",
        })
    pdf = daily_report.render(payload)
    return _stream(pdf, f"daily_report_{store_id}_{bd}.pdf")


@router.get("/sales-daily.pdf")
async def sales_daily_pdf(
    store_id: str = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    bd = _parse_date(date)
    store = await _get_store(db, tenant_id, store_id)

    # 時間帯別
    hr = await db.execute(
        select(HourlyStoreSales).where(
            HourlyStoreSales.tenant_id == tenant_id,
            HourlyStoreSales.store_id == store_id,
            HourlyStoreSales.business_date == bd,
        )
    )
    hourly = [{
        "hour": int(r.hour),
        "net_sales": r.net_sales,
        "customers": r.customer_count,
        "orders": r.order_count,
    } for r in hr.scalars().all()]

    # カテゴリ別 (Product.category_l1 で集計)
    rows = await db.execute(
        select(Product.category_l1, DailyProductSales.quantity, DailyProductSales.net_sales)
        .join(Product, Product.id == DailyProductSales.product_id)
        .where(
            DailyProductSales.tenant_id == tenant_id,
            DailyProductSales.store_id == store_id,
            DailyProductSales.business_date == bd,
        )
    )
    by_cat: dict[str, dict[str, Decimal]] = {}
    for cat, qty, net in rows.all():
        b = by_cat.setdefault(cat or "その他", {"qty": Decimal(0), "net_sales": Decimal(0)})
        b["qty"] += Decimal(qty or 0)
        b["net_sales"] += Decimal(net or 0)
    by_category = [{"category": k, "qty": v["qty"], "net_sales": v["net_sales"]} for k, v in by_cat.items()]

    # 税率別
    tax_rows = await db.execute(
        select(SalesTaxBreakdown).where(
            SalesTaxBreakdown.tenant_id == tenant_id,
            SalesTaxBreakdown.store_id == store_id,
            SalesTaxBreakdown.business_date == bd,
        )
    )
    by_tax = [{
        "tax_rate": str(r.tax_rate),
        "net_sales": r.net_sales,
        "tax_amount": r.tax_amount,
        "transaction_count": int(r.transaction_count),
    } for r in tax_rows.scalars().all()]
    total_net = sum((Decimal(r["net_sales"] or 0) for r in by_tax), Decimal("0"))
    total_tax = sum((Decimal(r["tax_amount"] or 0) for r in by_tax), Decimal("0"))

    daily_q = await db.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tenant_id,
            DailyStoreSales.store_id == store_id,
            DailyStoreSales.business_date == bd,
        )
    )
    daily_row = daily_q.scalar_one_or_none()

    payload = {
        "store_name": store.name if store else store_id,
        "business_date": bd.isoformat(),
        "hourly": hourly,
        "by_category": by_category,
        "by_tax_rate": by_tax,
        "totals": {
            "net_sales": total_net,
            "tax_amount": total_tax,
            "gross": total_net + total_tax,
            "customers": int(daily_row.customer_count) if daily_row else 0,
        },
    }
    pdf = sales_daily_summary.render(payload)
    return _stream(pdf, f"sales_daily_{store_id}_{bd}.pdf")


@router.get("/labor-monthly.pdf")
async def labor_monthly_pdf(
    store_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    start, end = _parse_month(month)
    store = await _get_store(db, tenant_id, store_id)

    # 労務集計 — labor / shift モデルから取れれば理想だが、シードがない場合は空
    employees: list[dict] = []
    summary: dict[str, Any] = {
        "total_work_hours": 0,
        "total_overtime": 0,
        "agreement36_violations": 0,
        "paid_leave_days": 0,
    }

    try:
        from app.models.labor import LaborActual  # type: ignore
        rows = await db.execute(
            select(LaborActual).where(
                LaborActual.tenant_id == tenant_id,
                LaborActual.store_id == store_id,
                LaborActual.work_date >= start,
                LaborActual.work_date <= end,
            )
        )
        agg: dict[str, dict[str, Any]] = {}
        for r in rows.scalars().all():
            eid = str(getattr(r, "employee_id", "")) or "—"
            a = agg.setdefault(eid, {
                "name": eid[:8],
                "role": "—",
                "work_days": 0,
                "work_hours": Decimal(0),
                "overtime_hours": Decimal(0),
                "night_hours": Decimal(0),
                "holiday_hours": Decimal(0),
            })
            a["work_days"] += 1
            a["work_hours"] += Decimal(getattr(r, "work_hours", 0) or 0)
            a["overtime_hours"] += Decimal(getattr(r, "overtime_hours", 0) or 0)
        for eid, a in agg.items():
            ov = float(a["overtime_hours"])
            a["agreement36_status"] = "違反" if ov > 45 else "OK"
            employees.append(a)
            summary["total_work_hours"] += float(a["work_hours"])
            summary["total_overtime"] += ov
            if a["agreement36_status"] != "OK":
                summary["agreement36_violations"] += 1
    except Exception:
        pass

    payload = {
        "store_name": store.name if store else store_id,
        "month": month,
        "employees": employees,
        "summary": summary,
    }
    pdf = labor_monthly.render(payload)
    return _stream(pdf, f"labor_monthly_{store_id}_{month}.pdf")


@router.get("/haccp-monitoring.pdf")
async def haccp_pdf(
    store_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    start, end = _parse_month(month)
    store = await _get_store(db, tenant_id, store_id)

    ccps: list[dict] = []
    try:
        from app.models.haccp import HACCPRecord  # type: ignore
        rows = await db.execute(
            select(HACCPRecord).where(
                HACCPRecord.tenant_id == tenant_id,
                HACCPRecord.store_id == store_id,
                HACCPRecord.recorded_at >= datetime.combine(start, datetime.min.time()),
                HACCPRecord.recorded_at <= datetime.combine(end, datetime.max.time()),
            )
        )
        bucket: dict[str, dict] = {}
        for r in rows.scalars().all():
            ccp_id = getattr(r, "ccp_id", None) or getattr(r, "ccp_name", "CCP") or "CCP"
            b = bucket.setdefault(str(ccp_id), {
                "ccp_id": str(ccp_id),
                "ccp_name": getattr(r, "ccp_name", "—") or "—",
                "threshold": getattr(r, "threshold", "—") or "—",
                "records": [],
            })
            ts = getattr(r, "recorded_at", None)
            b["records"].append({
                "date": ts.date().isoformat() if ts else "-",
                "time": ts.strftime("%H:%M") if ts else "-",
                "value": str(getattr(r, "measured_value", "-") or "-"),
                "status": getattr(r, "status", "OK") or "OK",
                "recorder": getattr(r, "recorder_name", "—") or "—",
                "action_taken": getattr(r, "action_taken", "") or "",
            })
        ccps = list(bucket.values())
    except Exception:
        pass

    if not ccps:
        # フォールバック: 1 つ空の CCP を出して帳票形式を保つ
        ccps = [{
            "ccp_id": "1",
            "ccp_name": "冷蔵庫温度",
            "threshold": "≤ 10°C",
            "records": [],
        }]

    payload = {
        "store_name": store.name if store else store_id,
        "month": month,
        "ccps": ccps,
    }
    pdf = haccp_monitoring.render(payload)
    return _stream(pdf, f"haccp_{store_id}_{month}.pdf")
