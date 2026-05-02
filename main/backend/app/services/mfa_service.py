"""MFA service — Fernet (AES-128-CBC + HMAC) encryption with key rotation"""
import base64
import hashlib
import json
import secrets

import pyotp

from app.config import settings


def _derive_master_key() -> bytes:
    """INGESTION_MASTER_KEY が設定されてればそれを、なければ JWT_SECRET_KEY から導出"""
    raw = settings.INGESTION_MASTER_KEY or settings.JWT_SECRET_KEY
    digest = hashlib.sha256(raw.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet():
    try:
        from cryptography.fernet import Fernet, MultiFernet
    except ImportError:
        return None
    keys = settings.INGESTION_MASTER_KEY.split(",") if settings.INGESTION_MASTER_KEY else []
    fernets = []
    for k in keys:
        try:
            fernets.append(Fernet(k.strip().encode()))
        except Exception:
            continue
    if not fernets:
        fernets = [Fernet(_derive_master_key())]
    return MultiFernet(fernets) if len(fernets) > 1 else fernets[0]


def encrypt(plaintext: str) -> str:
    """Fernet で暗号化、URL-safe base64 文字列を返す"""
    f = _get_fernet()
    if f is None:
        # cryptography 未 install のフォールバック（**本番では使わない**）
        return _legacy_encrypt(plaintext)
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    f = _get_fernet()
    if f is None:
        return _legacy_decrypt(ciphertext)
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:
        # 旧形式（base64+HMAC tag）からの後方互換
        return _legacy_decrypt(ciphertext)


def _legacy_encrypt(plaintext: str) -> str:
    """旧 base64+HMAC 形式（脆弱、互換のため残す）"""
    import hmac
    key = hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()
    tag = hmac.new(key, plaintext.encode(), hashlib.sha256).hexdigest()[:16]
    encoded = base64.b64encode(plaintext.encode()).decode()
    return f"legacy::{tag}:{encoded}"


def _legacy_decrypt(ciphertext: str) -> str:
    if ciphertext.startswith("legacy::"):
        ciphertext = ciphertext[len("legacy::"):]
    if ":" in ciphertext:
        _, encoded = ciphertext.split(":", 1)
        return base64.b64decode(encoded).decode()
    raise ValueError("Cannot decrypt: unknown format")


def is_legacy_format(ciphertext: str) -> bool:
    """migration job が旧形式を検出するため"""
    return ciphertext.startswith("legacy::") or (":" in ciphertext and not ciphertext.startswith("gAAAA"))


def enroll_mfa(user_email: str) -> dict:
    secret = pyotp.random_base32()
    backup_codes = [secrets.token_urlsafe(6) for _ in range(10)]
    qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_email, issuer_name="AENTRO"
    )
    return {
        "secret": secret,
        "secret_encrypted": encrypt(secret),
        "qr_uri": qr_uri,
        "backup_codes": backup_codes,
        "backup_codes_encrypted": encrypt(json.dumps(backup_codes)),
    }


def verify_totp(secret_encrypted: str, code: str) -> bool:
    secret = decrypt(secret_encrypted)
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def consume_backup_code(backup_codes_encrypted: str, code: str) -> tuple[bool, str | None]:
    """backup code を1つ使用、新 ciphertext を返す（失敗時 None）"""
    try:
        codes = json.loads(decrypt(backup_codes_encrypted))
    except Exception:
        return (False, None)
    if code not in codes:
        return (False, None)
    codes.remove(code)
    return (True, encrypt(json.dumps(codes)))


def rotate_secret(old_ciphertext: str) -> str:
    """key rotation: 旧 cipher を decrypt → 新 fernet で再暗号化"""
    plain = decrypt(old_ciphertext)
    return encrypt(plain)
