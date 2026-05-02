# 09 — 横断プラットフォーム（+5 点）

## 課題
01-08 を全部仕上げても、それを「**1万店舗 × 1万ユーザー × 100億行 / 99.9% SLO**」で動かす横断品質がなければ、エンプラ顧客は買わない。マルチテナンシー・性能・可観測性・データ基盤は **どこかの領域にぶら下げる** のではなく、**独立した品質基準** として要求される。

## ゴール
1. **マルチテナンシー**: tenant 分離が物理 / 論理 / アプリ層の3重で強制される
2. **性能**: 5 万店舗・1 日 1 億行投入でも API p95 < 500ms、SLO 99.9% 月間
3. **可観測性**: per-tenant メトリクス / トレース / ログ / コストが Grafana で見える
4. **データ基盤**: 取り込み → 正規化 → 集計 → 公開 のレイヤが標準パイプラインで動く

---

## A. マルチテナンシー仕様

### A.1 分離レベル（顧客プランで切替）

| プラン | 分離 | DB | 環境 | 想定顧客 |
|-------|------|----|----|---------|
| Shared (Standard) | tenant_id ベース論理分離 | 共有 cluster, 共有 DB, schema 共有, RLS 適用 | shared VPC | 中堅外食 (50-300 店) |
| Isolated DB (Pro) | 物理 DB 分離 | 共有 cluster, 個別 DB | shared VPC | 大手 (300-1000 店) |
| Dedicated (Enterprise) | 完全分離 | 専用 cluster | dedicated VPC | 上場大手 (1000 店+) / FC本部 |

### A.2 アプリ層の分離強制

```python
# app/core/tenant_context.py
from contextvars import ContextVar
from uuid import UUID

_current_tenant: ContextVar[UUID | None] = ContextVar("current_tenant", default=None)

def set_current_tenant(tenant_id: UUID): _current_tenant.set(tenant_id)
def get_current_tenant() -> UUID:
    tid = _current_tenant.get()
    if tid is None:
        raise RuntimeError("Tenant context not set — fail closed")
    return tid

# app/core/db_session.py
class TenantScopedSession(AsyncSession):
    async def execute(self, statement, *args, **kwargs):
        tenant_id = get_current_tenant()
        # SELECT/UPDATE/DELETE に tenant_id フィルタを自動注入
        statement = ensure_tenant_filter(statement, tenant_id)
        return await super().execute(statement, *args, **kwargs)
```

**全 API エンドポイントは `Depends(get_current_user)` 経由で tenant_context を必ず set**。set されていない状態の DB クエリは fail-closed で 500 を返す。

### A.3 PostgreSQL Row Level Security（RLS）

最終防衛線として **DB 層でも tenant 強制**：

```sql
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON daily_sales
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 接続ごとに SET LOCAL app.current_tenant = '<uuid>' を発行
```

### A.4 横串テスト（必須）

`tests/integration/test_tenant_isolation.py`:

```python
async def test_tenant_a_cannot_see_tenant_b_data():
    a_user = await create_test_user(tenant_id=TENANT_A)
    b_store = await create_test_store(tenant_id=TENANT_B)
    
    async with auth_as(a_user):
        result = await client.get(f"/api/v1/stores/{b_store.id}")
    
    assert result.status_code == 404  # 403 ではなく 404 で存在を露呈しない

async def test_all_endpoints_enforce_tenant():
    """全 GET endpoint を巡回し、context 未 set で 500 を返すことを確認。"""
    for endpoint in collect_all_get_endpoints():
        with pytest.raises(TenantContextNotSetError):
            await endpoint_function()
```

CI では **テナント分離テストの失敗 = blocker**。

### A.5 マイグレーション戦略
- shared → isolated DB は **顧客プラン変更時に dump/restore**
- 切替手順は `runbooks/tenant-tier-upgrade.md` で標準化

---

## B. 性能仕様

### B.1 SLA（顧客契約）

| 指標 | Standard | Pro | Enterprise |
|------|----------|-----|-----------|
| API 可用性（月間） | 99.5% | 99.9% | 99.95% |
| API p95 latency | < 1s | < 500ms | < 300ms |
| データ反映遅延 | < 24h | < 4h | < 1h |
| 復旧時間 (RTO) | 24h | 4h | 1h |
| データ損失許容 (RPO) | 24h | 1h | 15min |

### B.2 スケール目標（製品仕様）

| 軸 | 12 ヶ月後の目標 |
|----|---------------|
| テナント数 | 30 |
| 総店舗数 | 5 万 |
| 日次取込行数 | 1 億行 |
| 月次取込行数 | 30 億行 |
| 累積行数 | 100 億行 |
| 同時接続ユーザー数 | 5,000 |
| 同時 LLM セッション | 500 |

### B.3 設計原則

1. **集計テーブルの事前計算**：daily_sales → store_daily_kpi → store_monthly_kpi の3段
2. **partition by date + tenant_id**：daily_sales は `PARTITION BY RANGE (date) PARTITION BY HASH (tenant_id, 8)`
3. **read replica 1台**：分析クエリは read replica へ
4. **キャッシュ階層**：Redis（session / KPI cache / RBAC scope cache）
5. **非同期処理**：APScheduler → 重い ingestion は別プロセス
6. **N+1 禁止**：SQLAlchemy `selectinload` / `joinedload` 強制、`pytest-django-debug-toolbar` 同等のクエリ数 lint
7. **JSONB GIN index**：ontology_instances.properties は必ず GIN index

### B.4 性能テスト（必須）

```
backend/tests/perf/
├── locustfile.py          # 1000 users for 10min, p95 measure
├── seed_100m_rows.py      # 1 億行を投入
└── targets.yaml           # 各 endpoint の p50/p95/p99 SLO
```

CI で `make perf-test`、目標から 20% 劣化したら fail。

---

## C. 可観測性 / SLO

### C.1 SLI 定義

| SLI | 計測 | SLO 目標 |
|-----|------|---------|
| API 可用性 | (200/2xx + 304) / total | 99.9% |
| API latency | http.server.duration p95 | < 500ms |
| Ingestion 成功率 | success_jobs / total_jobs | 99% |
| LLM 応答成功率 | non-error responses / total | 99.5% |
| LLM 応答 latency | first_token p95 | < 3s |
| DB 接続プール利用率 | active / pool_size | < 80% |

### C.2 OpenTelemetry 計装

```python
# app/observability/otel.py
from opentelemetry import trace, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_observability(app, db_engine):
    FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
    SQLAlchemyInstrumentor().instrument(engine=db_engine)
    
    # tenant_id を span attribute に
    @app.middleware("http")
    async def tenant_span(request, call_next):
        span = trace.get_current_span()
        span.set_attribute("tenant.id", str(get_current_tenant()))
        span.set_attribute("user.id", str(get_current_user().id))
        return await call_next(request)
```

**注意**: tenant_id を **metric の label** には付けない（cardinality 爆発）。trace の attribute だけ。

### C.3 Grafana ダッシュボード（標準セット）

`infra/grafana/dashboards/`:
- `01-platform-overview.json`: 全 tenant 横串の health
- `02-per-tenant-sli.json`: tenant 選択 → SLI / SLO 達成率
- `03-ingestion-pipeline.json`: コネクタ別 sync 件数 / 失敗
- `04-llm-cost.json`: tenant 別 / モデル別 月次コスト
- `05-db-performance.json`: slow query / connection pool / replication lag
- `06-error-budget.json`: SLO error budget 残量

### C.4 アラート（PagerDuty / Slack）

| アラート | 条件 | 通知先 |
|---------|------|--------|
| Critical: 全体障害 | error rate > 5% for 5min | PagerDuty (oncall) |
| Critical: テナント分離違反 | RLS bypass 検知 | PagerDuty + Slack #security |
| High: SLO 危険水域 | error budget < 20% | Slack #sre |
| High: LLM 月予算 80% | tenant cumulative cost / cap > 0.8 | Slack #ai-cost + 該当 CS |
| Mid: ingestion 連続失敗 | 同一 data_source で 3 連続失敗 | Slack #integration |
| Mid: DB connection pool 90% | active >= 90% pool_size | Slack #sre |

### C.5 監査・ロギング統合

OTel logs + 既存 `audit_log` を Loki / CloudWatch にも転送。**全ログに tenant_id / user_id / request_id が必須**。

---

## D. データ基盤（Lakehouse 風）

### D.1 4 層アーキテクチャ

```
[Bronze: 生データ]
  ingestion_records (JSONB raw payload, immutable)
  ↓
[Silver: 正規化済み]
  daily_sales / hourly_sales / labor_actuals / ... (canonical schema)
  ↓
[Gold: 集計]
  store_daily_kpi / store_monthly_kpi / brand_quarterly_kpi
  ↓
[Platinum: 顧客カスタム]
  custom_kpis / cohorts / saved analyses (04 連携)
```

### D.2 Bronze 層の保存

`ingestion_records` テーブル:
- 30日間 hot (Postgres)
- 30〜365日 warm (S3 Parquet)
- 365日〜 cold (S3 Glacier)
- 削除ポリシー: 顧客契約解除 + 90 日後

### D.3 集計パイプライン

`app/services/aggregation_pipeline.py`:

```python
class AggregationPipeline:
    """
    Bronze → Silver → Gold の incremental 集計。
    各 step は idempotent。再実行で結果が壊れない。
    """
    async def run(self, tenant_id, target_date):
        await self.bronze_to_silver(tenant_id, target_date)
        await self.silver_to_gold(tenant_id, target_date)
        await self.notify_downstream(tenant_id, target_date)
        # AI Analyst のキャッシュ無効化、Workspace の Materialization 更新
```

毎日 03:00 JST 起動。前日分を **同期的に完了**してから dashboard が更新される。

### D.4 Lineage 自動配線

各 step で `lineage_edges` を自動記録。`/admin/lineage` UI で **bronze record まで遡れる**。

```
[Smaregi API] → [ingestion_records] → [daily_sales] → [store_daily_kpi]
                                                            ↓
                                                  [/api/v1/executive/summary]
                                                            ↓
                                                  [Dashboard / AI Analyst]
```

### D.5 データ品質ゲート

bronze → silver の遷移時に DQ ルール適用：

```python
DQ_RULES = [
    NotNull("daily_sales.store_id"),
    Range("daily_sales.net_sales", min=0, max=100_000_000),
    Reconciliation(
        left="daily_sales.net_sales",
        right="store_pl.net_sales",
        tolerance=0.01,  # ±1%
    ),
    UniquenessCheck("daily_sales", ["tenant_id", "store_id", "date"]),
    Freshness("daily_sales.date", max_lag_hours=24),
]
```

違反は `data_quality_issues` に記録、severity に応じて：
- `critical` → silver 投入を block、Slack 通知
- `warning` → 投入は通すが dashboard に注意マーク
- `info` → log のみ

---

## 指示書（実装手順）

### Step 1: テナント context 強制 (3日)
1. `app/core/tenant_context.py` 実装
2. `Depends(get_current_user)` で context 自動 set
3. `TenantScopedSession` 実装 + 既存 session 置換
4. 全 API endpoint をリグレッションテスト
5. RLS 有効化 SQL を migration に追加

### Step 2: テナント分離テスト (2日)
1. `tests/integration/test_tenant_isolation.py` 作成
2. 全 GET endpoint を反復テスト
3. CI に組込み、fail で merge block

### Step 3: 性能テスト基盤 (4日)
1. `tests/perf/seed_100m_rows.py`：seed scale-up
2. `locustfile.py`：主要 endpoint シナリオ
3. `targets.yaml`：endpoint 別 SLO
4. `make perf-test` を Makefile に追加

### Step 4: 集計パイプライン (5日)
1. `app/services/aggregation_pipeline.py`
2. `store_daily_kpi`、`store_monthly_kpi` テーブル + 集計 SQL
3. APScheduler に登録
4. lineage 自動配線

### Step 5: DQ ルール (3日)
1. `app/services/dq_engine.py` 強化
2. 上記 5 ルールクラスを実装
3. POS↔PL Reconciliation を `daily_sales.net_sales` vs `store_pl.net_sales` で実行
4. UI に DQ Issue ダッシュボード

### Step 6: OpenTelemetry (4日)
1. `app/observability/otel.py`
2. FastAPI / SQLAlchemy / httpx instrumentation
3. tenant span attribute 注入
4. OTel collector を docker-compose / terraform に
5. Grafana dashboard 6 本

### Step 7: SLO アラート (2日)
1. Grafana Alerting でアラートルール定義
2. PagerDuty 接続
3. Slack 接続
4. error budget burn rate アラート

### Step 8: パーティション + Index (3日)
1. `daily_sales` を partition 化（date 月単位）
2. `ingestion_records.payload` の必要キーに JSONB GIN
3. EXPLAIN ANALYZE でクエリプラン検証

### Step 9: マルチテナント DB プラン分離 (5日)
1. `tenants.tier` カラム追加（standard / pro / enterprise）
2. tier 切替ジョブ：`scripts/upgrade_tenant_tier.py`
3. dedicated VPC のための Terraform module（`environments/prod-dedicated/`）

### Step 10: 性能 / SLO 受け入れテスト (3日)
1. 5万店舗 + 1億行 seed
2. locust 1000 users → p95 計測
3. 30 日連続稼働で SLO 達成率検証

---

## 完了基準

### 5 点認定（最高評価）
- [ ] 全 API endpoint で tenant context 強制、未 set 時 500
- [ ] RLS が全主要テーブルで有効
- [ ] tenant 分離 integration test が CI で 100% pass
- [ ] 5 万店舗 + 1 億行で API p95 < 500ms 達成
- [ ] OTel + Grafana で per-tenant SLI dashboard 稼働
- [ ] error budget アラートが PagerDuty に飛ぶ
- [ ] 30 日連続で SLO 99.9% 達成
- [ ] 集計パイプラインが毎日 03:00 自動完走、Lineage 全段繋がる
- [ ] DQ ルール 5 件以上が稼働、Reconciliation で POS↔PL 検証
- [ ] dedicated VPC が Terraform で 30 分以内に立ち上がる

### 段階点
- 1 点: tenant 強制フィルタ完了
- 2 点: 性能 SLO 達成
- 3 点: OTel + 標準 dashboard
- 4 点: HPA / Fargate auto scale
- 5 点: 5 万店舗 / 100 億行 / SLO 99.9% 月間

---

## 工数見積
- Step 1-2 (tenant 強制 + テスト): 5日
- Step 3 (性能基盤): 4日
- Step 4-5 (パイプライン + DQ): 8日
- Step 6-7 (OTel + アラート): 6日
- Step 8 (partition / index): 3日
- Step 9-10 (DB tier + 受入): 8日
- **合計: 約 7 週間（1 人）**

## 注意
- RLS と application 強制の二重がベスト。片方だけは将来必ず穴
- OTel の cardinality 制御を怠ると Grafana / Loki が即死
- 5 万店舗 seed は時間がかかる（数時間）。CI では subset、nightly で full
- partition 切替は無停止で行う（DETACH/ATTACH）
