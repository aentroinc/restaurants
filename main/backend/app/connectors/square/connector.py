"""Square POS connector (sandbox stub mode)."""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.connectors.base import BaseConnector, CanonicalRecord, ConnectorRegistry, FetchResult
from app.connectors.square.transform import transform_orders


def _stub_orders():
    now = datetime.now(timezone.utc) - timedelta(hours=12)
    return [
        {
            "id": "sq-order-1",
            "location_id": "sq-loc-001",
            "created_at": now.isoformat(),
            "net_amounts": {"total_money": {"amount": 1500, "currency": "JPY"}},
            "guests_count": 1,
            "line_items": [
                {"catalog_object_id": "sq-prod-1", "name": "コーヒー", "quantity": 1, "base_price_money": {"amount": 500}},
                {"catalog_object_id": "sq-prod-2", "name": "サンドイッチ", "quantity": 1, "base_price_money": {"amount": 1000}},
            ],
        },
    ]


@ConnectorRegistry.register
class SquareConnector(BaseConnector):
    id = "square"
    display_name = "Square POS"
    auth_type = "oauth2"
    target_tables = ("daily_sales", "hourly_sales", "product_sales")

    @staticmethod
    def _is_stub_mode() -> bool:
        return not os.environ.get("SQUARE_APPLICATION_ID")

    async def test_connection(self) -> bool:
        if self._is_stub_mode():
            return True
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(
                    "https://connect.squareupsandbox.com/v2/locations",
                    headers={
                        "Authorization": f"Bearer {self.credentials.get('access_token','')}",
                        "Square-Version": "2024-04-17",
                    },
                )
                return r.status_code == 200
        except Exception:
            return False

    async def fetch(
        self, *, since: datetime | None = None, cursor: str | None = None, limit: int = 500,
    ) -> FetchResult:
        if self._is_stub_mode():
            return FetchResult(raw_records=_stub_orders(), next_cursor=None)
        try:
            import httpx
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.post(
                    "https://connect.squareupsandbox.com/v2/orders/search",
                    headers={
                        "Authorization": f"Bearer {self.credentials.get('access_token','')}",
                        "Square-Version": "2024-04-17",
                    },
                    json={
                        "location_ids": self.config.get("location_ids", []),
                        "limit": limit,
                        "cursor": cursor,
                    },
                )
                if r.status_code != 200:
                    return FetchResult(error=f"square: HTTP {r.status_code}")
                body = r.json()
                return FetchResult(
                    raw_records=body.get("orders", []),
                    next_cursor=body.get("cursor"),
                )
        except Exception as e:
            return FetchResult(error=str(e))

    def transform(self, raw_records: Iterable[dict]) -> list[CanonicalRecord]:
        return transform_orders(raw_records)

    @staticmethod
    def verify_webhook(*, signature_header: str, body: bytes, secret: str, url: str = "") -> bool:
        """HMAC-SHA256 verification for Square webhooks.

        Square signs `url + body` with the webhook secret. The header is
        a base64-encoded SHA256 HMAC. We accept both raw-body and
        url+body to be permissive across versions.
        """
        if not signature_header or not secret:
            return False
        import base64
        expected_a = base64.b64encode(
            hmac.new(secret.encode(), body, hashlib.sha256).digest()
        ).decode()
        expected_b = base64.b64encode(
            hmac.new(secret.encode(), (url.encode() + body), hashlib.sha256).digest()
        ).decode()
        return hmac.compare_digest(signature_header, expected_a) or hmac.compare_digest(signature_header, expected_b)
