"""Square OAuth (sandbox).

Docs: https://developer.squareup.com/docs/oauth-api/overview
Sandbox endpoints: https://connect.squareupsandbox.com
"""
from __future__ import annotations

import httpx

from app.connectors.oauth_base import OAuth2ConnectorBase


class SquareOAuth(OAuth2ConnectorBase):
    connector_type = "square"
    authorize_endpoint = "https://connect.squareupsandbox.com/oauth2/authorize"
    token_endpoint = "https://connect.squareupsandbox.com/oauth2/token"
    default_scope = "MERCHANT_PROFILE_READ ORDERS_READ PAYMENTS_READ"
    use_pkce = False
    client_id_env = "SQUARE_SANDBOX_CLIENT_ID"
    client_secret_env = "SQUARE_SANDBOX_CLIENT_SECRET"
    redirect_uri_env = "SQUARE_SANDBOX_REDIRECT_URI"
    # Square wants client_id/client_secret in the JSON body, not Basic auth.
    use_basic_auth_for_token = False
    api_base = "https://connect.squareupsandbox.com"

    async def test_token(self, access_token: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/v2/merchants/me",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Square-Version": "2024-09-19",
                    "Accept": "application/json",
                },
            )
        return {
            "ok": resp.status_code == 200,
            "status_code": resp.status_code,
            "endpoint": "/v2/merchants/me",
            "body": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else None,
        }
