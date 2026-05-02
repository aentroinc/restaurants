"""OAuth flow E2E (sandboxed) — exercises authorize → callback → test → sync.

We do NOT hit external services; httpx.AsyncClient is patched to return the
fixtures in `app/connectors/sandbox/`.

The DB layer is also avoided: we unit-test the OAuth helpers and the
connector_secrets encryption round-trip directly. The full HTTP route
exercise lives in the integration suite (test_api.py)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "app" / "connectors" / "sandbox"


def _fx(name: str) -> dict:
    with (FIXTURE_DIR / f"{name}.json").open() as f:
        return json.load(f)


# ── pure helpers (no DB) ────────────────────────────────────────

def test_pkce_pair_format():
    from app.connectors.oauth_base import gen_pkce_pair
    verifier, challenge = gen_pkce_pair()
    assert len(verifier) > 32
    assert len(challenge) > 32
    assert "=" not in challenge  # base64url stripped


def test_state_uniqueness():
    from app.connectors.oauth_base import gen_state
    s1, s2 = gen_state(), gen_state()
    assert s1 != s2 and len(s1) > 16


def test_square_authorize_url_shape(monkeypatch):
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_ID", "sq-cid")
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_SECRET", "sq-secret")
    monkeypatch.setenv("SQUARE_SANDBOX_REDIRECT_URI", "http://localhost:8000/cb")
    from app.connectors.oauth_square import SquareOAuth
    impl = SquareOAuth()
    url = impl.build_authorize_url(state="STATE123")
    assert url.startswith("https://connect.squareupsandbox.com/oauth2/authorize?")
    assert "client_id=sq-cid" in url
    assert "state=STATE123" in url
    assert "response_type=code" in url


def test_smaregi_authorize_url_with_pkce(monkeypatch):
    monkeypatch.setenv("SMAREGI_SANDBOX_CLIENT_ID", "sm-cid")
    monkeypatch.setenv("SMAREGI_SANDBOX_CLIENT_SECRET", "sm-secret")
    monkeypatch.setenv("SMAREGI_SANDBOX_REDIRECT_URI", "http://localhost:8000/cb")
    from app.connectors.oauth_smaregi import SmaregiOAuth
    from app.connectors.oauth_base import gen_pkce_pair
    impl = SmaregiOAuth()
    _, challenge = gen_pkce_pair()
    url = impl.build_authorize_url(state="ST", code_challenge=challenge)
    assert "code_challenge=" in url and "code_challenge_method=S256" in url


# ── token exchange (httpx mocked) ──────────────────────────────

class _FakeResp:
    def __init__(self, status_code: int, body: dict):
        self.status_code = status_code
        self._body = body
        self.text = json.dumps(body)
        self.headers = {"content-type": "application/json"}

    def json(self):
        return self._body


class _FakeAsyncClient:
    """Drop-in replacement for httpx.AsyncClient context manager."""
    def __init__(self, response: _FakeResp):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, *a, **kw):
        return self._response

    async def get(self, *a, **kw):
        return self._response


@pytest.mark.asyncio
async def test_square_exchange_code_parses_tokens(monkeypatch):
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_ID", "sq-cid")
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_SECRET", "sq-secret")
    monkeypatch.setenv("SQUARE_SANDBOX_REDIRECT_URI", "http://localhost:8000/cb")
    from app.connectors import oauth_base
    from app.connectors.oauth_square import SquareOAuth

    body = _fx("square_token_response")
    fake_client = _FakeAsyncClient(_FakeResp(200, body))
    monkeypatch.setattr(oauth_base.httpx, "AsyncClient", lambda timeout=15.0: fake_client)

    impl = SquareOAuth()
    tokens = await impl.exchange_code(code="auth-code-from-callback")
    assert tokens.access_token.endswith("-SANDBOX")
    assert tokens.refresh_token is not None
    assert tokens.merchant_id == "MLSANDBOX0000001"
    assert tokens.scope and "ORDERS_READ" in tokens.scope


@pytest.mark.asyncio
async def test_smaregi_exchange_uses_basic_auth(monkeypatch):
    monkeypatch.setenv("SMAREGI_SANDBOX_CLIENT_ID", "sm-cid")
    monkeypatch.setenv("SMAREGI_SANDBOX_CLIENT_SECRET", "sm-secret")
    monkeypatch.setenv("SMAREGI_SANDBOX_REDIRECT_URI", "http://localhost:8000/cb")
    from app.connectors import oauth_base
    from app.connectors.oauth_smaregi import SmaregiOAuth

    captured = {}

    class _Capture(_FakeAsyncClient):
        async def post(self, url, **kw):
            captured["url"] = url
            captured["kwargs"] = kw
            return self._response

    fake = _Capture(_FakeResp(200, _fx("smaregi_token_response")))
    monkeypatch.setattr(oauth_base.httpx, "AsyncClient", lambda timeout=15.0: fake)

    impl = SmaregiOAuth()
    tokens = await impl.exchange_code(code="abc", code_verifier="ver-12345")
    assert tokens.access_token.startswith("smaregi-sandbox-access-token")
    assert tokens.contract_id == "scid000001"
    # Smaregi uses Basic auth → kwargs should contain `auth`, not client_id in body
    assert "auth" in captured["kwargs"]
    assert "client_id" not in captured["kwargs"]["data"]
    assert captured["kwargs"]["data"]["code_verifier"] == "ver-12345"


@pytest.mark.asyncio
async def test_square_test_token_calls_merchants_me(monkeypatch):
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_ID", "x")
    monkeypatch.setenv("SQUARE_SANDBOX_CLIENT_SECRET", "y")
    from app.connectors import oauth_square
    from app.connectors.oauth_square import SquareOAuth

    fake = _FakeAsyncClient(_FakeResp(200, _fx("square_merchants_me")))
    monkeypatch.setattr(oauth_square.httpx, "AsyncClient", lambda timeout=10.0: fake)
    impl = SquareOAuth()
    result = await impl.test_token("access-tok")
    assert result["ok"] is True
    assert result["endpoint"] == "/v2/merchants/me"


@pytest.mark.asyncio
async def test_kot_test_credentials_handles_failure(monkeypatch):
    from app.connectors import oauth_kot
    from app.connectors.oauth_kot import KOTAPIKey

    fake = _FakeAsyncClient(_FakeResp(401, {"error": "unauthorized"}))
    monkeypatch.setattr(oauth_kot.httpx, "AsyncClient", lambda timeout=10.0: fake)
    impl = KOTAPIKey()
    result = await impl.test_credentials("bad-key")
    assert result["ok"] is False
    assert result["status_code"] == 401


# ── credential encryption round-trip (no DB) ───────────────────

def test_encrypt_decrypt_credential_payload():
    from app.services.secrets import encrypt_value, decrypt_value
    plain = "smaregi-sandbox-access-token-0000000000"
    enc = encrypt_value(plain)
    assert enc != plain
    assert decrypt_value(enc) == plain


def test_connector_credential_model_columns():
    from app.models.connector_credential import ConnectorCredential
    cols = {c.name for c in ConnectorCredential.__table__.columns}
    expected = {
        "tenant_id", "connector_type", "auth_type",
        "access_token_enc", "refresh_token_enc",
        "api_key_enc", "api_secret_enc",
        "expires_at", "state_token", "code_verifier",
        "merchant_id", "contract_id", "status", "last_error",
    }
    assert expected <= cols


# ── router wiring smoke ────────────────────────────────────────

def test_oauth_router_registers_routes():
    from app.api.v1.oauth import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/oauth/{connector}/authorize" in paths
    assert "/api/v1/oauth/{connector}/callback" in paths
    assert "/api/v1/oauth/{connector}/test" in paths
    assert "/api/v1/oauth/{connector}/sync" in paths
    assert "/api/v1/oauth/{connector}/api-key" in paths
    assert "/api/v1/oauth/{connector}/status" in paths


def test_oauth_provider_registry():
    from app.api.v1.oauth import OAUTH_PROVIDERS, API_KEY_PROVIDERS
    assert "square" in OAUTH_PROVIDERS
    assert "smaregi" in OAUTH_PROVIDERS
    assert "airregi" in API_KEY_PROVIDERS
    assert "king_of_time" in API_KEY_PROVIDERS


def test_sandbox_fixtures_load():
    from app.connectors.sandbox import load_fixture
    sq = load_fixture("square_token_response")
    assert "access_token" in sq
    sm = load_fixture("smaregi_token_response")
    assert sm["contract_id"] == "scid000001"
