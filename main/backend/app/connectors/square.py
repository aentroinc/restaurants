from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema


class SquareConnector(BaseConnector):
    name = "Square"
    source_type = "square"
    auth_type = "oauth2"
    system_category = "pos"

    SANDBOX_DATA = {
        "locations": [
            {"id": "SQ_LOC_001", "name": "Square テスト店舗1", "address": {"locality": "渋谷区", "administrative_district_level_1": "東京都"}},
            {"id": "SQ_LOC_002", "name": "Square テスト店舗2", "address": {"locality": "中央区", "administrative_district_level_1": "大阪府"}},
        ],
        "transactions": [
            {"id": "SQ-T001", "location_id": "SQ_LOC_001", "created_at": "2026-04-01T11:00:00Z", "total_money": {"amount": 72000, "currency": "JPY"}},
            {"id": "SQ-T002", "location_id": "SQ_LOC_001", "created_at": "2026-04-01T12:15:00Z", "total_money": {"amount": 135000, "currency": "JPY"}},
            {"id": "SQ-T003", "location_id": "SQ_LOC_002", "created_at": "2026-04-01T11:30:00Z", "total_money": {"amount": 89000, "currency": "JPY"}},
            {"id": "SQ-T004", "location_id": "SQ_LOC_002", "created_at": "2026-04-01T13:45:00Z", "total_money": {"amount": 156000, "currency": "JPY"}},
            {"id": "SQ-T005", "location_id": "SQ_LOC_001", "created_at": "2026-04-01T19:00:00Z", "total_money": {"amount": 210000, "currency": "JPY"}},
        ],
    }

    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return False

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        if config.get("sandbox_mode"):
            return FetchResult(
                records=self.SANDBOX_DATA["transactions"],
                cursor=None,
                has_more=False,
                total_fetched=len(self.SANDBOX_DATA["transactions"]),
            )
        raise NotImplementedError("Square接続にはOAuth設定が必要です")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            total = rec.get("total_money", {})
            # Square amounts are in smallest currency unit (cents/yen)
            amount = int(total.get("amount", 0))
            results.append({
                "business_date": rec.get("created_at", "")[:10],
                "store_code": rec.get("location_id"),
                "net_sales": amount,
                "customer_count": 1,
                "order_count": 1,
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "id", "type": "string", "required": True},
                {"name": "location_id", "type": "string", "required": True},
                {"name": "created_at", "type": "datetime", "required": True},
                {"name": "total_money.amount", "type": "integer", "required": True},
                {"name": "total_money.currency", "type": "string", "required": True},
            ],
            canonical_mapping={
                "location_id": "store_code",
                "created_at": "business_date",
                "total_money.amount": "net_sales",
            },
        )
