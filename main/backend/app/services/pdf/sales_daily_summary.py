"""売上日計表 PDF — 時間帯別 / カテゴリ別 / 税率別 (8% / 10%)。"""
from __future__ import annotations

import io
from decimal import Decimal
from typing import Any

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

from . import get_jp_font


def render(payload: dict[str, Any]) -> bytes:
    """payload:
      store_name, business_date,
      hourly: [{hour, net_sales, customers, orders}, ...] (24)
      by_category: [{category, net_sales, qty}, ...]
      by_tax_rate: [{tax_rate, net_sales, tax_amount, transaction_count}, ...]
      totals: {net_sales, tax_amount, gross, customers}
    """
    font = get_jp_font()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    W, H = landscape(A4)

    c.setFont(font, 16)
    c.drawString(15 * mm, H - 15 * mm, "売上日計表")
    c.setFont(font, 10)
    c.drawString(15 * mm, H - 22 * mm, f"店舗: {payload.get('store_name','-')}    日付: {payload.get('business_date','-')}")

    # 時間帯別
    c.setFont(font, 11)
    c.drawString(15 * mm, H - 32 * mm, "■ 時間帯別売上")
    hourly = payload.get("hourly") or []
    head = ["時刻"] + [f"{h:02d}" for h in range(24)] + ["合計"]
    sales_row = ["売上"] + [_yen(_pick(hourly, h, "net_sales")) for h in range(24)] + [_yen(sum(int(Decimal(str(x.get("net_sales") or 0))) for x in hourly))]
    cust_row = ["客数"] + [_num(_pick(hourly, h, "customers")) for h in range(24)] + [_num(sum(int(x.get("customers") or 0) for x in hourly))]
    t = Table([head, sales_row, cust_row], colWidths=[15 * mm] + [9.5 * mm] * 24 + [18 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 6),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]))
    t.wrapOn(c, W, H)
    t.drawOn(c, 15 * mm, H - 60 * mm)

    # カテゴリ別
    c.setFont(font, 11)
    c.drawString(15 * mm, H - 70 * mm, "■ カテゴリ別売上")
    cats = payload.get("by_category") or []
    cat_data = [["カテゴリ", "数量", "売上(税抜)"]] + [
        [c0.get("category", "-"), _num(c0.get("qty")), _yen(c0.get("net_sales"))] for c0 in cats
    ]
    t2 = Table(cat_data, colWidths=[60 * mm, 30 * mm, 40 * mm])
    t2.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    t2.wrapOn(c, W, H)
    t2.drawOn(c, 15 * mm, H - 70 * mm - 6 * mm * (len(cats) + 1) - 5 * mm)

    # 税率別 (重要)
    c.setFont(font, 11)
    c.drawString(150 * mm, H - 70 * mm, "■ 税率別 (軽減税率対応)")
    by_rate = payload.get("by_tax_rate") or []
    rate_data = [["税率", "税抜売上", "消費税", "税込", "件数"]]
    for r in by_rate:
        rate = float(r.get("tax_rate") or 0)
        rate_data.append([
            f"{rate*100:.0f}%",
            _yen(r.get("net_sales")),
            _yen(r.get("tax_amount")),
            _yen(Decimal(str(r.get("net_sales") or 0)) + Decimal(str(r.get("tax_amount") or 0))),
            _num(r.get("transaction_count")),
        ])
    totals = payload.get("totals") or {}
    rate_data.append([
        "合計",
        _yen(totals.get("net_sales")),
        _yen(totals.get("tax_amount")),
        _yen(totals.get("gross")),
        _num(totals.get("customers")),
    ])
    t3 = Table(rate_data, colWidths=[20 * mm, 30 * mm, 25 * mm, 30 * mm, 20 * mm])
    t3.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fff2cc")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    t3.wrapOn(c, W, H)
    t3.drawOn(c, 150 * mm, H - 70 * mm - 6 * mm * len(rate_data) - 5 * mm)

    c.setFont(font, 7)
    c.drawString(15 * mm, 10 * mm, "適格請求書 (インボイス) 対応 — 税率別の集計を別個に表示。")

    c.showPage()
    c.save()
    return buf.getvalue()


def _pick(rows: list[dict], hour: int, key: str):
    for r in rows:
        if int(r.get("hour", -1)) == hour:
            return r.get(key)
    return 0


def _yen(v) -> str:
    if v is None or v == "":
        return "-"
    try:
        return f"¥{int(Decimal(str(v))):,}"
    except Exception:
        return str(v)


def _num(v) -> str:
    if v is None or v == "":
        return "-"
    try:
        return f"{int(Decimal(str(v))):,}"
    except Exception:
        return str(v)
