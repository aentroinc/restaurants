from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID, uuid4
from app.database import get_db
from app.models.meeting_pack import BoardMeetingPack, BoardMeetingItem
from app.schemas.common import APIResponse
from app.schemas.meeting import MeetingPackCreate, MeetingPackResponse, MeetingItemCreate, MeetingItemResponse
from app.auth import get_tenant_id, require_role
from app.middleware.audit import log_audit

router = APIRouter(prefix="/api/v1/meeting-packs", tags=["meeting"])


@router.get("", response_model=APIResponse[list[MeetingPackResponse]])
async def list_meeting_packs(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(BoardMeetingPack)
        .where(BoardMeetingPack.tenant_id == tenant_id)
        .order_by(BoardMeetingPack.meeting_date.desc())
    )
    packs = []
    for p in q.scalars().all():
        items_q = await db.execute(
            select(BoardMeetingItem).where(BoardMeetingItem.pack_id == p.id).order_by(BoardMeetingItem.sort_order)
        )
        items = [MeetingItemResponse(
            id=i.id, item_type=i.item_type, title=i.title,
            content=i.content, store_id=i.store_id, task_id=i.task_id,
            sort_order=i.sort_order,
        ) for i in items_q.scalars().all()]

        packs.append(MeetingPackResponse(
            id=p.id, title=p.title, meeting_date=p.meeting_date,
            status=p.status, created_at=p.created_at, items=items,
        ))
    return APIResponse(data=packs)


@router.get("/{pack_id}", response_model=APIResponse[MeetingPackResponse])
async def get_meeting_pack(
    pack_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(BoardMeetingPack).where(and_(BoardMeetingPack.id == pack_id, BoardMeetingPack.tenant_id == tenant_id))
    )
    p = q.scalar_one_or_none()
    if not p:
        return APIResponse(errors=[{"detail": "Meeting pack not found"}])

    items_q = await db.execute(
        select(BoardMeetingItem).where(BoardMeetingItem.pack_id == p.id).order_by(BoardMeetingItem.sort_order)
    )
    items = [MeetingItemResponse(
        id=i.id, item_type=i.item_type, title=i.title,
        content=i.content, store_id=i.store_id, task_id=i.task_id,
        sort_order=i.sort_order,
    ) for i in items_q.scalars().all()]

    return APIResponse(data=MeetingPackResponse(
        id=p.id, title=p.title, meeting_date=p.meeting_date,
        status=p.status, created_at=p.created_at, items=items,
    ))


@router.post("", response_model=APIResponse[MeetingPackResponse])
async def create_meeting_pack(
    body: MeetingPackCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user=Depends(require_role("admin", "director")),
):
    pack = BoardMeetingPack(
        id=uuid4(), tenant_id=UUID(tenant_id),
        company_id=body.company_id, title=body.title,
        meeting_date=body.meeting_date, status="draft",
    )
    db.add(pack)
    await db.commit()
    await db.refresh(pack)

    log_audit(tenant_id, None, "create_meeting_pack", "meeting_pack", str(pack.id), {"title": body.title})

    return APIResponse(data=MeetingPackResponse(
        id=pack.id, title=pack.title, meeting_date=pack.meeting_date,
        status=pack.status, created_at=pack.created_at,
    ))


@router.post("/{pack_id}/items", response_model=APIResponse[MeetingItemResponse])
async def add_meeting_item(
    pack_id: UUID = Path(...),
    body: MeetingItemCreate = ...,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # verify pack belongs to tenant
    pack_q = await db.execute(
        select(BoardMeetingPack.id).where(and_(BoardMeetingPack.id == pack_id, BoardMeetingPack.tenant_id == tenant_id))
    )
    if not pack_q.scalar():
        return APIResponse(errors=[{"detail": "Meeting pack not found"}])

    item = BoardMeetingItem(
        id=uuid4(), pack_id=pack_id, item_type=body.item_type,
        title=body.title, content=body.content, store_id=body.store_id,
        task_id=body.task_id, sort_order=body.sort_order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    log_audit(tenant_id, None, "add_meeting_item", "meeting_item", str(item.id), {"title": body.title, "pack_id": str(pack_id)})

    return APIResponse(data=MeetingItemResponse(
        id=item.id, item_type=item.item_type, title=item.title,
        content=item.content, store_id=item.store_id, task_id=item.task_id,
        sort_order=item.sort_order,
    ))
