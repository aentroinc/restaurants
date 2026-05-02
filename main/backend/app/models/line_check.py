"""Line Check (digital opening/closing/4h checklist) models.

Crunchtime / Zenput equivalent for Zensho. Forces photos, geofence, and timers.
NG answers auto-create tasks via the task module.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Boolean, Numeric, Text, ForeignKey, DateTime, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    schedule_type: Mapped[str] = mapped_column(String(20), nullable=False)  # opening / 4h / closing / weekly
    items_json: Mapped[list | None] = mapped_column(JSONB, default=list)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    store_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("ChecklistItem", back_populates="template", cascade="all, delete-orphan", order_by="ChecklistItem.order")
    runs = relationship("ChecklistRun", back_populates="template")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_temperature: Mapped[bool] = mapped_column(Boolean, default=False)
    min_temp: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    max_temp: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    ng_action_template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    template = relationship("ChecklistTemplate", back_populates="items")


class ChecklistRun(Base):
    __tablename__ = "checklist_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    geofence_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress / completed / failed
    lat: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    lon: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)

    template = relationship("ChecklistTemplate", back_populates="runs")
    answers = relationship("ChecklistAnswer", back_populates="run", cascade="all, delete-orphan")


class ChecklistAnswer(Base):
    __tablename__ = "checklist_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_items.id"), nullable=False)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    run = relationship("ChecklistRun", back_populates="answers")
