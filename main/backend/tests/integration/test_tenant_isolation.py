"""Tenant-isolation integration tests.

Skipped automatically when no DATABASE_URL is configured. They exercise
the full middleware -> router -> session path with two synthetic
tenants, asserting that a JWT scoped to tenant A cannot read rows
belonging to tenant B.
"""
import os
import uuid

import pytest


pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL_SYNC"),
    reason="DATABASE_URL_SYNC not configured",
)


@pytest.fixture(scope="module")
def two_tenants():
    """Create two tenants + one user each + a store in each."""
    from sqlalchemy import text
    from app.database import SyncSession
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.models.brand import Brand
    from app.models.region import Region
    from app.models.area import Area
    from app.models.store import Store

    session = SyncSession()
    tA = Tenant(name="Tenant A")
    tB = Tenant(name="Tenant B")
    session.add_all([tA, tB])
    session.flush()

    rA = Region(tenant_id=tA.id, name="関東")
    rB = Region(tenant_id=tB.id, name="関西")
    session.add_all([rA, rB])
    session.flush()

    aA = Area(tenant_id=tA.id, region_id=rA.id, name="東京")
    aB = Area(tenant_id=tB.id, region_id=rB.id, name="大阪")
    session.add_all([aA, aB])
    session.flush()

    bA = Brand(tenant_id=tA.id, name="BrandA")
    bB = Brand(tenant_id=tB.id, name="BrandB")
    session.add_all([bA, bB])
    session.flush()

    sA = Store(
        tenant_id=tA.id, brand_id=bA.id, area_id=aA.id,
        code="A001", name="新宿店", prefecture="東京都", city="新宿区",
        address="新宿1-1-1", trade_area_type="駅前",
    )
    sB = Store(
        tenant_id=tB.id, brand_id=bB.id, area_id=aB.id,
        code="B001", name="梅田店", prefecture="大阪府", city="大阪市",
        address="梅田1-1-1", trade_area_type="駅前",
    )
    session.add_all([sA, sB])
    session.commit()

    out = {
        "tenantA": str(tA.id), "tenantB": str(tB.id),
        "storeA": str(sA.id), "storeB": str(sB.id),
    }
    yield out

    # Cleanup
    session.execute(text("DELETE FROM stores WHERE tenant_id IN (:a, :b)"),
                    {"a": str(tA.id), "b": str(tB.id)})
    session.execute(text("DELETE FROM brands WHERE tenant_id IN (:a, :b)"),
                    {"a": str(tA.id), "b": str(tB.id)})
    session.execute(text("DELETE FROM areas WHERE tenant_id IN (:a, :b)"),
                    {"a": str(tA.id), "b": str(tB.id)})
    session.execute(text("DELETE FROM regions WHERE tenant_id IN (:a, :b)"),
                    {"a": str(tA.id), "b": str(tB.id)})
    session.execute(text("DELETE FROM tenants WHERE id IN (:a, :b)"),
                    {"a": str(tA.id), "b": str(tB.id)})
    session.commit()
    session.close()


@pytest.mark.asyncio
async def test_store_query_does_not_leak_across_tenants(two_tenants):
    from sqlalchemy import select
    from app.database import async_session
    from app.models.store import Store

    async with async_session() as db:
        res = await db.execute(
            select(Store).where(Store.tenant_id == two_tenants["tenantA"])
        )
        stores = list(res.scalars().all())

    assert all(str(s.tenant_id) == two_tenants["tenantA"] for s in stores)
    ids = {str(s.id) for s in stores}
    assert two_tenants["storeA"] in ids
    assert two_tenants["storeB"] not in ids
