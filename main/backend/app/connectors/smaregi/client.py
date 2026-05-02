"""Thin async HTTP client for Smaregi Platform API.

Adds:
  - Bearer auth
  - Exponential backoff on 429 / 5xx
  - Retry-After honoring
  - Stub mode (returns deterministic fixtures when no credentials)
"""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger("aentro.smaregi")


def _is_stub_mode() -> bool:
    return not settings.SMAREGI_CLIENT_ID


def _stub_response(path: str, params: dict | None) -> dict:
    """Deterministic sandbox response for tests / demos.

    Returns shapes consistent with Smaregi API to exercise transform code.
    """
    if path.startswith("/pos/transactions"):
        from datetime import datetime, timezone, timedelta
        d = datetime.now(timezone.utc) - timedelta(days=1)
        return {
            "results": [
                {
                    "transactionHeadId": "tx-001",
                    "transactionDateTime": d.isoformat(),
                    "storeId": "store-001",
                    "subtotal": 1200,
                    "taxInclude": 1320,
                    "customers": 1,
                    "details": [
                        {"productId": "p-001", "productName": "牛丼並", "salesPrice": 400, "quantity": 1},
                        {"productId": "p-002", "productName": "味噌汁", "salesPrice": 100, "quantity": 1},
                    ],
                }
            ],
            "next": None,
        }
    if path.startswith("/pos/stores"):
        return {
            "results": [
                {"storeId": "store-001", "storeName": "新宿店", "displayCode": "001"},
            ],
            "next": None,
        }
    if path.startswith("/pos/products"):
        return {
            "results": [
                {"productId": "p-001", "productName": "牛丼並", "price": 400, "categoryName": "丼物"},
            ],
            "next": None,
        }
    return {"results": [], "next": None}


class SmaregiClient:
    def __init__(self, access_token: str, contract_id: str | None = None):
        self.access_token = access_token
        self.contract_id = contract_id

    async def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        max_retries: int = 5,
    ) -> dict:
        if _is_stub_mode():
            return _stub_response(path, params)

        url = f"{settings.SMAREGI_API_BASE}{path}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "X-contract-id": self.contract_id or "",
            "Accept": "application/json",
        }
        attempt = 0
        backoff = 1.0
        async with httpx.AsyncClient(timeout=60) as client:
            while True:
                attempt += 1
                try:
                    r = await client.get(url, headers=headers, params=params or {})
                except httpx.HTTPError as e:
                    if attempt >= max_retries:
                        raise
                    await asyncio.sleep(backoff + random.random() * 0.5)
                    backoff = min(backoff * 2, 60)
                    continue

                if r.status_code == 429 or 500 <= r.status_code < 600:
                    if attempt >= max_retries:
                        r.raise_for_status()
                    retry_after = float(r.headers.get("Retry-After", backoff))
                    await asyncio.sleep(retry_after + random.random() * 0.3)
                    backoff = min(backoff * 2, 60)
                    continue

                r.raise_for_status()
                return r.json()
