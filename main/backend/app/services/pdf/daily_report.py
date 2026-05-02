"""店長日報 PDF — A4 縦。

ヘッダ: 日付 / 店舗名 / 店長 / 天候
本体: 売上サマリ (税抜・税込・客数・客単価・人時)
特記事項 (フリーテキスト)
明日の予定 / 課題
署名欄 (店長 / SV)
"""
from __future__ import annotations

import io
from datetime import date
from decimal import Decimal
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors

from . import get_jp_font


def render(payload: dict[str, Any]) -> bytes:
    """payload keys:
        store_name, business_date, manager_name, weather,
        gross_sales, net_sales, customer_count, avg_check,
        labor_hours, sales_per_hour,
        notes, tomorrow_plan
    """
    font = get_jp_font()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    # ヘッダ
    c.setFont(font, 16)
    c.drawString(20 * mm, H - 20 * mm, "店長日報")
    c.setFont(font, 9)
    c.drawRightString(W - 20 * mm, H - 20 * mm, f"AENTRO Restaurant OS")

    c.setFont(font, 10)
    bd = payload.get("business_date", date.today().isoformat())
    c.drawString(20 * mm, H - 30 * mm, f"日付: {bd}")
    c.drawString(80 * mm, H - 30 * mm, f"店舗: {payload.get('store_name','-')}")
    c.drawString(140 * mm, H - 30 * mm, f"天候: {payload.get('weather','-')}")
    c.drawString(20 * mm, H - 36 * mm, f"店長: {payload.get('manager_name','-')}")

    # 売上サマリテーブル
    data = [
        ["項目", "実績", "予算", "達成率"],
        ["総売上(税込)", _yen(payload.get("gross_sales")), _yen(payload.get("budget_gross")), _pct(payload.get("gross_pct"))],
        ["税抜売上", _yen(payload.get("net_sales")), "", ""],
        ["客数", _num(payload.get("customer_count")), _num(payload.get("budget_customers")), _pct(payload.get("customers_pct"))],
        ["客単価", _yen(payload.get("avg_check")), "", ""],
        ["人時数", _num(payload.get("labor_hours")), "", ""],
        ["人時売上", _yen(payload.get("sales_per_hour")), "", ""],
    ]
    t = Table(data, colWidths=[40 * mm, 40 * mm, 40 * mm, 30 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f0fe")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    t.wrapOn(c, W, H)
    t.drawOn(c, 20 * mm, H - 100 * mm)

    # 特記事項
    style = ParagraphStyle("body", fontName=font, fontSize=9, leading=13)
    c.setFont(font, 11)
    c.drawString(20 * mm, H - 110 * mm, "特記事項")
    notes = payload.get("notes") or "（特記なし）"
    p = Paragraph(_escape(notes), style)
    p.wrapOn(c, W - 40 * mm, 30 * mm)
    p.drawOn(c, 20 * mm, H - 140 * mm)

    c.setFont(font, 11)
    c.drawString(20 * mm, H - 150 * mm, "明日の予定 / 課題")
    plan = payload.get("tomorrow_plan") or "（記入なし）"
    p2 = Paragraph(_escape(plan), style)
    p2.wrapOn(c, W - 40 * mm, 30 * mm)
    p2.drawOn(c, 20 * mm, H - 180 * mm)

    # 署名欄
    c.setFont(font, 9)
    y = 35 * mm
    c.line(20 * mm, y, 80 * mm, y)
    c.line(110 * mm, y, 170 * mm, y)
    c.drawString(20 * mm, y - 5 * mm, "店長サイン")
    c.drawString(110 * mm, y - 5 * mm, "SVサイン")

    c.setFont(font, 7)
    c.drawString(20 * mm, 15 * mm, "本帳票は AENTRO Restaurant OS が自動生成。改ざん検知のため hash 付き。")

    c.showPage()
    c.save()
    return buf.getvalue()


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


def _pct(v) -> str:
    if v is None or v == "":
        return "-"
    try:
        return f"{float(v):.1f}%"
    except Exception:
        return str(v)


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
