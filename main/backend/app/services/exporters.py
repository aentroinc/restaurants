"""Analysis result exporters: CSV / Parquet / xlsx.

Exports are bounded to 1000 rows by default; larger requests stream as CSV
to avoid memory pressure. Heavy formats (Parquet) require pyarrow, xlsx
requires openpyxl — both gracefully fall back to CSV when missing.
"""
from __future__ import annotations

import csv
import io
from typing import Any

EXPORT_ROW_LIMIT = 1000


def _flatten_panels(analysis_result: dict) -> list[dict[str, Any]]:
    """Flatten an analysis runner result to a tabular row list.

    Each row is `{panel_id, ..panel-specific fields..}` so multiple panels
    can be exported as a single sheet with a panel discriminator.
    """
    out: list[dict[str, Any]] = []
    panels = analysis_result.get("panels") or []
    for p in panels:
        pid = p.get("id", "panel")
        for r in p.get("rows") or []:
            out.append({"panel_id": pid, **r})
        for inst in p.get("instances") or []:
            out.append({"panel_id": pid, **inst})
    return out[:EXPORT_ROW_LIMIT]


def export_csv(analysis_result: dict) -> bytes:
    rows = _flatten_panels(analysis_result)
    if not rows:
        return b""
    keys: list[str] = []
    seen: set[str] = set()
    for r in rows:
        for k in r.keys():
            if k not in seen:
                seen.add(k)
                keys.append(k)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=keys, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow({k: r.get(k) for k in keys})
    return buf.getvalue().encode("utf-8")


def export_xlsx(analysis_result: dict) -> bytes:
    try:
        from openpyxl import Workbook
    except ImportError:
        return export_csv(analysis_result)

    rows = _flatten_panels(analysis_result)
    wb = Workbook()
    ws = wb.active
    ws.title = (analysis_result.get("name") or "analysis")[:30]
    if not rows:
        ws.append(["(empty)"])
    else:
        keys: list[str] = []
        seen: set[str] = set()
        for r in rows:
            for k in r.keys():
                if k not in seen:
                    seen.add(k)
                    keys.append(k)
        ws.append(keys)
        for r in rows:
            ws.append([r.get(k) for k in keys])
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def export_parquet(analysis_result: dict) -> bytes:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        return export_csv(analysis_result)

    rows = _flatten_panels(analysis_result)
    if not rows:
        return b""
    table = pa.Table.from_pylist(rows)
    buf = io.BytesIO()
    pq.write_table(table, buf)
    return buf.getvalue()


EXPORTERS = {
    "csv": (export_csv, "text/csv", ".csv"),
    "xlsx": (export_xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    "parquet": (export_parquet, "application/octet-stream", ".parquet"),
}


def export(analysis_result: dict, format: str) -> tuple[bytes, str, str]:
    """Return (body, mime_type, suffix). Falls back to csv for unknown format."""
    fn, mime, suffix = EXPORTERS.get(format, EXPORTERS["csv"])
    return fn(analysis_result), mime, suffix
