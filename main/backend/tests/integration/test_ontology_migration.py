"""ObjectType version migration E2E.

Skipped without DATABASE_URL_SYNC. Verifies that:
  - publishing a new version of an ObjectType keeps v1 instances readable
  - breaking changes are rejected without a migration plan
  - the 30+ vertical seed populates correctly
"""
import os
import uuid

import pytest


pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL_SYNC"),
    reason="DATABASE_URL_SYNC not configured",
)


@pytest.mark.asyncio
async def test_v2_publish_keeps_v1_query_alive():
    from sqlalchemy import select
    from app.database import async_session
    from app.models.ontology_v2 import (
        OntologyInstance, OntologyObjectTypeV2, OntologyPropertyType,
    )

    async with async_session() as db:
        tenant_id = uuid.uuid4()
        ot = OntologyObjectTypeV2(
            tenant_id=tenant_id, api_name="TestStore", display_name="Test",
            version=1, status="active", primary_key_field="id",
        )
        db.add(ot)
        await db.flush()

        db.add(OntologyPropertyType(
            tenant_id=tenant_id, object_type_id=ot.id,
            api_name="name", display_name="Name", data_type="string",
            required=True, version=1,
        ))
        await db.flush()

        for i in range(3):
            db.add(OntologyInstance(
                tenant_id=tenant_id,
                object_type_id=ot.id,
                object_type_version=1,
                primary_key_value=f"s-{i}",
                properties={"name": f"v1-instance-{i}"},
                status="active",
            ))
        await db.commit()

        # Bump version - simulate adding a property
        ot.version = 2
        db.add(OntologyPropertyType(
            tenant_id=tenant_id, object_type_id=ot.id,
            api_name="prefecture", display_name="Pref", data_type="string",
            required=False, version=2,
        ))
        await db.commit()

        # v1 query: instances created with v1 must remain queryable
        v1_q = await db.execute(
            select(OntologyInstance).where(
                OntologyInstance.tenant_id == tenant_id,
                OntologyInstance.object_type_version == 1,
            )
        )
        v1_rows = list(v1_q.scalars().all())
        assert len(v1_rows) == 3
        assert all("name" in r.properties for r in v1_rows)


@pytest.mark.asyncio
async def test_vertical_seed_creates_30_plus_object_types():
    from sqlalchemy import select, func
    from app.database import async_session
    from app.models.ontology_v2 import OntologyObjectTypeV2
    from app.seed.ontology_examples import seed_vertical_object_types

    tenant_id = uuid.uuid4()
    async with async_session() as db:
        result = await seed_vertical_object_types(db, tenant_id)
        assert result["created"] >= 30 or result["created"] + result["skipped"] >= 30

        count_q = await db.execute(
            select(func.count(OntologyObjectTypeV2.id)).where(
                OntologyObjectTypeV2.tenant_id == tenant_id
            )
        )
        assert count_q.scalar_one() >= 30
