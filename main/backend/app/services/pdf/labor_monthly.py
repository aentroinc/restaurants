"""労務月次集計 PDF — 従業員別 残業 / 36協定状況。"""
from __future__ import annotations

import io
from decimal import Decimal
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

from . import get_jp_font


def render(payload: dict[str, Any]) -> bytes:
    """payload:
      store_name, month (YYYY-MM),
      employees: [{name, role, work_days, work_hours, overtime_hours,
                   night_hours, holiday_hours, agreement36_status}, ...]
      summary: {total_work_hours, total_overtime, agreement36_violations}
    """
    font = get_jp_font()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    c.setFont(font, 16)
    c.drawString(20 * mm, H - 18 * mm, "労務月次集計表")
    c.setFont(font, 9)
    c.drawString(20 * mm, H - 25 * mm, f"店舗: {payload.get('store_name','-')}    対象月: {payload.get('month','-')}")

    # サマリ
    summary = payload.get("summary") or {}
    sum_data = [
        ["項目", "値"],
        ["総労働時間", _hr(summary.get("total_work_hours"))],
        ["総残業時間", _hr(summary.get("total_overtime"))],
        ["36協定違反件数", _num(summary.get("agreement36_violations"))],
        ["有給取得日数", _num(summary.get("paid_leave_days"))],
    ]
    t = Table(sum_data, colWidths=[60 * mm, 50 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 9),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    t.wrapOn(c, W, H)
    t.drawOn(c, 20 * mm, H - 70 * mm)

    # 従業員別
    c.setFont(font, 11)
    c.drawString(20 * mm, H - 80 * mm, "■ 従業員別")
    emps = payload.get("employees") or []
    head = ["氏名", "役職", "出勤日", "労働h", "残業h", "深夜h", "休日h", "36協定"]
    rows = [head]
    for e in emps:
        rows.append([
            e.get("name", "-"),
            e.get("role", "-"),
            _num(e.get("work_days")),
            _hr(e.get("work_hours")),
            _hr(e.get("overtime_hours")),
            _hr(e.get("night_hours")),
            _hr(e.get("holiday_hours")),
            e.get("agreement36_status") or "OK",
        ])
    t2 = Table(rows, colWidths=[35 * mm, 25 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 20 * mm])
    style = [
        ("FONT", (0, 0), (-1, -1), font, 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ("ALIGN", (2, 1), (-2, -1), "RIGHT"),
    ]
    # 36協定違反は赤
    for i, e in enumerate(emps, start=1):
        if (e.get("agreement36_status") or "OK") not in ("OK", "ok", "OK内"):
            style.append(("BACKGROUND", (-1, i), (-1, i), colors.HexColor("#ffd6d6")))
    t2.setStyle(TableStyle(style))
    t2.wrapOn(c, W, H)
    t2.drawOn(c, 20 * mm, H - 80 * mm - 6 * mm * (len(rows) + 1))

    # 確認欄
    c.setFont(font, 9)
    y = 25 * mm
    c.line(20 * mm, y, 80 * mm, y)
    c.line(110 * mm, y, 170 * mm, y)
    c.drawString(20 * mm, y - 5 * mm, "店長確認印")
    c.drawString(110 * mm, y - 5 * mm, "労務担当確認印")

    c.setFont(font, 7)
    c.drawString(20 * mm, 12 * mm, "労働基準法 36条/37条準拠 — 残業 45h/月 超は要点検。")

    c.showPage()
    c.save()
    return buf.getvalue()


def _hr(v) -> str:
    if v is None or v == "":
        return "-"
    try:
        return f"{float(v):.1f}h"
    except Exception:
        return str(v)


def _num(v) -> str:
    if v is None or v == "":
        return "-"
    try:
        return f"{int(Decimal(str(v))):,}"
    except Exception:
        return str(v)
