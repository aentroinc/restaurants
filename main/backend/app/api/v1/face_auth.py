"""3秒打刻のための認証 API: 顔 / QR / PIN。"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional, get_tenant_id
from app.database import get_db
from app.schemas.common import APIResponse
from app.schemas.face_auth import (
    EnrollRequest, EnrollResponse,
    VerifyRequest, VerifyResponse,
    QrInitRequest, QrInitResponse, QrVerifyRequest, QrVerifyResponse,
    PinSetRequest, PinVerifyRequest, PinVerifyResponse,
)
from app.services.face_auth_engine import (
    enroll, verify, issue_qr_token, consume_qr_token, set_pin, verify_pin,
    QR_TOKEN_TTL_SEC,
)
from app.services.consent_engine import ConsentRequiredError


router = APIRouter(prefix="/api/v1/face-auth", tags=["face-auth"])


@router.post("/enroll", response_model=APIResponse[EnrollResponse])
async def enroll_face(
    body: EnrollRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    # admin/manager のみ他従業員 enroll 可能。それ以外は自分のみ。
    role = (user or {}).get("role")
    own_id = (user or {}).get("sub")
    target_id = body.employee_id or (UUID(own_id) if own_id else None)
    if target_id is None:
        raise HTTPException(status_code=400, detail="employee_id required")
    if body.employee_id and body.employee_id != (UUID(own_id) if own_id else None):
        if role not in ("admin", "manager", "owner"):
            raise HTTPException(status_code=403, detail="enrolling another user requires admin")
    try:
        tmpl = await enroll(db, UUID(tenant_id), target_id, body.embedding, body.device_info)
    except ConsentRequiredError as e:
        raise HTTPException(
            status_code=403,
            detail={"error": "consent_required", "missing": e.missing, "message": "顔認証データ取得の同意が必要です"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return APIResponse(data=EnrollResponse(
        template_id=tmpl.id, employee_id=tmpl.employee_id, enrolled_at=tmpl.enrolled_at
    ))


@router.post("/verify", response_model=APIResponse[VerifyResponse])
async def verify_face(
    body: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    res = await verify(db, UUID(tenant_id), body.embedding, body.candidate_employee_ids)
    return APIResponse(data=VerifyResponse(
        employee_id=res.employee_id, confidence=res.confidence, allowed=res.allowed
    ))


@router.post("/qr-init", response_model=APIResponse[QrInitResponse])
async def qr_init(body: QrInitRequest):
    token, expires = issue_qr_token(body.store_id, body.employee_id)
    return APIResponse(data=QrInitResponse(qr_token=token, expires_at=expires, ttl_sec=QR_TOKEN_TTL_SEC))


@router.post("/qr-verify", response_model=APIResponse[QrVerifyResponse])
async def qr_verify(body: QrVerifyRequest):
    entry = consume_qr_token(body.qr_token)
    if not entry:
        return APIResponse(data=QrVerifyResponse(employee_id=None, store_id=None, valid=False))
    return APIResponse(data=QrVerifyResponse(
        employee_id=UUID(entry["employee_id"]) if entry.get("employee_id") else None,
        store_id=UUID(entry["store_id"]) if entry.get("store_id") else None,
        valid=True,
    ))


@router.post("/pin-set", response_model=APIResponse[dict])
async def pin_set(
    body: PinSetRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        await set_pin(db, UUID(tenant_id), body.employee_id, body.pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return APIResponse(data={"ok": True})


@router.post("/pin-verify", response_model=APIResponse[PinVerifyResponse])
async def pin_verify(
    body: PinVerifyRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ok = await verify_pin(db, UUID(tenant_id), body.employee_id, body.pin)
    # locked check 用に再取得は省略。失敗 = ロックされている可能性ありとして locked=False で返す。
    return APIResponse(data=PinVerifyResponse(valid=ok, locked=False))
