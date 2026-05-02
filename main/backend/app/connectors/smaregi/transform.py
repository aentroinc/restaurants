"""Smaregi -> canonical transformation.

Maps Smaregi `transaction` shape into the project's canonical Silver-layer
records: daily_sales / hourly_sales / product_sales.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Iterable

from app.connectors.base import CanonicalRecord


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def transform_transactions(transactions: Iterable[dict]) -> list[CanonicalRecord]:
    """Aggregate transaction-level rows into canonical daily/hourly/product sales."""
    daily: dict[tuple[str, str], dict] = defaultdict(lambda: {
        "net_sales": Decimal("0"),
        "tax": Decimal("0"),
        "customer_count": 0,
        "transactions": 0,
    })
    hourly: dict[tuple[str, str, int], dict] = defaultdict(lambda: {
        "net_sales": Decimal("0"),
        "customer_count": 0,
    })
    product: dict[tuple[str, str, str], dict] = defaultdict(lambda: {
        "quantity": 0,
        "net_sales": Decimal("0"),
        "product_name": "",
    })

    raw_rows: list[dict] = list(transactions)

    for tx in raw_rows:
        try:
            dt = _parse_dt(tx["transactionDateTime"])
        except Exception:
            continue
        date_key = dt.date().isoformat()
        hour_key = dt.hour
        store_id = str(tx.get("storeId", ""))
        if not store_id:
            continue

        subtotal = Decimal(str(tx.get("subtotal", 0)))
        tax_total = Decimal(str(tx.get("taxInclude", subtotal))) - subtotal
        customers = int(tx.get("customers", 1))

        d = daily[(store_id, date_key)]
        d["net_sales"] += subtotal
        d["tax"] += tax_total
        d["customer_count"] += customers
        d["transactions"] += 1

        h = hourly[(store_id, date_key, hour_key)]
        h["net_sales"] += subtotal
        h["customer_count"] += customers

        for line in tx.get("details", []) or []:
            pid = str(line.get("productId", ""))
            if not pid:
                continue
            qty = int(line.get("quantity", 0))
            price = Decimal(str(line.get("salesPrice", 0)))
            p = product[(store_id, date_key, pid)]
            p["quantity"] += qty
            p["net_sales"] += price * qty
            p["product_name"] = line.get("productName", p["product_name"])

    out: list[CanonicalRecord] = []
    for (store_id, date_key), v in daily.items():
        out.append(CanonicalRecord(
            target_table="daily_sales",
            source_id=f"smaregi:daily:{store_id}:{date_key}",
            payload={
                "store_id": store_id,
                "date": date_key,
                "net_sales": float(v["net_sales"]),
                "tax": float(v["tax"]),
                "customer_count": v["customer_count"],
                "transactions": v["transactions"],
            },
        ))
    for (store_id, date_key, hour), v in hourly.items():
        out.append(CanonicalRecord(
            target_table="hourly_sales",
            source_id=f"smaregi:hourly:{store_id}:{date_key}:{hour:02d}",
            payload={
                "store_id": store_id,
                "date": date_key,
                "hour": hour,
                "net_sales": float(v["net_sales"]),
                "customer_count": v["customer_count"],
            },
        ))
    for (store_id, date_key, pid), v in product.items():
        out.append(CanonicalRecord(
            target_table="product_sales",
            source_id=f"smaregi:product:{store_id}:{date_key}:{pid}",
            payload={
                "store_id": store_id,
                "date": date_key,
                "product_id": pid,
                "product_name": v["product_name"],
                "quantity": v["quantity"],
                "net_sales": float(v["net_sales"]),
            },
        ))
    return out


def transform_stores(rows: Iterable[dict]) -> list[CanonicalRecord]:
    out = []
    for r in rows:
        sid = str(r.get("storeId", ""))
        if not sid:
            continue
        out.append(CanonicalRecord(
            target_table="stores",
            source_id=f"smaregi:store:{sid}",
            payload={
                "store_id": sid,
                "name": r.get("storeName"),
                "display_code": r.get("displayCode"),
            },
        ))
    return out


def transform_products(rows: Iterable[dict]) -> list[CanonicalRecord]:
    out = []
    for r in rows:
        pid = str(r.get("productId", ""))
        if not pid:
            continue
        out.append(CanonicalRecord(
            target_table="products",
            source_id=f"smaregi:product_master:{pid}",
            payload={
                "product_id": pid,
                "name": r.get("productName"),
                "price": float(Decimal(str(r.get("price", 0)))),
                "category_name": r.get("categoryName"),
            },
        ))
    return out
