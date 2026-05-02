import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# --- Health ---

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --- Executive ---

@pytest.mark.asyncio
async def test_executive_summary(client):
    r = await client.get("/api/v1/executive/summary")
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["total_stores"] > 0
    assert int(d["total_sales"]) > 0


@pytest.mark.asyncio
async def test_executive_issues(client):
    r = await client.get("/api/v1/executive/issues")
    assert r.status_code == 200


# --- Stores ---

@pytest.mark.asyncio
async def test_stores_ranking(client):
    r = await client.get("/api/v1/stores/ranking")
    assert r.status_code == 200
    assert len(r.json()["data"]) > 0


@pytest.mark.asyncio
async def test_stores_ranking_pagination(client):
    r = await client.get("/api/v1/stores/ranking?page_size=5")
    assert r.status_code == 200
    assert len(r.json()["data"]) <= 5


# --- Tasks ---

@pytest.mark.asyncio
async def test_tasks_list(client):
    r = await client.get("/api/v1/tasks")
    assert r.status_code == 200


# --- SV ---

@pytest.mark.asyncio
async def test_sv_missions(client):
    r = await client.get("/api/v1/sv/missions")
    assert r.status_code == 200


# --- Meeting Packs ---

@pytest.mark.asyncio
async def test_meeting_packs(client):
    r = await client.get("/api/v1/meeting-packs")
    assert r.status_code == 200


# --- Data Quality ---

@pytest.mark.asyncio
async def test_dq_summary(client):
    r = await client.get("/api/v1/data-quality/summary")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_dq_issues(client):
    r = await client.get("/api/v1/data-quality/issues")
    assert r.status_code == 200


# --- Value Cases ---

@pytest.mark.asyncio
async def test_value_cases(client):
    r = await client.get("/api/v1/value-cases")
    assert r.status_code == 200


# --- AI ---

@pytest.mark.asyncio
async def test_ai_suggested(client):
    r = await client.get("/api/v1/ai/suggested-questions")
    assert r.status_code == 200
    assert len(r.json()["data"]) >= 5


# --- KPI ---

@pytest.mark.asyncio
async def test_kpi_definitions(client):
    r = await client.get("/api/v1/kpi-definitions")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_kpi_calc_status(client):
    r = await client.get("/api/v1/kpi/calculation-status")
    assert r.status_code == 200


# --- Ontology ---

@pytest.mark.asyncio
async def test_ontology_object_types(client):
    r = await client.get("/api/v1/ontology/object-types")
    assert r.status_code == 200


# --- Workflows ---

@pytest.mark.asyncio
async def test_workflow_summary(client):
    r = await client.get("/api/v1/workflows/summary")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_workflow_templates(client):
    r = await client.get("/api/v1/workflows/templates")
    assert r.status_code == 200


# --- Vertical ---

@pytest.mark.asyncio
async def test_vertical_recipes(client):
    r = await client.get("/api/v1/vertical/recipes")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_vertical_labor(client):
    r = await client.get("/api/v1/vertical/labor/compliance-report")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_vertical_qsc(client):
    r = await client.get("/api/v1/vertical/qsc/summary")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_vertical_haccp(client):
    r = await client.get("/api/v1/vertical/haccp/compliance-rate")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_vertical_franchise(client):
    r = await client.get("/api/v1/vertical/franchise/agreements")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_vertical_benchmarks(client):
    r = await client.get("/api/v1/vertical/benchmarks")
    assert r.status_code == 200


# --- RBAC ---

@pytest.mark.asyncio
async def test_rbac_roles(client):
    r = await client.get("/api/v1/rbac/roles")
    assert r.status_code == 200


# --- Workspace ---

@pytest.mark.asyncio
async def test_workspace_analyses(client):
    r = await client.get("/api/v1/workspace/analyses")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_workspace_custom_kpis(client):
    r = await client.get("/api/v1/workspace/custom-kpis")
    assert r.status_code == 200


# --- Connectors ---

@pytest.mark.asyncio
async def test_connectors_available(client):
    r = await client.get("/api/v1/connectors/available")
    assert r.status_code == 200
    assert len(r.json()["data"]) >= 5


# --- Auth ---

@pytest.mark.asyncio
async def test_auth_login(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@aentro.jp", "password": "demo"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body or "mfa_required" in body


# --- Audit ---

@pytest.mark.asyncio
async def test_audit_logs(client):
    r = await client.get("/api/v1/audit/logs")
    assert r.status_code == 200


# --- Ingestion ---

@pytest.mark.asyncio
async def test_ingestion_template(client):
    r = await client.get("/api/v1/ingestion/templates/daily_sales")
    assert r.status_code == 200
