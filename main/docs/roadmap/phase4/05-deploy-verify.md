# S5 — デプロイ実動作検証（+5点 / 1日）

## 現状 → ゴール
Dockerfile.prod + docker-compose.prod.yml + Terraform + Helm: **書面のみ** → **ローカルでprod構成が完走、OTel基本メトリクス取得**

---

## Step 1: Dockerfile.prod 動作検証（2時間）

### Backend
```bash
cd main/backend
docker build -f Dockerfile.prod -t aentro-api:prod .
# ビルドが通るか確認。エラーがあれば修正。

# 起動テスト（DB不要、importチェック）
docker run --rm aentro-api:prod python -c "from app.main import app; print('OK')"
```

よくある問題:
- `alembic.ini` のCOPY漏れ → Dockerfile修正
- `cryptography` のビルド依存（`libffi-dev`）→ Dockerfile に `RUN apk add --no-cache gcc musl-dev libffi-dev` 追加（Alpine）
- 非rootユーザーのパーミッション → `--chown=app:app` 確認

### Frontend
```bash
cd main/frontend
# next.config.js に output: 'standalone' があるか確認
grep -q "standalone" next.config.js || echo 'output: "standalone" を追加'

docker build -f Dockerfile.prod -t aentro-web:prod .
# standalone ビルドが通るか確認
```

よくある問題:
- `output: 'standalone'` 未設定 → next.config.js 修正
- `.next/static` のCOPY パスずれ
- `public/` ディレクトリのCOPY漏れ

## Step 2: docker-compose.prod.yml 完走（1時間）

```bash
cd main
docker compose -f docker-compose.prod.yml up --build -d
sleep 15  # DBヘルスチェック待ち

# ヘルスチェック
curl http://localhost:8000/health     # 200
curl http://localhost:3000/            # 200

# テーブル作成 + シード
docker compose -f docker-compose.prod.yml exec api \
  python -c "from app.database import Base, sync_engine; from app.models import *; Base.metadata.create_all(sync_engine)"
docker compose -f docker-compose.prod.yml exec api \
  python -m app.seed.run

# API確認
curl http://localhost:8000/api/v1/executive/summary | python3 -m json.tool | head -5

# 停止
docker compose -f docker-compose.prod.yml down
```

prod構成のチェック:
- [ ] volume mount なし（コード変更はビルドし直し）
- [ ] --reload なし
- [ ] workers=4
- [ ] 非rootユーザーで起動
- [ ] ヘルスチェックが動作

## Step 3: OTel基本メトリクス（3時間）

### opentelemetry依存追加
```
# requirements.txt
opentelemetry-api>=1.20.0
opentelemetry-sdk>=1.20.0
opentelemetry-instrumentation-fastapi>=0.41b0
opentelemetry-instrumentation-sqlalchemy>=0.41b0
opentelemetry-exporter-otlp-proto-http>=1.20.0
```

### OTelセットアップ
`backend/app/observability.py`:
```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, BatchSpanProcessor
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def setup_observability(app=None):
    """OTelの初期化。OTEL_EXPORTER_OTLP_ENDPOINTが未設定ならconsoleに出力。"""
    resource = Resource.create({
        "service.name": "aentro-api",
        "service.version": "1.0.0",
        "deployment.environment": settings.ENVIRONMENT,
    })
    
    # Tracing
    provider = TracerProvider(resource=resource)
    
    otlp_endpoint = getattr(settings, 'OTEL_EXPORTER_OTLP_ENDPOINT', '')
    if otlp_endpoint:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint)))
    else:
        # ローカル: ログ出力のみ（毎スパンは煩い→サンプリング）
        logger.info("OTel: console mode (OTEL_EXPORTER_OTLP_ENDPOINT not set)")
    
    trace.set_tracer_provider(provider)
    
    # Metrics
    reader = PeriodicExportingMetricReader(ConsoleMetricExporter(), export_interval_millis=60000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(meter_provider)
    
    # Custom business metrics
    meter = metrics.get_meter("aentro.business")
    
    return {
        "tracer": trace.get_tracer("aentro"),
        "meter": meter,
        "api_request_counter": meter.create_counter("aentro.api.requests", unit="1"),
        "api_latency_histogram": meter.create_histogram("aentro.api.latency_ms", unit="ms"),
        "llm_cost_counter": meter.create_counter("aentro.llm.cost_jpy", unit="JPY"),
        "ingestion_rows_counter": meter.create_counter("aentro.ingestion.rows", unit="1"),
    }
```

### main.py に組込み
```python
from app.observability import setup_observability

# lifespan or startup
otel = setup_observability(app)
```

### FastAPI自動計測
```python
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
FastAPIInstrumentor.instrument_app(app)
```

### カスタムメトリクス埋め込み
- `ai_chat.py`: LLMコスト記録 `otel["llm_cost_counter"].add(cost, {"model": model, "tenant": tid})`
- `ingestion.py`: 投入行数 `otel["ingestion_rows_counter"].add(count, {"entity_type": etype})`
- 全エンドポイント: FastAPIInstrumentorで自動計測

## Step 4: パフォーマンスベースライン（1時間）

```bash
# 主要エンドポイントのレイテンシ計測
for ep in /health /api/v1/executive/summary /api/v1/stores/ranking /api/v1/sv/missions; do
  time curl -s http://localhost:8000$ep > /dev/null
done

# 結果をdocs/に記録
cat > docs/perf-baseline.md << EOF
# Performance Baseline ($(date +%Y-%m-%d))

| Endpoint | p50 | p95 | Target |
|----------|-----|-----|--------|
| /health | Xms | Xms | <100ms |
| /executive/summary | Xms | Xms | <2s |
| /stores/ranking | Xms | Xms | <2s |
| /sv/missions | Xms | Xms | <2s |
EOF
```

## Step 5: Makefile統合（30分）

```makefile
prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-test:
	$(MAKE) prod-up
	sleep 15
	curl -sf http://localhost:8000/health || { echo "API FAIL"; $(MAKE) prod-down; exit 1; }
	curl -sf http://localhost:3000/ || { echo "WEB FAIL"; $(MAKE) prod-down; exit 1; }
	echo "PASS"
	$(MAKE) prod-down
```

---

## 完了基準

- [ ] `docker build -f Dockerfile.prod` が backend / frontend 両方で成功
- [ ] `docker compose -f docker-compose.prod.yml up` で3サービス起動、全ページ200
- [ ] prod構成: volume mountなし、--reloadなし、非rootユーザー、workers=4
- [ ] OTelメトリクス（request count, latency）がコンソールに出力
- [ ] カスタムメトリクス（LLMコスト、ingestion行数）が記録される
- [ ] `make prod-test` が1コマンドで完走
- [ ] パフォーマンスベースラインがdocsに記録
