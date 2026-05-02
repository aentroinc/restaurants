# Phase 2 / S4 — デプロイ実証 + 観測（+1点 / 3日）

## 課題
Phase 1 で Terraform 6 モジュール / Helm chart / CI/CD / Runbook 5本が**書面として**揃った。但し：
- **terraform apply が一度も完走していない**：state bucket すら無い
- **Helm chart 未デプロイ**：手元の k3d/kind 上ですら検証なし
- **OpenTelemetry runtime 未組込**：Grafana ダッシュボードはモジュール定義だけ
- **DR drill 未実施**：RDS 復元手順が机上計画

実環境で「動くこと」を1度でも実証して、`docs/runbooks/` の手順が正しいか検証する。

## ゴール
- staging 環境（AWS）に Terraform で1回デプロイ完走
- Helm を kind cluster に install 完走
- OTel collector が起動、Grafana にメトリクス到達
- DR drill（RDS スナップショットから別リージョンに復元）を1回実施

---

## 仕様書

### Terraform staging apply

事前準備（**実行前確認必須、ユーザー判断**）：
- AWS account: aentro-staging
- S3 bucket: `aentro-terraform-state` 作成（手動 or `infra/bootstrap/` で）
- DynamoDB table: `aentro-terraform-lock` 作成
- IAM user `terraform-deployer` + admin policy（一時、後で絞る）
- env: `AWS_PROFILE=aentro-staging`

```bash
cd infra/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
# → 出力に ALB DNS, RDS endpoint, ECS cluster ARN
```

確認：
- ALB が green target を持つ（healthcheck 通過）
- ECS task が backend / frontend ともに RUNNING
- RDS が available
- CloudWatch log group にログが流入

### Helm 検証

local (kind / k3d) で：
```bash
kind create cluster --name aentro-test
kubectl create namespace aentro
helm dependency update charts/aentro
helm install aentro charts/aentro -n aentro --values charts/aentro/values.yaml
kubectl wait --for=condition=ready pod -l app=aentro-backend -n aentro --timeout=120s
```

確認：
- backend / frontend pod が Running
- ingress が応答（`kubectl port-forward`）
- HPA が config 通り（min=2 max=10 cpu=70%）

### OTel runtime 組込

`backend/app/observability.py` 新設：
```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def setup_observability(app, engine):
    resource = Resource.create({
        "service.name": "aentro-backend",
        "service.version": settings.APP_VERSION,
        "deployment.environment": settings.ENVIRONMENT,
    })
    
    # tracing
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    
    # metrics
    reader = PeriodicExportingMetricReader(OTLPMetricExporter(), export_interval_millis=15000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(meter_provider)
    
    # instrument
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    HTTPXClientInstrumentor().instrument()
```

`app/main.py` で起動時に呼ぶ。`OTEL_EXPORTER_OTLP_ENDPOINT` を env で設定。

custom metrics（business KPI）：
```python
meter = metrics.get_meter("aentro.business")
llm_cost_counter = meter.create_counter("aentro.llm.cost_jpy", unit="JPY")
ingestion_rows_counter = meter.create_counter("aentro.ingestion.rows", unit="1")
kpi_compute_histogram = meter.create_histogram("aentro.kpi.compute_seconds", unit="s")

# 使用例
llm_cost_counter.add(cost_jpy, attributes={"tenant_id": tid, "model": model_name})
```

### Grafana ダッシュボード

`infra/grafana/dashboards/`：
1. `api-latency.json` — request rate / p50/p95/p99 / error rate per endpoint
2. `db-health.json` — connection pool / slow queries / replication lag
3. `llm-cost.json` — tenant 別 daily cost / model split / cache hit ratio
4. `ingestion.json` — job success rate / rows per source / failed records
5. `business-kpi.json` — store_count / active_users / monthly_arr

Terraform observability モジュールに dashboard JSON を Grafana API で push する provisioner を追加。

### DR drill

`docs/runbooks/dr.md` の手順を実走：
1. staging RDS に test-data を投入
2. 「故障発生」シミュレーション
3. 別リージョン（ap-northeast-3 / 大阪）に snapshot 復元
4. 復元 endpoint に backend を向けて、データ全件確認
5. 計測：RTO（実時間）、RPO（差分時間）、誤りやすい手順を runbook に追記

ゴール: RTO ≤ 4h, RPO ≤ 1h（バックアップ間隔依存）

---

## 指示書（実装手順）

### Step 1: AWS staging 準備（半日 / **要承認**）
1. AWS staging account 確認
2. `infra/bootstrap/main.tf` 新設：state bucket + DynamoDB table 作成
3. `terraform apply infra/bootstrap` 実行（**要 user 承認**）
4. AWS_PROFILE 設定 + credential 確認

### Step 2: Terraform staging apply（半日 / **要承認**）
1. `infra/environments/dev/main.tf` を AWS staging account に向ける
2. `terraform plan` で resource 一覧確認、user に approve もらう
3. `terraform apply`
4. 出力（ALB DNS / RDS endpoint）を runbook に記録
5. ALB DNS にアクセスして 200 OK 確認

### Step 3: Helm 検証（半日）
1. kind cluster 起動
2. `helm install` 実行
3. pod Running 確認、ingress port-forward でブラウザ確認
4. HPA scaling 動作確認（負荷をかける）

### Step 4: OTel 組込（1日）
1. `pip install opentelemetry-distro opentelemetry-exporter-otlp opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-sqlalchemy opentelemetry-instrumentation-httpx`
2. `app/observability.py` 実装
3. `app/main.py` の lifespan で `setup_observability(app, engine)`
4. local でも otel-collector docker container 起動 → console exporter で動作確認
5. staging で OTel collector を確認、Grafana にメトリクス到達

### Step 5: Grafana ダッシュボード（半日）
1. 5 dashboard JSON を作成
2. terraform で Grafana API 経由 push
3. staging に反映、目視確認

### Step 6: DR drill（1日 / **要承認**）
1. RDS snapshot 取得
2. 別リージョンに restore（**要 user 承認**：別リージョンインスタンス起動はコスト発生）
3. backend を新 RDS に向ける（staging のみ）
4. データ確認、不整合の有無
5. RTO / RPO 実測値を `docs/runbooks/dr.md` に記録
6. drill 後、復元インスタンスは速やかに削除

---

## 完了基準

- [ ] `terraform apply` が staging で完走、resource 全て healthy
- [ ] ALB DNS にアクセスして frontend が表示される
- [ ] `helm install` が kind cluster で完走、pod Running
- [ ] OTel collector で trace / metrics / logs が Grafana に到達
- [ ] Grafana の API latency / DB / LLM cost / Ingestion / Business の5枚が live で見える
- [ ] DR drill 実施 → RTO 実測値 ≤ 4h、`docs/runbooks/dr.md` に記録
- [ ] terraform.tfstate が S3 に保存され、lock が動作

## 工数見積
- Step 1-2: 1日
- Step 3: 半日
- Step 4: 1日
- Step 5: 半日
- Step 6: 1日
- **合計: 4日（3日に圧縮可）**

## 増点内訳
- 06 デプロイ：実環境で動作実証 + OTel runtime + DR drill で **+1**
- = **+1点**

## 注意（**実行前必読**）
- AWS のコスト：staging 環境は ECS Fargate + Aurora で月 ~5万円程度。停止忘れ注意
- DR drill のクロスリージョン RDS は1時間で数百円。drill 後に必ず削除
- staging deploy は本番に影響しないが、**実 AWS リソース起動は user の明示承認が必要**（CLAUDE.md ルール）
- terraform destroy も承認必須
