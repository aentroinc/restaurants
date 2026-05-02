"""Foundry-style marking ACL API."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id, get_current_user_optional
from app.models.marking import Marking, MarkingAssignment, UserPurpose
from app.services.marking_engine import get_active_purpose
from app.services import marking_seeds

router = APIRouter(prefix="/api/v1/markings", tags=["markings"])


# ── Markings ──────────────────────────────────────────────

@router.get("")
async def list_markings(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(Marking).where(Marking.tenant_id == tenant_id).order_by(Marking.code)
    )).scalars().all()
    return {"data": [_marking_dict(m) for m in rows]}


@router.post("", status_code=201)
async def create_marking(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = Marking(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        code=body["code"],
        display_name=body["display_name"],
        description=body.get("description"),
        level=body.get("level", "medium"),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _marking_dict(obj)}


@router.post("/seed")
async def seed_standard(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """標準 5 marking + 標準 column 紐付けを idempotent に投入."""
    code_map = await marking_seeds.ensure_standard_markings(db, tenant_id)
    added = await marking_seeds.ensure_standard_assignments(db, tenant_id)
    return {"data": {"markings": code_map, "assignments_added": added}}


# ── Assignments ───────────────────────────────────────────

@router.get("/assignments")
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(MarkingAssignment, Marking.code, Marking.display_name, Marking.level)
        .join(Marking, Marking.id == MarkingAssignment.marking_id)
        .where(MarkingAssignment.tenant_id == tenant_id)
        .order_by(MarkingAssignment.resource_type)
    )
    rows = (await db.execute(q)).all()
    data = []
    for asn, code, name, level in rows:
        data.append({
            "id": str(asn.id),
            "resource_type": asn.resource_type,
            "resource_id": asn.resource_id,
            "column_name": asn.column_name,
            "marking_code": code,
            "marking_display_name": name,
            "marking_level": level,
        })
    return {"data": data}


@router.post("/assign", status_code=201)
async def assign_marking(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """{ resource_type, resource_id?, column?, marking_code } で marking を付与."""
    code = body["marking_code"]
    m = (await db.execute(
        select(Marking).where(Marking.tenant_id == tenant_id, Marking.code == code)
    )).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail=f"Marking not found: {code}")

    obj = MarkingAssignment(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        marking_id=m.id,
        resource_type=body["resource_type"],
        resource_id=body.get("resource_id"),
        column_name=body.get("column"),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": {
        "id": str(obj.id),
        "resource_type": obj.resource_type,
        "resource_id": obj.resource_id,
        "column_name": obj.column_name,
        "marking_code": code,
    }}


@router.delete("/assign/{assignment_id}", status_code=204)
async def unassign_marking(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = (await db.execute(
        select(MarkingAssignment).where(
            MarkingAssignment.id == assignment_id,
            MarkingAssignment.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(obj)
    await db.commit()


# ── Purpose Tokens ────────────────────────────────────────

@router.post("/purpose/grant", status_code=201)
async def grant_purpose(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    """{ user_id, purpose_token, markings: [], ttl_minutes } で purpose を付与."""
    user_id = body["user_id"]
    purpose_token = body["purpose_token"]
    ttl_minutes = int(body.get("ttl_minutes", 60))

    markings = body.get("markings")
    if markings is None:
        markings = marking_seeds.STANDARD_PURPOSES.get(purpose_token, [])

    obj = UserPurpose(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        user_id=uuid.UUID(user_id),
        purpose_token=purpose_token,
        granted_markings=list(markings),
        valid_from=datetime.now(timezone.utc),
        valid_to=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        granted_by=uuid.UUID(user["sub"]) if user and user.get("sub") else None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _purpose_dict(obj)}


@router.get("/my-purpose")
async def get_my_purpose(
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    user_id = user.get("sub") if user else None
    return {"data": await get_active_purpose(db, user_id)}


@router.get("/purpose/{user_id}")
async def list_user_purposes(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(UserPurpose).where(
            UserPurpose.tenant_id == tenant_id,
            UserPurpose.user_id == user_id,
        ).order_by(UserPurpose.valid_from.desc())
    )).scalars().all()
    return {"data": [_purpose_dict(r) for r in rows]}


# ── helpers ───────────────────────────────────────────────

def _marking_dict(m: Marking) -> dict:
    return {
        "id": str(m.id),
        "code": m.code,
        "display_name": m.display_name,
        "description": m.description,
        "level": m.level,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _purpose_dict(p: UserPurpose) -> dict:
    return {
        "id": str(p.id),
        "user_id": str(p.user_id),
        "purpose_token": p.purpose_token,
        "granted_markings": p.granted_markings or [],
        "valid_from": p.valid_from.isoformat() if p.valid_from else None,
        "valid_to": p.valid_to.isoformat() if p.valid_to else None,
        "granted_by": str(p.granted_by) if p.granted_by else None,
    }
