"""Uber Eats Merchant connector — OAuth2 Client Credentials grant。

Endpoints:
  - GET  https://api.uber.com/v1/eats/stores/{store_id}/orders
  - GET  https://api.uber.com/v1/eats/stores/{store_id}/menu

env:
  - UBEREATS_CLIENT_ID
  - UBEREATS_CLIENT_SECRET
"""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timezone
from collections import defaultdict
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import BaseConnector, ConnectorSchema, FetchResult
from app.connectors.oauth_base import OAuthTokens
from app.models.daily_sales import DailyStoreSales
from app.models.ingestion import IngestionBatch
from app.models.store import Store
from app.services.secrets import get_secret

_SANDBOX_DIR = Path(__file__).parent / "sandbox"


def _load(name: str) -> Any:
    with (_SANDBOX_DIR / f"{name}.json").open() as f:
        return json.load(f)


class UberEatsMerchant(BaseConnector):
    """Uber Eats Merchant connector. OAuth2 Client Credentials + 注文取得 + sync。"""

    name = "Uber Eats Merchant"
    source_type = "ubereats"
    connector_type = "ubereats"
    auth_type = "oauth2_client_credentials"
    system_category = "delivery"
    api_base = "https://api.uber.com/v1/eats"
    token_endpoint = "https://login.uber.com/oauth/v2/token"
    default_scope = "eats.store eats.order"
    client_id_env = "UBEREATS_CLIENT_ID"
    client_secret_env = "UBEREATS_CLIENT_SECRET"

    def client_id(self) -> str | None:
        return get_secret(self.client_id_env)

    def client_secret(self) -> str | None:
        return get_secret(self.client_secret_env)

    async def get_client_credentials_token(self) -> OAuthTokens:
        """Client Credentials grant — 直接 access_token を取得 (refresh なし)。"""
        cid = self.client_id()
        csec = self.client_secret()
        if not cid or not csec:
            raise RuntimeError(f"{self.client_id_env}/{self.client_secret_env} not set")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self.token_endpoint,
                data={
                    "client_id": cid,
                    "client_secret": csec,
                    "grant_type": "client_credentials",
                    "scope": self.default_scope,
                },
                headers={"Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"UberEats token grant failed: {resp.status_code}")
        body = resp.json()
        return OAuthTokens(
            access_token=body.get("access_token", ""),
            expires_in=body.get("expires_in"),
            token_type=body.get("token_type"),
            scope=body.get("scope"),
            raw=body,
        )

    async def test_token(self, access_token: str, store_id: str | None = None) -> dict:
        sid = store_id or "UE-STORE-001"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/stores/{sid}/menu",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        return {
            "ok": resp.status_code == 200,
            "status_code": resp.status_code,
            "endpoint": f"/stores/{sid}/menu",
        }

    # ── BaseConnector interface ──────────────────────────────
    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return bool(self.client_id() and self.client_secret())

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        if config.get("sandbox_mode"):
            orders = _load("ubereats_orders").get("orders", [])
            return FetchResult(records=orders, cursor=None, has_more=False, total_fetched=len(orders))
        access_token = config.get("access_token")
        store_id = config.get("store_id")
        if not access_token or not store_id:
            raise RuntimeError("UberEats fetch requires access_token and store_id")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/stores/{store_id}/orders",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"UberEats orders fetch failed: {resp.status_code}")
        body = resp.json()
        orders = body.get("orders", [])
        return FetchResult(records=orders, cursor=None, has_more=False, total_fetched=len(orders))

    async def fetch_menu(self, config: dict) -> dict:
        if config.get("sandbox_mode"):
            return _load("ubereats_menu")
        access_token = config.get("access_token")
        store_id = config.get("store_id")
        if not access_token or not store_id:
            raise RuntimeError("UberEats menu fetch requires access_token and store_id")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/stores/{store_id}/menu",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        return resp.json()

    def transform(self, raw_records: list[dict]) -> list[dict]:
        """注文を日別/store別に集約。"""
        # store_id (Uber内ID) → tenant 側 store_code はマッピングテーブルが要るが、
        # サンドボックスでは UE-STORE-001/002 → ST0001/ST0002 という規約に従う。
        store_code_map = {"UE-STORE-001": "ST0001", "UE-STORE-002": "ST0002"}
        agg: dict[tuple[str, str], dict] = defaultdict(lambda: {
            "delivery_sales": 0,
            "order_count": 0,
            "cancelled_count": 0,
        })
        for o in raw_records:
            placed = o.get("placed_at") or o.get("fulfilled_at") or ""
            biz_date = placed[:10] if placed else None
            ue_store = o.get("store_id", "")
            store_code = store_code_map.get(ue_store, ue_store)
            if not biz_date or not store_code:
                continue
            key = (store_code, biz_date)
            row = agg[key]
            if o.get("state") == "CANCELLED":
                row["cancelled_count"] += 1
                continue
            row["delivery_sales"] += int(o.get("total") or 0)
            row["order_count"] += 1
        return [
            {
                "store_code": store_code,
                "business_date": biz_date,
                "delivery_sales": v["delivery_sales"],
                "order_count": v["order_count"],
                "cancelled_count": v["cancelled_count"],
            }
            for (store_code, biz_date), v in agg.items()
        ]

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "id", "type": "string", "required": True},
                {"name": "store_id", "type": "string", "required": True},
                {"name": "placed_at", "type": "datetime", "required": True},
                {"name": "state", "type": "string", "required": True},
                {"name": "total", "type": "integer", "required": True},
                {"name": "items", "type": "array", "required": False},
            ],
            canonical_mapping={
                "store_id": "store_code",
                "total": "delivery_sales",
            },
        )

    # ── sync ─────────────────────────────────────────────────
    async def sync(
        self,
        db: AsyncSession,
        tenant_id: str,
        sandbox_mode: bool = True,
    ) -> dict:
        config = {"sandbox_mode": sandbox_mode}
        orders = await self.fetch(config)
        aggregated = self.transform(orders.records)

        batch = IngestionBatch(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            source_system=self.source_type,
            entity_type="ubereats_orders",
            status="processing",
            row_count=len(orders.records),
            valid_row_count=0,
            invalid_row_count=0,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(batch)
        await db.flush()

        # delivery_sales を daily_store_sales に upsert
        persisted = 0
        for rec in aggregated:
            store_id = (await db.execute(
                select(Store.id).where(
                    Store.code == rec["store_code"],
                    Store.tenant_id == tenant_id,
                )
            )).scalar_one_or_none()
            if not store_id:
                continue
            stmt = pg_insert(DailyStoreSales).values(
                tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                store_id=store_id,
                business_date=rec["business_date"],
                gross_sales=rec["delivery_sales"],
                net_sales=rec["delivery_sales"],
                customer_count=rec["order_count"],
                order_count=rec["order_count"],
                discount_amount=0,
                delivery_sales=rec["delivery_sales"],
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_daily_sales_store_date",
                set_={"delivery_sales": stmt.excluded.delivery_sales},
            )
            await db.execute(stmt)
            persisted += 1

        batch.valid_row_count = persisted
        batch.invalid_row_count = len(orders.records) - persisted
        batch.status = "completed"
        batch.validated_at = datetime.now(timezone.utc)
        batch.promoted_at = datetime.now(timezone.utc)
        await db.flush()

        return {
            "batch_id": str(batch.id),
            "orders_fetched": len(orders.records),
            "rows_persisted": persisted,
            "total_delivery_sales": sum(r["delivery_sales"] for r in aggregated),
            "status": batch.status,
        }
