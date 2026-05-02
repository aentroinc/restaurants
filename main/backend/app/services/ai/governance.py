"""Role x tool authorization matrix and PII redaction policy for AI Analyst."""
from __future__ import annotations

from typing import Iterable

# Role -> allowed tool names. "*" = all.
ROLE_TOOL_MATRIX: dict[str, set[str]] = {
    "admin":         {"*"},
    "executive":     {"query_kpi", "get_store_360", "search_documents", "run_forecast", "list_ontology_objects"},
    "brand_manager": {"query_kpi", "get_store_360", "search_documents", "run_forecast"},
    "area_manager":  {"query_kpi", "get_store_360", "search_documents", "run_forecast"},
    "sv":            {"query_kpi", "get_store_360", "search_documents"},
    "store_staff":   {"query_kpi"},
    "viewer":        {"query_kpi"},
    "analyst":       {"query_kpi", "get_store_360", "search_documents", "run_forecast",
                       "list_ontology_objects", "create_action"},
}


def filter_tools_for_role(role: str | None, all_tools: Iterable[dict]) -> list[dict]:
    if not role:
        # Anonymous in non-strict mode: limited tool set
        allowed = {"query_kpi"}
    else:
        allowed = ROLE_TOOL_MATRIX.get(role, {"query_kpi"})
    if "*" in allowed:
        return list(all_tools)
    return [t for t in all_tools if t.get("name") in allowed]


def can_use_tool(role: str | None, tool_name: str) -> bool:
    if not role:
        return tool_name == "query_kpi"
    allowed = ROLE_TOOL_MATRIX.get(role, set())
    return "*" in allowed or tool_name in allowed


def requires_approval(role: str | None, tool_name: str) -> bool:
    """Some tools (writeback / actions) require human approval even when allowed."""
    return tool_name in {"create_action", "approve_writeback"}
