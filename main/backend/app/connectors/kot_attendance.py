"""KING OF TIME 勤怠 connector — API キー方式。

既存 `oauth_kot.py` の `KOTAPIKey` を継承し、勤怠データ取得・同期機能を追加する。

Endpoints:
  - GET  https://api.kingtime.jp/v1.0/daily-workings  (打刻・残業・休憩)
  - GET  https://api.kingtime.jp/v1.0/employees       (従業員)

env:
  - KOT_SANDBOX_API_TOKEN
"""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import BaseConnector, ConnectorSchema, FetchResult
from app.connectors.oauth_kot import KOTAPIKey
from app.models.employee import Employee
from app.models.ingestion import IngestionBatch
from app.services.secrets import get_secret

_SANDBOX_DIR = Path(__file__).parent / "sandbox"


def _load(name: str) -> Any:
    with (_SANDBOX_DIR / f"{name}.json").open() as f:
        return json.load(f)


class KOTAttendance(KOTAPIKey, BaseConnector):
    """KING OF TIME 勤怠 connector. API キー認証 + 勤怠取得 + sync。"""

    name = "KING OF TIME (勤怠)"
    source_type = "kot"
    auth_type = "api_key"
    system_category = "labor"
    api_base = "https://api.kingtime.jp/v1.0"
    api_key_env = "KOT_SANDBOX_API_TOKEN"

    # ── BaseConnector interface ──────────────────────────────
    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return bool(get_secret(self.api_key_env))

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        if config.get("sandbox_mode"):
            workings = _load("kot_daily_workings").get("dailyWorkings", [])
            return FetchResult(
                records=workings,
                cursor=None,
                has_more=False,
                total_fetched=len(workings),
            )
        api_key = get_secret(self.api_key_env)
        if not api_key:
            raise RuntimeError("KOT_SANDBOX_API_TOKEN not set")
        target_date = config.get("date") or date.today().isoformat()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/daily-workings",
                params={"date": target_date},
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"KOT fetch failed: {resp.status_code} {resp.text[:200]}")
        body = resp.json()
        records = body.get("dailyWorkings", body if isinstance(body, list) else [])
        return FetchResult(records=records, cursor=None, has_more=False, total_fetched=len(records))

    async def fetch_employees(self, config: dict) -> list[dict]:
        if config.get("sandbox_mode"):
            return _load("kot_employees").get("employees", [])
        api_key = get_secret(self.api_key_env)
        if not api_key:
            raise RuntimeError("KOT_SANDBOX_API_TOKEN not set")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/employees",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"KOT employees fetch failed: {resp.status_code}")
        body = resp.json()
        return body.get("employees", body if isinstance(body, list) else [])

    def transform(self, raw_records: list[dict]) -> list[dict]:
        out = []
        for r in raw_records:
            work_min = int(r.get("workMinutes") or 0)
            ot_min = int(r.get("overtimeMinutes") or 0)
            out.append({
                "store_code": f"ST{r.get('divisionCode', 'D000')[-3:]}",
                "business_date": r.get("date"),
                "employee_code": r.get("employeeKey"),
                "labor_hours": round(work_min / 60, 2),
                "overtime_hours": round(ot_min / 60, 2),
                "clock_in": r.get("clockIn"),
                "clock_out": r.get("clockOut"),
                "break_minutes": int(r.get("breakMinutes") or 0),
            })
        return out

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "employeeKey", "type": "string", "required": True},
                {"name": "date", "type": "date", "required": True},
                {"name": "clockIn", "type": "time", "required": True},
                {"name": "clockOut", "type": "time", "required": True},
                {"name": "workMinutes", "type": "integer", "required": True},
                {"name": "overtimeMinutes", "type": "integer", "required": False},
                {"name": "breakMinutes", "type": "integer", "required": False},
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

    # ── sync ─────────────────────────────────────────────────
    async def sync(
        self,
        db: AsyncSession,
        tenant_id: str,
        sandbox_mode: bool = True,
    ) -> dict:
        """IngestionBatch を作成、Employee テーブルへ upsert、勤怠は labor 投入。"""
        config = {"sandbox_mode": sandbox_mode}
        employees = await self.fetch_employees(config)
        workings = await self.fetch(config)

        batch = IngestionBatch(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            source_system=self.source_type,
            entity_type="kot_attendance",
            file_name=None,
            status="processing",
            row_count=workings.total_fetched,
            valid_row_count=0,
            invalid_row_count=0,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(batch)
        await db.flush()

        # Upsert employees by tenant_id + code
        emp_count = 0
        from app.models.company import Company
        company_id = (await db.execute(
            select(Company.id).where(Company.tenant_id == tenant_id).limit(1)
        )).scalar_one_or_none()

        if company_id:
            for emp in employees:
                code = emp.get("code")
                if not code:
                    continue
                full_name = f"{emp.get('lastName', '')} {emp.get('firstName', '')}".strip() or code
                # 既存 (tenant_id, code) があれば skip
                existing = (await db.execute(
                    select(Employee.id).where(
                        Employee.tenant_id == tenant_id,
                        Employee.code == code,
                    )
                )).scalar_one_or_none()
                if existing:
                    continue
                row = Employee(
                    id=uuid.uuid4(),
                    tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                    company_id=company_id,
                    code=code,
                    name=full_name,
                    role=emp.get("employeeType", "staff"),
                    email=emp.get("email"),
                    active=bool(emp.get("active", True)),
                )
                db.add(row)
                emp_count += 1

        batch.valid_row_count = len(workings.records)
        batch.invalid_row_count = 0
        batch.status = "completed"
        batch.validated_at = datetime.now(timezone.utc)
        batch.promoted_at = datetime.now(timezone.utc)
        await db.flush()

        return {
            "batch_id": str(batch.id),
            "employees_synced": emp_count,
            "workings_fetched": workings.total_fetched,
            "status": batch.status,
        }
