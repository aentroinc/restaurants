from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema


class AirregiConnector(BaseConnector):
    name = "Airレジ"
    source_type = "airregi"
    auth_type = "oauth2"
    system_category = "pos"

    SANDBOX_DATA = {
        "stores": [
            {"shop_id": "AIR001", "shop_name": "Airレジ テスト店舗1", "prefecture": "東京都", "address": "東京都港区赤坂1-1"},
            {"shop_id": "AIR002", "shop_name": "Airレジ テスト店舗2", "prefecture": "大阪府", "address": "大阪府大阪市中央区1-1"},
        ],
        "transactions": [
            {"receipt_id": "AIR-R001", "shop_id": "AIR001", "sales_date": "2026-04-01", "total_amount": 750, "tax_amount": 68, "payment_type": "現金"},
            {"receipt_id": "AIR-R002", "shop_id": "AIR001", "sales_date": "2026-04-01", "total_amount": 1320, "tax_amount": 120, "payment_type": "クレジット"},
            {"receipt_id": "AIR-R003", "shop_id": "AIR002", "sales_date": "2026-04-01", "total_amount": 980, "tax_amount": 89, "payment_type": "現金"},
            {"receipt_id": "AIR-R004", "shop_id": "AIR002", "sales_date": "2026-04-01", "total_amount": 1650, "tax_amount": 150, "payment_type": "QR決済"},
            {"receipt_id": "AIR-R005", "shop_id": "AIR001", "sales_date": "2026-04-01", "total_amount": 890, "tax_amount": 81, "payment_type": "現金"},
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
        raise NotImplementedError("Airレジ接続にはOAuth設定が必要です")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            results.append({
                "business_date": rec.get("sales_date", ""),
                "store_code": rec.get("shop_id"),
                "net_sales": int(rec.get("total_amount", 0)),
                "customer_count": 1,
                "order_count": 1,
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "receipt_id", "type": "string", "required": True},
                {"name": "shop_id", "type": "string", "required": True},
                {"name": "sales_date", "type": "date", "required": True},
                {"name": "total_amount", "type": "integer", "required": True},
                {"name": "tax_amount", "type": "integer", "required": False},
                {"name": "payment_type", "type": "string", "required": False},
            ],
            canonical_mapping={
                "shop_id": "store_code",
                "sales_date": "business_date",
                "total_amount": "net_sales",
            },
        )
