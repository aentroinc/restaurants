"""SCIM v2 helpers — User mapping, ListResponse formatting, filter parsing."""
from __future__ import annotations

import re
import uuid
from typing import Any, Optional

from app.models.user import User

USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User"
GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group"
LIST_RESPONSE = "urn:ietf:params:scim:api:messages:2.0:ListResponse"
ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error"
PATCH_OP_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp"


def user_to_scim(user: User) -> dict[str, Any]:
    return {
        "schemas": [USER_SCHEMA],
        "id": str(user.id),
        "userName": user.email,
        "name": {"formatted": user.name},
        "displayName": user.name,
        "emails": [{"value": user.email, "primary": True, "type": "work"}],
        "active": user.active,
        "meta": {
            "resourceType": "User",
            "created": user.created_at.isoformat() if user.created_at else None,
            "lastModified": user.updated_at.isoformat() if user.updated_at else None,
            "location": f"/scim/v2/Users/{user.id}",
        },
        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
            "department": user.role,
        },
    }


def list_response(resources: list[dict], total: int, start: int = 1, count: int = 0) -> dict:
    return {
        "schemas": [LIST_RESPONSE],
        "totalResults": total,
        "startIndex": start,
        "itemsPerPage": count or len(resources),
        "Resources": resources,
    }


def scim_error(detail: str, status: int = 400, scim_type: Optional[str] = None) -> dict:
    body: dict[str, Any] = {
        "schemas": [ERROR_SCHEMA],
        "detail": detail,
        "status": str(status),
    }
    if scim_type:
        body["scimType"] = scim_type
    return body


# Minimal SCIM filter parser: supports `attr eq "value"` and `attr eq value`.
_FILTER_RE = re.compile(r'^\s*(\w+)\s+eq\s+"?([^"]+)"?\s*$', re.IGNORECASE)


def parse_filter(filter_str: Optional[str]) -> Optional[tuple[str, str]]:
    if not filter_str:
        return None
    m = _FILTER_RE.match(filter_str)
    if not m:
        return None
    return m.group(1), m.group(2)


def scim_to_user_fields(payload: dict) -> dict[str, Any]:
    """Map SCIM User payload to our User model fields."""
    out: dict[str, Any] = {}
    if "userName" in payload:
        out["email"] = payload["userName"]
    elif "emails" in payload and payload["emails"]:
        primary = next((e for e in payload["emails"] if e.get("primary")), payload["emails"][0])
        out["email"] = primary["value"]
    if "displayName" in payload:
        out["name"] = payload["displayName"]
    elif "name" in payload and isinstance(payload["name"], dict):
        out["name"] = payload["name"].get("formatted") or payload["name"].get("givenName", "")
    if "active" in payload:
        out["active"] = bool(payload["active"])
    ext = payload.get("urn:ietf:params:scim:schemas:extension:enterprise:2.0:User", {})
    if "department" in ext:
        out["role"] = ext["department"]
    return out


def apply_patch_ops(user: User, ops: list[dict]) -> None:
    """Apply a SCIM PATCH op list (RFC 7644 §3.5.2) — minimal subset."""
    for op in ops:
        operation = (op.get("op") or "").lower()
        path = op.get("path", "")
        value = op.get("value")
        if operation == "replace":
            if path == "active":
                user.active = bool(value)
            elif path == "displayName":
                user.name = str(value)
            elif path == "userName":
                user.email = str(value)
            elif not path and isinstance(value, dict):
                fields = scim_to_user_fields(value)
                for k, v in fields.items():
                    setattr(user, k, v)
        elif operation == "remove":
            if path == "active":
                user.active = False
