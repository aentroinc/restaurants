"""Secrets backend — abstraction over env / Vault / SOPS-decrypted file.

Selection via SECRETS_BACKEND env var:
  - "env"   : read from os.environ (default)
  - "vault" : read from HashiCorp Vault KV v2 at VAULT_PATH_PREFIX/<key>
  - "sops"  : assumes SOPS already decrypted env vars at startup, reads env

Encryption helpers (encrypt_value / decrypt_value) remain Fernet-based for
short-lived secrets stored in DB rows (e.g. MFASecret.secret_encrypted).
"""
import os
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings


# ── Symmetric encryption (DB columns) ───────────────────────────

def _get_fernet():
    key = getattr(settings, "INGESTION_MASTER_KEY", None)
    if not key:
        # Derive a stable dev key from JWT secret. Production must set INGESTION_MASTER_KEY.
        import base64
        import hashlib
        digest = hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_value(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()


# ── Secret retrieval (config secrets) ───────────────────────────

class SecretNotFound(Exception):
    pass


def _get_from_env(key: str) -> str | None:
    return os.environ.get(key)


@lru_cache(maxsize=1)
def _vault_client():
    try:
        import hvac
    except ImportError as e:
        raise SecretNotFound("hvac not installed; pip install hvac") from e
    if not settings.VAULT_ADDR or not settings.VAULT_TOKEN:
        raise SecretNotFound("VAULT_ADDR and VAULT_TOKEN must be set")
    client = hvac.Client(url=settings.VAULT_ADDR, token=settings.VAULT_TOKEN)
    if not client.is_authenticated():
        raise SecretNotFound("Vault auth failed")
    return client


def _get_from_vault(key: str) -> str | None:
    client = _vault_client()
    path = f"{settings.VAULT_PATH_PREFIX}/{key}"
    try:
        # KV v2 secret read
        mount, _, sub = settings.VAULT_PATH_PREFIX.partition("/")
        resp = client.secrets.kv.v2.read_secret_version(
            mount_point=mount,
            path=f"{sub}/{key}" if sub else key,
        )
        return resp["data"]["data"].get("value")
    except Exception:
        return None


def get_secret(key: str, default: str | None = None) -> str | None:
    """Resolve a secret value via the configured backend.
    Always falls back to env if backend lookup fails."""
    backend = (settings.SECRETS_BACKEND or "env").lower()
    if backend == "vault":
        try:
            v = _get_from_vault(key)
            if v is not None:
                return v
        except SecretNotFound:
            pass
    return _get_from_env(key) or default
