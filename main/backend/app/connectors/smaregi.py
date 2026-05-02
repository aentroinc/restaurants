import random as _rng

from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema

_rng.seed(42)

SANDBOX_DAILY = [
    {
        "storeId": str(store),
        "businessDate": f"2026-04-{day + 1:02d}",
        "netSales": _rng.randint(350000, 900000),
        "grossSales": 0,
        "customerCount": _rng.randint(400, 900),
        "orderCount": _rng.randint(380, 880),
        "discountAmount": _rng.randint(5000, 30000),
    }
    for store in range(1, 4)
    for day in range(30)
]
for _d in SANDBOX_DAILY:
    _d["grossSales"] = _d["netSales"] + _d["discountAmount"]


class SmaregiConnector(BaseConnector):
    name = "スマレジ"
    source_type = "smaregi"
    auth_type = "oauth2"
    system_category = "pos"

    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return False

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        if config.get("sandbox_mode"):
            return FetchResult(
                records=SANDBOX_DAILY,
                cursor=None,
                has_more=False,
                total_fetched=len(SANDBOX_DAILY),
            )
        raise NotImplementedError("Real smaregi connection requires OAuth setup")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            results.append({
                "store_code": f"SUK{rec['storeId'].zfill(3)}",
                "business_date": rec["businessDate"],
                "net_sales": int(rec.get("netSales", 0)),
                "gross_sales": int(rec.get("grossSales", 0)),
                "customer_count": int(rec.get("customerCount", 0)),
                "order_count": int(rec.get("orderCount", 0)),
                "discount_amount": int(rec.get("discountAmount", 0)),
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "storeId", "type": "string", "required": True},
                {"name": "businessDate", "type": "date", "required": True},
                {"name": "netSales", "type": "integer", "required": True},
                {"name": "grossSales", "type": "integer", "required": False},
                {"name": "customerCount", "type": "integer", "required": False},
                {"name": "orderCount", "type": "integer", "required": False},
                {"name": "discountAmount", "type": "integer", "required": False},
            ],
            canonical_mapping={
                "storeId": "store_code",
                "businessDate": "business_date",
                "netSales": "net_sales",
            },
        )
