from app.connectors.base import BaseConnector, FetchResult, ConnectorSchema


class KingOfTimeConnector(BaseConnector):
    name = "KING OF TIME"
    source_type = "king_of_time"
    auth_type = "api_key"
    system_category = "labor"

    SANDBOX_DATA = {
        "employees": [
            {"employeeKey": "KOT001", "lastName": "田中", "firstName": "太郎", "divisionName": "テスト店舗1"},
            {"employeeKey": "KOT002", "lastName": "佐藤", "firstName": "花子", "divisionName": "テスト店舗1"},
            {"employeeKey": "KOT003", "lastName": "鈴木", "firstName": "一郎", "divisionName": "テスト店舗2"},
        ],
        "daily_workings": [
            {"employeeKey": "KOT001", "date": "2026-04-01", "clockIn": "09:00", "clockOut": "18:00", "workMinutes": 480, "overtimeMinutes": 0, "divisionCode": "D001"},
            {"employeeKey": "KOT002", "date": "2026-04-01", "clockIn": "10:00", "clockOut": "19:30", "workMinutes": 510, "overtimeMinutes": 30, "divisionCode": "D001"},
            {"employeeKey": "KOT003", "date": "2026-04-01", "clockIn": "08:30", "clockOut": "17:30", "workMinutes": 480, "overtimeMinutes": 0, "divisionCode": "D002"},
            {"employeeKey": "KOT001", "date": "2026-04-02", "clockIn": "09:00", "clockOut": "20:00", "workMinutes": 600, "overtimeMinutes": 120, "divisionCode": "D001"},
            {"employeeKey": "KOT002", "date": "2026-04-02", "clockIn": "11:00", "clockOut": "20:00", "workMinutes": 480, "overtimeMinutes": 0, "divisionCode": "D001"},
            {"employeeKey": "KOT003", "date": "2026-04-02", "clockIn": "09:00", "clockOut": "18:00", "workMinutes": 480, "overtimeMinutes": 0, "divisionCode": "D002"},
        ],
    }

    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return False

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        if config.get("sandbox_mode"):
            return FetchResult(
                records=self.SANDBOX_DATA["daily_workings"],
                cursor=None,
                has_more=False,
                total_fetched=len(self.SANDBOX_DATA["daily_workings"]),
            )
        raise NotImplementedError("KING OF TIME接続にはAPIキー設定が必要です")

    def transform(self, raw_records: list[dict]) -> list[dict]:
        results = []
        for rec in raw_records:
            work_hours = round(int(rec.get("workMinutes", 0)) / 60, 2)
            overtime_hours = round(int(rec.get("overtimeMinutes", 0)) / 60, 2)
            results.append({
                "business_date": rec.get("date"),
                "store_code": rec.get("divisionCode"),
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
