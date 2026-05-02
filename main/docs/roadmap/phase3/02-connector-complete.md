# S-B — コネクタ完遂（+4点 / 3日）

## 現状
- BaseConnector ABC + 5 stub connector + registry 実装済
- CSV upload → 検証 → IngestionBatch 作成は動く
- **canonical永続化が不完全**: ingestion_runner がtransformed recordsをDBに書き込まない
- スケジューラ未配線
- credentials暗号化未実装
- コネクタ詳細画面（ジョブ履歴）なし

## ゴール
CSVアップロード → 自動検証 → canonical table永続化 → KPI再計算 → ダッシュボード反映が一気通貫で動く。

---

## 実装手順

### Step 1: ingestion_runner の canonical永続化（4時間）

`backend/app/services/ingestion_runner.py` を改修:

```python
async def run_sync_job(db, tenant_id, data_source_id, job_type):
    # 既存: fetch + transform
    # 追加: transformed records → canonical tables にUPSERT
    
    canonical = connector.transform(fetch_result.records)
    
    # daily_sales の UPSERT
    for record in canonical:
        # store_code → store_id 解決
        store = await db.execute(
            select(Store).where(Store.code == record["store_code"], Store.tenant_id == tenant_id)
        )
        store = store.scalar_one_or_none()
        if not store:
            job.rows_rejected += 1
            continue
        
        # UPSERT (ON CONFLICT DO UPDATE)
        stmt = pg_insert(DailyStoreSales).values(
            tenant_id=tenant_id,
            store_id=store.id,
            business_date=record["business_date"],
            net_sales=record["net_sales"],
            customer_count=record.get("customer_count", 0),
            # ... other fields
        ).on_conflict_do_update(
            constraint="uq_daily_sales_store_date",  # store_id + business_date
            set_={"net_sales": stmt.excluded.net_sales, ...}
        )
        await db.execute(stmt)
        job.rows_loaded += 1
    
    await db.commit()
```

**注意**: DailyStoreSales に store_id + business_date の UNIQUE制約を追加する必要あり。

### Step 2: CSV コネクタのフル動作（2時間）

`backend/app/connectors/csv_connector.py` 強化:
- `transform()` でCSV行をcanonical形式に変換
- 日本語カラム名の自動マッピング（`売上日` → `business_date` 等）
- encoding自動判定（UTF-8 / Shift-JIS）
- 日付フォーマット自動判定（YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD）

### Step 3: 既存 ingestion.py の upload → connector統合（2時間）

`backend/app/api/v1/ingestion.py` 修正:
- upload → IngestionBatch作成 → **IngestionJob作成** → connector.transform → 永続化
- promote エンドポイントを統合（upload時にvalidation、promoteで永続化の2段階を維持）
- promote後に `kpi_engine.recalculate_kpis()` を自動トリガ
- promote後に `lineage_tracker.track_lineage()` で系譜記録

### Step 4: UNIQUE制約追加（1時間）

`daily_store_sales` テーブルに `UNIQUE(tenant_id, store_id, business_date)` 制約を追加:
```python
# backend/app/models/daily_sales.py
__table_args__ = (
    UniqueConstraint("tenant_id", "store_id", "business_date", name="uq_daily_sales_store_date"),
)
```

同様に:
- `labor_actuals`: `UNIQUE(tenant_id, store_id, business_date)`
- `store_pl`: `UNIQUE(tenant_id, store_id, period_start, period_end)`

テーブル変更は `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` で。

### Step 5: credentials暗号化（1時間）

`backend/app/services/secrets.py` が既にある場合は確認。なければ作成:
```python
from cryptography.fernet import Fernet
import os

def get_fernet():
    key = os.environ.get("INGESTION_MASTER_KEY")
    if not key:
        key = Fernet.generate_key().decode()  # dev用自動生成
    return Fernet(key.encode() if isinstance(key, str) else key)

def encrypt_credentials(plaintext: str) -> str:
    return get_fernet().encrypt(plaintext.encode()).decode()

def decrypt_credentials(ciphertext: str) -> str:
    return get_fernet().decrypt(ciphertext.encode()).decode()
```

DataSourceV2 の credentials 保存時に `encrypt_credentials()` を使用。

### Step 6: フロント data-sources 強化（3時間）

`frontend/src/app/admin/data-sources/page.tsx` 修正:
- 「接続テスト」ボタン → `/connectors/data-sources/{id}/test` を呼ぶ → 結果表示
- 「今すぐ同期」ボタン → `/connectors/data-sources/{id}/sync` を呼ぶ → ジョブ作成 → ステータス表示
- ジョブ履歴タブ: `/connectors/data-sources/{id}/jobs` からジョブ一覧
- 各ジョブのステータスバッジ（success=green, failed=red, running=blue）
- CSVアップロード時にプレビュー（先頭5行）→ カラムマッピング確認 → 投入

### Step 7: E2Eテスト（1時間）

手動テストスクリプト:
```bash
# 1. テスト用CSVを作成
echo "business_date,store_code,net_sales,customer_count" > /tmp/test.csv
echo "2026-05-01,SUK001,550000,720" >> /tmp/test.csv

# 2. アップロード
curl -X POST http://localhost:8000/api/v1/ingestion/upload \
  -F "entity_type=daily_sales" -F "file=@/tmp/test.csv"

# 3. 昇格
curl -X POST http://localhost:8000/api/v1/ingestion/batches/{id}/promote \
  -F "entity_type=daily_sales" -F "file=@/tmp/test.csv"

# 4. KPI再計算が走ったか確認
curl http://localhost:8000/api/v1/kpi/calculation-status

# 5. ダッシュボードに反映されたか確認
curl http://localhost:8000/api/v1/executive/summary
```

---

## 完了基準
- [ ] CSVアップロード → 検証通過 → promote → `daily_store_sales` にUPSERTされる
- [ ] promote後にKPI再計算が自動トリガされる
- [ ] promote後にlineage_eventsに記録が残る
- [ ] 同じCSVを2回アップロードしてもデータが二重にならない（UPSERT）
- [ ] credentials が暗号化されてDBに保存される（grep で平文ヒットしない）
- [ ] フロントの data-sources ページでジョブ履歴が見える
- [ ] E2Eテスト: CSV 100行 → promote → KPI → ダッシュボード反映が5分以内
