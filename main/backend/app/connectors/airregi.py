import random as _rng

from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema

_rng.seed(43)

SANDBOX_DAILY = [
    {
        "shop_id": f"AIR{store:03d}",
        "sales_date": f"2026-04-{day + 1:02d}",
        "net_sales": _rng.randint(350000, 900000),
        "gross_sales": 0,
        "customer_count": _rng.randint(400, 900),
        "order_count": _rng.randint(380, 880),
        "discount_amount": _rng.randint(5000, 30000),
    }
    for store in range(1, 4)
    for day in range(30)
]
for _d in SANDBOX_DAILY:
    _d["gross_sales"] = _d["net_sales"] + _d["discount_amount"]


class AirregiConnector(BaseConnector):
    name = "Airレジ"
    source_type = "airregi"
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
        raise NotImplementedError("Airレジ接続にはOAuth設定が必要です")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            results.append({
                "store_code": f"SUK{rec['shop_id'][-3:]}",
                "business_date": rec["sales_date"],
                "net_sales": int(rec.get("net_sales", 0)),
                "gross_sales": int(rec.get("gross_sales", 0)),
                "customer_count": int(rec.get("customer_count", 0)),
                "order_count": int(rec.get("order_count", 0)),
                "discount_amount": int(rec.get("discount_amount", 0)),
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "shop_id", "type": "string", "required": True},
                {"name": "sales_date", "type": "date", "required": True},
                {"name": "net_sales", "type": "integer", "required": True},
                {"name": "gross_sales", "type": "integer", "required": False},
                {"name": "customer_count", "type": "integer", "required": False},
                {"name": "order_count", "type": "integer", "required": False},
                {"name": "discount_amount", "type": "integer", "required": False},
            ],
            canonical_mapping={
                "shop_id": "store_code",
                "sales_date": "business_date",
                "net_sales": "net_sales",
            },
        )
