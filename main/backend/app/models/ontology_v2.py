import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class OntologyObjectTypeV2(Base):
    __tablename__ = "ontology_object_types_v2"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    api_name: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str | None] = mapped_column(String, nullable=True)
    primary_key_field: Mapped[str] = mapped_column(String, default="id")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="active")  # draft | active | deprecated
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    properties = relationship("OntologyPropertyType", back_populates="object_type", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_ot_v2_tenant_api", "tenant_id", "api_name", unique=True),
    )


class OntologyPropertyType(Base):
    __tablename__ = "ontology_property_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    object_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_object_types_v2.id"))
    api_name: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    data_type: Mapped[str] = mapped_column(String, nullable=False)  # string|int|float|bool|timestamp|enum|array|object
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    enum_values: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    validation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # {min, max, regex}
    pii_level: Mapped[str] = mapped_column(String, default="none")  # none|low|high
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)

    object_type = relationship("OntologyObjectTypeV2", back_populates="properties")


class OntologyLinkType(Base):
    __tablename__ = "ontology_link_types_v2"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    api_name: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    from_object_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_object_types_v2.id"))
    to_object_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_object_types_v2.id"))
    cardinality: Mapped[str] = mapped_column(String, default="many_to_one")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OntologyInstance(Base):
    __tablename__ = "ontology_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    object_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_object_types_v2.id"))
    object_type_version: Mapped[int] = mapped_column(Integer, default=1)
    primary_key_value: Mapped[str] = mapped_column(String, nullable=False)
    properties: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String, default="active")
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_instance_lookup", "tenant_id", "object_type_id", "primary_key_value", unique=True),
    )


class OntologyLink(Base):
    __tablename__ = "ontology_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    link_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_link_types_v2.id"))
    link_type_version: Mapped[int] = mapped_column(Integer, default=1)
    from_instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_instances.id"))
    to_instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ontology_instances.id"))
    properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
