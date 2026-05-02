"""T&D 温度ロガー connector — API キー方式 + Webhook 受信パターン併用。

機器: T&D RTR-500 シリーズ
Endpoints:
  - GET  https://api.tandd.com/v1/devices
  - GET  https://api.tandd.com/v1/devices/{id}/data

env:
  - TD_API_KEY

閾値超過: 自動的に Task を発行 (HACCP 逸脱対応)。
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
from app.models.haccp import CCPDefinition, HACCPMonitoring
from app.models.ingestion import IngestionBatch
from app.models.store import Store
from app.models.task import Task
from app.services.secrets import get_secret

_SANDBOX_DIR = Path(__file__).parent / "sandbox"


def _load(name: str) -> Any:
    with (_SANDBOX_DIR / f"{name}.json").open() as f:
        return json.load(f)


class TDTemperature(BaseConnector):
    """T&D RTR-500 connector. APIキー認証 + 1分粒度温度ログ + 閾値超過Task発行。"""

    name = "T&D 温度ロガー"
    source_type = "td"
    connector_type = "td"
    auth_type = "api_key"
    system_category = "iot_sensor"
    api_base = "https://api.tandd.com/v1"
    api_key_env = "TD_API_KEY"

    def env_api_key(self) -> str | None:
        return get_secret(self.api_key_env)

    async def test_credentials(self, api_key: str, api_secret: str | None = None) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.api_base}/devices",
                    headers={"X-Api-Key": api_key, "Accept": "application/json"},
                )
            return {
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
                "endpoint": "/devices",
            }
        except httpx.HTTPError as e:
            return {"ok": False, "status_code": 0, "error": str(e)[:200]}

    # ── BaseConnector interface ──────────────────────────────
    def test_connection(self, config: dict) -> bool:
        if config.get("sandbox_mode"):
            return True
        return bool(self.env_api_key())

    async def fetch_devices(self, config: dict) -> list[dict]:
        if config.get("sandbox_mode"):
            return _load("td_devices").get("devices", [])
        api_key = self.env_api_key()
        if not api_key:
            raise RuntimeError("TD_API_KEY not set")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.api_base}/devices",
                headers={"X-Api-Key": api_key, "Accept": "application/json"},
            )
        return resp.json().get("devices", [])

    async def fetch(self, config: dict, cursor: str | None = None, limit: int = 1000) -> FetchResult:
        """device_id 指定がなければ sandbox の単一デバイスを返す。"""
        if config.get("sandbox_mode"):
            doc = _load("td_temperature_data")
            records = doc.get("data", [])
            # デバイスメタを各レコードへ付与
            for r in records:
                r["device_id"] = doc.get("device_id")
                r["store_code"] = doc.get("store_code")
                r["threshold_min_c"] = doc.get("threshold_min_c", 0.0)
                r["threshold_max_c"] = doc.get("threshold_max_c", 10.0)
            return FetchResult(records=records, cursor=None, has_more=False, total_fetched=len(records))
        api_key = self.env_api_key()
        device_id = config.get("device_id")
        if not api_key or not device_id:
            raise RuntimeError("TD fetch requires TD_API_KEY and device_id")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.api_base}/devices/{device_id}/data",
                headers={"X-Api-Key": api_key, "Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"TD fetch failed: {resp.status_code}")
        records = resp.json().get("data", [])
        return FetchResult(records=records, cursor=None, has_more=False, total_fetched=len(records))

    def transform(self, raw_records: list[dict]) -> list[dict]:
        out = []
        for r in raw_records:
            out.append({
                "device_id": r.get("device_id"),
                "store_code": r.get("store_code"),
                "timestamp": r.get("timestamp"),
                "temperature_c": float(r.get("temperature_c") or 0),
                "humidity_pct": r.get("humidity_pct"),
                "battery_pct": r.get("battery_pct"),
                "threshold_min_c": r.get("threshold_min_c"),
                "threshold_max_c": r.get("threshold_max_c"),
            })
        return out

    def schema(self) -> ConnectorSchema:
        return ConnectorSchema(
            source_fields=[
                {"name": "device_id", "type": "string", "required": True},
                {"name": "timestamp", "type": "datetime", "required": True},
                {"name": "temperature_c", "type": "number", "required": True},
                {"name": "humidity_pct", "type": "number", "required": False},
                {"name": "battery_pct", "type": "integer", "required": False},
            ],
            canonical_mapping={
                "timestamp": "monitoring_date_time",
                "temperature_c": "measured_value",
            },
        )

    # ── webhook handler ──────────────────────────────────────
    async def receive_webhook(
        self,
        db: AsyncSession,
        tenant_id: str,
        payload: dict,
    ) -> dict:
        """T&D Webhook を受信して即座に閾値判定 + Task発行。"""
        records = payload.get("data", [payload]) if "data" in payload else [payload]
        return await self._ingest_and_check(db, tenant_id, records, source="webhook")

    # ── sync ─────────────────────────────────────────────────
    async def sync(
        self,
        db: AsyncSession,
        tenant_id: str,
        sandbox_mode: bool = True,
    ) -> dict:
        config = {"sandbox_mode": sandbox_mode}
        result = await self.fetch(config)
        records = self.transform(result.records)
        return await self._ingest_and_check(db, tenant_id, records, source="poll")

    async def _ingest_and_check(
        self,
        db: AsyncSession,
        tenant_id: str,
        records: list[dict],
        source: str = "poll",
    ) -> dict:
        """HACCP 書き込み + 閾値超過 Task 発行。"""
        batch = IngestionBatch(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            source_system=self.source_type,
            entity_type="td_temperature",
            status="processing",
            row_count=len(records),
            valid_row_count=0,
            invalid_row_count=0,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(batch)
        await db.flush()

        breach_records: list[dict] = []
        persisted = 0
        store_cache: dict[str, uuid.UUID] = {}
        ccp_cache: dict[str, uuid.UUID] = {}

        for rec in records:
            store_code = rec.get("store_code")
            if not store_code:
                continue
            if store_code not in store_cache:
                sid = (await db.execute(
                    select(Store.id).where(Store.code == store_code, Store.tenant_id == tenant_id)
                )).scalar_one_or_none()
                if sid:
                    store_cache[store_code] = sid
            store_id = store_cache.get(store_code)
            if not store_id:
                continue

            # CCP definition (1 store につき 1 つ作る簡易ロジック)
            ccp_key = f"{store_code}:fridge"
            if ccp_key not in ccp_cache:
                ccp = (await db.execute(
                    select(CCPDefinition).where(
                        CCPDefinition.tenant_id == tenant_id,
                        CCPDefinition.name == f"冷蔵庫温度監視 ({store_code})",
                    )
                )).scalar_one_or_none()
                if not ccp:
                    ccp = CCPDefinition(
                        id=uuid.uuid4(),
                        tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                        name=f"冷蔵庫温度監視 ({store_code})",
                        threshold_min=rec.get("threshold_min_c") or 0,
                        threshold_max=rec.get("threshold_max_c") or 10,
                        monitoring_frequency="continuous",
                        monitoring_method="T&D RTR-500",
                    )
                    db.add(ccp)
                    await db.flush()
                ccp_cache[ccp_key] = ccp.id
            ccp_id = ccp_cache[ccp_key]

            temp = float(rec.get("temperature_c") or 0)
            tmin = float(rec.get("threshold_min_c") or 0)
            tmax = float(rec.get("threshold_max_c") or 10)
            compliant = tmin <= temp <= tmax
            ts_str = rec.get("timestamp")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except ValueError:
                    ts = datetime.now(timezone.utc)
            else:
                ts = datetime.now(timezone.utc)

            mon = HACCPMonitoring(
                id=uuid.uuid4(),
                tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                store_id=store_id,
                ccp_id=ccp_id,
                monitoring_date_time=ts,
                measured_value=round(temp, 2),
                is_compliant=compliant,
                deviation_action=None if compliant else f"閾値超過: {temp}℃ (上限{tmax}℃)",
            )
            db.add(mon)
            persisted += 1

            if not compliant:
                breach_records.append({
                    "store_id": store_id,
                    "store_code": store_code,
                    "timestamp": ts.isoformat(),
                    "temperature_c": temp,
                    "ccp_id": ccp_id,
                })

        # 閾値超過 → Task 発行 (連続breachは1グループ=1Taskにまとめる)
        tasks_created = 0
        if breach_records:
            # store_id ごとにまとめる
            by_store: dict[uuid.UUID, list] = {}
            for b in breach_records:
                by_store.setdefault(b["store_id"], []).append(b)
            for sid, items in by_store.items():
                peak = max(items, key=lambda x: x["temperature_c"])
                task = Task(
                    id=uuid.uuid4(),
                    tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
                    store_id=sid,
                    title=f"[HACCP逸脱] 冷蔵庫温度 {peak['temperature_c']}℃ 検知",
                    description=(
                        f"店舗 {peak['store_code']} の冷蔵庫で閾値超過を {len(items)}回検知。"
                        f"ピーク温度 {peak['temperature_c']}℃ ({peak['timestamp']})。"
                        f"廃棄判定と機器点検を実施してください。"
                    ),
                    issue_type="haccp_deviation",
                    status="open",
                    priority="high",
                    source="td_temperature",
                )
                db.add(task)
                tasks_created += 1

        batch.valid_row_count = persisted
        batch.invalid_row_count = len(records) - persisted
        batch.status = "completed"
        batch.validated_at = datetime.now(timezone.utc)
        batch.promoted_at = datetime.now(timezone.utc)
        await db.flush()

        return {
            "batch_id": str(batch.id),
            "records_fetched": len(records),
            "monitoring_records_persisted": persisted,
            "breaches_detected": len(breach_records),
            "tasks_created": tasks_created,
            "source": source,
            "status": batch.status,
        }
