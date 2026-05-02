"""Smaregi OAuth2 (developer sandbox).

Smaregi uses a contract_id-scoped OAuth2 flow.
Authorize:  https://id.smaregi.dev/authorize
Token:      https://id.smaregi.dev/authorize/token
"""
from __future__ import annotations

import httpx

from app.connectors.oauth_base import OAuth2ConnectorBase


class SmaregiOAuth(OAuth2ConnectorBase):
    connector_type = "smaregi"
    authorize_endpoint = "https://id.smaregi.dev/authorize"
    token_endpoint = "https://id.smaregi.dev/authorize/token"
    default_scope = "openid pos.transactions:read pos.stores:read"
    use_pkce = True
    client_id_env = "SMAREGI_SANDBOX_CLIENT_ID"
    client_secret_env = "SMAREGI_SANDBOX_CLIENT_SECRET"
    redirect_uri_env = "SMAREGI_SANDBOX_REDIRECT_URI"
    use_basic_auth_for_token = True
    api_base = "https://api.smaregi.dev"

    async def test_token(self, access_token: str, contract_id: str | None = None) -> dict:
        # Smaregi keeps API endpoints under /{contract_id}/pos/...
        path = f"/{contract_id}/pos/stores" if contract_id else "/pos/stores"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}{path}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
        return {
            "ok": resp.status_code == 200,
            "status_code": resp.status_code,
            "endpoint": path,
        }
