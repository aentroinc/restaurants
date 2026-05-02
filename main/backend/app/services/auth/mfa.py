"""TOTP MFA helpers (RFC 6238).

The TOTP secret is encrypted per-tenant via app.core.secrets so a leaked
DB row alone is not enough to bypass MFA. Backup codes are 8-character
base32 strings encrypted alongside.
"""
from __future__ import annotations

import json
import secrets
from typing import Iterable

import pyotp

from app.core.secrets import decrypt_for_tenant, encrypt_for_tenant


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(*, secret: str, account_name: str, issuer: str = "AENTRO") -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)


def verify_totp(secret: str, code: str, *, valid_window: int = 1) -> bool:
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(code, valid_window=valid_window)
    except Exception:
        return False


def generate_backup_codes(n: int = 8, length: int = 8) -> list[str]:
    return [secrets.token_hex(length // 2).upper() for _ in range(n)]


def encrypt_secret(tenant_id: str, secret: str) -> str:
    return encrypt_for_tenant(tenant_id, secret)


def decrypt_secret(tenant_id: str, ciphertext: str) -> str:
    raw = decrypt_for_tenant(tenant_id, ciphertext)
    return raw if isinstance(raw, str) else json.dumps(raw)


def encrypt_backup_codes(tenant_id: str, codes: Iterable[str]) -> str:
    return encrypt_for_tenant(tenant_id, list(codes))


def decrypt_backup_codes(tenant_id: str, ciphertext: str) -> list[str]:
    raw = decrypt_for_tenant(tenant_id, ciphertext)
    if isinstance(raw, list):
        return raw
    return []


def consume_backup_code(tenant_id: str, ciphertext: str, code: str) -> tuple[bool, str | None]:
    """Verify a single backup code. Returns (verified, new_ciphertext_or_None)."""
    codes = decrypt_backup_codes(tenant_id, ciphertext)
    target = code.strip().upper()
    if target in codes:
        codes.remove(target)
        return True, encrypt_backup_codes(tenant_id, codes)
    return False, None
