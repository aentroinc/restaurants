"""4 種帳票 PDF 生成テスト — 破損なく生成、サイズ妥当 (>1KB)、PDF magic byte。"""
from __future__ import annotations


def _is_pdf(b: bytes) -> bool:
    return b.startswith(b"%PDF-") and b.rstrip().endswith(b"%%EOF")


def test_daily_report_pdf_renders():
    from app.services.pdf import daily_report
    pdf = daily_report.render({
        "store_name": "渋谷店",
        "business_date": "2026-05-02",
        "manager_name": "山田 太郎",
        "weather": "晴れ",
        "gross_sales": 850000,
        "net_sales": 772727,
        "customer_count": 320,
        "avg_check": 2656,
        "labor_hours": 48.5,
        "sales_per_hour": 17525,
        "notes": "ランチ混雑により提供遅延あり。改善策検討中。",
        "tomorrow_plan": "新人研修と棚卸し",
    })
    assert _is_pdf(pdf)
    assert len(pdf) > 1000


def test_sales_daily_summary_pdf_with_tax_breakdown():
    from app.services.pdf import sales_daily_summary
    pdf = sales_daily_summary.render({
        "store_name": "渋谷店",
        "business_date": "2026-05-02",
        "hourly": [{"hour": h, "net_sales": 35000, "customers": 15, "orders": 18} for h in range(11, 22)],
        "by_category": [
            {"category": "麺類", "qty": 120, "net_sales": 240000},
            {"category": "ご飯類", "qty": 80, "net_sales": 160000},
            {"category": "酒類", "qty": 30, "net_sales": 90000},
        ],
        "by_tax_rate": [
            {"tax_rate": "0.08", "net_sales": 400000, "tax_amount": 32000, "transaction_count": 200},
            {"tax_rate": "0.10", "net_sales": 90000, "tax_amount": 9000, "transaction_count": 30},
        ],
        "totals": {"net_sales": 490000, "tax_amount": 41000, "gross": 531000, "customers": 230},
    })
    assert _is_pdf(pdf)
    assert len(pdf) > 1500


def test_labor_monthly_pdf_renders():
    from app.services.pdf import labor_monthly
    pdf = labor_monthly.render({
        "store_name": "渋谷店",
        "month": "2026-04",
        "employees": [
            {"name": "山田", "role": "店長", "work_days": 22, "work_hours": 176, "overtime_hours": 30, "night_hours": 5, "holiday_hours": 0, "agreement36_status": "OK"},
            {"name": "佐藤", "role": "社員", "work_days": 20, "work_hours": 160, "overtime_hours": 50, "night_hours": 8, "holiday_hours": 8, "agreement36_status": "違反"},
        ],
        "summary": {"total_work_hours": 336, "total_overtime": 80, "agreement36_violations": 1, "paid_leave_days": 4},
    })
    assert _is_pdf(pdf)
    assert len(pdf) > 1000


def test_haccp_monitoring_pdf_renders():
    from app.services.pdf import haccp_monitoring
    pdf = haccp_monitoring.render({
        "store_name": "渋谷店",
        "month": "2026-04",
        "ccps": [
            {
                "ccp_id": "1",
                "ccp_name": "冷蔵庫温度",
                "threshold": "≤ 10°C",
                "records": [
                    {"date": "2026-04-01", "time": "09:00", "value": "4.2°C", "status": "OK", "recorder": "山田", "action_taken": ""},
                    {"date": "2026-04-02", "time": "09:05", "value": "11.8°C", "status": "NG", "recorder": "佐藤", "action_taken": "扉確認/再測定 OK"},
                ],
            },
            {
                "ccp_id": "2",
                "ccp_name": "加熱中心温度 (フライヤー)",
                "threshold": "≥ 75°C 1分",
                "records": [
                    {"date": "2026-04-01", "time": "12:00", "value": "85°C", "status": "OK", "recorder": "山田", "action_taken": ""},
                ],
            },
        ],
    })
    assert _is_pdf(pdf)
    assert len(pdf) > 1500
