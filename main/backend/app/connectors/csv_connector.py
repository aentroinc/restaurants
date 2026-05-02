from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema


class CSVConnector(BaseConnector):
    name = "CSV アップロード"
    source_type = "csv"
    auth_type = "none"
    system_category = "manual"

    def test_connection(self, config: dict) -> bool:
        return True

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        return FetchResult(records=[], cursor=None, has_more=False, total_fetched=0)

    def transform(self, raw_records: list[dict]) -> list[dict]:
        return raw_records

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[],  # dynamic based on CSV headers
            canonical_mapping={},
        )
