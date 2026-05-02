"""BaseConnector ABC + registry.

Each connector is registered under a stable string id (e.g. "smaregi") and
must implement: test_connection, fetch, transform.

Authentication is intentionally out of scope of fetch/transform — credentials
are decrypted by the IngestionRunner and passed via a context dict.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncIterator, ClassVar, Iterable


@dataclass
class CanonicalRecord:
    """A normalized row destined for a Silver-layer table.

    target_table: e.g. "daily_sales" / "product_sales" / "labor_actuals"
    payload: dict matching the canonical schema for that table
    source_id: stable id from the source system, used for idempotent upsert
    """
    target_table: str
    payload: dict
    source_id: str


@dataclass
class FetchResult:
    """Outcome of one fetch() invocation."""
    raw_records: list[dict] = field(default_factory=list)
    next_cursor: str | None = None
    rate_limited: bool = False
    error: str | None = None


class BaseConnector(abc.ABC):
    """Connector interface.

    Subclasses set:
      - id: short string id
      - display_name: human-friendly name
      - auth_type: oauth2 | api_key | basic | csv
    """
    id: ClassVar[str]
    display_name: ClassVar[str]
    auth_type: ClassVar[str]
    target_tables: ClassVar[tuple[str, ...]] = ()

    def __init__(self, credentials: dict, config: dict | None = None):
        self.credentials = credentials
        self.config = config or {}

    @abc.abstractmethod
    async def test_connection(self) -> bool: ...

    @abc.abstractmethod
    async def fetch(
        self, *, since: datetime | None = None, cursor: str | None = None,
        limit: int = 500,
    ) -> FetchResult:
        ...

    @abc.abstractmethod
    def transform(self, raw_records: Iterable[dict]) -> list[CanonicalRecord]: ...


class ConnectorRegistry:
    _registry: dict[str, type[BaseConnector]] = {}

    @classmethod
    def register(cls, connector_cls: type[BaseConnector]) -> type[BaseConnector]:
        if not getattr(connector_cls, "id", None):
            raise ValueError("Connector must define a class-level `id`")
        cls._registry[connector_cls.id] = connector_cls
        return connector_cls

    @classmethod
    def get(cls, connector_id: str) -> type[BaseConnector]:
        if connector_id not in cls._registry:
            raise KeyError(f"Unknown connector: {connector_id}")
        return cls._registry[connector_id]

    @classmethod
    def list(cls) -> list[dict]:
        return [
            {
                "id": c.id,
                "display_name": getattr(c, "display_name", c.id),
                "auth_type": getattr(c, "auth_type", "oauth2"),
                "target_tables": list(getattr(c, "target_tables", ())),
            }
            for c in cls._registry.values()
        ]
