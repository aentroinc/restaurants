"""Square Order -> canonical record transform."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Iterable

from app.connectors.base import CanonicalRecord


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def transform_orders(orders: Iterable[dict]) -> list[CanonicalRecord]:
    """Aggregate Square `Order` rows into daily / hourly / product sales."""
    daily = defaultdict(lambda: {"net_sales": Decimal("0"), "customer_count": 0, "transactions": 0})
    hourly = defaultdict(lambda: {"net_sales": Decimal("0"), "customer_count": 0})
    product = defaultdict(lambda: {"quantity": 0, "net_sales": Decimal("0"), "product_name": ""})

    for order in orders:
        try:
            dt = _parse_dt(order["created_at"])
        except Exception:
            continue
        date_key = dt.date().isoformat()
        hour = dt.hour
        location = str(order.get("location_id", ""))
        if not location:
            continue

        # Square stores money in cents (USD) or yen (JPY) — assume yen for JP
        total_cents = int(order.get("net_amounts", {}).get("total_money", {}).get("amount", 0))
        net = Decimal(total_cents)
        customers = max(1, int(order.get("guests_count", 1)))

        d = daily[(location, date_key)]
        d["net_sales"] += net
        d["customer_count"] += customers
        d["transactions"] += 1

        h = hourly[(location, date_key, hour)]
        h["net_sales"] += net
        h["customer_count"] += customers

        for li in order.get("line_items", []) or []:
            pid = str(li.get("catalog_object_id", ""))
            if not pid:
                continue
            qty = int(li.get("quantity", 1))
            unit_cents = int(li.get("base_price_money", {}).get("amount", 0))
            p = product[(location, date_key, pid)]
            p["quantity"] += qty
            p["net_sales"] += Decimal(unit_cents) * qty
            p["product_name"] = li.get("name", p["product_name"])

    out: list[CanonicalRecord] = []
    for (loc, date_key), v in daily.items():
        out.append(CanonicalRecord(
            target_table="daily_sales",
            source_id=f"square:daily:{loc}:{date_key}",
            payload={
                "store_id": loc, "date": date_key,
                "net_sales": float(v["net_sales"]),
                "customer_count": v["customer_count"],
                "transactions": v["transactions"],
            },
        ))
    for (loc, date_key, hour), v in hourly.items():
        out.append(CanonicalRecord(
            target_table="hourly_sales",
            source_id=f"square:hourly:{loc}:{date_key}:{hour:02d}",
            payload={
                "store_id": loc, "date": date_key, "hour": hour,
                "net_sales": float(v["net_sales"]),
                "customer_count": v["customer_count"],
            },
        ))
    for (loc, date_key, pid), v in product.items():
        out.append(CanonicalRecord(
            target_table="product_sales",
            source_id=f"square:product:{loc}:{date_key}:{pid}",
            payload={
                "store_id": loc, "date": date_key, "product_id": pid,
                "product_name": v["product_name"],
                "quantity": v["quantity"],
                "net_sales": float(v["net_sales"]),
            },
        ))
    return out
