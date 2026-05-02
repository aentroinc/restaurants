from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from app.database import get_db
from app.models.campaign import MenuItem, Campaign, CampaignBreakdown
from app.models.brand import Brand
from app.schemas.common import APIResponse
from app.schemas.campaign import (
    MenuItemRead,
    MenuItemPerformance,
    MenuPerformanceCell,
    CampaignRead,
    CampaignBreakdownRead,
    CampaignCreate,
    CampaignUpdate,
)
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/campaigns", tags=["campaigns"])


def _campaign_to_read(c: Campaign, brand_name: str | None, breakdowns: list[CampaignBreakdown]) -> CampaignRead:
    return CampaignRead(
        id=c.id, name=c.name, brand_id=c.brand_id, brand_name=brand_name,
        target_menu_ids=c.target_menu_ids or [],
        target_segment=c.target_segment,
        target_store_ids=c.target_store_ids or [],
        start_date=c.start_date, end_date=c.end_date, status=c.status,
        sales_lift_pct=c.sales_lift_pct, customer_lift_pct=c.customer_lift_pct,
        new_customer_rate=c.new_customer_rate, repeat_rate=c.repeat_rate,
        confidence_lower=c.confidence_lower, confidence_upper=c.confidence_upper,
        breakdowns=[
            CampaignBreakdownRead(
                id=b.id, dimension=b.dimension, bucket_key=b.bucket_key,
                sales_lift_pct=b.sales_lift_pct,
                customer_lift_pct=b.customer_lift_pct,
                sample_size=b.sample_size,
            ) for b in breakdowns
        ],
        created_at=c.created_at,
    )


@router.get("/", response_model=APIResponse[list[CampaignRead]])
async def list_campaigns(
    status: str | None = Query(None),
    brand_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Campaign, Brand.name).outerjoin(
        Brand, Brand.id == Campaign.brand_id
    ).where(Campaign.tenant_id == tenant_id)
    if status:
        q = q.where(Campaign.status == status)
    if brand_id:
        q = q.where(Campaign.brand_id == brand_id)
    q = q.order_by(Campaign.start_date.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()

    items: list[CampaignRead] = []
    for c, brand_name in rows:
        items.append(_campaign_to_read(c, brand_name, []))
    return APIResponse(data=items)


@router.get("/menu-items", response_model=APIResponse[list[MenuItemRead]])
async def list_menu_items(
    brand_id: UUID | None = Query(None),
    is_new: bool | None = Query(None),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(MenuItem, Brand.name).join(
        Brand, Brand.id == MenuItem.brand_id
    ).where(MenuItem.tenant_id == tenant_id)
    if brand_id:
        q = q.where(MenuItem.brand_id == brand_id)
    if is_new is not None:
        q = q.where(MenuItem.is_new == is_new)
    if category:
        q = q.where(MenuItem.category == category)
    q = q.order_by(MenuItem.code)
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()
    items = [
        MenuItemRead(
            id=m.id, brand_id=m.brand_id, brand_name=brand_name,
            code=m.code, name=m.name, category=m.category,
            price=m.price, cost=m.cost,
            gross_margin_estimate=m.gross_margin_estimate,
            is_new=m.is_new, launched_at=m.launched_at,
            consumes_skus=m.consumes_skus or [],
            status=m.status,
        ) for m, brand_name in rows
    ]
    return APIResponse(data=items)


@router.get("/menu-items/{menu_item_id}/performance", response_model=APIResponse[MenuItemPerformance])
async def menu_item_performance(
    menu_item_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(MenuItem).where(and_(
        MenuItem.id == menu_item_id, MenuItem.tenant_id == tenant_id
    )))
    m = q.scalar_one_or_none()
    if not m:
        return APIResponse(errors=[{"detail": "Menu item not found"}])
    location_types = ["駅前", "ロードサイド", "郊外", "オフィス街"]
    time_slots = ["7-10", "10-14", "14-17", "17-21", "21-24"]
    cells: list[MenuPerformanceCell] = []
    for lt in location_types:
        for ts in time_slots:
            base = 100.0
            if lt == "駅前" and ts in ("7-10", "10-14"):
                base = 130.0
            elif lt == "オフィス街" and ts == "10-14":
                base = 145.0
            elif lt == "ロードサイド" and ts == "17-21":
                base = 120.0
            elif lt == "郊外" and ts == "17-21":
                base = 110.0
            cells.append(MenuPerformanceCell(
                location_type=lt, time_slot=ts,
                sales_index=base, customer_index=base * 0.95,
                sample_size=int(base * 5),
            ))
    return APIResponse(data=MenuItemPerformance(
        menu_item_id=m.id, name=m.name, cells=cells,
    ))


@router.get("/{campaign_id}", response_model=APIResponse[CampaignRead])
async def get_campaign(
    campaign_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(Campaign, Brand.name).outerjoin(
            Brand, Brand.id == Campaign.brand_id
        ).where(and_(Campaign.id == campaign_id, Campaign.tenant_id == tenant_id))
    )
    row = q.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Campaign not found"}])
    c, brand_name = row
    bk = await db.execute(
        select(CampaignBreakdown).where(and_(
            CampaignBreakdown.campaign_id == campaign_id,
            CampaignBreakdown.tenant_id == tenant_id,
        )).order_by(CampaignBreakdown.dimension, CampaignBreakdown.bucket_key)
    )
    breakdowns = bk.scalars().all()
    return APIResponse(data=_campaign_to_read(c, brand_name, list(breakdowns)))


@router.get("/{campaign_id}/breakdown", response_model=APIResponse[list[CampaignBreakdownRead]])
async def campaign_breakdown(
    campaign_id: UUID = Path(...),
    dimension: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(CampaignBreakdown).where(and_(
        CampaignBreakdown.campaign_id == campaign_id,
        CampaignBreakdown.tenant_id == tenant_id,
    ))
    if dimension:
        q = q.where(CampaignBreakdown.dimension == dimension)
    q = q.order_by(CampaignBreakdown.dimension, CampaignBreakdown.bucket_key)
    rows = (await db.execute(q)).scalars().all()
    items = [
        CampaignBreakdownRead(
            id=b.id, dimension=b.dimension, bucket_key=b.bucket_key,
            sales_lift_pct=b.sales_lift_pct,
            customer_lift_pct=b.customer_lift_pct,
            sample_size=b.sample_size,
        ) for b in rows
    ]
    return APIResponse(data=items)


@router.post("/", response_model=APIResponse[CampaignRead])
async def create_campaign(
    payload: CampaignCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    c = Campaign(
        tenant_id=tenant_id,
        name=payload.name,
        brand_id=payload.brand_id,
        target_menu_ids=[str(x) for x in payload.target_menu_ids],
        target_segment=payload.target_segment,
        target_store_ids=[str(x) for x in payload.target_store_ids],
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)

    brand_name = None
    if c.brand_id:
        bq = await db.execute(select(Brand.name).where(Brand.id == c.brand_id))
        brand_name = bq.scalar()
    return APIResponse(data=_campaign_to_read(c, brand_name, []))


@router.patch("/{campaign_id}", response_model=APIResponse[CampaignRead])
async def update_campaign(
    campaign_id: UUID = Path(...),
    payload: CampaignUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(Campaign).where(and_(
        Campaign.id == campaign_id, Campaign.tenant_id == tenant_id
    )))
    c = q.scalar_one_or_none()
    if not c:
        return APIResponse(errors=[{"detail": "Campaign not found"}])

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k in ("target_menu_ids", "target_store_ids") and v is not None:
            setattr(c, k, [str(x) for x in v])
        else:
            setattr(c, k, v)
    await db.commit()
    await db.refresh(c)

    brand_name = None
    if c.brand_id:
        bq = await db.execute(select(Brand.name).where(Brand.id == c.brand_id))
        brand_name = bq.scalar()

    bk = await db.execute(
        select(CampaignBreakdown).where(and_(
            CampaignBreakdown.campaign_id == campaign_id,
            CampaignBreakdown.tenant_id == tenant_id,
        )).order_by(CampaignBreakdown.dimension, CampaignBreakdown.bucket_key)
    )
    breakdowns = list(bk.scalars().all())
    return APIResponse(data=_campaign_to_read(c, brand_name, breakdowns))
