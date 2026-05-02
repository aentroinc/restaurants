"""Airレジ wrapper — API key style.

Recruit / Airレジ does not currently expose a public OAuth2 sandbox.
We model it as an API key + secret (CSV bridge / Airレジ Web Service partner key).
"""
from __future__ import annotations

import httpx

from app.services.secrets import get_secret


class AirregiAPIKey:
    connector_type = "airregi"
    auth_type = "api_key"
    api_base = "https://airregi.jp/api/sandbox"
    api_key_env = "AIRREGI_SANDBOX_API_KEY"
    api_secret_env = "AIRREGI_SANDBOX_API_SECRET"

    def env_api_key(self) -> str | None:
        return get_secret(self.api_key_env)

    def env_api_secret(self) -> str | None:
        return get_secret(self.api_secret_env)

    async def test_credentials(self, api_key: str, api_secret: str | None = None) -> dict:
        """Hit a low-cost shop list endpoint with the supplied key."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.api_base}/shops",
                    headers={
                        "X-Airregi-Api-Key": api_key,
                        "X-Airregi-Api-Secret": api_secret or "",
                        "Accept": "application/json",
                    },
                )
            return {
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
                "endpoint": "/shops",
            }
        except httpx.HTTPError as e:
            return {"ok": False, "status_code": 0, "error": str(e)[:200]}
