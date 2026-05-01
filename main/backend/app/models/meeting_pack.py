import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Date, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class BoardMeetingPack(Base):
    __tablename__ = "board_meeting_packs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("BoardMeetingItem", back_populates="pack", order_by="BoardMeetingItem.sort_order")
    company = relationship("Company")


class BoardMeetingItem(Base):
    __tablename__ = "board_meeting_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pack_id: Mapped[str] = mapped_column(String(36), ForeignKey("board_meeting_packs.id"), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[dict | None] = mapped_column(JSON)
    store_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("stores.id"))
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pack = relationship("BoardMeetingPack", back_populates="items")
