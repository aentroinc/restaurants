from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rbac import Role, Permission, UserRole


async def check_permission(
    db: AsyncSession,
    user_id: str,
    tenant_id: str,
    resource: str,
    action: str,
    context: dict | None = None,
) -> bool:
    q = (
        select(Permission)
        .join(Role, Role.id == Permission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(and_(
            UserRole.user_id == user_id,
            UserRole.tenant_id == tenant_id,
            Permission.resource == resource,
            Permission.action == action,
        ))
    )
    result = await db.execute(q)
    perms = result.scalars().all()

    if not perms:
        return False

    for perm in perms:
        if perm.scope is None:
            return True
        if context and _match_scope(perm.scope, context):
            return True

    return any(p.scope is None for p in perms) or bool(perms)


def _match_scope(scope: dict, context: dict) -> bool:
    field = scope.get("field")
    operator = scope.get("operator", "eq")
    value = scope.get("value")

    if not field or not value:
        return True

    ctx_value = context.get(field)
    if ctx_value is None:
        return False

    if operator == "eq":
        if isinstance(value, list):
            return ctx_value in value
        return ctx_value == value
    elif operator == "in":
        if isinstance(value, list):
            return ctx_value in value
        return False
    elif operator == "contains":
        if isinstance(ctx_value, list):
            return value in ctx_value
        return False

    return False


async def get_row_filter(
    db: AsyncSession,
    user_id: str,
    tenant_id: str,
    resource: str,
) -> dict | None:
    q = (
        select(Permission.scope)
        .join(Role, Role.id == Permission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(and_(
            UserRole.user_id == user_id,
            UserRole.tenant_id == tenant_id,
            Permission.resource == resource,
            Permission.action == "read",
            Permission.scope.isnot(None),
        ))
    )
    result = await db.execute(q)
    scopes = result.scalars().all()

    if not scopes:
        return None

    filters = {}
    for scope in scopes:
        if scope and "field" in scope and "value" in scope:
            field = scope["field"]
            value = scope["value"]
            if field not in filters:
                filters[field] = []
            if isinstance(value, list):
                filters[field].extend(value)
            else:
                filters[field].append(value)

    return filters if filters else None
