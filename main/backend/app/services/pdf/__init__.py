"""PDF report generation (reportlab).

4 templates:
  - daily_report.py        店長日報
  - sales_daily_summary.py 売上日計表 (時間帯/カテゴリ/税率別)
  - labor_monthly.py       労務月次集計 (残業・36協定状況)
  - haccp_monitoring.py    HACCP 記録 (CCP 別 / 確認者印欄)

Japanese fonts: ./fonts/ 配下に IPAexGothic.ttf 等を置けば使用、
無ければ reportlab 標準 (HeiseiKakuGo-W5 — Acrobat 互換 CID Type0) を使う。
"""
from __future__ import annotations

from .fonts import get_jp_font  # re-export

__all__ = ["get_jp_font"]
