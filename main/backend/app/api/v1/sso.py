"""SSO endpoints — OIDC + SAML login flows."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.tenant import get_tenant_id_from_context
from app.services.sso_oidc import OIDCError, complete_oidc_login, start_oidc_login
from app.services.sso_saml import (
    SAMLError,
    build_sp_metadata,
    complete_saml_login,
    start_saml_login,
)

router = APIRouter(prefix="/api/v1/sso", tags=["sso"])


# ---------- OIDC ----------


class OIDCStartResponse(BaseModel):
    authorize_url: str
    state: str


@router.get("/oidc/{idp_id}/login")
async def oidc_login(
    idp_id: uuid.UUID,
    redirect: bool = Query(True, description="if true, 302 to IdP; else return JSON"),
    redirect_uri: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    try:
        result = await start_oidc_login(db, tenant_id, str(idp_id), redirect_uri)
    except OIDCError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if redirect:
        return RedirectResponse(result["authorize_url"], status_code=302)
    return {"authorize_url": result["authorize_url"], "state": result["state"]}


@router.get("/oidc/{idp_id}/callback")
async def oidc_callback(
    idp_id: uuid.UUID,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await complete_oidc_login(db, state, code)
    except OIDCError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return result


# ---------- SAML ----------


class SAMLStartResponse(BaseModel):
    redirect_url: str
    relay_state: str


@router.post("/saml/{idp_id}/login", response_model=SAMLStartResponse)
async def saml_login(
    idp_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    try:
        result = await start_saml_login(db, tenant_id, str(idp_id))
    except SAMLError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SAMLStartResponse(redirect_url=result["redirect_url"], relay_state=result["relay_state"])


@router.get("/saml/{idp_id}/login")
async def saml_login_get(
    idp_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Browser-friendly: 302 to IdP."""
    tenant_id = get_tenant_id_from_context()
    try:
        result = await start_saml_login(db, tenant_id, str(idp_id))
    except SAMLError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(result["redirect_url"], status_code=302)


@router.post("/saml/{idp_id}/acs")
async def saml_acs(
    idp_id: uuid.UUID,
    SAMLResponse: str = Form(...),
    RelayState: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Assertion Consumer Service — receives the IdP's signed Response."""
    try:
        result = await complete_saml_login(db, SAMLResponse, RelayState)
    except SAMLError as e:
        raise HTTPException(status_code=401, detail=str(e))
    # Optionally redirect to frontend with token
    frontend_url = getattr(settings, "FRONTEND_URL", "")
    if frontend_url:
        return RedirectResponse(
            f"{frontend_url}/auth/callback?token={result['access_token']}",
            status_code=302,
        )
    return result


@router.get("/saml/{idp_id}/metadata")
async def saml_sp_metadata(
    idp_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return SP metadata XML for IdP-side configuration."""
    from sqlalchemy import select
    from app.models.auth_enterprise import IdentityProvider

    res = await db.execute(
        select(IdentityProvider).where(IdentityProvider.id == idp_id)
    )
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="provider not found")
    config = p.config or {}
    sp_entity_id = config.get("sp_entity_id") or str(request.base_url) + "saml/sp"
    acs_url = config.get("acs_url") or f"{str(request.base_url).rstrip('/')}/api/v1/sso/saml/{idp_id}/acs"
    xml = build_sp_metadata(sp_entity_id, acs_url)
    return Response(content=xml, media_type="application/xml")
