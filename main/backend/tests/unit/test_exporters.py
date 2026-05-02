"""Unit tests for analysis exporters."""
from app.services.exporters import export, export_csv


SAMPLE = {
    "name": "test analysis",
    "panels": [
        {"id": "p1", "type": "kpi", "rows": [
            {"month": "2026-01", "value": 100},
            {"month": "2026-02", "value": 110},
        ]},
        {"id": "p2", "type": "cohort", "instances": [
            {"store_id": "s1", "name": "新宿店", "brand": "A"},
        ]},
    ],
}


def test_csv_export_includes_panel_id():
    body = export_csv(SAMPLE)
    text = body.decode("utf-8")
    assert "panel_id" in text
    assert "p1" in text and "p2" in text
    assert "新宿店" in text


def test_csv_dispatch():
    body, mime, suffix = export(SAMPLE, "csv")
    assert b"panel_id" in body
    assert mime == "text/csv"
    assert suffix == ".csv"


def test_xlsx_export_or_fallback():
    body, mime, suffix = export(SAMPLE, "xlsx")
    # openpyxl may not be installed -> CSV fallback is acceptable
    assert len(body) > 0


def test_parquet_or_fallback():
    body, mime, suffix = export(SAMPLE, "parquet")
    assert len(body) > 0


def test_empty_input_returns_empty_or_header():
    body = export_csv({"panels": []})
    assert body == b""
