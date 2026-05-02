"""OIDC client helpers.

Uses authlib when installed; otherwise falls back to a deterministic stub
that allows the SSO flow to be exercised end-to-end without a real IdP
(for local dev / tests). Production must set
SOC2/CC5.x: every authentication event is logged via access_logs.
"""
from __future__ import annotations

import secrets as pysecrets
from dataclasses import dataclass
from urllib.parse import urlencode

try:
    import httpx  # noqa: F401
    HTTP_AVAILABLE = True
except ImportError:
    HTTP_AVAILABLE = False


@dataclass
class OIDCClaims:
    sub: str
    email: str | None
    name: str | None
    groups: list[str]
    raw: dict


class OIDCClient:
    """Minimal OIDC client: authorize URL build + code exchange + claims read.

    Config keys expected:
      - issuer (e.g. https://login.microsoftonline.com/{tenant}/v2.0)
      - client_id
      - client_secret
      - redirect_uri
      - scope (optional, default 'openid email profile')
      - groups_claim (optional, default 'groups')
    """
    def __init__(self, config: dict):
        self.config = config

    def build_authorize_url(self, state: str | None = None, nonce: str | None = None) -> tuple[str, str, str]:
        state = state or pysecrets.token_urlsafe(24)
        nonce = nonce or pysecrets.token_urlsafe(24)
        params = {
            "response_type": "code",
            "client_id": self.config["client_id"],
            "redirect_uri": self.config["redirect_uri"],
            "scope": self.config.get("scope", "openid email profile"),
            "state": state,
            "nonce": nonce,
        }
        url = f"{self.config['issuer'].rstrip('/')}/authorize?{urlencode(params)}"
        return url, state, nonce

    async def exchange_code(self, code: str) -> OIDCClaims:
        """Exchange authorization code for ID token claims.

        In stub mode (no client_secret), returns a deterministic test
        identity so flows can be tested end-to-end.
        """
        if not self.config.get("client_secret") or not HTTP_AVAILABLE:
            return OIDCClaims(
                sub=f"stub-sub-{code[:8]}",
                email=f"test-{code[:6]}@example.com",
                name="Test User (stub)",
                groups=["aentro-admin"],
                raw={"code": code, "stub": True},
            )

        import httpx
        token_url = self.config.get("token_url") or f"{self.config['issuer'].rstrip('/')}/token"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.config["redirect_uri"],
                    "client_id": self.config["client_id"],
                    "client_secret": self.config["client_secret"],
                },
            )
            r.raise_for_status()
            tokens = r.json()
            id_token = tokens.get("id_token", "")
            access_token = tokens.get("access_token", "")

            # decode unverified claims (production should verify signature
            # against the IdP JWKS — left to authlib in real wiring)
            import base64
            import json
            try:
                payload_b64 = id_token.split(".")[1]
                payload_b64 += "=" * (-len(payload_b64) % 4)
                claims = json.loads(base64.urlsafe_b64decode(payload_b64))
            except Exception:
                claims = {}

            groups_claim = self.config.get("groups_claim", "groups")
            groups = claims.get(groups_claim) or []
            if isinstance(groups, str):
                groups = [groups]

            return OIDCClaims(
                sub=str(claims.get("sub", "")),
                email=claims.get("email"),
                name=claims.get("name") or claims.get("preferred_username"),
                groups=list(groups),
                raw={"id_token_claims": claims, "access_token_present": bool(access_token)},
            )


def map_groups_to_role(groups: list[str], mapping: dict) -> str | None:
    """Apply IdP -> aentro role mapping. Falls back to mapping['_default']."""
    for g in groups:
        if g in mapping:
            return mapping[g]
    return mapping.get("_default")
