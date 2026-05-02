"""Unit tests for Smaregi -> canonical transform.

These exercise the pure transformation logic with synthetic Smaregi-style
payloads — no network, no DB.
"""
from app.connectors.smaregi.transform import (
    transform_products, transform_stores, transform_transactions,
)


def test_transform_transactions_aggregates_daily():
    raw = [
        {
            "transactionHeadId": "tx-1",
            "transactionDateTime": "2026-04-30T12:30:00+09:00",
            "storeId": "S1",
            "subtotal": 1200,
            "taxInclude": 1320,
            "customers": 1,
            "details": [
                {"productId": "P1", "productName": "牛丼", "salesPrice": 400, "quantity": 1},
                {"productId": "P2", "productName": "味噌汁", "salesPrice": 100, "quantity": 1},
            ],
        },
        {
            "transactionHeadId": "tx-2",
            "transactionDateTime": "2026-04-30T13:00:00+09:00",
            "storeId": "S1",
            "subtotal": 800,
            "taxInclude": 880,
            "customers": 1,
            "details": [],
        },
    ]
    out = transform_transactions(raw)
    daily = [r for r in out if r.target_table == "daily_sales"]
    hourly = [r for r in out if r.target_table == "hourly_sales"]
    product = [r for r in out if r.target_table == "product_sales"]

    assert len(daily) == 1
    assert daily[0].payload["net_sales"] == 2000.0
    assert daily[0].payload["customer_count"] == 2
    assert daily[0].payload["transactions"] == 2

    # 12:00 hour and 13:00 hour
    assert len(hourly) == 2
    assert sum(h.payload["net_sales"] for h in hourly) == 2000.0

    # P1 + P2 from one transaction
    assert len(product) == 2


def test_transform_stores_passthrough():
    out = transform_stores([{"storeId": "S1", "storeName": "新宿店", "displayCode": "001"}])
    assert len(out) == 1
    assert out[0].target_table == "stores"
    assert out[0].payload["name"] == "新宿店"


def test_transform_products_passthrough():
    out = transform_products([{"productId": "P1", "productName": "牛丼", "price": 400}])
    assert len(out) == 1
    assert out[0].target_table == "products"
    assert out[0].payload["price"] == 400.0


def test_skips_invalid_rows():
    raw = [{"transactionDateTime": "2026-04-30T12:00:00+09:00"}]  # missing storeId
    out = transform_transactions(raw)
    assert out == []
