from fastapi import APIRouter, Depends, Query, Path
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
from app.models.ontology import OntologyObjectType, OntologyRelationType
from app.schemas.common import APIResponse, PaginationMeta
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/ontology", tags=["ontology"])

SYSTEM_OBJECT_TYPES = [
    {"id": "10000000-0000-0000-0000-000000000001", "object_type": "store", "display_name": "店舗", "description": "飲食店舗マスタ。POSデータ・勤怠データの集約単位。", "base_schema": "stores", "icon": "store", "field_count": 14},
    {"id": "10000000-0000-0000-0000-000000000002", "object_type": "brand", "display_name": "ブランド", "description": "飲食ブランド。複数店舗を束ねるサービスモデル単位。", "base_schema": "brands", "icon": "tag", "field_count": 6},
    {"id": "10000000-0000-0000-0000-000000000003", "object_type": "product", "display_name": "商品", "description": "メニュー商品マスタ。原価・カテゴリ情報を保持。", "base_schema": "products", "icon": "package", "field_count": 8},
    {"id": "10000000-0000-0000-0000-000000000004", "object_type": "employee", "display_name": "従業員", "description": "店舗スタッフ・SV・エリアマネージャー等の人事マスタ。", "base_schema": "employees", "icon": "user", "field_count": 10},
    {"id": "10000000-0000-0000-0000-000000000005", "object_type": "task", "display_name": "タスク", "description": "改善タスク。AIまたはSVが起票し、店舗で実行。", "base_schema": "tasks", "icon": "check-square", "field_count": 12},
    {"id": "10000000-0000-0000-0000-000000000006", "object_type": "area", "display_name": "エリア", "description": "店舗を束ねる管理エリア。SV管轄単位。", "base_schema": "areas", "icon": "map", "field_count": 5},
    {"id": "10000000-0000-0000-0000-000000000007", "object_type": "region", "display_name": "リージョン", "description": "エリアを束ねる上位地域区分。", "base_schema": "regions", "icon": "globe", "field_count": 4},
    {"id": "10000000-0000-0000-0000-000000000008", "object_type": "daily_kpi", "display_name": "日次KPI", "description": "店舗ごとの日次KPIスナップショット。売上・原価率・FL比率等。", "base_schema": "store_daily_kpi", "icon": "bar-chart", "field_count": 16},
    {"id": "10000000-0000-0000-0000-000000000009", "object_type": "sv_visit", "display_name": "SV訪問", "description": "SVによる店舗訪問記録。チェックリスト結果を含む。", "base_schema": "sv_visits", "icon": "clipboard", "field_count": 9},
    {"id": "10000000-0000-0000-0000-00000000000a", "object_type": "review", "display_name": "口コミ", "description": "Googleレビュー等の口コミデータ。感情分析結果付き。", "base_schema": "reviews", "icon": "message-circle", "field_count": 7},
]

SYSTEM_RELATION_TYPES = [
    {"id": "20000000-0000-0000-0000-000000000001", "name": "belongs_to_brand", "display_name": "ブランド所属", "from_type": "store", "to_type": "brand", "cardinality": "many_to_one"},
    {"id": "20000000-0000-0000-0000-000000000002", "name": "belongs_to_area", "display_name": "エリア所属", "from_type": "store", "to_type": "area", "cardinality": "many_to_one"},
    {"id": "20000000-0000-0000-0000-000000000003", "name": "area_in_region", "display_name": "リージョン所属", "from_type": "area", "to_type": "region", "cardinality": "many_to_one"},
    {"id": "20000000-0000-0000-0000-000000000004", "name": "has_product", "display_name": "商品提供", "from_type": "brand", "to_type": "product", "cardinality": "one_to_many"},
    {"id": "20000000-0000-0000-0000-000000000005", "name": "has_task", "display_name": "タスク割当", "from_type": "store", "to_type": "task", "cardinality": "one_to_many"},
    {"id": "20000000-0000-0000-0000-000000000006", "name": "assigned_to", "display_name": "担当者", "from_type": "task", "to_type": "employee", "cardinality": "many_to_one"},
    {"id": "20000000-0000-0000-0000-000000000007", "name": "has_kpi", "display_name": "KPI紐付", "from_type": "store", "to_type": "daily_kpi", "cardinality": "one_to_many"},
    {"id": "20000000-0000-0000-0000-000000000008", "name": "has_visit", "display_name": "SV訪問", "from_type": "store", "to_type": "sv_visit", "cardinality": "one_to_many"},
    {"id": "20000000-0000-0000-0000-000000000009", "name": "managed_by", "display_name": "店長", "from_type": "store", "to_type": "employee", "cardinality": "many_to_one"},
]


@router.get("/object-types", response_model=APIResponse[list[dict]])
async def list_object_types(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(OntologyObjectType).where(OntologyObjectType.tenant_id == tenant_id)
    )
    db_types = result.scalars().all()

    if db_types:
        data = [{
            "id": str(t.id),
            "object_type": t.name,
            "display_name": t.display_name,
            "description": t.description or "",
            "base_schema": t.base_table or "",
            "custom_schema": {},
            "icon": t.icon or "box",
            "is_system": t.is_system,
            "field_count": 0,
        } for t in db_types]
    else:
        data = [{
            "id": t["id"],
            "object_type": t["object_type"],
            "display_name": t["display_name"],
            "description": t["description"],
            "base_schema": t["base_schema"],
            "custom_schema": {},
            "icon": t["icon"],
            "is_system": True,
            "field_count": t["field_count"],
        } for t in SYSTEM_OBJECT_TYPES]

    return APIResponse(data=data, meta={"total": len(data)})


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

    if db_types:
        data = [{
            "id": str(t.id), "name": t.name, "display_name": t.display_name,
            "from_object_type": "", "to_object_type": "",
            "cardinality": t.cardinality, "description": t.description or "",
        } for t in db_types]
    else:
        data = [{
            "id": t["id"], "name": t["name"], "display_name": t["display_name"],
            "from_object_type": t["from_type"], "to_object_type": t["to_type"],
            "cardinality": t["cardinality"],
        } for t in SYSTEM_RELATION_TYPES]

    return APIResponse(data=data, meta={"total": len(data)})
