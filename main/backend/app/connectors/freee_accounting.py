"""freee 会計 connector — OAuth2 Authorization Code flow。

Endpoints:
  - GET  https://api.freee.co.jp/api/1/companies
  - GET  https://api.freee.co.jp/api/1/deals      (取引)
  - GET  https://api.freee.co.jp/api/1/journals   (仕訳)

env:
  - FREEE_CLIENT_ID
  - FREEE_CLIENT_SECRET
  - FREEE_REDIRECT_URI
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import BaseConnector, ConnectorSchema, FetchResult
from app.connectors.oauth_base import OAuth2ConnectorBase
from app.models.ingestion import IngestionBatch

_SANDBOX_DIR = Path(__file__).parent / "sandbox"


def _load(name: str) -> Any:
    with (_SANDBOX_DIR / f"{name}.json").open() as f:
        return json.load(f)


class FreeeAccounting(OAuth2ConnectorBase, BaseConnector):
    """freee 会計 connector. OAuth2 + 仕入(deals/journals) 取得 + sync。"""

    name = "freee 会計"
    source_type = "freee"
    connector_type = "freee"
    auth_type = "oauth2"
    system_category = "accounting"
    api_base = "https://api.freee.co.jp/api/1"

    authorize_endpoint = "https://accounts.secure.freee.co.jp/public_api/authorize"
    token_endpoint = "https://accounts.secure.freee.co.jp/public_api/token"
    default_scope = "read write"
    use_pkce = False
    client_id_env = "FREEE_CLIENT_ID"
    client_secret_env = "FREEE_CLIENT_SECRET"
    redirect_uri_env = "FREEE_REDIRECT_URI"
    use_basic_auth_for_token = False

    # 仕入勘定科目 (freee デフォルト)
    PURCHASE_ACCOUNT_ITEM_IDS = {605}  # 仕入高

    async def test_token(self, access_token: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/companies",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
        return {
            "ok": resp.status_code == 200,
            "status_code": resp.status_code,
            "endpoint": "/companies",
        }

    # ── BaseConnector interface ──────────────────────────────
    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return False

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        """Fetch deals (取引)。"""
        if config.get("sandbox_mode"):
            deals = _load("freee_deals").get("deals", [])
            return FetchResult(records=deals, cursor=None, has_more=False, total_fetched=len(deals))
        access_token = config.get("access_token")
        company_id = config.get("company_id")
        if not access_token or not company_id:
            raise RuntimeError("freee fetch requires access_token and company_id")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/deals",
                params={"company_id": company_id, "type": "expense", "limit": limit},
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"freee deals fetch failed: {resp.status_code}")
        body = resp.json()
        deals = body.get("deals", [])
        return FetchResult(records=deals, cursor=None, has_more=False, total_fetched=len(deals))

    async def fetch_companies(self, config: dict) -> list[dict]:
        if config.get("sandbox_mode"):
            return _load("freee_companies").get("companies", [])
        access_token = config.get("access_token")
        if not access_token:
            raise RuntimeError("freee fetch_companies requires access_token")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/companies",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        return resp.json().get("companies", [])

    async def fetch_journals(self, config: dict) -> dict:
        if config.get("sandbox_mode"):
            return _load("freee_journals")
        access_token = config.get("access_token")
        company_id = config.get("company_id")
        if not access_token or not company_id:
            raise RuntimeError("freee journals fetch requires access_token and company_id")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/journals",
                params={"company_id": company_id, "download_type": "csv"},
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
        return resp.json()

    def transform(self, raw_records: list[dict]) -> list[dict]:
        out = []
        for d in raw_records:
            issue_date = d.get("issue_date")
            partner = d.get("partner_name")
            for det in d.get("details") or []:
                if det.get("account_item_id") not in self.PURCHASE_ACCOUNT_ITEM_IDS:
                    continue
                out.append({
                    "deal_id": d.get("id"),
                    "issue_date": issue_date,
                    "partner_name": partner,
                    "amount": int(det.get("amount") or 0),
                    "description": det.get("description"),
                    "account_item": det.get("account_item_name"),
                    "ref_number": d.get("ref_number"),
                })
        return out

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "id", "type": "integer", "required": True},
                {"name": "issue_date", "type": "date", "required": True},
                {"name": "partner_name", "type": "string", "required": False},
                {"name": "amount", "type": "integer", "required": True},
                {"name": "details", "type": "array", "required": True},
            ],
            canonical_mapping={
                "issue_date": "purchase_date",
                "partner_name": "supplier_name",
                "amount": "purchase_amount",
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
        deals = await self.fetch(config)
        purchases = self.transform(deals.records)

        batch = IngestionBatch(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            source_system=self.source_type,
            entity_type="freee_deals",
            status="processing",
            row_count=len(deals.records),
            valid_row_count=len(purchases),
            invalid_row_count=len(deals.records) - len(purchases),
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(batch)
        await db.flush()

        batch.status = "completed"
        batch.validated_at = datetime.now(timezone.utc)
        batch.promoted_at = datetime.now(timezone.utc)
        await db.flush()

        return {
            "batch_id": str(batch.id),
            "deals_fetched": len(deals.records),
            "purchases_extracted": len(purchases),
            "total_purchase_amount": sum(p["amount"] for p in purchases),
            "status": batch.status,
        }
