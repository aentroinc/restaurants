import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class IndustryBenchmark(Base):
    __tablename__ = "industry_benchmarks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int | None] = mapped_column(Integer)
    p25: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    p50: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    p75: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    p90: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
