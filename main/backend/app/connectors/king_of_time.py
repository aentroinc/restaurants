import random as _rng

from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema

_rng.seed(45)

SANDBOX_DAILY = [
    {
        "divisionCode": f"D{store:03d}",
        "date": f"2026-04-{day + 1:02d}",
        "employeeKey": f"KOT{store:03d}-{emp:02d}",
        "clockIn": f"{8 + _rng.randint(0, 2):02d}:{_rng.choice(['00', '30'])}",
        "clockOut": f"{17 + _rng.randint(0, 3):02d}:{_rng.choice(['00', '30'])}",
        "workMinutes": _rng.randint(420, 600),
        "overtimeMinutes": _rng.randint(0, 120),
    }
    for store in range(1, 4)
    for day in range(30)
    for emp in range(1, 4)
]


class KingOfTimeConnector(BaseConnector):
    name = "KING OF TIME"
    source_type = "king_of_time"
    auth_type = "api_key"
    system_category = "labor"

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
        raise NotImplementedError("KING OF TIME接続にはAPIキー設定が必要です")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            work_hours = round(int(rec.get("workMinutes", 0)) / 60, 2)
            overtime_hours = round(int(rec.get("overtimeMinutes", 0)) / 60, 2)
            results.append({
                "store_code": f"SUK{rec['divisionCode'][-3:]}",
                "business_date": rec.get("date"),
                "employee_code": rec.get("employeeKey"),
                "labor_hours": work_hours,
                "overtime_hours": overtime_hours,
                "clock_in": rec.get("clockIn"),
                "clock_out": rec.get("clockOut"),
            })
        return results

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "employeeKey", "type": "string", "required": True},
                {"name": "date", "type": "date", "required": True},
                {"name": "clockIn", "type": "time", "required": True},
                {"name": "clockOut", "type": "time", "required": True},
                {"name": "workMinutes", "type": "integer", "required": True},
                {"name": "overtimeMinutes", "type": "integer", "required": False},
                {"name": "divisionCode", "type": "string", "required": True},
            ],
            canonical_mapping={
                "date": "business_date",
                "divisionCode": "store_code",
                "employeeKey": "employee_code",
                "workMinutes": "labor_hours",
                "overtimeMinutes": "overtime_hours",
            },
        )
