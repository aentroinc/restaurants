"""Permission-based access control using Permission table.

require_permission(resource, action) checks the permissions table for the user's role.
Falls back to role-based check if the user has no role mapping yet (backward compat).
"""
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.database import get_db
from app.models.rbac import Role, Permission, UserRole


ROLE_FALLBACK = {
    "admin": {"*"},
    "executive": {"read"},
    "director": {"read", "write"},
    "brand_manager": {"read", "write"},
    "area_manager": {"read", "write"},
    "sv": {"read", "write"},
    "store_staff": {"read"},
    "viewer": {"read"},
    "analyst": {"read"},
}


async def _user_has_permission(
    db: AsyncSession,
    user_id: str,
    tenant_id: str,
    resource: str,
    action: str,
) -> bool:
    try:
        uid = UUID(user_id)
        tid = UUID(tenant_id)
    except (ValueError, TypeError):
        return False

    q = (
        select(Permission)
        .join(UserRole, UserRole.role_id == Permission.role_id)
        .where(
            and_(
                UserRole.user_id == uid,
                UserRole.tenant_id == tid,
                Permission.tenant_id == tid,
                Permission.resource.in_([resource, "*"]),
                Permission.action.in_([action, "*"]),
            )
        )
        .limit(1)
    )
    result = await db.execute(q)
    return result.scalar_one_or_none() is not None


def require_permission(resource: str, action: str = "read"):
    """FastAPI dependency: enforces permission(resource, action) for the current user.

    - admin role bypasses checks (super-user)
    - if user has UserRole + Permission row matching, allow
    - otherwise fall back to ROLE_FALLBACK for unmigrated tenants
    - 401 if no user, 403 if user but no permission
    """
    async def check(
        user: Optional[dict] = Depends(get_current_user_optional),
        db: AsyncSession = Depends(get_db),
    ):
        if user is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        role = user.get("role")
        if role == "admin":
            return user

        user_id = user.get("sub")
        tenant_id = user.get("tenant_id")
        if user_id and tenant_id:
            if await _user_has_permission(db, user_id, tenant_id, resource, action):
                return user

        allowed = ROLE_FALLBACK.get(role, set())
        if "*" in allowed or action in allowed:
            return user

        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {resource}.{action}",
        )

    return check
