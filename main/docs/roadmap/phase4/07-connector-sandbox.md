# S7 — コネクタsandbox実動作（+5点 / 1日）

## 現状 → ゴール
5 stub connector（CSV/スマレジ/Airレジ/Square/KOT）が registry にあるが、sandbox JSONを返すだけで **fetch→transform→persist→KPI再計算** のフルフローが動かない。

→ sandbox モードで「同期」ボタンを押すと、sandbox JSONがcanonical tableに永続化され、KPIが更新される。

---

## Step 1: スマレジsandbox JSONを充実（1時間）

`backend/app/connectors/smaregi.py` のSANDBOX_DATAを拡充:

```python
SANDBOX_DATA = {
    "stores": [
        {"storeId": "1", "storeName": "すき家 品川港南店", "address": "東京都港区港南2-18"},
        {"storeId": "2", "storeName": "すき家 横浜鶴見店", "address": "神奈川県横浜市鶴見区"},
        {"storeId": "3", "storeName": "すき家 大宮駅前店", "address": "埼玉県さいたま市大宮区"},
    ],
    "transactions": [
        # 30日分の取引データ（1店舗あたり1日50-80件 × 3店舗 × 30日 = ~6,000件）
        # 実際には日次集計済みデータとして生成:
        *[{
            "transactionId": f"TX-{store}-{day:04d}",
            "storeId": str(store),
            "transactionDateTime": f"2026-04-{(day % 30) + 1:02d}T{12 + (i % 10):02d}:00:00+09:00",
            "subtotal": amount,
            "tax": int(amount * 0.1),
            "total": int(amount * 1.1),
            "customerCount": 1,
            "items": [{"productId": "P001", "productName": "牛丼並盛", "quantity": 1, "price": 450}],
        } for store in [1, 2, 3] 
          for day in range(30) 
          for i, amount in enumerate([random.randint(400, 800) for _ in range(random.randint(50, 80))])]
        # → 約6,000件の取引
    ],
}
```

**注**: 6,000件は多すぎるので、日次集計済みデータ（3店舗×30日=90件）で代用:

```python
import random as _rng
_rng.seed(42)

SANDBOX_DAILY = [
    {
        "storeId": str(store),
        "businessDate": f"2026-04-{day+1:02d}",
        "netSales": _rng.randint(350000, 900000),
        "grossSales": None,  # netSales * 1.03程度
        "customerCount": _rng.randint(400, 900),
        "orderCount": _rng.randint(380, 880),
        "discountAmount": _rng.randint(5000, 30000),
    }
    for store in [1, 2, 3]
    for day in range(30)
]
# grossSales補完
for d in SANDBOX_DAILY:
    d["grossSales"] = d["netSales"] + d["discountAmount"]
```

## Step 2: transform()を完成（1時間）

各コネクタの `transform()` を smaregi形式 → canonical形式に変換:

```python
class SmaregiConnector(BaseConnector):
    def transform(self, raw_records):
        """スマレジ形式 → canonical daily_sales形式"""
        results = []
        for rec in raw_records:
            results.append({
                "store_code": f"SUK{rec['storeId'].zfill(3)}",  # storeId → store_code
                "business_date": rec["businessDate"],
                "net_sales": int(rec.get("netSales", 0)),
                "gross_sales": int(rec.get("grossSales", 0)),
                "customer_count": int(rec.get("customerCount", 0)),
                "order_count": int(rec.get("orderCount", 0)),
                "discount_amount": int(rec.get("discountAmount", 0)),
            })
        return results
```

同様に Airレジ, Square, KOT にもsandbox日次データと transform を実装。

## Step 3: ingestion_runner のフルフロー統合（2時間）

`backend/app/services/ingestion_runner.py` 修正:

```python
async def run_sync_job(db, tenant_id, data_source_id, job_type="incremental"):
    """同期ジョブ実行: fetch → transform → persist → lineage → KPI再計算"""
    # 1. DataSource取得
    ds = await db.get(DataSourceV2, data_source_id)
    
    # 2. Connector取得
    connector = get_connector(ds.source_type)
    
    # 3. IngestionJob作成
    job = IngestionJob(
        tenant_id=tenant_id, data_source_id=data_source_id,
        job_type=job_type, status="running",
        started_at=datetime.utcnow(),
    )
    db.add(job)
    await db.flush()
    
    try:
        # 4. Fetch
        config = ds.config or {}
        if ds.source_type != "csv":
            config["sandbox_mode"] = True  # sandbox固定
        fetch_result = await connector.fetch(config)
        job.rows_fetched = fetch_result.total_fetched
        
        # 5. Transform
        canonical_records = connector.transform(fetch_result.records)
        
        # 6. Persist (UPSERT)
        persisted = await _persist_daily_sales(db, tenant_id, canonical_records, job)
        job.rows_loaded = persisted
        
        # 7. Lineage記録
        from app.services.lineage_tracker import track_lineage
        track_lineage(
            tenant_id=str(tenant_id),
            event_type="connector_sync",
            source_type=ds.source_type,
            source_id=str(ds.id),
            target_type="daily_store_sales",
            target_id=None,
            transformation_name=f"{ds.source_type}_transform",
            metadata={"rows_fetched": job.rows_fetched, "rows_loaded": job.rows_loaded},
        )
        
        # 8. KPI再計算
        affected_dates = sorted(set(r["business_date"] for r in canonical_records if "business_date" in r))
        if affected_dates:
            from app.services.kpi_engine import recalculate_kpis
            from app.database import SyncSession
            sync_session = SyncSession()
            try:
                recalculate_kpis(
                    sync_session, str(tenant_id),
                    start_date=min(affected_dates) if isinstance(min(affected_dates), date) else date.fromisoformat(str(min(affected_dates))),
                    end_date=max(affected_dates) if isinstance(max(affected_dates), date) else date.fromisoformat(str(max(affected_dates))),
                )
            finally:
                sync_session.close()
        
        # 9. DataSource更新
        ds.last_sync_at = datetime.utcnow()
        ds.status = "connected"
        ds.last_error = None
        
        job.status = "success"
        job.finished_at = datetime.utcnow()
        
    except Exception as e:
        job.status = "failed"
        job.finished_at = datetime.utcnow()
        job.error_log = [{"error": str(e), "at": datetime.utcnow().isoformat()}]
        ds.last_error = str(e)
    
    await db.commit()
    
    return {
        "job_id": str(job.id),
        "status": job.status,
        "rows_fetched": job.rows_fetched,
        "rows_loaded": job.rows_loaded,
        "rows_rejected": job.rows_rejected,
    }
```

## Step 4: /connectors/data-sources/{id}/sync の実動作（30分）

`backend/app/api/v1/connectors.py` の sync エンドポイント確認・修正:

```python
@router.post("/data-sources/{id}/sync")
async def sync_data_source(id: str, db = Depends(get_db), tenant_id = Depends(get_tenant_id)):
    result = await run_sync_job(db, tenant_id, id)
    return APIResponse(data=result)
```

## Step 5: フロントの「今すぐ同期」ボタン確認（1時間）

`frontend/src/app/admin/data-sources/page.tsx`:
- 「今すぐ同期」ボタンが sandbox接続（status=connected）のコネクタに表示されること
- クリック → POST `/api/v1/connectors/data-sources/{id}/sync`
- 結果表示: "90件取得、85件投入成功"
- ジョブ履歴に新しいジョブが追加されること

## Step 6: E2Eテスト（30分）

```bash
# 1. スマレジsandboxの同期実行
SMAREGI_DS_ID=$(curl -s http://localhost:8000/api/v1/connectors/data-sources | python3 -c "import json,sys; ds=json.load(sys.stdin)['data']; print([d['id'] for d in ds if d['source_type']=='smaregi'][0])")

curl -X POST "http://localhost:8000/api/v1/connectors/data-sources/${SMAREGI_DS_ID}/sync" | python3 -m json.tool

# 期待: {"data": {"status": "success", "rows_fetched": 90, "rows_loaded": 85, ...}}

# 2. daily_sales にデータが追加されたか
curl -s "http://localhost:8000/api/v1/stores/ranking?page_size=3" | python3 -m json.tool | head -10

# 3. KPIが更新されたか
curl -s http://localhost:8000/api/v1/kpi/calculation-status | python3 -m json.tool
```

---

## 完了基準

- [ ] スマレジ sandbox の「同期」→ 90件fetch → 85件以上persist → KPI再計算
- [ ] Airレジ sandbox の「同期」→ 同様に動作
- [ ] KING OF TIME sandbox の「同期」→ labor_actuals に投入
- [ ] 同期後に `/admin/lineage` で「connector_sync → daily_store_sales → KPI」が表示
- [ ] 同期後に `audit_log` にジョブ記録
- [ ] 同じデータを2回同期してもUPSERTで重複なし
- [ ] フロントの data-sources ページでジョブ履歴に新ジョブが表示
- [ ] ジョブステータスが success / failed で色分け表示
