from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema


class SmaregiConnector(BaseConnector):
    name = "スマレジ"
    source_type = "smaregi"
    auth_type = "oauth2"
    system_category = "pos"

    SANDBOX_DATA = {
        "stores": [
            {"storeId": "1", "storeName": "テスト店舗1", "prefectureCode": "13", "address": "東京都渋谷区1-1"},
            {"storeId": "2", "storeName": "テスト店舗2", "prefectureCode": "27", "address": "大阪府大阪市1-1"},
        ],
        "transactions": [
            {"transactionId": "T001", "storeId": "1", "transactionDateTime": "2026-04-01 11:23:00", "total": 680, "subtotal": 618, "tax": 62, "paymentMethod": "cash"},
            {"transactionId": "T002", "storeId": "1", "transactionDateTime": "2026-04-01 12:05:00", "total": 1250, "subtotal": 1137, "tax": 113, "paymentMethod": "credit"},
            {"transactionId": "T003", "storeId": "1", "transactionDateTime": "2026-04-01 12:30:00", "total": 890, "subtotal": 810, "tax": 80, "paymentMethod": "qr"},
            {"transactionId": "T004", "storeId": "2", "transactionDateTime": "2026-04-01 11:45:00", "total": 720, "subtotal": 655, "tax": 65, "paymentMethod": "cash"},
            {"transactionId": "T005", "storeId": "2", "transactionDateTime": "2026-04-01 13:10:00", "total": 1580, "subtotal": 1437, "tax": 143, "paymentMethod": "credit"},
            {"transactionId": "T006", "storeId": "1", "transactionDateTime": "2026-04-01 18:20:00", "total": 950, "subtotal": 864, "tax": 86, "paymentMethod": "cash"},
            {"transactionId": "T007", "storeId": "1", "transactionDateTime": "2026-04-01 19:05:00", "total": 1100, "subtotal": 1000, "tax": 100, "paymentMethod": "qr"},
            {"transactionId": "T008", "storeId": "2", "transactionDateTime": "2026-04-01 18:50:00", "total": 650, "subtotal": 591, "tax": 59, "paymentMethod": "cash"},
            {"transactionId": "T009", "storeId": "2", "transactionDateTime": "2026-04-01 20:15:00", "total": 2100, "subtotal": 1910, "tax": 190, "paymentMethod": "credit"},
            {"transactionId": "T010", "storeId": "1", "transactionDateTime": "2026-04-01 20:45:00", "total": 780, "subtotal": 710, "tax": 70, "paymentMethod": "cash"},
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
        raise NotImplementedError("Real smaregi connection requires OAuth setup")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            results.append({
                "business_date": rec.get("transactionDateTime", "")[:10],
                "store_code": rec.get("storeId"),
                "net_sales": int(rec.get("total", 0)),
                "customer_count": 1,
                "order_count": 1,
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "transactionId", "type": "string", "required": True},
                {"name": "storeId", "type": "string", "required": True},
                {"name": "transactionDateTime", "type": "datetime", "required": True},
                {"name": "total", "type": "integer", "required": True},
                {"name": "subtotal", "type": "integer", "required": False},
                {"name": "tax", "type": "integer", "required": False},
            ],
            canonical_mapping={
                "storeId": "store_code",
                "transactionDateTime": "business_date",
                "total": "net_sales",
            },
        )
