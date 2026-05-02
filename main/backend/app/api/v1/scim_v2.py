"""SCIM v2 (RFC 7644) endpoints — Users.

Auth: Bearer token compared to settings.SCIM_TOKEN (env var SCIM_TOKEN).
Tenant: derived from the SCIM token (must be configured per tenant) — for now
all tokens map to the auth context's tenant via JWT or fall back to demo tenant.
"""
from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import DEMO_TENANT_ID
from app.database import get_db
from app.middleware.tenant import get_tenant_id_from_context
from app.models.user import User
from app.services.scim import (
    USER_SCHEMA,
    apply_patch_ops,
    list_response,
    parse_filter,
    scim_error,
    scim_to_user_fields,
    user_to_scim,
)

router = APIRouter(prefix="/scim/v2", tags=["scim"])


def _get_scim_token() -> str | None:
    return os.getenv("SCIM_TOKEN")


async def scim_auth(authorization: str | None = Header(default=None)) -> str:
    expected = _get_scim_token()
    if not expected:
        raise HTTPException(status_code=503, detail="SCIM not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    if authorization[7:].strip() != expected:
        raise HTTPException(status_code=401, detail="invalid SCIM token")
    return authorization[7:].strip()


def _resolve_tenant() -> str:
    tid = get_tenant_id_from_context()
    return tid or DEMO_TENANT_ID


@router.get("/Users")
async def list_users(
    request: Request,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
    startIndex: int = Query(1, ge=1),
    count: int = Query(100, ge=0, le=500),
    filter: str | None = Query(None),
):
    tenant_id = _resolve_tenant()
    stmt = select(User).where(User.tenant_id == tenant_id)
    parsed = parse_filter(filter)
    if parsed:
        attr, value = parsed
        if attr.lower() == "username":
            stmt = stmt.where(User.email == value)
        elif attr.lower() == "active":
            stmt = stmt.where(User.active == (str(value).lower() == "true"))

    total_q = await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    total = total_q.scalar() or 0

    stmt = stmt.offset(startIndex - 1).limit(count)
    res = await db.execute(stmt)
    users = res.scalars().all()
    body = list_response([user_to_scim(u) for u in users], total=total, start=startIndex, count=count)
    return JSONResponse(content=body, media_type="application/scim+json")


@router.get("/Users/{user_id}")
async def get_user(
    user_id: uuid.UUID,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = _resolve_tenant()
    res = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = res.scalar_one_or_none()
    if not user:
        return JSONResponse(
            status_code=404,
            content=scim_error("user not found", 404),
            media_type="application/scim+json",
        )
    return JSONResponse(content=user_to_scim(user), media_type="application/scim+json")


@router.post("/Users", status_code=201)
async def create_user(
    request: Request,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.json()
    if USER_SCHEMA not in payload.get("schemas", []):
        return JSONResponse(
            status_code=400,
            content=scim_error("schemas must include core:2.0:User", 400, "invalidSyntax"),
            media_type="application/scim+json",
        )
    fields = scim_to_user_fields(payload)
    if "email" not in fields:
        return JSONResponse(
            status_code=400,
            content=scim_error("userName/emails required", 400, "invalidValue"),
            media_type="application/scim+json",
        )
    tenant_id = _resolve_tenant()
    # uniqueness
    existing_q = await db.execute(
        select(User).where(User.email == fields["email"], User.tenant_id == tenant_id)
    )
    if existing_q.scalar_one_or_none():
        return JSONResponse(
            status_code=409,
            content=scim_error("userName already exists", 409, "uniqueness"),
            media_type="application/scim+json",
        )
    user = User(
        tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        email=fields["email"],
        name=fields.get("name") or fields["email"],
        role=fields.get("role", "viewer"),
        active=fields.get("active", True),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return JSONResponse(
        status_code=201,
        content=user_to_scim(user),
        media_type="application/scim+json",
    )


@router.put("/Users/{user_id}")
async def replace_user(
    user_id: uuid.UUID,
    request: Request,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.json()
    tenant_id = _resolve_tenant()
    res = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = res.scalar_one_or_none()
    if not user:
        return JSONResponse(status_code=404, content=scim_error("not found", 404), media_type="application/scim+json")
    fields = scim_to_user_fields(payload)
    for k, v in fields.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return JSONResponse(content=user_to_scim(user), media_type="application/scim+json")


@router.patch("/Users/{user_id}")
async def patch_user(
    user_id: uuid.UUID,
    request: Request,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.json()
    ops = payload.get("Operations", [])
    tenant_id = _resolve_tenant()
    res = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = res.scalar_one_or_none()
    if not user:
        return JSONResponse(status_code=404, content=scim_error("not found", 404), media_type="application/scim+json")
    apply_patch_ops(user, ops)
    await db.commit()
    await db.refresh(user)
    return JSONResponse(content=user_to_scim(user), media_type="application/scim+json")


@router.delete("/Users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    _token: str = Depends(scim_auth),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = _resolve_tenant()
    res = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = res.scalar_one_or_none()
    if not user:
        return JSONResponse(status_code=404, content=scim_error("not found", 404), media_type="application/scim+json")
    # soft delete — SCIM spec allows either; we deactivate for audit trail
    user.active = False
    await db.commit()
    return JSONResponse(status_code=204, content=None)


@router.get("/ServiceProviderConfig")
async def service_provider_config(_token: str = Depends(scim_auth)):
    return JSONResponse(
        content={
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
            "patch": {"supported": True},
            "bulk": {"supported": False, "maxOperations": 0, "maxPayloadSize": 0},
            "filter": {"supported": True, "maxResults": 500},
            "changePassword": {"supported": False},
            "sort": {"supported": False},
            "etag": {"supported": False},
            "authenticationSchemes": [
                {
                    "type": "oauthbearertoken",
                    "name": "OAuth Bearer Token",
                    "description": "Authentication via Bearer token",
                }
            ],
        },
        media_type="application/scim+json",
    )


@router.get("/ResourceTypes")
async def resource_types(_token: str = Depends(scim_auth)):
    return JSONResponse(
        content=[
            {
                "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
                "id": "User",
                "name": "User",
                "endpoint": "/Users",
                "schema": USER_SCHEMA,
            }
        ],
        media_type="application/scim+json",
    )
