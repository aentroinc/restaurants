from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class FetchResult:
    records: list[dict]
    cursor: str | None
    has_more: bool
    total_fetched: int


@dataclass
class ConnectorSchema:
    source_fields: list[dict] = field(default_factory=list)  # [{name, type, required}]
    canonical_mapping: dict[str, str] = field(default_factory=dict)  # source_field -> canonical_field


class BaseConnector(ABC):
    name: str
    source_type: str
    auth_type: str
    system_category: str

    @abstractmethod
    def test_connection(self, config: dict) -> bool: ...

    @abstractmethod
    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult: ...

    @abstractmethod
    def transform(self, raw_records: list[dict]) -> list[dict]: ...

    @abstractmethod
    def schema(self) -> ConnectorSchema: ...
