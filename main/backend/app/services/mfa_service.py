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


# ---------- High-level enroll/verify (DB-backed) ----------

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auth_enterprise import MFASecret
from app.models.user import User

# in-process MFA failure counter: user_id -> count
_MFA_FAILURES: dict[str, int] = {}
MFA_MAX_FAILURES = 3


class MFAError(Exception):
    pass


async def enroll_totp(db: AsyncSession, user_id: str) -> dict:
    """Generate TOTP secret + otpauth URL, persist encrypted secret."""
    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise MFAError("user not found")

    existing_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user.id))
    existing = existing_q.scalar_one_or_none()
    if existing:
        raise MFAError("MFA already enrolled")

    enrollment = enroll_mfa(user.email)
    db.add(MFASecret(
        user_id=user.id,
        secret_encrypted=encrypt(enrollment["secret"]),
        method="totp",
        backup_codes_encrypted=encrypt(json.dumps(enrollment["backup_codes"])),
    ))
    await db.commit()
    return {
        "otpauth_url": enrollment["qr_uri"],
        "secret": enrollment["secret"],
        "backup_codes": enrollment["backup_codes"],
    }


async def verify_totp_for_user(db: AsyncSession, user_id: str, code: str) -> bool:
    """Verify TOTP code with 30-sec window. After 3 failures → trigger lockout."""
    mfa_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user_id))
    rec = mfa_q.scalar_one_or_none()
    if not rec:
        raise MFAError("MFA not enrolled")

    if verify_totp(rec.secret_encrypted, code):
        rec.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        _MFA_FAILURES.pop(user_id, None)
        return True

    # backup code fallback
    if rec.backup_codes_encrypted:
        ok, new_cipher = consume_backup_code(rec.backup_codes_encrypted, code)
        if ok and new_cipher:
            rec.backup_codes_encrypted = new_cipher
            rec.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            _MFA_FAILURES.pop(user_id, None)
            return True

    _MFA_FAILURES[user_id] = _MFA_FAILURES.get(user_id, 0) + 1
    if _MFA_FAILURES[user_id] >= MFA_MAX_FAILURES:
        # Trigger account lock via lockout_service
        try:
            from datetime import timedelta
            from app.models.auth_enterprise import AccountLock
            lock = AccountLock(
                user_id=user_id,
                locked_until=datetime.now(timezone.utc) + timedelta(minutes=30),
                reason="too_many_mfa_failures",
            )
            await db.merge(lock)
            await db.commit()
        except Exception:
            pass
        _MFA_FAILURES.pop(user_id, None)
        raise MFAError("too many failures, account locked")
    return False


# ---------- WebAuthn (FIDO2) ----------

# Per-user challenge cache for registration / authentication
_WEBAUTHN_CHALLENGES: dict[str, str] = {}


def _webauthn_available() -> bool:
    try:
        import webauthn  # noqa: F401
        return True
    except ImportError:
        return False


async def enroll_webauthn(db: AsyncSession, user_id: str, rp_id: str = "localhost", rp_name: str = "AENTRO") -> dict:
    """Generate registration options. Returns options dict for the browser."""
    if not _webauthn_available():
        raise MFAError("webauthn package not installed")

    from webauthn import generate_registration_options, options_to_json

    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise MFAError("user not found")

    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_id=str(user.id).encode(),
        user_name=user.email,
        user_display_name=user.name,
    )
    # cache challenge for verification
    _WEBAUTHN_CHALLENGES[str(user.id)] = base64.urlsafe_b64encode(options.challenge).decode().rstrip("=")
    return json.loads(options_to_json(options))


async def verify_webauthn(db: AsyncSession, user_id: str, credential: dict, rp_id: str = "localhost", origin: str = "http://localhost:3000") -> bool:
    """Verify WebAuthn registration response and persist credential as MFA secret."""
    if not _webauthn_available():
        raise MFAError("webauthn package not installed")

    from webauthn import verify_registration_response
    from webauthn.helpers.structs import RegistrationCredential

    challenge_b64 = _WEBAUTHN_CHALLENGES.pop(user_id, None)
    if not challenge_b64:
        raise MFAError("no pending webauthn challenge")

    try:
        verification = verify_registration_response(
            credential=RegistrationCredential.parse_obj(credential)
            if hasattr(RegistrationCredential, "parse_obj")
            else credential,
            expected_challenge=base64.urlsafe_b64decode(challenge_b64 + "=="),
            expected_origin=origin,
            expected_rp_id=rp_id,
        )
    except Exception as e:
        raise MFAError(f"webauthn verification failed: {e}")

    # Persist credential id + public key (encrypted) as MFA record
    cred_payload = json.dumps({
        "credential_id": base64.urlsafe_b64encode(verification.credential_id).decode(),
        "public_key": base64.urlsafe_b64encode(verification.credential_public_key).decode(),
        "sign_count": verification.sign_count,
    })
    user_uuid = uuid_from_str(user_id)
    existing_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user_uuid))
    existing = existing_q.scalar_one_or_none()
    if existing:
        existing.secret_encrypted = encrypt(cred_payload)
        existing.method = "webauthn"
    else:
        db.add(MFASecret(
            user_id=user_uuid,
            secret_encrypted=encrypt(cred_payload),
            method="webauthn",
        ))
    await db.commit()
    return True


def uuid_from_str(s):
    import uuid as _uuid
    if isinstance(s, _uuid.UUID):
        return s
    return _uuid.UUID(s)

