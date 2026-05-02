"""Generic OAuth2 Authorization Code flow scaffolding.

Concrete connector classes subclass `OAuth2ConnectorBase` and override the
provider-specific URLs / client credentials. The flow:

  1. authorize_url() -> URL to redirect the user to (state + optional PKCE).
  2. exchange_code(code) -> POST to token_url, returns tokens.
  3. refresh(refresh_token) -> POST refresh_token grant.

All HTTP is via httpx so tests can monkeypatch `httpx.AsyncClient`.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
import urllib.parse
from dataclasses import dataclass

import httpx

from app.services.secrets import get_secret


@dataclass
class OAuthTokens:
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
    token_type: str | None = None
    scope: str | None = None
    merchant_id: str | None = None
    contract_id: str | None = None
    raw: dict | None = None


def gen_state() -> str:
    return secrets.token_urlsafe(24)


def gen_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) using S256."""
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


class OAuth2ConnectorBase:
    """Provider-agnostic OAuth2 helper. Subclasses override the env-var keys
    and provider URLs."""

    connector_type: str = ""
    authorize_endpoint: str = ""
    token_endpoint: str = ""
    default_scope: str = ""
    use_pkce: bool = False
    client_id_env: str = ""
    client_secret_env: str = ""
    redirect_uri_env: str = ""
    # If true, send client_id/client_secret as Basic auth header in token POST.
    use_basic_auth_for_token: bool = False

    # ── credential resolution ────────────────────────────────────
    def client_id(self) -> str:
        v = get_secret(self.client_id_env)
        if not v:
            raise RuntimeError(f"{self.client_id_env} is not set")
        return v

    def client_secret(self) -> str:
        v = get_secret(self.client_secret_env)
        if not v:
            raise RuntimeError(f"{self.client_secret_env} is not set")
        return v

    def redirect_uri(self) -> str:
        v = get_secret(self.redirect_uri_env)
        if not v:
            # Fall back to a sane default for local dev.
            return f"http://localhost:8000/api/v1/oauth/{self.connector_type}/callback"
        return v

    # ── flow steps ───────────────────────────────────────────────
    def build_authorize_url(
        self,
        state: str,
        code_challenge: str | None = None,
        scope: str | None = None,
        extra: dict | None = None,
    ) -> str:
        params: dict[str, str] = {
            "client_id": self.client_id(),
            "redirect_uri": self.redirect_uri(),
            "response_type": "code",
            "scope": scope or self.default_scope,
            "state": state,
        }
        if self.use_pkce and code_challenge:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"
        if extra:
            params.update(extra)
        return f"{self.authorize_endpoint}?{urllib.parse.urlencode(params)}"

    def _token_request_kwargs(
        self,
        data: dict,
    ) -> dict:
        kwargs: dict = {"data": data, "headers": {"Accept": "application/json"}}
        if self.use_basic_auth_for_token:
            kwargs["auth"] = (self.client_id(), self.client_secret())
        else:
            data["client_id"] = self.client_id()
            data["client_secret"] = self.client_secret()
        return kwargs

    async def exchange_code(
        self,
        code: str,
        code_verifier: str | None = None,
    ) -> OAuthTokens:
        data: dict[str, str] = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri(),
        }
        if self.use_pkce and code_verifier:
            data["code_verifier"] = code_verifier
        kwargs = self._token_request_kwargs(data)

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.token_endpoint, **kwargs)
        if resp.status_code >= 400:
            raise RuntimeError(f"Token exchange failed ({resp.status_code}): {resp.text[:300]}")
        return self._parse_token_response(resp.json())

    async def refresh(self, refresh_token: str) -> OAuthTokens:
        data: dict[str, str] = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        kwargs = self._token_request_kwargs(data)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.token_endpoint, **kwargs)
        if resp.status_code >= 400:
            raise RuntimeError(f"Token refresh failed ({resp.status_code}): {resp.text[:300]}")
        return self._parse_token_response(resp.json())

    def _parse_token_response(self, body: dict) -> OAuthTokens:
        return OAuthTokens(
            access_token=body.get("access_token", ""),
            refresh_token=body.get("refresh_token"),
            expires_in=body.get("expires_in"),
            token_type=body.get("token_type"),
            scope=body.get("scope"),
            merchant_id=body.get("merchant_id"),
            contract_id=body.get("contract_id"),
            raw=body,
        )

    async def test_token(self, access_token: str) -> dict:
        """Hit a low-cost provider endpoint to verify the access token works.
        Subclasses should override; default just returns ok."""
        return {"ok": True, "endpoint": "noop"}
