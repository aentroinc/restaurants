from __future__ import annotations
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class EnrollRequest(BaseModel):
    embedding: list[float] = Field(..., min_length=32)
    employee_id: UUID | None = None  # admin が他人を enroll する場合のみ
    device_info: dict | None = None


class EnrollResponse(BaseModel):
    template_id: UUID
    employee_id: UUID
    enrolled_at: datetime


class VerifyRequest(BaseModel):
    embedding: list[float] = Field(..., min_length=32)
    store_id: UUID
    candidate_employee_ids: list[UUID] | None = None


class VerifyResponse(BaseModel):
    employee_id: UUID | None
    confidence: float
    allowed: bool


class QrInitRequest(BaseModel):
    store_id: UUID
    employee_id: UUID | None = None  # 管理者画面から特定スタッフ用に発行する場合


class QrInitResponse(BaseModel):
    qr_token: str
    expires_at: datetime
    ttl_sec: int


class QrVerifyRequest(BaseModel):
    qr_token: str


class QrVerifyResponse(BaseModel):
    employee_id: UUID | None
    store_id: UUID | None
    valid: bool


class PinSetRequest(BaseModel):
    employee_id: UUID
    pin: str = Field(..., pattern=r"^\d{4}$")


class PinVerifyRequest(BaseModel):
    employee_id: UUID
    pin: str = Field(..., pattern=r"^\d{4}$")


class PinVerifyResponse(BaseModel):
    valid: bool
    locked: bool = False


# ---- Clock ----

class ClockEventCreate(BaseModel):
    employee_id: UUID
    store_id: UUID
    lat: float | None = None
    lon: float | None = None
    auth_method: str = Field(..., pattern="^(face|qr|pin)$")
    confidence: float | None = None


class ClockEventRead(BaseModel):
    id: UUID
    employee_id: UUID
    store_id: UUID
    event_type: str
    lat: float | None
    lon: float | None
    geofence_ok: bool
    auth_method: str
    confidence: float | None
    occurred_at: datetime
