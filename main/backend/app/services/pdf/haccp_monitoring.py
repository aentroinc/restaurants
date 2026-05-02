"""HACCP 記録 PDF — CCP 別 / 温度 / 記録者 / 確認者印欄。

食品衛生法 (HACCP 義務化) 対応の月次記録一覧。
"""
from __future__ import annotations

import io
from typing import Any

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

from . import get_jp_font


def render(payload: dict[str, Any]) -> bytes:
    """payload:
      store_name, month (YYYY-MM),
      ccps: [
        {
          ccp_id, ccp_name (例: 冷蔵庫温度), threshold (例: <=10C),
          records: [{date, time, value, recorder, status (OK/NG), action_taken}, ...]
        }, ...
      ]
    """
    font = get_jp_font()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    W, H = landscape(A4)

    c.setFont(font, 16)
    c.drawString(15 * mm, H - 15 * mm, "HACCP 記録表")
    c.setFont(font, 9)
    c.drawString(15 * mm, H - 22 * mm, f"店舗: {payload.get('store_name','-')}    対象月: {payload.get('month','-')}")

    y = H - 35 * mm
    ccps = payload.get("ccps") or []
    for ccp in ccps:
        if y < 60 * mm:
            c.showPage()
            y = H - 20 * mm
        c.setFont(font, 11)
        c.drawString(15 * mm, y, f"■ CCP-{ccp.get('ccp_id','?')}: {ccp.get('ccp_name','-')}")
        c.setFont(font, 8)
        c.drawString(120 * mm, y, f"管理基準: {ccp.get('threshold','-')}")
        y -= 6 * mm

        records = ccp.get("records") or []
        head = ["日付", "時刻", "測定値", "判定", "記録者", "是正措置", "確認印"]
        rows = [head]
        for r in records:
            rows.append([
                r.get("date", "-"),
                r.get("time", "-"),
                r.get("value", "-"),
                r.get("status", "-"),
                r.get("recorder", "-"),
                r.get("action_taken", ""),
                "",  # 確認印欄 (空白)
            ])
        if len(rows) == 1:
            rows.append(["-"] * 7)

        t = Table(rows, colWidths=[22 * mm, 18 * mm, 22 * mm, 18 * mm, 30 * mm, 90 * mm, 25 * mm])
        style = [
            ("FONT", (0, 0), (-1, -1), font, 7),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2f7")),
        ]
        for i, r in enumerate(records, start=1):
            if (r.get("status") or "").upper() == "NG":
                style.append(("BACKGROUND", (3, i), (3, i), colors.HexColor("#ffd6d6")))
        t.setStyle(TableStyle(style))
        t.wrapOn(c, W, H)
        t_h = 5 * mm * len(rows) + 4 * mm
        t.drawOn(c, 15 * mm, y - t_h)
        y -= t_h + 8 * mm

    # 確認印
    c.setFont(font, 9)
    c.line(15 * mm, 20 * mm, 75 * mm, 20 * mm)
    c.line(105 * mm, 20 * mm, 165 * mm, 20 * mm)
    c.line(195 * mm, 20 * mm, 255 * mm, 20 * mm)
    c.drawString(15 * mm, 15 * mm, "記録責任者")
    c.drawString(105 * mm, 15 * mm, "店長確認")
    c.drawString(195 * mm, 15 * mm, "SV / 衛生管理者")

    c.setFont(font, 7)
    c.drawString(15 * mm, 8 * mm, "食品衛生法 (HACCP 制度化) 準拠 — 記録は 1 年間保管義務。")

    c.showPage()
    c.save()
    return buf.getvalue()
