"""KING OF TIME — API key auth wrapper.

KOT uses an `Authorization: Bearer <ACCESS_TOKEN>` style API key.
Reference: https://developer.kingoftime.jp/
"""
from __future__ import annotations

import httpx

from app.services.secrets import get_secret


class KOTAPIKey:
    connector_type = "king_of_time"
    auth_type = "api_key"
    api_base = "https://api.kingtime.jp/v1.0"
    api_key_env = "KOT_SANDBOX_API_TOKEN"

    def env_api_key(self) -> str | None:
        return get_secret(self.api_key_env)

    async def test_credentials(self, api_key: str, api_secret: str | None = None) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.api_base}/companies",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Accept": "application/json",
                    },
                )
            return {
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
                "endpoint": "/companies",
            }
        except httpx.HTTPError as e:
            return {"ok": False, "status_code": 0, "error": str(e)[:200]}
