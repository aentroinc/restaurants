"""Brand <-> OntologyInstance dual-write.

Strategy: SQLAlchemy `after_insert` and `after_update` events on Brand keep
a corresponding row in `ontology_instances` with object_type='Brand'.

Failures are *logged but never raised* — the transactional boundary is the
Brand insert/update. If the v2 sync fails, a periodic reconciliation job
catches it.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.ontology_v2 import (
    OntologyInstance, OntologyObjectTypeV2, OntologyPropertyType,
)

logger = logging.getLogger("aentro.ontology")


BRAND_OBJECT_TYPE_API_NAME = "Brand"
BRAND_PROPERTIES = [
    {"api_name": "name", "display_name": "ブランド名", "data_type": "string", "required": True},
    {"api_name": "code", "display_name": "コード", "data_type": "string", "required": False},
    {"api_name": "category", "display_name": "業態カテゴリ", "data_type": "string", "required": False},
]


def ensure_brand_object_type(session: Session, tenant_id: uuid.UUID) -> OntologyObjectTypeV2:
    """Make sure the Brand ObjectType + standard properties exist for tenant."""
    res = session.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.tenant_id == tenant_id,
            OntologyObjectTypeV2.api_name == BRAND_OBJECT_TYPE_API_NAME,
        )
    )
    ot = res.scalar_one_or_none()
    if ot is None:
        ot = OntologyObjectTypeV2(
            tenant_id=tenant_id,
            api_name=BRAND_OBJECT_TYPE_API_NAME,
            display_name="ブランド",
            primary_key_field="id",
            version=1,
            status="active",
        )
        session.add(ot)
        session.flush()

        for spec in BRAND_PROPERTIES:
            session.add(OntologyPropertyType(
                tenant_id=tenant_id,
                object_type_id=ot.id,
                api_name=spec["api_name"],
                display_name=spec["display_name"],
                data_type=spec["data_type"],
                required=spec["required"],
                version=1,
            ))
        session.flush()
    return ot


def upsert_brand_instance(session: Session, brand: Brand) -> OntologyInstance:
    ot = ensure_brand_object_type(session, brand.tenant_id)

    res = session.execute(
        select(OntologyInstance).where(
            OntologyInstance.tenant_id == brand.tenant_id,
            OntologyInstance.object_type_id == ot.id,
            OntologyInstance.primary_key_value == str(brand.id),
        )
    )
    inst = res.scalar_one_or_none()

    properties = {"name": brand.name}
    if hasattr(brand, "code") and getattr(brand, "code", None):
        properties["code"] = brand.code
    if hasattr(brand, "category") and getattr(brand, "category", None):
        properties["category"] = brand.category

    if inst is None:
        inst = OntologyInstance(
            tenant_id=brand.tenant_id,
            object_type_id=ot.id,
            object_type_version=ot.version,
            primary_key_value=str(brand.id),
            properties=properties,
            status="active",
        )
        session.add(inst)
    else:
        inst.properties = properties
        inst.object_type_version = ot.version
    return inst


def _on_brand_after_insert(mapper, connection, target: Brand):  # noqa: ARG001
    try:
        # We can't always fetch a session from `connection`; use a fresh
        # synchronous session keyed off the same engine for the dual-write.
        from app.database import SyncSession
        s = SyncSession()
        try:
            upsert_brand_instance(s, target)
            s.commit()
        finally:
            s.close()
    except Exception as e:  # pragma: no cover -- defensive
        logger.warning("Brand dual-write failed for %s: %s", target.id, e)


def _on_brand_after_update(mapper, connection, target: Brand):  # noqa: ARG001
    _on_brand_after_insert(mapper, connection, target)


_listeners_registered = False


def register_dual_write():
    global _listeners_registered
    if _listeners_registered:
        return
    event.listen(Brand, "after_insert", _on_brand_after_insert)
    event.listen(Brand, "after_update", _on_brand_after_update)
    _listeners_registered = True


def reconcile_brands(session: Session, tenant_id: uuid.UUID) -> dict:
    """Backfill / reconcile Brand -> OntologyInstance for one tenant."""
    brands = session.execute(
        select(Brand).where(Brand.tenant_id == tenant_id)
    ).scalars().all()
    created = 0
    updated = 0
    for b in brands:
        before = session.execute(
            select(OntologyInstance).where(
                OntologyInstance.primary_key_value == str(b.id)
            )
        ).scalar_one_or_none()
        upsert_brand_instance(session, b)
        if before is None:
            created += 1
        else:
            updated += 1
    session.commit()
    return {"brands_total": len(brands), "created": created, "updated": updated}
