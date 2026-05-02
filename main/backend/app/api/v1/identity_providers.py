import uuid
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user, require_role, create_access_token, SECRET_KEY
from app.models.auth_enterprise import IdentityProvider
from app.models.user import User, AccessScope
from app.middleware.tenant import get_tenant_id_from_context
from app.config import settings

router = APIRouter(prefix="/api/v1/identity-providers", tags=["identity-providers"])


class IdPCreate(BaseModel):
    type: str  # oidc | saml | local
    name: str
    config: dict = {}
    is_default: bool = False
    role_mapping: dict = {}
    enabled: bool = True


class IdPUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    is_default: Optional[bool] = None
    role_mapping: Optional[dict] = None
    enabled: Optional[bool] = None


@router.get("/")
async def list_idps(
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    result = await db.execute(
        select(IdentityProvider).where(IdentityProvider.tenant_id == tenant_id)
    )
    providers = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "type": p.type,
            "name": p.name,
            "config": {k: v for k, v in p.config.items() if k != "client_secret"},
            "is_default": p.is_default,
            "role_mapping": p.role_mapping,
            "enabled": p.enabled,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in providers
    ]


@router.post("/")
async def create_idp(
    body: IdPCreate,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    if body.type not in ("oidc", "saml", "local"):
        raise HTTPException(status_code=400, detail="type must be oidc, saml, or local")

    idp = IdentityProvider(
        tenant_id=tenant_id,
        type=body.type,
        name=body.name,
        config=body.config,
        is_default=body.is_default,
        role_mapping=body.role_mapping,
        enabled=body.enabled,
    )
    db.add(idp)
    await db.commit()
    await db.refresh(idp)
    return {"id": str(idp.id), "name": idp.name, "type": idp.type}


@router.get("/{provider_id}")
async def get_idp(
    provider_id: uuid.UUID,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.tenant_id == tenant_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Identity provider not found")
    return {
        "id": str(p.id),
        "type": p.type,
        "name": p.name,
        "config": {k: v for k, v in p.config.items() if k != "client_secret"},
        "is_default": p.is_default,
        "role_mapping": p.role_mapping,
        "enabled": p.enabled,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.put("/{provider_id}")
async def update_idp(
    provider_id: uuid.UUID,
    body: IdPUpdate,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.tenant_id == tenant_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Identity provider not found")

    if body.name is not None:
        p.name = body.name
    if body.config is not None:
        p.config = body.config
    if body.is_default is not None:
        p.is_default = body.is_default
    if body.role_mapping is not None:
        p.role_mapping = body.role_mapping
    if body.enabled is not None:
        p.enabled = body.enabled

    await db.commit()
    return {"id": str(p.id), "updated": True}


@router.delete("/{provider_id}")
async def disable_idp(
    provider_id: uuid.UUID,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.tenant_id == tenant_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Identity provider not found")
    p.enabled = False
    await db.commit()
    return {"id": str(p.id), "disabled": True}


# --- OIDC flow ---

def _sign_state(provider_id: str, tenant_id: str) -> str:
    data = f"{provider_id}:{tenant_id}"
    sig = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{data}:{sig}"


def _verify_state(state: str) -> tuple[str, str]:
    parts = state.rsplit(":", 2)
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Invalid state")
    provider_id, tenant_id, sig = parts
    expected = hmac.new(SECRET_KEY.encode(), f"{provider_id}:{tenant_id}".encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=400, detail="Invalid state signature")
    return provider_id, tenant_id


@router.get("/oidc/{provider_id}/start")
async def oidc_start(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.tenant_id == tenant_id,
            IdentityProvider.type == "oidc",
            IdentityProvider.enabled == True,
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="OIDC provider not found")

    config = provider.config
    state = _sign_state(str(provider_id), str(tenant_id))
    authorize_url = (
        f"{config['authorize_url']}"
        f"?response_type=code"
        f"&client_id={config['client_id']}"
        f"&redirect_uri={config['redirect_uri']}"
        f"&scope=openid email profile"
        f"&state={state}"
    )
    return {"authorize_url": authorize_url}


@router.get("/oidc/callback")
async def oidc_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    provider_id, tenant_id = _verify_state(state)

    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.type == "oidc",
            IdentityProvider.enabled == True,
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    config = provider.config

    # Exchange code for token
    import httpx
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            config["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": config["redirect_uri"],
                "client_id": config["client_id"],
                "client_secret": config.get("client_secret", ""),
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Token exchange failed")
        token_data = token_resp.json()

        # Get user info
        userinfo_resp = await client.get(
            config["userinfo_url"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get user info")
        user_info = userinfo_resp.json()

    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email in user info")

    # Upsert user
    user_q = await db.execute(select(User).where(User.email == email, User.tenant_id == tenant_id))
    user = user_q.scalar_one_or_none()

    # Map roles from groups
    groups = user_info.get("groups", [])
    target_role = "viewer"
    for g in groups:
        if g in provider.role_mapping:
            target_role = provider.role_mapping[g]
            break

    if not user:
        user = User(
            tenant_id=tenant_id,
            email=email,
            name=user_info.get("name", email),
            role=target_role,
            active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.role = target_role
        await db.commit()

    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=[],
    )

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(f"{frontend_url}/auth/callback?token={token}")


# --- SAML stubs ---

@router.get("/saml/{provider_id}/metadata")
async def saml_metadata(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return SP metadata XML (stub — requires python3-saml for full implementation)."""
    return {"status": "stub", "message": "SAML metadata endpoint — requires python3-saml configuration"}


@router.post("/saml/{provider_id}/acs")
async def saml_acs(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Assertion Consumer Service (stub).

    Note: the production ACS lives at `/api/v1/sso/saml/{idp_id}/acs`.
    """
    return {"status": "stub", "message": "use /api/v1/sso/saml/{idp_id}/acs for production"}


# ---------- JWKS test + SAML metadata XML ----------


@router.post("/oidc/{provider_id}/test-jwks")
async def test_jwks(
    provider_id: uuid.UUID,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Probe the configured jwks_uri and return the key count + first kid."""
    import httpx
    tenant_id = get_tenant_id_from_context()
    res = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.tenant_id == tenant_id,
            IdentityProvider.type == "oidc",
        )
    )
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="OIDC provider not found")
    jwks_uri = (p.config or {}).get("jwks_uri")
    if not jwks_uri:
        raise HTTPException(status_code=400, detail="jwks_uri not configured")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(jwks_uri)
        if resp.status_code != 200:
            return {"ok": False, "status": resp.status_code, "body": resp.text[:200]}
        keys = resp.json().get("keys", [])
        return {
            "ok": True,
            "key_count": len(keys),
            "kids": [k.get("kid") for k in keys],
            "algorithms": list({k.get("alg") for k in keys if k.get("alg")}),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/saml/{provider_id}/sp-metadata")
async def saml_sp_metadata_xml(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return SP metadata XML for IdP configuration (XML media type)."""
    from fastapi.responses import Response
    from app.services.sso_saml import build_sp_metadata

    res = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == provider_id,
            IdentityProvider.type == "saml",
        )
    )
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="SAML provider not found")
    config = p.config or {}
    sp_entity_id = config.get("sp_entity_id") or "aentro-sp"
    acs_url = config.get("acs_url") or f"/api/v1/sso/saml/{provider_id}/acs"
    xml = build_sp_metadata(sp_entity_id, acs_url)
    return Response(content=xml, media_type="application/xml")
