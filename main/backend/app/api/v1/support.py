"""Support ticket CRUD.

POST   /api/v1/support/tickets          — create ticket (open by default)
GET    /api/v1/support/tickets          — list (filter by status / category)
GET    /api/v1/support/tickets/{id}     — fetch
PATCH  /api/v1/support/tickets/{id}     — update status / resolution_note
"""
from __future__ import annotations

import uuid as uuidlib
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.support import SupportTicket
from app.schemas.common import APIResponse

router = APIRouter(prefix="/api/v1/support", tags=["support"])


# ---------- schemas ----------


class TicketCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=40)
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    screenshot_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    store_id: Optional[UUID] = None


class TicketUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|in_progress|resolved|closed)$")
    resolution_note: Optional[str] = None


class TicketRead(BaseModel):
    id: UUID
    category: str
    subject: str
    body: str
    screenshot_url: Optional[str] = None
    status: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- helpers ----------


def _to_read(t: SupportTicket) -> TicketRead:
    return TicketRead.model_validate(t, from_attributes=True)


def _safe_tenant_uuid(tenant_id: str | None) -> UUID | None:
    if not tenant_id:
        return None
    try:
        return UUID(tenant_id)
    except (ValueError, TypeError):
        return None


# ---------- endpoints ----------


@router.post("/tickets", response_model=APIResponse[TicketRead])
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ticket = SupportTicket(
        id=uuidlib.uuid4(),
        tenant_id=_safe_tenant_uuid(tenant_id),
        category=payload.category,
        subject=payload.subject,
        body=payload.body,
        screenshot_url=payload.screenshot_url,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        store_id=payload.store_id,
        status="open",
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return APIResponse(data=_to_read(ticket))


@router.get("/tickets", response_model=APIResponse[list[TicketRead]])
async def list_tickets(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(limit)
    tuid = _safe_tenant_uuid(tenant_id)
    if tuid is not None:
        q = q.where(SupportTicket.tenant_id == tuid)
    if status:
        q = q.where(SupportTicket.status == status)
    if category:
        q = q.where(SupportTicket.category == category)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[_to_read(r) for r in rows], meta={"count": len(rows)})


@router.get("/tickets/{ticket_id}", response_model=APIResponse[TicketRead])
async def get_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ticket = await _fetch(db, ticket_id, tenant_id)
    return APIResponse(data=_to_read(ticket))


@router.patch("/tickets/{ticket_id}", response_model=APIResponse[TicketRead])
async def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ticket = await _fetch(db, ticket_id, tenant_id)
    if payload.status is not None:
        ticket.status = payload.status
        if payload.status in ("resolved", "closed"):
            ticket.resolved_at = datetime.now(timezone.utc)
    if payload.resolution_note is not None:
        ticket.resolution_note = payload.resolution_note
    await db.commit()
    await db.refresh(ticket)
    return APIResponse(data=_to_read(ticket))


async def _fetch(db: AsyncSession, ticket_id: UUID, tenant_id: str) -> SupportTicket:
    q = select(SupportTicket).where(SupportTicket.id == ticket_id)
    tuid = _safe_tenant_uuid(tenant_id)
    if tuid is not None:
        q = q.where(SupportTicket.tenant_id == tuid)
    row = (await db.execute(q)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="ticket not found")
    return row
