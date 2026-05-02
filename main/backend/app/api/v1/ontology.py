from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
import uuid as uuid_mod
from datetime import datetime, date
from app.database import get_db
from app.models.store import Store
from app.models.brand import Brand
from app.models.product import Product
from app.models.employee import Employee
from app.models.task import Task
from app.models.ontology import OntologyObjectType, OntologyRelationType, OntologyField
from app.models.ontology_v2 import (
    OntologyObjectTypeV2, OntologyPropertyType, OntologyLinkType,
    OntologyInstance, OntologyLink,
)
from app.schemas.common import APIResponse, PaginationMeta
from app.auth import get_tenant_id
from app.services.ontology_engine import validate_instance, bump_version, compute_impact
from app.models.ontology_migration import OntologyMigrationJob
from app.services.ontology_migration import run_migration, rollback_migration as rollback_migration_svc
from app.middleware.audit import log_audit

router = APIRouter(prefix="/api/v1/ontology", tags=["ontology"])


# ---------------------------------------------------------------------------
# Helper: check if v2 tables have data for this tenant
# ---------------------------------------------------------------------------
async def _has_v2_data(db: AsyncSession, tenant_id: str) -> bool:
    count = (await db.execute(
        select(func.count(OntologyObjectTypeV2.id)).where(
            OntologyObjectTypeV2.tenant_id == tenant_id
        )
    )).scalar() or 0
    return count > 0


# ===========================================================================
# Object Types (v2-first, fallback to legacy)
# ===========================================================================

@router.get("/object-types", response_model=APIResponse[list[dict]])
async def list_object_types(
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if await _has_v2_data(db, tenant_id):
        q = select(OntologyObjectTypeV2).where(OntologyObjectTypeV2.tenant_id == tenant_id)
        if status_filter:
            q = q.where(OntologyObjectTypeV2.status == status_filter)
        result = await db.execute(q.order_by(OntologyObjectTypeV2.api_name))
        v2_types = result.scalars().all()

        # count properties per type
        type_ids = [t.id for t in v2_types]
        prop_counts = {}
        if type_ids:
            pc_q = await db.execute(
                select(OntologyPropertyType.object_type_id, func.count(OntologyPropertyType.id))
                .where(OntologyPropertyType.object_type_id.in_(type_ids))
                .group_by(OntologyPropertyType.object_type_id)
            )
            prop_counts = {r[0]: r[1] for r in pc_q.all()}

        data = [{
            "id": str(t.id),
            "api_name": t.api_name,
            "display_name": t.display_name,
            "icon": t.icon or "box",
            "primary_key_field": t.primary_key_field,
            "version": t.version,
            "status": t.status,
            "property_count": prop_counts.get(t.id, 0),
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            # backward compat fields
            "object_type": t.api_name,
        } for t in v2_types]

        return APIResponse(data=data, meta={"total": len(data)})

    # fallback to legacy
    result = await db.execute(
        select(OntologyObjectType).where(OntologyObjectType.tenant_id == tenant_id)
    )
    db_types = result.scalars().all()
    field_counts = {}
    if db_types:
        type_ids = [t.id for t in db_types]
        fc_q = await db.execute(
            select(OntologyField.object_type_id, func.count(OntologyField.id))
            .where(OntologyField.object_type_id.in_(type_ids))
            .group_by(OntologyField.object_type_id)
        )
        field_counts = {r[0]: r[1] for r in fc_q.all()}

    data = [{
        "id": str(t.id),
        "object_type": t.name,
        "display_name": t.display_name,
        "description": t.description or "",
        "base_schema": t.base_table or "",
        "custom_schema": {},
        "icon": t.icon or "box",
        "is_system": t.is_system,
        "field_count": field_counts.get(t.id, 0),
        "property_count": field_counts.get(t.id, 0),
    } for t in db_types]

    return APIResponse(data=data, meta={"total": len(data)})


@router.post("/object-types", response_model=APIResponse[dict])
async def create_object_type(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    new_type = OntologyObjectTypeV2(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        api_name=body.get("api_name", body.get("name", "custom_type")),
        display_name=body.get("display_name", "Custom Type"),
        icon=body.get("icon"),
        primary_key_field=body.get("primary_key_field", "id"),
        version=1,
        status="draft",
    )
    db.add(new_type)
    await db.commit()
    await db.refresh(new_type)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_create_type", resource_type="ontology_object_type",
        resource_id=str(new_type.id),
        metadata={"api_name": new_type.api_name, "display_name": new_type.display_name},
    )

    return APIResponse(data={
        "id": str(new_type.id),
        "api_name": new_type.api_name,
        "display_name": new_type.display_name,
        "icon": new_type.icon or "box",
        "primary_key_field": new_type.primary_key_field,
        "version": new_type.version,
        "status": new_type.status,
        "property_count": 0,
        "created_at": new_type.created_at.isoformat() if new_type.created_at else None,
    })


@router.put("/object-types/{type_id}", response_model=APIResponse[dict])
async def update_object_type(
    type_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )
    ot = result.scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Object type not found")

    if "display_name" in body:
        ot.display_name = body["display_name"]
    if "icon" in body:
        ot.icon = body["icon"]
    if "primary_key_field" in body:
        ot.primary_key_field = body["primary_key_field"]

    before = {"display_name": ot.display_name, "icon": ot.icon}
    new_ver, is_breaking = await bump_version(db, type_id, tenant_id)

    await db.commit()
    await db.refresh(ot)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_update_type", resource_type="ontology_object_type",
        resource_id=str(ot.id),
        metadata={"before": before, "after": body, "new_version": new_ver, "is_breaking": is_breaking},
    )

    return APIResponse(data={
        "id": str(ot.id),
        "api_name": ot.api_name,
        "display_name": ot.display_name,
        "icon": ot.icon,
        "version": ot.version,
        "status": ot.status,
        "is_breaking": is_breaking,
    })


@router.post("/object-types/{type_id}/publish", response_model=APIResponse[dict])
async def publish_object_type(
    type_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )
    ot = result.scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Object type not found")
    if ot.status == "deprecated":
        raise HTTPException(status_code=400, detail="Cannot publish a deprecated type")

    ot.status = "active"
    await db.commit()
    await db.refresh(ot)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_publish", resource_type="ontology_object_type",
        resource_id=str(ot.id),
        metadata={"api_name": ot.api_name, "version": ot.version},
    )

    return APIResponse(data={
        "id": str(ot.id),
        "api_name": ot.api_name,
        "status": ot.status,
        "version": ot.version,
    })


@router.delete("/object-types/{type_id}", response_model=APIResponse[dict])
async def deprecate_object_type(
    type_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )
    ot = result.scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Object type not found")

    impact = await compute_impact(db, type_id, tenant_id)
    ot.status = "deprecated"
    await db.commit()

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_deprecate_type", resource_type="ontology_object_type",
        resource_id=str(ot.id),
        metadata={"api_name": ot.api_name, "impact": impact},
    )

    return APIResponse(data={
        "id": str(ot.id),
        "api_name": ot.api_name,
        "status": "deprecated",
        "impact": impact,
    })


# ===========================================================================
# Properties
# ===========================================================================

@router.get("/object-types/{type_id}/properties", response_model=APIResponse[list[dict]])
async def list_properties(
    type_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyPropertyType).where(
            OntologyPropertyType.object_type_id == type_id,
            OntologyPropertyType.tenant_id == tenant_id,
        ).order_by(OntologyPropertyType.sort_order)
    )
    props = result.scalars().all()

    data = [{
        "id": str(p.id),
        "api_name": p.api_name,
        "display_name": p.display_name,
        "data_type": p.data_type,
        "required": p.required,
        "enum_values": p.enum_values,
        "validation": p.validation,
        "pii_level": p.pii_level,
        "sort_order": p.sort_order,
        "version": p.version,
    } for p in props]

    return APIResponse(data=data, meta={"total": len(data)})


@router.post("/object-types/{type_id}/properties", response_model=APIResponse[dict])
async def create_property(
    type_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # verify object type exists
    ot = (await db.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Object type not found")

    # get max sort_order
    max_order = (await db.execute(
        select(func.max(OntologyPropertyType.sort_order)).where(
            OntologyPropertyType.object_type_id == type_id,
        )
    )).scalar() or 0

    prop = OntologyPropertyType(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        object_type_id=type_id,
        api_name=body["api_name"],
        display_name=body.get("display_name", body["api_name"]),
        data_type=body.get("data_type", "string"),
        required=body.get("required", False),
        enum_values=body.get("enum_values"),
        validation=body.get("validation"),
        pii_level=body.get("pii_level", "none"),
        sort_order=body.get("sort_order", max_order + 1),
        version=1,
    )
    db.add(prop)

    # bump object type version (non-breaking: adding property)
    await bump_version(db, type_id, tenant_id)

    await db.commit()
    await db.refresh(prop)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_create_property", resource_type="ontology_property",
        resource_id=str(prop.id),
        metadata={"object_type_id": str(type_id), "api_name": prop.api_name, "data_type": prop.data_type},
    )

    return APIResponse(data={
        "id": str(prop.id),
        "api_name": prop.api_name,
        "display_name": prop.display_name,
        "data_type": prop.data_type,
        "required": prop.required,
        "sort_order": prop.sort_order,
    })


@router.put("/properties/{prop_id}", response_model=APIResponse[dict])
async def update_property(
    prop_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyPropertyType).where(
            OntologyPropertyType.id == prop_id,
            OntologyPropertyType.tenant_id == tenant_id,
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    for field in ("display_name", "data_type", "required", "enum_values", "validation", "pii_level", "sort_order"):
        if field in body:
            setattr(prop, field, body[field])

    before_state = {"display_name": prop.display_name, "data_type": prop.data_type, "required": prop.required}
    prop.version += 1
    await bump_version(db, prop.object_type_id, tenant_id)
    await db.commit()
    await db.refresh(prop)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_update_property", resource_type="ontology_property",
        resource_id=str(prop.id),
        metadata={"before": before_state, "after": body},
    )

    return APIResponse(data={
        "id": str(prop.id),
        "api_name": prop.api_name,
        "display_name": prop.display_name,
        "data_type": prop.data_type,
        "required": prop.required,
        "version": prop.version,
    })


@router.delete("/properties/{prop_id}", response_model=APIResponse[dict])
async def delete_property(
    prop_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyPropertyType).where(
            OntologyPropertyType.id == prop_id,
            OntologyPropertyType.tenant_id == tenant_id,
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    impact = await compute_impact(db, prop.object_type_id, tenant_id)

    deleted_info = {"api_name": prop.api_name, "data_type": prop.data_type, "object_type_id": str(prop.object_type_id)}
    await db.delete(prop)
    await bump_version(db, prop.object_type_id, tenant_id)
    await db.commit()

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_delete_property", resource_type="ontology_property",
        resource_id=str(prop_id),
        metadata={"deleted": deleted_info, "impact": impact},
    )

    return APIResponse(data={
        "id": str(prop_id),
        "deleted": True,
        "impact": impact,
    })


# ===========================================================================
# Link Types
# ===========================================================================

@router.get("/link-types", response_model=APIResponse[list[dict]])
async def list_link_types(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyLinkType).where(OntologyLinkType.tenant_id == tenant_id)
    )
    link_types = result.scalars().all()

    # resolve object type names
    ot_ids = set()
    for lt in link_types:
        ot_ids.add(lt.from_object_type_id)
        ot_ids.add(lt.to_object_type_id)

    ot_names = {}
    if ot_ids:
        ot_q = await db.execute(
            select(OntologyObjectTypeV2.id, OntologyObjectTypeV2.api_name)
            .where(OntologyObjectTypeV2.id.in_(ot_ids))
        )
        ot_names = {r[0]: r[1] for r in ot_q.all()}

    data = [{
        "id": str(lt.id),
        "api_name": lt.api_name,
        "display_name": lt.display_name,
        "from_object_type": ot_names.get(lt.from_object_type_id, ""),
        "to_object_type": ot_names.get(lt.to_object_type_id, ""),
        "cardinality": lt.cardinality,
        "version": lt.version,
        "status": lt.status,
    } for lt in link_types]

    return APIResponse(data=data, meta={"total": len(data)})


@router.post("/link-types", response_model=APIResponse[dict])
async def create_link_type(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    lt = OntologyLinkType(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        api_name=body["api_name"],
        display_name=body.get("display_name", body["api_name"]),
        from_object_type_id=UUID(body["from_object_type_id"]),
        to_object_type_id=UUID(body["to_object_type_id"]),
        cardinality=body.get("cardinality", "many_to_one"),
        version=1,
        status="active",
    )
    db.add(lt)
    await db.commit()
    await db.refresh(lt)

    return APIResponse(data={
        "id": str(lt.id),
        "api_name": lt.api_name,
        "display_name": lt.display_name,
        "cardinality": lt.cardinality,
        "status": lt.status,
    })


# ===========================================================================
# Instances
# ===========================================================================

@router.get("/instances", response_model=APIResponse[list[dict]])
async def list_instances(
    object_type: str | None = Query(None),
    object_type_id: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(OntologyInstance).where(OntologyInstance.tenant_id == tenant_id)

    if object_type_id:
        q = q.where(OntologyInstance.object_type_id == UUID(object_type_id))
    elif object_type:
        # resolve api_name to id
        ot_result = await db.execute(
            select(OntologyObjectTypeV2.id).where(
                OntologyObjectTypeV2.tenant_id == tenant_id,
                OntologyObjectTypeV2.api_name == object_type,
            )
        )
        ot_id = ot_result.scalar_one_or_none()
        if ot_id:
            q = q.where(OntologyInstance.object_type_id == ot_id)

    # count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(OntologyInstance.created_at.desc())
        .limit(page_size).offset((page - 1) * page_size)
    )
    instances = result.scalars().all()

    data = [{
        "id": str(inst.id),
        "object_type_id": str(inst.object_type_id),
        "object_type_version": inst.object_type_version,
        "primary_key_value": inst.primary_key_value,
        "properties": inst.properties,
        "status": inst.status,
        "created_at": inst.created_at.isoformat() if inst.created_at else None,
        "updated_at": inst.updated_at.isoformat() if inst.updated_at else None,
    } for inst in instances]

    meta = PaginationMeta(
        total=total, page=page, page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )
    return APIResponse(data=data, meta=meta.model_dump())


@router.post("/instances", response_model=APIResponse[dict])
async def create_instance(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    object_type_id = UUID(body["object_type_id"])
    properties = body.get("properties", {})
    primary_key_value = body.get("primary_key_value", str(uuid_mod.uuid4()))

    # validate
    errors = await validate_instance(db, object_type_id, properties, tenant_id)
    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})

    # get current version
    ot = (await db.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == object_type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not ot:
        raise HTTPException(status_code=404, detail="Object type not found")

    inst = OntologyInstance(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        object_type_id=object_type_id,
        object_type_version=ot.version,
        primary_key_value=primary_key_value,
        properties=properties,
        status=body.get("status", "active"),
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)

    return APIResponse(data={
        "id": str(inst.id),
        "object_type_id": str(inst.object_type_id),
        "primary_key_value": inst.primary_key_value,
        "properties": inst.properties,
        "status": inst.status,
        "created_at": inst.created_at.isoformat() if inst.created_at else None,
    })


@router.get("/instances/{instance_id}", response_model=APIResponse[dict])
async def get_instance(
    instance_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyInstance).where(
            OntologyInstance.id == instance_id,
            OntologyInstance.tenant_id == tenant_id,
        )
    )
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    # get links
    links_out = await db.execute(
        select(OntologyLink).where(OntologyLink.from_instance_id == instance_id)
    )
    links_in = await db.execute(
        select(OntologyLink).where(OntologyLink.to_instance_id == instance_id)
    )
    links = [{
        "id": str(l.id),
        "link_type_id": str(l.link_type_id),
        "direction": "outgoing",
        "target_instance_id": str(l.to_instance_id),
        "properties": l.properties,
    } for l in links_out.scalars().all()] + [{
        "id": str(l.id),
        "link_type_id": str(l.link_type_id),
        "direction": "incoming",
        "target_instance_id": str(l.from_instance_id),
        "properties": l.properties,
    } for l in links_in.scalars().all()]

    return APIResponse(data={
        "id": str(inst.id),
        "object_type_id": str(inst.object_type_id),
        "object_type_version": inst.object_type_version,
        "primary_key_value": inst.primary_key_value,
        "properties": inst.properties,
        "status": inst.status,
        "links": links,
        "created_at": inst.created_at.isoformat() if inst.created_at else None,
        "updated_at": inst.updated_at.isoformat() if inst.updated_at else None,
    })


@router.get("/instances/{instance_id}/links", response_model=APIResponse[list[dict]])
async def get_instance_links(
    instance_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    links_out = await db.execute(
        select(OntologyLink).where(
            OntologyLink.from_instance_id == instance_id,
            OntologyLink.tenant_id == tenant_id,
        )
    )
    links_in = await db.execute(
        select(OntologyLink).where(
            OntologyLink.to_instance_id == instance_id,
            OntologyLink.tenant_id == tenant_id,
        )
    )

    data = [{
        "id": str(l.id),
        "link_type_id": str(l.link_type_id),
        "direction": "outgoing",
        "from_instance_id": str(l.from_instance_id),
        "to_instance_id": str(l.to_instance_id),
        "properties": l.properties,
    } for l in links_out.scalars().all()] + [{
        "id": str(l.id),
        "link_type_id": str(l.link_type_id),
        "direction": "incoming",
        "from_instance_id": str(l.from_instance_id),
        "to_instance_id": str(l.to_instance_id),
        "properties": l.properties,
    } for l in links_in.scalars().all()]

    return APIResponse(data=data, meta={"total": len(data)})


# ===========================================================================
# Backward-compatible endpoints (synthesize from stores/brands)
# ===========================================================================

@router.get("/objects", response_model=APIResponse[list[dict]])
async def list_objects(
    object_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    objects = []

    if object_type is None or object_type == "store":
        q = (
            select(Store, Brand.name.label("brand_name"))
            .join(Brand, Brand.id == Store.brand_id)
            .where(and_(Store.status == "active", Store.tenant_id == tenant_id))
        )
        if search:
            q = q.where(Store.name.ilike(f"%{search}%"))
        result = await db.execute(q.limit(page_size).offset((page - 1) * page_size))
        for row in result.all():
            s = row[0]
            objects.append({
                "id": str(s.id), "object_type": "store", "display_name": s.name,
                "code": s.code, "description": f"{s.prefecture}{s.city}",
                "relations_count": 3, "created_at": s.created_at.isoformat() if s.created_at else None,
                "meta": {"brand": row[1], "prefecture": s.prefecture, "seat_count": s.seat_count},
            })

    if object_type is None or object_type == "brand":
        q = select(Brand).where(Brand.tenant_id == tenant_id)
        if search:
            q = q.where(Brand.name.ilike(f"%{search}%"))
        result = await db.execute(q.limit(20))
        for b in result.scalars().all():
            objects.append({
                "id": str(b.id), "object_type": "brand", "display_name": b.name,
                "code": "", "description": f"サービスモデル: {b.service_model}",
                "relations_count": 2, "created_at": b.created_at.isoformat() if b.created_at else None,
                "meta": {"service_model": b.service_model},
            })

    if object_type is None or object_type == "employee":
        q = select(Employee).where(Employee.tenant_id == tenant_id)
        if search:
            q = q.where(Employee.name.ilike(f"%{search}%"))
        result = await db.execute(q.limit(20))
        for e in result.scalars().all():
            objects.append({
                "id": str(e.id), "object_type": "employee", "display_name": e.name,
                "code": e.code if hasattr(e, "code") else "", "description": e.role if hasattr(e, "role") else "",
                "relations_count": 1, "created_at": e.created_at.isoformat() if e.created_at else None,
                "meta": {},
            })

    total = len(objects)
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=max(1, (total + page_size - 1) // page_size))
    return APIResponse(data=objects, meta=meta.model_dump())


@router.get("/objects/{object_id}", response_model=APIResponse[dict])
async def get_object(
    object_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Store, Brand.name).join(Brand, Brand.id == Store.brand_id)
        .where(and_(Store.id == object_id, Store.tenant_id == tenant_id))
    )
    row = result.one_or_none()
    if row:
        s, brand_name = row
        relations = [
            {"relation_type": "belongs_to_brand", "display_name": "ブランド所属", "target_id": str(s.brand_id), "target_name": brand_name, "target_type": "brand"},
            {"relation_type": "belongs_to_area", "display_name": "エリア所属", "target_id": str(s.area_id), "target_name": "", "target_type": "area"},
        ]
        task_count = (await db.execute(
            select(func.count(Task.id)).where(and_(Task.store_id == object_id, Task.tenant_id == tenant_id))
        )).scalar() or 0
        data = {
            "id": str(s.id), "object_type": "store", "display_name": s.name,
            "code": s.code, "description": f"{s.prefecture}{s.city}{s.address}",
            "relations": relations, "relations_count": len(relations) + task_count,
            "fields": {
                "prefecture": s.prefecture, "city": s.city, "address": s.address,
                "trade_area_type": s.trade_area_type, "seat_count": s.seat_count,
                "status": s.status, "brand_name": brand_name,
            },
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        return APIResponse(data=data)

    result = await db.execute(
        select(Brand).where(and_(Brand.id == object_id, Brand.tenant_id == tenant_id))
    )
    brand = result.scalar_one_or_none()
    if brand:
        store_count = (await db.execute(
            select(func.count(Store.id)).where(and_(Store.brand_id == object_id, Store.tenant_id == tenant_id))
        )).scalar() or 0
        data = {
            "id": str(brand.id), "object_type": "brand", "display_name": brand.name,
            "code": "", "description": f"サービスモデル: {brand.service_model}",
            "relations": [], "relations_count": store_count,
            "fields": {"service_model": brand.service_model, "store_count": store_count},
            "created_at": brand.created_at.isoformat() if brand.created_at else None,
        }
        return APIResponse(data=data)

    return APIResponse(errors=[{"detail": "Object not found"}])


@router.get("/objects/{object_id}/relations", response_model=APIResponse[list[dict]])
async def get_object_relations(
    object_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    relations = []

    result = await db.execute(
        select(Store, Brand.name).join(Brand, Brand.id == Store.brand_id)
        .where(and_(Store.id == object_id, Store.tenant_id == tenant_id))
    )
    row = result.one_or_none()
    if row:
        s, brand_name = row
        relations.append({"relation_type": "belongs_to_brand", "display_name": "ブランド所属", "direction": "outgoing", "target_id": str(s.brand_id), "target_name": brand_name, "target_type": "brand"})
        relations.append({"relation_type": "belongs_to_area", "display_name": "エリア所属", "direction": "outgoing", "target_id": str(s.area_id), "target_name": "", "target_type": "area"})

        tasks_q = await db.execute(
            select(Task).where(and_(Task.store_id == object_id, Task.tenant_id == tenant_id)).limit(10)
        )
        for t in tasks_q.scalars().all():
            relations.append({"relation_type": "has_task", "display_name": "タスク", "direction": "outgoing", "target_id": str(t.id), "target_name": t.title, "target_type": "task"})
        return APIResponse(data=relations, meta={"total": len(relations)})

    result = await db.execute(
        select(Store).where(and_(Store.brand_id == object_id, Store.tenant_id == tenant_id)).limit(20)
    )
    stores = result.scalars().all()
    if stores:
        for s in stores:
            relations.append({"relation_type": "has_store", "display_name": "店舗", "direction": "outgoing", "target_id": str(s.id), "target_name": s.name, "target_type": "store"})

    return APIResponse(data=relations, meta={"total": len(relations)})


@router.get("/objects/{object_id}/lineage", response_model=APIResponse[list[dict]])
async def get_object_lineage(
    object_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    events = [
        {"event_type": "created", "timestamp": "2025-01-15T09:00:00+09:00", "actor": "system", "description": "初期データ投入により作成", "source": "seed"},
        {"event_type": "updated", "timestamp": "2025-03-01T10:30:00+09:00", "actor": "pos_csv_import", "description": "POS CSVバッチ取り込みにより売上データ更新", "source": "ingestion_batch"},
        {"event_type": "kpi_calculated", "timestamp": "2025-04-30T06:00:00+09:00", "actor": "kpi_engine", "description": "日次KPI算出完了（健全度スコア再計算）", "source": "kpi_pipeline"},
        {"event_type": "task_generated", "timestamp": "2025-04-30T06:30:00+09:00", "actor": "ai_engine", "description": "AI分析により改善タスク自動生成", "source": "ai_task_generator"},
    ]
    return APIResponse(data=events, meta={"total": len(events)})


@router.get("/relation-types", response_model=APIResponse[list[dict]])
async def list_relation_types(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # try v2 link types first
    if await _has_v2_data(db, tenant_id):
        return await list_link_types(db=db, tenant_id=tenant_id)

    # fallback to legacy
    result = await db.execute(
        select(OntologyRelationType).where(OntologyRelationType.tenant_id == tenant_id)
    )
    db_types = result.scalars().all()

    type_ids = set()
    for t in db_types:
        type_ids.add(t.from_object_type_id)
        type_ids.add(t.to_object_type_id)

    type_names = {}
    if type_ids:
        tn_q = await db.execute(
            select(OntologyObjectType.id, OntologyObjectType.name)
            .where(OntologyObjectType.id.in_(type_ids))
        )
        type_names = {r[0]: r[1] for r in tn_q.all()}

    data = [{
        "id": str(t.id), "name": t.name, "display_name": t.display_name,
        "from_object_type": type_names.get(t.from_object_type_id, ""),
        "to_object_type": type_names.get(t.to_object_type_id, ""),
        "cardinality": t.cardinality, "description": t.description or "",
    } for t in db_types]

    return APIResponse(data=data, meta={"total": len(data)})


# ===========================================================================
# Migration Jobs
# ===========================================================================

@router.post("/migrate", response_model=APIResponse[dict])
async def start_migration(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Start a migration job for an object type version change."""
    job = OntologyMigrationJob(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        object_type_id=UUID(body["object_type_id"]),
        from_version=body["from_version"],
        to_version=body["to_version"],
        migration_spec=body.get("migration_spec", {}),
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    result = await run_migration(db, str(job.id), tenant_id)

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_migrate", resource_type="ontology_migration_job",
        resource_id=str(job.id),
        metadata={"from_version": body["from_version"], "to_version": body["to_version"], "result": result},
    )

    return APIResponse(data={
        "job_id": str(job.id),
        **result,
    })


@router.get("/migrate/{job_id}", response_model=APIResponse[dict])
async def get_migration_status(
    job_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Get migration job status."""
    result = await db.execute(
        select(OntologyMigrationJob).where(
            OntologyMigrationJob.id == job_id,
            OntologyMigrationJob.tenant_id == tenant_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Migration job not found")

    return APIResponse(data={
        "id": str(job.id),
        "object_type_id": str(job.object_type_id),
        "from_version": job.from_version,
        "to_version": job.to_version,
        "status": job.status,
        "rows_processed": job.rows_processed,
        "rows_failed": job.rows_failed,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    })


@router.post("/migrate/{job_id}/rollback", response_model=APIResponse[dict])
async def rollback_migration_endpoint(
    job_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Rollback a failed migration."""
    result = await rollback_migration_svc(db, str(job_id))

    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="ontology_migrate_rollback", resource_type="ontology_migration_job",
        resource_id=str(job_id),
        metadata=result,
    )

    return APIResponse(data=result)


# ===========================================================================
# Impact Analysis
# ===========================================================================

@router.get("/object-types/{type_id}/impact", response_model=APIResponse[dict])
async def get_impact(
    type_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Get impact analysis for an object type."""
    impact = await compute_impact(db, type_id, tenant_id)
    return APIResponse(data=impact)
