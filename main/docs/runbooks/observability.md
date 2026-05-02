# Observability Runbook

## 概要
- バックエンドは Prometheus 形式の `/metrics` を公開（auth 不要、`MetricsMiddleware` 経由）
- OpenTelemetry trace は `OTEL_ENABLED=true` 環境変数で OTLP gRPC エクスポート（FastAPI / SQLAlchemy / httpx 全て自動計測）
- Grafana ダッシュボード 2 種を `infra/grafana/dashboards/` に同梱

## メトリクス一覧
| メトリクス | 種別 | ラベル | 用途 |
|---|---|---|---|
| `aentro_requests_total` | Counter | method, path, status | リクエスト数 |
| `aentro_request_latency_seconds` | Histogram | method, path | p50/p95/p99 |
| `aentro_errors_total` | Counter | method, path, status | 5xx error |
| `aentro_ai_tokens_total` | Counter | model, kind | input/output tokens |
| `aentro_ai_cost_usd_total` | Counter | model | 推定 AI コスト |
| `aentro_login_failures_total` | Counter | — | login fail |
| `aentro_lockouts_total` | Counter | — | アカウントロック |
| `aentro_access_deny_total` | Counter | — | RBAC deny |
| `aentro_pii_redactions_total` | Counter | — | PII column-mask |
| `aentro_db_connections_in_use` | Gauge | — | DB プール使用数 |
| `aentro_pipeline_runs_total` | Counter | status | パイプライン実行 |

## アラート閾値（推奨）
| シグナル | 警告 | 重大 |
|---|---|---|
| p95 latency | > 300ms × 5min | > 500ms × 5min |
| 5xx error rate | > 0.5% × 5min | > 1% × 5min |
| login failures | > 5 / min | > 10 / min |
| lockouts | > 3 / hour | > 10 / hour |
| AI daily cost | > $30/日 | > $50/日 |
| DB connections in use | > 15 | > 25 |

## Grafana ダッシュボードのインポート
1. Grafana の Datasource として Prometheus（uid: `Prometheus`）を登録
2. Grafana UI の **Dashboards → Import** から `infra/grafana/dashboards/aentro-overview.json` を貼り付け（または file upload）
3. `aentro-security.json` も同様にインポート
4. プロビジョニング派は `/etc/grafana/provisioning/dashboards/` に上記 JSON を配置し `path` を指定

## Prometheus 起動
```bash
docker run -d --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```
（同一 docker network で `backend:8000/metrics` を scrape）

## OTEL collector を立てる場合
- `OTEL_ENABLED=true`
- `OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317`
- `requirements-otel.txt` を `pip install`

## 障害時のクイック確認
1. `/api/v1/observability/health` — DB / Anthropic / Vault 依存ヘルス
2. `/api/v1/observability/slo` — SLO 達成状況（success rate / p95 / AI cost）
3. `/metrics` — 生データ
4. Grafana の **AENTRO Overview** ダッシュボードで時系列確認

## 計装ポイントの追加方法
- API 側で何かカウントしたい時は `from app.middleware.metrics import inc_login_failure, record_ai_tokens, ...`
- AI 呼び出し直後に `record_ai_tokens(model, input_tokens, output_tokens)` を 1 行入れる
- パイプライン runner の `try/except` で `inc_pipeline_run("ok"|"failed")` を呼ぶ
