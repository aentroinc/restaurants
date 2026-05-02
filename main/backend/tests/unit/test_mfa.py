"""Unit tests for MFA helpers."""
import pyotp

from app.services.auth.mfa import (
    consume_backup_code, decrypt_secret, encrypt_backup_codes, encrypt_secret,
    generate_backup_codes, generate_secret, provisioning_uri, verify_totp,
)


def test_generate_secret_format():
    s = generate_secret()
    assert len(s) >= 16
    assert s.isalnum()


def test_provisioning_uri_includes_issuer():
    s = generate_secret()
    uri = provisioning_uri(secret=s, account_name="test@aentro.jp")
    assert uri.startswith("otpauth://totp/")
    assert "AENTRO" in uri


def test_verify_totp_round_trip():
    s = generate_secret()
    code = pyotp.TOTP(s).now()
    assert verify_totp(s, code) is True


def test_verify_wrong_code_fails():
    s = generate_secret()
    assert verify_totp(s, "000000") is False
    assert verify_totp(s, "") is False


def test_encrypt_decrypt_secret_per_tenant():
    secret = "JBSWY3DPEHPK3PXP"
    enc = encrypt_secret("00000000-0000-0000-0000-000000000001", secret)
    assert enc != secret
    dec = decrypt_secret("00000000-0000-0000-0000-000000000001", enc)
    assert dec == secret


def test_backup_codes_consumable_once():
    tenant = "00000000-0000-0000-0000-000000000001"
    codes = generate_backup_codes(4)
    enc = encrypt_backup_codes(tenant, codes)
    ok, new_enc = consume_backup_code(tenant, enc, codes[0])
    assert ok is True
    # Same code again on the new ciphertext should fail
    ok2, _ = consume_backup_code(tenant, new_enc, codes[0])
    assert ok2 is False


def test_backup_invalid_code_returns_false():
    tenant = "00000000-0000-0000-0000-000000000001"
    enc = encrypt_backup_codes(tenant, ["AAAA1111", "BBBB2222"])
    ok, _ = consume_backup_code(tenant, enc, "ZZZZ9999")
    assert ok is False
