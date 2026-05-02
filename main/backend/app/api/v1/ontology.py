from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime, date
from app.database import get_db
from app.models.store import Store
from app.models.brand import Brand
from app.models.product import Product
from app.models.employee import Employee
from app.models.task import Task
from app.models.ontology import OntologyObjectType, OntologyRelationType, OntologyField
from app.schemas.common import APIResponse, PaginationMeta
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/ontology", tags=["ontology"])


@router.get("/object-types", response_model=APIResponse[list[dict]])
async def list_object_types(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyObjectType).where(OntologyObjectType.tenant_id == tenant_id)
    )
    db_types = result.scalars().all()

    # count fields per object type
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
    } for t in db_types]

    return APIResponse(data=data, meta={"total": len(data)})


@router.post("/object-types", response_model=APIResponse[dict])
async def create_object_type(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    import uuid
    # get company_id from an existing object type
    existing = await db.execute(
        select(OntologyObjectType.company_id).where(OntologyObjectType.tenant_id == tenant_id).limit(1)
    )
    company_id = existing.scalar_one_or_none()

    new_type = OntologyObjectType(
        id=uuid.uuid4(),
        tenant_id=UUID(tenant_id),
        company_id=company_id or UUID(tenant_id),
        name=body.get("name", "custom_type"),
        display_name=body.get("display_name", "カスタムタイプ"),
        description=body.get("description"),
        base_table=body.get("base_table"),
        icon=body.get("icon", "box"),
        is_system=False,
    )
    db.add(new_type)
    await db.commit()
    await db.refresh(new_type)

    data = {
        "id": str(new_type.id),
        "object_type": new_type.name,
        "display_name": new_type.display_name,
        "description": new_type.description or "",
        "base_schema": new_type.base_table or "",
        "custom_schema": {},
        "icon": new_type.icon or "box",
        "is_system": new_type.is_system,
        "field_count": 0,
    }
    return APIResponse(data=data)


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
    result = await db.execute(
        select(OntologyRelationType).where(OntologyRelationType.tenant_id == tenant_id)
    )
    db_types = result.scalars().all()

    # resolve from/to object type names
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
