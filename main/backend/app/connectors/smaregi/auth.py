"""Smaregi Platform API OAuth2 helpers.

Documentation: https://www1.smaregi.dev/apidoc/

Notes:
  - Authorization Code grant with PKCE recommended in production
  - Tokens scoped per contract; refresh expires after rotation policy
  - When SMAREGI_CLIENT_ID is empty, every helper returns deterministic
    sandbox-friendly stubs so unit tests can exercise the flow.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from app.config import settings


@dataclass
class TokenSet:
    access_token: str
    refresh_token: str | None
    expires_at: datetime
    token_type: str = "Bearer"
    scope: str | None = None


def _is_stub_mode() -> bool:
    return not settings.SMAREGI_CLIENT_ID or not settings.SMAREGI_CLIENT_SECRET


def build_authorize_url(*, contract_id: str, redirect_uri: str, scope: str = "pos.transactions:read pos.products:read pos.stores:read", state: str | None = None) -> tuple[str, str]:
    state = state or secrets.token_urlsafe(24)
    params = {
        "response_type": "code",
        "client_id": settings.SMAREGI_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": state,
        "contract_id": contract_id,
    }
    return f"{settings.SMAREGI_AUTH_BASE}/authorize?{urlencode(params)}", state


async def exchange_code(code: str, *, contract_id: str, redirect_uri: str) -> TokenSet:
    if _is_stub_mode():
        return TokenSet(
            access_token=f"stub-access-{code[:8]}",
            refresh_token=f"stub-refresh-{code[:8]}",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            scope="pos.transactions:read",
        )
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{settings.SMAREGI_AUTH_BASE}/access_tokens",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.SMAREGI_CLIENT_ID,
                "client_secret": settings.SMAREGI_CLIENT_SECRET,
                "contract_id": contract_id,
            },
        )
        r.raise_for_status()
        data = r.json()
        return TokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600)),
            scope=data.get("scope"),
        )


async def refresh_token(refresh: str, *, contract_id: str) -> TokenSet:
    if _is_stub_mode():
        return TokenSet(
            access_token=f"stub-refreshed-{refresh[:6]}",
            refresh_token=refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{settings.SMAREGI_AUTH_BASE}/access_tokens",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh,
                "client_id": settings.SMAREGI_CLIENT_ID,
                "client_secret": settings.SMAREGI_CLIENT_SECRET,
                "contract_id": contract_id,
            },
        )
        r.raise_for_status()
        data = r.json()
        return TokenSet(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600)),
        )
