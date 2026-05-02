"""Smaregi connector implementing BaseConnector."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.connectors.base import BaseConnector, CanonicalRecord, ConnectorRegistry, FetchResult
from app.connectors.smaregi.client import SmaregiClient
from app.connectors.smaregi.transform import (
    transform_products, transform_stores, transform_transactions,
)


@ConnectorRegistry.register
class SmaregiConnector(BaseConnector):
    id = "smaregi"
    display_name = "スマレジ Platform API"
    auth_type = "oauth2"
    target_tables = ("daily_sales", "hourly_sales", "product_sales", "stores", "products")

    @property
    def _client(self) -> SmaregiClient:
        return SmaregiClient(
            access_token=self.credentials.get("access_token", ""),
            contract_id=self.config.get("contract_id"),
        )

    async def test_connection(self) -> bool:
        try:
            await self._client.get("/pos/stores", params={"limit": 1})
            return True
        except Exception:
            return False

    async def fetch(
        self, *, since: datetime | None = None, cursor: str | None = None,
        limit: int = 500,
    ) -> FetchResult:
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(days=1)

        params = {
            "limit": limit,
            "transactionDateTimeFrom": since.isoformat(),
        }
        if cursor:
            params["page_token"] = cursor

        try:
            tx = await self._client.get("/pos/transactions", params=params)
            stores = await self._client.get("/pos/stores", params={"limit": 200})
            products = await self._client.get("/pos/products", params={"limit": 1000})
        except Exception as e:
            return FetchResult(error=str(e))

        raw = []
        for r in tx.get("results", []):
            raw.append({"_kind": "transaction", **r})
        for r in stores.get("results", []):
            raw.append({"_kind": "store", **r})
        for r in products.get("results", []):
            raw.append({"_kind": "product", **r})

        return FetchResult(raw_records=raw, next_cursor=tx.get("next"))

    def transform(self, raw_records: Iterable[dict]) -> list[CanonicalRecord]:
        rows = list(raw_records)
        out: list[CanonicalRecord] = []
        out.extend(transform_transactions([r for r in rows if r.get("_kind") == "transaction"]))
        out.extend(transform_stores([r for r in rows if r.get("_kind") == "store"]))
        out.extend(transform_products([r for r in rows if r.get("_kind") == "product"]))
        return out
