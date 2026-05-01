from typing import TypeVar, Generic, Any
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    data: T | None = None
    meta: dict[str, Any] = {}
    errors: list[dict[str, Any]] = []


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
