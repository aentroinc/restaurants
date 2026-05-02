from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete as sa_delete
from app.database import get_db
from app.auth import get_tenant_id, get_current_user_optional
from app.models.rbac import Role, Permission, UserRole

router = APIRouter(prefix="/api/v1/rbac", tags=["rbac"])


# ── Roles ─────────────────────────────────────────────────

@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Role).where(Role.tenant_id == tenant_id).order_by(Role.name)
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_role_dict(r) for r in rows]}


@router.post("/roles", status_code=201)
async def create_role(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = Role(
        id=uuid4(),
        tenant_id=tenant_id,
        name=body["name"],
        display_name=body["display_name"],
        description=body.get("description"),
        is_system=body.get("is_system", False),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _role_dict(obj)}


@router.get("/roles/{role_id}/permissions")
async def get_role_permissions(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    await _get_role_or_404(db, role_id, tenant_id)
    q = select(Permission).where(and_(Permission.role_id == role_id, Permission.tenant_id == tenant_id))
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_perm_dict(p) for p in rows]}


@router.post("/roles/{role_id}/permissions", status_code=201)
async def add_permission(
    role_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    await _get_role_or_404(db, role_id, tenant_id)
    obj = Permission(
        id=uuid4(),
        tenant_id=tenant_id,
        role_id=role_id,
        resource=body["resource"],
        action=body["action"],
        scope=body.get("scope"),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _perm_dict(obj)}


@router.delete("/permissions/{permission_id}", status_code=204)
async def remove_permission(
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Permission).where(and_(Permission.id == permission_id, Permission.tenant_id == tenant_id))
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Permission not found")
    await db.delete(obj)
    await db.commit()


# ── User Roles ────────────────────────────────────────────

@router.get("/users/{user_id}/roles")
async def get_user_roles(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(UserRole, Role)
        .join(Role, Role.id == UserRole.role_id)
        .where(and_(UserRole.user_id == user_id, UserRole.tenant_id == tenant_id))
    )
    result = await db.execute(q)
    rows = result.all()
    return {"data": [_user_role_dict(ur, role) for ur, role in rows]}


@router.post("/users/{user_id}/roles", status_code=201)
async def assign_role(
    user_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    role_id = body["role_id"]
    await _get_role_or_404(db, role_id, tenant_id)
    obj = UserRole(
        id=uuid4(),
        user_id=user_id,
        role_id=role_id,
        tenant_id=tenant_id,
        granted_by=user["sub"] if user else None,
        expires_at=body.get("expires_at"),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": {"id": str(obj.id), "user_id": str(obj.user_id), "role_id": str(obj.role_id)}}


@router.delete("/user-roles/{user_role_id}", status_code=204)
async def remove_user_role(
    user_role_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(UserRole).where(and_(UserRole.id == user_role_id, UserRole.tenant_id == tenant_id))
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="UserRole not found")
    await db.delete(obj)
    await db.commit()


# ── Helpers ───────────────────────────────────────────────

async def _get_role_or_404(db, role_id, tenant_id):
    q = select(Role).where(and_(Role.id == role_id, Role.tenant_id == tenant_id))
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Role not found")
    return obj


def _role_dict(r: Role) -> dict:
    return {
        "id": str(r.id), "name": r.name, "display_name": r.display_name,
        "description": r.description, "is_system": r.is_system,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _perm_dict(p: Permission) -> dict:
    return {
        "id": str(p.id), "role_id": str(p.role_id),
        "resource": p.resource, "action": p.action, "scope": p.scope,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _user_role_dict(ur: UserRole, role: Role) -> dict:
    return {
        "id": str(ur.id), "user_id": str(ur.user_id),
        "role_id": str(ur.role_id), "role_name": role.name,
        "role_display_name": role.display_name,
        "granted_by": str(ur.granted_by) if ur.granted_by else None,
        "granted_at": ur.granted_at.isoformat() if ur.granted_at else None,
        "expires_at": ur.expires_at.isoformat() if ur.expires_at else None,
    }
