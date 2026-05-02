import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_executive_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/executive/summary")
        assert r.status_code == 200
        assert "data" in r.json()


@pytest.mark.asyncio
async def test_stores_ranking():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/stores/ranking")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_ai_suggested():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/ai/suggested-questions")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_kpi_definitions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/kpi-definitions")
        assert r.status_code == 200
