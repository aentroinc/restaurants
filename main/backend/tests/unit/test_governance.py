"""Unit tests for AI governance role x tool matrix."""
from app.services.ai.governance import (
    can_use_tool, filter_tools_for_role, requires_approval,
)


SAMPLE_TOOLS = [
    {"name": "query_kpi"},
    {"name": "create_action"},
    {"name": "search_documents"},
    {"name": "list_ontology_objects"},
]


def test_admin_sees_all():
    out = filter_tools_for_role("admin", SAMPLE_TOOLS)
    assert {t["name"] for t in out} == {t["name"] for t in SAMPLE_TOOLS}


def test_store_staff_only_query_kpi():
    out = filter_tools_for_role("store_staff", SAMPLE_TOOLS)
    assert {t["name"] for t in out} == {"query_kpi"}


def test_anonymous_only_query_kpi():
    out = filter_tools_for_role(None, SAMPLE_TOOLS)
    assert {t["name"] for t in out} == {"query_kpi"}


def test_can_use_tool_admin():
    assert can_use_tool("admin", "create_action") is True


def test_can_use_tool_viewer_blocked():
    assert can_use_tool("viewer", "create_action") is False
    assert can_use_tool("viewer", "query_kpi") is True


def test_create_action_requires_approval():
    assert requires_approval("analyst", "create_action") is True
    assert requires_approval("analyst", "query_kpi") is False
