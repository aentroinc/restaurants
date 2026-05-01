import uuid
from datetime import date, datetime
from sqlalchemy import String, Boolean, Integer, Float, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prefecture: Mapped[str] = mapped_column(String(10), nullable=False)
    city: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_area_type: Mapped[str] = mapped_column(String(30), nullable=False)
    opening_date: Mapped[date | None] = mapped_column(Date)
    seat_count: Mapped[int | None] = mapped_column(Integer)
    parking: Mapped[bool] = mapped_column(Boolean, default=False)
    drive_through: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery: Mapped[bool] = mapped_column(Boolean, default=False)
    takeout: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    manager_employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    brand = relationship("Brand", back_populates="stores")
    area = relationship("Area", back_populates="stores")
    manager = relationship("Employee", foreign_keys=[manager_employee_id])
    daily_sales = relationship("DailyStoreSales", back_populates="store")
    kpis = relationship("StoreDailyKPI", back_populates="store")
    tasks = relationship("Task", back_populates="store")
    reviews = relationship("Review", back_populates="store")
    sv_visits = relationship("SVVisit", back_populates="store")
    pls = relationship("StorePL", back_populates="store")
