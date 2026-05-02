"""個人情報保護法 / GDPR 風 同意管理 API."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional, get_tenant_id
from app.database import get_db
from app.models.consent import ConsentRecord, ConsentTemplate, DataDeletionRequest
from app.schemas.common import APIResponse
from app.services import consent_engine, consent_seeds

router = APIRouter(prefix="/api/v1/consent", tags=["consent"])


# ---- schemas ----

class ConsentTemplateRead(BaseModel):
    id: UUID
    code: str
    version: int
    title: str
    body_md: str
    required_fields: list[str] = Field(default_factory=list)


class GrantBody(BaseModel):
    template_id: UUID
    scope: dict | None = None  # {face: true, ...}


class WithdrawBody(BaseModel):
    record_id: UUID


class DeletionRequestBody(BaseModel):
    scope: str = Field(default="all", pattern="^(all|face|personal|training)$")
    note: str | None = None


class ConsentRecordRead(BaseModel):
    id: UUID
    template_id: UUID
    template_code: str
    template_version: int
    granted_at: datetime
    withdrawn_at: datetime | None = None
    scope: dict


class DeletionRequestRead(BaseModel):
    id: UUID
    user_id: UUID
    requested_by: UUID
    requested_at: datetime
    scope: str
    status: str
    processed_at: datetime | None = None
    deletion_log: dict | None = None
    note: str | None = None


# ---- helpers ----

def _user_id(user: dict | None) -> UUID:
    if not user or not user.get("sub"):
        raise HTTPException(status_code=401, detail="authentication required")
    try:
        return UUID(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="invalid user id")


def _is_admin(user: dict | None) -> bool:
    role = (user or {}).get("role")
    return role in ("admin", "owner")


# ---- endpoints ----

@router.get("/templates", response_model=APIResponse[list[ConsentTemplateRead]])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    res = await db.execute(
        select(ConsentTemplate).where(ConsentTemplate.tenant_id == tenant_id).order_by(ConsentTemplate.code, ConsentTemplate.version)
    )
    rows = res.scalars().all()
    data = [
        ConsentTemplateRead(
            id=t.id, code=t.code, version=t.version, title=t.title, body_md=t.body_md,
            required_fields=list(t.required_fields_jsonb or []),
        )
        for t in rows
    ]
    return APIResponse(data=data)


@router.post("/seed", response_model=APIResponse[dict])
async def seed_templates(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """4テンプレ + 生体情報 marking を idempotent 投入."""
    tmpls = await consent_seeds.ensure_consent_templates(db, tenant_id)
    markings = await consent_seeds.ensure_biometric_markings(db, tenant_id)
    return APIResponse(data={"templates": tmpls, "markings": markings})


@router.get("/required", response_model=APIResponse[list[ConsentTemplateRead]])
async def required_consents(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    """ユーザに必要 (= 未取得 or 撤回済み) の同意テンプレ一覧."""
    if not user or not user.get("sub"):
        # 未ログインなら全テンプレを返す (LP / 仮ログイン用)
        res = await db.execute(
            select(ConsentTemplate).where(ConsentTemplate.tenant_id == tenant_id)
        )
        rows = res.scalars().all()
    else:
        user_id = UUID(user["sub"])
        recs = (await db.execute(
            select(ConsentRecord).where(
                ConsentRecord.tenant_id == tenant_id,
                ConsentRecord.user_id == user_id,
                ConsentRecord.withdrawn_at.is_(None),
            )
        )).scalars().all()
        granted_codes = {r.template_code for r in recs}

        all_tmpls = (await db.execute(
            select(ConsentTemplate).where(ConsentTemplate.tenant_id == tenant_id)
        )).scalars().all()
        # code 単位で最新 version のみ
        latest_by_code: dict[str, ConsentTemplate] = {}
        for t in all_tmpls:
            cur = latest_by_code.get(t.code)
            if cur is None or t.version > cur.version:
                latest_by_code[t.code] = t
        rows = [t for code, t in latest_by_code.items() if code not in granted_codes]

    data = [
        ConsentTemplateRead(
            id=t.id, code=t.code, version=t.version, title=t.title, body_md=t.body_md,
            required_fields=list(t.required_fields_jsonb or []),
        )
        for t in rows
    ]
    return APIResponse(data=data)


@router.post("/grant", response_model=APIResponse[ConsentRecordRead])
async def grant(
    body: GrantBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    user_id = _user_id(user)
    ip = request.client.host if request.client else None
    try:
        rec = await consent_engine.record_consent(
            db, UUID(tenant_id), user_id, body.template_id, body.scope, ip
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=_record_dict(rec))


@router.post("/withdraw", response_model=APIResponse[ConsentRecordRead])
async def withdraw(
    body: WithdrawBody,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    user_id = _user_id(user)
    rec = await consent_engine.withdraw(db, body.record_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="record not found")
    if rec.user_id != user_id and not _is_admin(user):
        raise HTTPException(status_code=403, detail="cannot withdraw other user's consent")
    return APIResponse(data=_record_dict(rec))


@router.get("/my-consents", response_model=APIResponse[list[ConsentRecordRead]])
async def my_consents(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    user_id = _user_id(user)
    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.tenant_id == tenant_id,
            ConsentRecord.user_id == user_id,
        ).order_by(ConsentRecord.granted_at.desc())
    )
    rows = res.scalars().all()
    return APIResponse(data=[_record_dict(r) for r in rows])


@router.post("/deletion-request", response_model=APIResponse[DeletionRequestRead])
async def create_deletion_request(
    body: DeletionRequestBody,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    user_id = _user_id(user)
    req = DataDeletionRequest(
        tenant_id=UUID(tenant_id),
        user_id=user_id,
        requested_by=user_id,
        scope=body.scope,
        status="pending",
        note=body.note,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return APIResponse(data=_deletion_dict(req))


@router.get("/deletion-requests", response_model=APIResponse[list[DeletionRequestRead]])
async def list_deletion_requests(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="admin only")
    res = await db.execute(
        select(DataDeletionRequest).where(
            DataDeletionRequest.tenant_id == tenant_id
        ).order_by(DataDeletionRequest.requested_at.desc())
    )
    rows = res.scalars().all()
    return APIResponse(data=[_deletion_dict(r) for r in rows])


@router.post("/deletion-requests/{request_id}/process", response_model=APIResponse[DeletionRequestRead])
async def process_deletion_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="admin only")
    processor_id = _user_id(user)
    try:
        req = await consent_engine.process_deletion(db, request_id, processor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=_deletion_dict(req))


@router.post("/deletion-requests/{request_id}/reject", response_model=APIResponse[DeletionRequestRead])
async def reject_deletion_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="admin only")
    res = await db.execute(
        select(DataDeletionRequest).where(DataDeletionRequest.id == request_id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="request not found")
    req.status = "rejected"
    req.processor_id = _user_id(user)
    await db.commit()
    await db.refresh(req)
    return APIResponse(data=_deletion_dict(req))


# ---- serialize helpers ----

def _record_dict(r: ConsentRecord) -> ConsentRecordRead:
    return ConsentRecordRead(
        id=r.id,
        template_id=r.template_id,
        template_code=r.template_code,
        template_version=r.template_version,
        granted_at=r.granted_at,
        withdrawn_at=r.withdrawn_at,
        scope=dict(r.scope_jsonb or {}),
    )


def _deletion_dict(r: DataDeletionRequest) -> DeletionRequestRead:
    return DeletionRequestRead(
        id=r.id,
        user_id=r.user_id,
        requested_by=r.requested_by,
        requested_at=r.requested_at,
        scope=r.scope,
        status=r.status,
        processed_at=r.processed_at,
        deletion_log=dict(r.deletion_log_jsonb or {}) if r.deletion_log_jsonb else None,
        note=r.note,
    )
