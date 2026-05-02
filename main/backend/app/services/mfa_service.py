import pyotp
import secrets
import json
import hashlib
import hmac
from app.config import settings


def _derive_key() -> bytes:
    return hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()


def encrypt(plaintext: str) -> str:
    key = _derive_key()
    tag = hmac.new(key, plaintext.encode(), hashlib.sha256).hexdigest()[:16]
    import base64
    encoded = base64.b64encode(plaintext.encode()).decode()
    return f"{tag}:{encoded}"


def decrypt(ciphertext: str) -> str:
    import base64
    _, encoded = ciphertext.split(":", 1)
    return base64.b64decode(encoded).decode()


def enroll_mfa(user_email: str) -> dict:
    secret = pyotp.random_base32()
    backup_codes = [secrets.token_urlsafe(6) for _ in range(10)]
    qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_email, issuer_name="AENTRO"
    )
    return {
        "secret": secret,
        "qr_uri": qr_uri,
        "backup_codes": backup_codes,
    }


def verify_totp(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=1)
