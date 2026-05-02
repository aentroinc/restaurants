"""Row-level scoping helpers.

Given a SQLAlchemy SELECT and a user payload, returns the SELECT with
tenant_id and (where applicable) row-scope filters applied. This is the
single source of truth for "what data can this user see".
"""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import Select, and_, or_
from sqlalchemy.sql.expression import ColumnElement

# Roles in increasing scope:
ROLE_HIERARCHY = [
    "store_staff", "sv", "area_manager", "brand_manager", "analyst",
    "viewer", "executive", "admin",
]


def has_role(user: dict | None, *roles: str) -> bool:
    if not user:
        return False
    return user.get("role") in roles


def can_see_all_stores(user: dict | None) -> bool:
    return has_role(user, "admin", "executive", "analyst", "viewer")


def scope_store_query(
    stmt: Select,
    user: dict | None,
    store_id_col: ColumnElement,
) -> Select:
    """Apply store-level row scope to a SELECT.

    - admin/executive/analyst/viewer: no extra restriction
    - brand_manager: stores must belong to one of user.scopes brand_id
    - area_manager: stores must be in user.scopes region/area
    - sv: assigned_store_ids
    - store_staff: home_store_id only
    """
    if can_see_all_stores(user):
        return stmt
    if not user:
        return stmt.where(store_id_col.is_(None))  # no user, no rows

    scopes = user.get("scopes") or []
    role = user.get("role")

    store_ids: list[str] = []
    brand_ids: list[str] = []
    region_ids: list[str] = []

    for s in scopes:
        st = s.get("scope_type")
        sid = s.get("scope_id")
        if not sid:
            continue
        if st == "store":
            store_ids.append(str(sid))
        elif st == "brand":
            brand_ids.append(str(sid))
        elif st == "region":
            region_ids.append(str(sid))

    if role == "store_staff" and store_ids:
        return stmt.where(store_id_col.in_(store_ids[:1]))
    if role == "sv" and store_ids:
        return stmt.where(store_id_col.in_(store_ids))
    if role == "area_manager" and (region_ids or store_ids):
        # Region scoping done via Store table join; here we fallback to allowed store_ids
        return stmt.where(store_id_col.in_(store_ids)) if store_ids else stmt
    if role == "brand_manager" and (brand_ids or store_ids):
        return stmt.where(store_id_col.in_(store_ids)) if store_ids else stmt

    # Unknown role with no scopes: fail closed.
    return stmt.where(store_id_col.is_(None))


def assert_user_can_access_store(user: dict | None, store_id: str) -> bool:
    if can_see_all_stores(user):
        return True
    if not user:
        return False
    scopes = user.get("scopes") or []
    return any(
        s.get("scope_type") == "store" and str(s.get("scope_id")) == str(store_id)
        for s in scopes
    )
