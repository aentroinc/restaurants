from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, AccessScope
from app.models.auth_enterprise import MFASecret
from app.auth import (
    verify_password, create_access_token, get_current_user,
    SECRET_KEY, ALGORITHM,
)
from app.services.lockout_service import check_lockout, record_attempt, MFA_REQUIRED_ROLES
from app.services.mfa_service import enroll_mfa, verify_totp, encrypt, decrypt
from jose import jwt, JWTError
import json

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEMO_EMAILS = {"admin@aentro.jp", "sv@aentro.jp", "manager@aentro.jp"}

MFA_TOKEN_EXPIRE_MINUTES = 5


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MFARequiredResponse(BaseModel):
    mfa_required: bool = True
    mfa_token: str


class MFALoginRequest(BaseModel):
    mfa_token: str
    code: str


class MFAEnrollResponse(BaseModel):
    qr_uri: str
    backup_codes: list[str]


class MFAVerifyRequest(BaseModel):
    code: str


def _create_mfa_token(user_id: str, tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "tenant_id": tenant_id, "purpose": "mfa", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_mfa_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "mfa":
            raise HTTPException(status_code=401, detail="Invalid MFA token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired MFA token")


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    if await check_lockout(db, body.email):
        raise HTTPException(
            status_code=429,
            detail="アカウントがロックされています。30分後にお試しください。",
        )

    result = await db.execute(
        select(User).where(User.email == body.email, User.active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        await record_attempt(db, body.email, False, reason="user_not_found")
        try:
            from app.middleware.metrics import inc_login_failure
            inc_login_failure()
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_demo = body.email in DEMO_EMAILS
    if not is_demo:
        if not user.password_hash or not verify_password(body.password, user.password_hash):
            await record_attempt(db, body.email, False, tenant_id=user.tenant_id, reason="bad_password")
            try:
                from app.middleware.metrics import inc_login_failure
                inc_login_failure()
            except Exception:
                pass
            raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if MFA is required for this role
    if user.role in MFA_REQUIRED_ROLES:
        mfa_q = await db.execute(
            select(MFASecret).where(MFASecret.user_id == user.id)
        )
        mfa_secret = mfa_q.scalar_one_or_none()
        if mfa_secret:
            mfa_token = _create_mfa_token(str(user.id), str(user.tenant_id))
            return {"mfa_required": True, "mfa_token": mfa_token}

    await record_attempt(db, body.email, True, tenant_id=user.tenant_id)

    scopes_q = await db.execute(
        select(AccessScope).where(AccessScope.user_id == user.id)
    )
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]

    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login/mfa")
async def login_mfa(body: MFALoginRequest, db: AsyncSession = Depends(get_db)):
    payload = _decode_mfa_token(body.mfa_token)
    user_id = payload["sub"]

    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    mfa_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user.id))
    mfa_rec = mfa_q.scalar_one_or_none()
    if not mfa_rec:
        raise HTTPException(status_code=400, detail="MFA not enrolled")

    secret = decrypt(mfa_rec.secret_encrypted)

    if verify_totp(secret, body.code):
        mfa_rec.last_used_at = datetime.now(timezone.utc)
        await db.commit()
    else:
        # Check backup codes
        if mfa_rec.backup_codes_encrypted:
            codes = json.loads(decrypt(mfa_rec.backup_codes_encrypted))
            if body.code in codes:
                codes.remove(body.code)
                mfa_rec.backup_codes_encrypted = encrypt(json.dumps(codes))
                await db.commit()
            else:
                await record_attempt(db, user.email, False, tenant_id=user.tenant_id, reason="bad_mfa_code")
                raise HTTPException(status_code=401, detail="Invalid MFA code")
        else:
            await record_attempt(db, user.email, False, tenant_id=user.tenant_id, reason="bad_mfa_code")
            raise HTTPException(status_code=401, detail="Invalid MFA code")

    await record_attempt(db, user.email, True, tenant_id=user.tenant_id)

    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/mfa/enroll", response_model=MFAEnrollResponse)
async def mfa_enroll(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = user["sub"]
    existing = await db.execute(select(MFASecret).where(MFASecret.user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="MFA already enrolled")

    user_q = await db.execute(select(User).where(User.id == user_id))
    u = user_q.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    enrollment = enroll_mfa(u.email)
    db.add(MFASecret(
        user_id=u.id,
        secret_encrypted=encrypt(enrollment["secret"]),
        method="totp",
        backup_codes_encrypted=encrypt(json.dumps(enrollment["backup_codes"])),
    ))
    await db.commit()
    return MFAEnrollResponse(qr_uri=enrollment["qr_uri"], backup_codes=enrollment["backup_codes"])


@router.post("/mfa/verify")
async def mfa_verify(body: MFAVerifyRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = user["sub"]
    mfa_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user_id))
    mfa_rec = mfa_q.scalar_one_or_none()
    if not mfa_rec:
        raise HTTPException(status_code=400, detail="MFA not enrolled")

    secret = decrypt(mfa_rec.secret_encrypted)
    if not verify_totp(secret, body.code):
        # Check backup codes
        if mfa_rec.backup_codes_encrypted:
            codes = json.loads(decrypt(mfa_rec.backup_codes_encrypted))
            if body.code in codes:
                codes.remove(body.code)
                mfa_rec.backup_codes_encrypted = encrypt(json.dumps(codes))
                await db.commit()
                return {"verified": True, "via": "backup"}
        raise HTTPException(status_code=401, detail="Invalid MFA code")

    mfa_rec.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    return {"verified": True, "via": "totp"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["sub"],
        "tenant_id": user["tenant_id"],
        "role": user["role"],
        "scopes": user.get("scopes", []),
    }


# ---------- v2 login flow (MFA-aware, two-step) ----------


class LoginV2Response(BaseModel):
    mfa_required: bool = False
    mfa_token: Optional[str] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"


@router.post("/login_v2", response_model=LoginV2Response)
async def login_v2(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Step 1: password. If MFA enrolled → return short-lived mfa_token; else issue full JWT."""
    if await check_lockout(db, body.email):
        raise HTTPException(status_code=429, detail="account locked, retry in 30 minutes")

    result = await db.execute(
        select(User).where(User.email == body.email, User.active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        await record_attempt(db, body.email, False, reason="user_not_found")
        try:
            from app.middleware.metrics import inc_login_failure
            inc_login_failure()
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_demo = body.email in DEMO_EMAILS
    if not is_demo:
        if not user.password_hash or not verify_password(body.password, user.password_hash):
            await record_attempt(db, body.email, False, tenant_id=user.tenant_id, reason="bad_password")
            try:
                from app.middleware.metrics import inc_login_failure
                inc_login_failure()
            except Exception:
                pass
            raise HTTPException(status_code=401, detail="Invalid credentials")

    mfa_q = await db.execute(select(MFASecret).where(MFASecret.user_id == user.id))
    mfa_secret = mfa_q.scalar_one_or_none()

    if mfa_secret:
        mfa_token = _create_mfa_token(str(user.id), str(user.tenant_id))
        return LoginV2Response(mfa_required=True, mfa_token=mfa_token)

    await record_attempt(db, body.email, True, tenant_id=user.tenant_id)
    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return LoginV2Response(mfa_required=False, access_token=token)


@router.post("/mfa/verify_token", response_model=TokenResponse)
async def mfa_verify_token(body: MFALoginRequest, db: AsyncSession = Depends(get_db)):
    """Step 2: exchange mfa_token + TOTP/backup code → full JWT.

    Distinct from `/mfa/verify` (which only confirms a logged-in user's code).
    """
    payload = _decode_mfa_token(body.mfa_token)
    user_id = payload["sub"]

    user_q = await db.execute(select(User).where(User.id == user_id))
    user = user_q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    from app.services.mfa_service import verify_totp_for_user, MFAError
    try:
        ok = await verify_totp_for_user(db, str(user.id), body.code)
    except MFAError as e:
        raise HTTPException(status_code=401, detail=str(e))
    if not ok:
        await record_attempt(db, user.email, False, tenant_id=user.tenant_id, reason="bad_mfa_code")
        raise HTTPException(status_code=401, detail="Invalid MFA code")

    await record_attempt(db, user.email, True, tenant_id=user.tenant_id)
    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return TokenResponse(access_token=token)
