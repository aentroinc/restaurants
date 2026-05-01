from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID, uuid4
from app.database import get_db
from app.models.meeting_pack import BoardMeetingPack, BoardMeetingItem
from app.schemas.common import APIResponse
from app.schemas.meeting import MeetingPackCreate, MeetingPackResponse, MeetingItemCreate, MeetingItemResponse

router = APIRouter(prefix="/api/v1/meeting-packs", tags=["meeting"])

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"


@router.get("", response_model=APIResponse[list[MeetingPackResponse]])
async def list_meeting_packs(db: AsyncSession = Depends(get_db)):
    q = await db.execute(
        select(BoardMeetingPack).order_by(BoardMeetingPack.meeting_date.desc())
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
async def get_meeting_pack(pack_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(BoardMeetingPack).where(BoardMeetingPack.id == pack_id))
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
async def create_meeting_pack(body: MeetingPackCreate, db: AsyncSession = Depends(get_db)):
    pack = BoardMeetingPack(
        id=uuid4(), tenant_id=UUID(DEMO_TENANT_ID),
        company_id=body.company_id, title=body.title,
        meeting_date=body.meeting_date, status="draft",
    )
    db.add(pack)
    await db.commit()
    await db.refresh(pack)
    return APIResponse(data=MeetingPackResponse(
        id=pack.id, title=pack.title, meeting_date=pack.meeting_date,
        status=pack.status, created_at=pack.created_at,
    ))


@router.post("/{pack_id}/items", response_model=APIResponse[MeetingItemResponse])
async def add_meeting_item(pack_id: UUID = Path(...), body: MeetingItemCreate = ..., db: AsyncSession = Depends(get_db)):
    item = BoardMeetingItem(
        id=uuid4(), pack_id=pack_id, item_type=body.item_type,
        title=body.title, content=body.content, store_id=body.store_id,
        task_id=body.task_id, sort_order=body.sort_order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return APIResponse(data=MeetingItemResponse(
        id=item.id, item_type=item.item_type, title=item.title,
        content=item.content, store_id=item.store_id, task_id=item.task_id,
        sort_order=item.sort_order,
    ))
