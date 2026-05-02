"""UserStoreAssignment — multi-store role assignments.

A single user can be:
  - manager of exactly 1 store (is_default=True)
  - sv covering 5-10 stores
  - admin covering all stores in tenant

`role` here is the *contextual* role for that store and may differ from the
user's global `User.role` (e.g. an admin acting as manager when looking at one
specific store). For the demo we keep them aligned.
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserStoreAssignment(Base):
    __tablename__ = "user_store_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "store_id", name="uq_user_store"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # manager | staff | sv | admin
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    granted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="store_assignments")
    granter = relationship("User", foreign_keys=[granted_by])
