import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    incident_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active")
    summary: Mapped[str | None] = mapped_column(Text)
    impacted_stores: Mapped[list | None] = mapped_column(JSONB, default=list)
    impacted_skus: Mapped[list | None] = mapped_column(JSONB, default=list)
    impacted_routes: Mapped[list | None] = mapped_column(JSONB, default=list)
    impacted_factories: Mapped[list | None] = mapped_column(JSONB, default=list)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    actions = relationship("Action", back_populates="incident", cascade="all, delete-orphan")
    scenarios = relationship("IncidentScenario", back_populates="incident", cascade="all, delete-orphan")


class IncidentScenario(Base):
    __tablename__ = "incident_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    pros: Mapped[list | None] = mapped_column(JSONB, default=list)
    cons: Mapped[list | None] = mapped_column(JSONB, default=list)
    expected_impact: Mapped[list | None] = mapped_column(JSONB, default=list)
    confidence: Mapped[str] = mapped_column(String(20), default="Medium")
    risk: Mapped[str] = mapped_column(String(20), default="Medium")
    recommended: Mapped[bool] = mapped_column(Boolean, default=False)
    selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="scenarios")


class Action(Base):
    __tablename__ = "actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    incident_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    owner_role: Mapped[str | None] = mapped_column(String(50))
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="pending")
    expected_impact: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(20), default="Medium")
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    incident = relationship("Incident", back_populates="actions")
    audit_logs = relationship("ActionAuditLog", back_populates="action", cascade="all, delete-orphan")


class ActionAuditLog(Base):
    __tablename__ = "action_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    action_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("actions.id"), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_role: Mapped[str | None] = mapped_column(String(50))
    actor_name: Mapped[str | None] = mapped_column(String(255))
    event: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    action = relationship("Action", back_populates="audit_logs")
