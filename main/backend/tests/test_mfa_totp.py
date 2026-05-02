"""MFA TOTP enroll + verify tests."""
import json

import pyotp
import pytest


def test_enroll_mfa_returns_secret_and_qr():
    from app.services.mfa_service import enroll_mfa, decrypt
    enrollment = enroll_mfa("user@example.com")
    assert enrollment["secret"]
    assert enrollment["qr_uri"].startswith("otpauth://totp/")
    assert len(enrollment["backup_codes"]) == 10
    assert decrypt(enrollment["secret_encrypted"]) == enrollment["secret"]
    decrypted_codes = json.loads(decrypt(enrollment["backup_codes_encrypted"]))
    assert decrypted_codes == enrollment["backup_codes"]


def test_verify_totp_correct_code():
    from app.services.mfa_service import enroll_mfa, verify_totp
    enrollment = enroll_mfa("user@example.com")
    code = pyotp.TOTP(enrollment["secret"]).now()
    assert verify_totp(enrollment["secret_encrypted"], code) is True


def test_verify_totp_wrong_code():
    from app.services.mfa_service import enroll_mfa, verify_totp
    enrollment = enroll_mfa("user@example.com")
    assert verify_totp(enrollment["secret_encrypted"], "000000") is False


def test_consume_backup_code_once():
    from app.services.mfa_service import enroll_mfa, consume_backup_code, decrypt
    enrollment = enroll_mfa("user@example.com")
    code = enrollment["backup_codes"][0]
    ok, new_cipher = consume_backup_code(enrollment["backup_codes_encrypted"], code)
    assert ok is True
    remaining = json.loads(decrypt(new_cipher))
    assert code not in remaining
    # second consume should fail
    ok2, _ = consume_backup_code(new_cipher, code)
    assert ok2 is False


def test_rotate_secret_preserves_plaintext():
    from app.services.mfa_service import encrypt, rotate_secret, decrypt
    original = "JBSWY3DPEHPK3PXP"
    cipher = encrypt(original)
    rotated = rotate_secret(cipher)
    assert decrypt(rotated) == original


def test_mfa_failure_counter_module_present():
    from app.services.mfa_service import _MFA_FAILURES, MFA_MAX_FAILURES
    assert MFA_MAX_FAILURES == 3
    assert isinstance(_MFA_FAILURES, dict)
