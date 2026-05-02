"""Per-tenant secret encryption using Fernet (AES-128-CBC + HMAC).

The master key comes from settings.CONNECTOR_MASTER_KEY (a urlsafe-base64 32-byte
key). For production this should come from KMS / Vault — see roadmap doc 06.
"""
from __future__ import annotations

import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _derive_key(tenant_id: str) -> bytes:
    """Derive a per-tenant Fernet key from the master key + tenant id."""
    master = settings.CONNECTOR_MASTER_KEY.encode()
    h = hashlib.sha256(master + b":" + tenant_id.encode()).digest()
    return base64.urlsafe_b64encode(h)


def encrypt_for_tenant(tenant_id: str, plaintext: dict | str) -> str:
    if isinstance(plaintext, dict):
        plaintext = json.dumps(plaintext)
    f = Fernet(_derive_key(tenant_id))
    return f.encrypt(plaintext.encode()).decode()


def decrypt_for_tenant(tenant_id: str, ciphertext: str) -> dict | str:
    f = Fernet(_derive_key(tenant_id))
    try:
        raw = f.decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Invalid token (wrong tenant or rotated key)") from e
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw
