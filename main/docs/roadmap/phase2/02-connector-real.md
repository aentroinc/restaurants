# Phase 2 / S1 — コネクタ完成（+7点 / 1.5週）

## 課題
Phase 1 で `BaseConnector` ABC + 5 stub connector + ingestion_runner + `/connectors` API は作った。但し：
- **smaregi.py は sandbox JSON のハードコード**、本番 OAuth は `NotImplementedError`
- **ingestion_runner は canonical 永続化してない**（transformed records を response に返すだけ、`daily_sales` に INSERT しない）
- スケジューラ未配線（手動実行のみ）
- IngestionRecord（生データ provenance）モデル無し
- credentials 暗号化未実装

これらを完遂して「**顧客のデータを実際に取り込んで KPI が出る**」状態にする。

## ゴール
- スマレジ Sandbox API（公開）に実 OAuth で接続、過去30日分を取得
- transformed データが `daily_sales` / `hourly_sales` / `product_sales` に永続化
- IngestionRecord で provenance 追跡 → Lineage 自動生成
- APScheduler で日次同期
- credentials は Fernet 暗号化
- CSV import が完走（手動アップロードで daily_sales 投入）
- frontend `/admin/data-sources` UI で接続管理

---

## 仕様書

### 追加データモデル

```python
class IngestionRecord(Base):
    """生レコードの provenance ストア（Lineage の根）"""
    __tablename__ = "ingestion_records"
    id: Mapped[UUID]
    tenant_id, ingestion_job_id (fk)
    source_payload: Mapped[dict] = JSONB     # 生レスポンス
    source_id: Mapped[str]                    # smaregi の transactionId 等
    target_table: Mapped[str]                 # daily_sales | hourly_sales | product_sales
    target_id: Mapped[UUID | None]
    ingested_at, processed_at
    
class DataSourceCredentials(Base):
    """暗号化された credentials の別テーブル管理（DataSourceV2.credentials JSON は廃止）"""
    __tablename__ = "data_source_credentials"
    id, tenant_id, data_source_id (unique fk)
    encrypted_payload: Mapped[bytes]          # Fernet
    key_id: Mapped[str]                       # rotation 用
    created_at, updated_at
```

### Smaregi 本番接続

`app/connectors/smaregi/` をディレクトリ化（現在の単一ファイル → 分割）：
```
connectors/smaregi/
├── __init__.py        # SmaregiConnector の re-export
├── auth.py            # OAuth2 flow
├── client.py          # httpx + rate limit + retry
├── fetch.py           # transactions / products / stores
├── transform.py       # smaregi → canonical
└── connector.py       # BaseConnector 実装
```

OAuth flow（`auth.py`）：
```python
SMAREGI_AUTH_BASE = "https://id.smaregi.dev"  # sandbox
SMAREGI_API_BASE = "https://api.smaregi.dev"

def build_authorize_url(state: str, redirect_uri: str) -> str:
    return (
        f"{SMAREGI_AUTH_BASE}/authorize"
        f"?response_type=code"
        f"&client_id={settings.SMAREGI_CLIENT_ID}"
        f"&scope=pos.transactions:read+pos.stores:read+pos.products:read"
        f"&state={state}"
        f"&redirect_uri={redirect_uri}"
    )

async def exchange_code(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{SMAREGI_AUTH_BASE}/token", data={
            "grant_type": "authorization_code",
            "code": code, "redirect_uri": redirect_uri,
            "client_id": settings.SMAREGI_CLIENT_ID,
            "client_secret": settings.SMAREGI_CLIENT_SECRET,
        })
        r.raise_for_status()
        return r.json()  # {access_token, refresh_token, expires_in, contract_id}

async def refresh_token(refresh_token: str) -> dict: ...
```

API client（`client.py`）：
- httpx.AsyncClient
- 401 で自動 token refresh
- 429 で exponential backoff（1s, 2s, 4s, 8s, max=60s, 5回）
- 全 request を audit log に（path, status のみ、bodyマスキング）

Fetch（`fetch.py`）：
```python
async def fetch_transactions(client, contract_id: str, since: datetime, until: datetime) -> AsyncIterator[dict]:
    page = 1
    while True:
        r = await client.get(f"/{contract_id}/pos/transactions",
                              params={"transaction_date_time-from": since.isoformat(),
                                      "transaction_date_time-to": until.isoformat(),
                                      "limit": 1000, "page": page})
        items = r.json()
        if not items: break
        for item in items: yield item
        if len(items) < 1000: break
        page += 1
```

Transform（`transform.py`）：
```python
def transform_transactions_to_canonical(raw: list[dict]) -> dict:
    """生 transactions → daily_sales + hourly_sales + product_sales 集計"""
    daily, hourly, product = defaultdict(...), defaultdict(...), defaultdict(...)
    for tx in raw:
        store_code = tx["storeId"]
        dt = parse_datetime(tx["transactionDateTime"])
        date_key = (store_code, dt.date())
        hour_key = (store_code, dt.date(), dt.hour)
        # ... aggregate net_sales, customer_count, order_count
    return {"daily_sales": [...], "hourly_sales": [...], "product_sales": [...]}
```

### ingestion_runner の永続化

`app/services/ingestion_runner.py` 改修：
```python
async def run_sync_job(db, tenant_id, data_source_id, job_type):
    # ... existing fetch/transform ...
    
    # 7. PERSIST canonical records
    canonical = connector.transform_to_canonical(fetch_result.records)
    persisted_counts = {}
    
    if "daily_sales" in canonical:
        persisted_counts["daily_sales"] = await _bulk_upsert_daily_sales(
            db, tenant_id, canonical["daily_sales"], job.id
        )
    if "hourly_sales" in canonical:
        persisted_counts["hourly_sales"] = await _bulk_upsert_hourly_sales(...)
    if "product_sales" in canonical:
        persisted_counts["product_sales"] = await _bulk_upsert_product_sales(...)
    
    # 8. IngestionRecord で provenance 記録
    for raw in fetch_result.records:
        db.add(IngestionRecord(
            tenant_id=tenant_id, ingestion_job_id=job.id,
            source_payload=raw, source_id=str(raw.get(connector.SOURCE_ID_FIELD)),
            target_table="daily_sales",
        ))
    
    # 9. Lineage 自動生成
    await _emit_lineage(db, tenant_id, job, persisted_counts)
    
    # 10. KPI engine トリガ（変更日付分のみ）
    affected_dates = sorted(set(r["business_date"] for r in canonical["daily_sales"]))
    await trigger_kpi_recompute(db, tenant_id, affected_dates)
    
    job.rows_loaded = sum(persisted_counts.values())
    job.status = "success"
```

`_bulk_upsert_daily_sales`：
```python
async def _bulk_upsert_daily_sales(db, tenant_id, records, job_id):
    stmt = pg_insert(DailyStoreSales).values(records).on_conflict_do_update(
        index_elements=["tenant_id", "store_id", "business_date"],
        set_={c.name: c for c in stmt.excluded if c.name not in ["id", "created_at"]},
    )
    result = await db.execute(stmt)
    return result.rowcount
```

### スケジューラ

`app/scheduler.py` 新設：
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler(timezone="Asia/Tokyo")

@scheduler.scheduled_job("cron", hour=3, minute=0, id="daily_ingestion")
async def daily_ingestion_job():
    """全 tenant の active DataSource を順次 sync"""
    async with async_session() as db:
        sources = await db.execute(
            select(DataSourceV2).where(
                DataSourceV2.status == "connected",
                DataSourceV2.auto_sync_enabled == True,
            )
        )
        for ds in sources.scalars():
            try:
                # tenant ごとに postgres advisory lock
                lock_key = hash(f"{ds.tenant_id}:{ds.id}") % (2**63)
                await db.execute(text(f"SELECT pg_advisory_lock({lock_key})"))
                await run_sync_job(db, str(ds.tenant_id), str(ds.id), "incremental")
            finally:
                await db.execute(text(f"SELECT pg_advisory_unlock({lock_key})"))
```

`app/main.py` で `scheduler.start()` を `lifespan` で起動。

### 暗号化

`app/services/secrets.py` 新設：
```python
from cryptography.fernet import Fernet, MultiFernet
from app.config import settings

def _get_keys() -> list[Fernet]:
    keys = [Fernet(k.encode()) for k in settings.INGESTION_MASTER_KEY.split(",")]
    return keys

def encrypt(plaintext: str) -> tuple[bytes, str]:
    """Returns (ciphertext, key_id)"""
    keys = _get_keys()
    cipher = MultiFernet(keys)
    return cipher.encrypt(plaintext.encode()), "v1"

def decrypt(ciphertext: bytes, key_id: str) -> str:
    keys = _get_keys()
    cipher = MultiFernet(keys)
    return cipher.decrypt(ciphertext).decode()
```

`.env` に：
```
INGESTION_MASTER_KEY=<base64 fernet key>  # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
SMAREGI_CLIENT_ID=...
SMAREGI_CLIENT_SECRET=...
```

### CSV Import 強化

`app/connectors/csv_connector.py` を 23行 → 完成版に：
- multipart upload で UTF-8/Shift-JIS 自動検出
- カラムマッピング YAML（`config/connectors/csv_mapping_*.yaml`）
- preview API（最初10行返して mapping 確認させる）
- validation：必須列の有無、日付フォーマット、金額が数値

### Frontend

`frontend/src/app/admin/data-sources/page.tsx` を強化：
- 「接続を追加」ボタン → モーダル（Smaregi / Airレジ / Square / KOT / CSV のカード選択）
- Smaregi 選択 → 「OAuth で連携」ボタン → 別タブで `/api/v1/oauth/smaregi/start` へ → callback で接続完了
- CSV 選択 → ファイル upload → カラムマッピング画面 → 投入
- 接続済一覧：status badge / 最終同期 / 同期件数 / 「今すぐ同期」「履歴」ボタン
- 詳細画面：ジョブ履歴 / 失敗レコード一覧

`frontend/src/app/admin/data-sources/[id]/page.tsx` 新設で詳細画面。

---

## 指示書（実装手順）

### Step 1: 依存追加（30分）
```
pip install httpx==0.28.* apscheduler==3.10.* cryptography==44.*
```
requirements.txt 更新、env.example に新キー追加。

### Step 2: モデル追加（1日）
1. `IngestionRecord`, `DataSourceCredentials` モデル
2. `DataSourceV2` に `auto_sync_enabled` `cron_schedule` カラム追加
3. `alembic revision -m "ingestion records and credentials"` → upgrade

### Step 3: 暗号化基盤（半日）
1. `app/services/secrets.py` 実装
2. 既存 `DataSourceV2.credentials` (JSON) を `DataSourceCredentials` (encrypted) へ移行スクリプト
3. `app/api/v1/connectors.py` の credential 設定箇所を encrypt/decrypt 経由に

### Step 4: Smaregi 本番接続（3日）
1. `connectors/smaregi/` ディレクトリ化、上記5ファイルに分割
2. OAuth flow 完成、`app/api/v1/oauth.py` 新設
   - `GET /api/v1/oauth/smaregi/start?data_source_id=...`
   - `GET /api/v1/oauth/smaregi/callback`
3. httpx client + token refresh + rate limit
4. fetch_transactions 実装
5. transform_to_canonical 実装（daily/hourly/product）
6. Smaregi Developer Console で sandbox アプリ登録、`SMAREGI_CLIENT_ID/SECRET` 取得

### Step 5: 永続化と Lineage（2日）
1. `_bulk_upsert_*` 関数群を `app/services/ingestion_persist.py` 新設
2. ingestion_runner で呼び出し
3. IngestionRecord で生データ保存
4. Lineage event 自動生成（`emit_lineage()`）
5. KPI engine トリガ：変更日付の `recalculate_kpis()` を呼ぶ

### Step 6: スケジューラ（半日）
1. `app/scheduler.py` 実装
2. `app/main.py` の lifespan に start/stop
3. 設定で disable できるように（test 環境用）

### Step 7: CSV 強化（1日）
1. `csv_connector.py` を仕様通りに強化
2. mapping YAML サポート
3. preview endpoint
4. encoding 自動検出（chardet）

### Step 8: Frontend（2日）
1. `/admin/data-sources` を改修
2. 接続追加モーダル
3. OAuth start ボタン
4. CSV upload + mapping 画面
5. ジョブ履歴 / 失敗レコード一覧

### Step 9: テスト（1日）
1. unit: transform / persist 各関数
2. integration: smaregi sandbox に実 OAuth → 1日分 fetch → DB 投入確認
3. integration: CSV 100件投入 → daily_sales が増える
4. e2e: KPI engine が再計算される

---

## 完了基準

- [ ] Smaregi Developer Console で sandbox アプリ登録完了、env に CLIENT_ID/SECRET 設定済
- [ ] UI から「Smaregi 接続」→ OAuth flow → 接続完了状態表示
- [ ] 「今すぐ同期」ボタンで sandbox の transactions が daily_sales に投入される（rowcount > 0）
- [ ] IngestionRecord に生データが残る
- [ ] /admin/lineage で「smaregi → daily_sales → KPI」フローが見える
- [ ] CSV upload で 100件の売上を投入 → 即座に dashboard に反映
- [ ] credentials が grep で平文ヒットしない（fernet 化済）
- [ ] APScheduler が起動時に登録される（log 確認）
- [ ] 接続切れ時に自動 token refresh → 次回 sync 成功
- [ ] integration test 全 PASS（pytest -v）

## 工数見積
- Step 1-3: 2日
- Step 4-5: 5日
- Step 6: 半日
- Step 7-8: 3日
- Step 9: 1日
- **合計: 11.5日（≈ 1.5週）**

## 増点内訳
- 02 実コネクタ：OAuth + 永続化 + scheduler + 暗号化 + CSV 強化で **+7**
- = **+7点**

## 注意
- スマレジ sandbox は無料、本番接続は顧客契約後
- transactions API のレートリミットは 60req/min。30日分 fetch は分割必要
- 過去データのバックフィルは 90日制限あり、それ以前は CSV 経由で
