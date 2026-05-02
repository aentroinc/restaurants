# 06 — デプロイ堅牢化（+5点）

## 課題
docker-compose 1本で「動かしてみせる」までは行ける。だが、エンタープライズ顧客は **VPC isolated / 専用環境 / SOC2 対応 / 監視 / 災害対策** を要求する。`Dockerfile` は dev 用 1段階ビルドのまま。

## ゴール
- 本番デプロイ：AWS / GCP どちらでも Terraform で 30分以内に立ち上がる
- Kubernetes (Helm chart) で水平スケール
- secrets は SOPS or Vault、env ファイル直書き禁止
- observability：OpenTelemetry → Grafana / Loki / Tempo
- バックアップ：postgres を毎日 S3 へ、PITR 7日保持
- 災害復旧：RTO 4h, RPO 1h
- セキュリティスキャン：CI で SAST + SCA + Container scan
- 単一テナント (dedicated) / マルチテナント (shared) どちらの構成も可

---

## 仕様書

### インフラ構成（AWS 想定 / GCP は対応版を併記）

```
[CloudFront / Cloud CDN]
  ↓
[ALB / Cloud LB]
  ↓
┌─ private subnet ─────────────────────────────────┐
│ [ECS Fargate / GKE]                              │
│  ├─ frontend (Next.js standalone)                │
│  └─ backend (FastAPI + uvicorn)                  │
│                                                   │
│ [RDS Aurora PostgreSQL / Cloud SQL]              │
│ [ElastiCache Redis / Memorystore]  ← session     │
│ [S3 / GCS]  ← uploads, exports, backups          │
│ [SQS / Pub/Sub]  ← ingestion job queue           │
│ [Secrets Manager / Secret Manager]               │
│ [KMS / Cloud KMS]                                │
└──────────────────────────────────────────────────┘

[CloudWatch / Cloud Logging] ← OTel collector
[Grafana Cloud or self-hosted] ← metrics + logs + traces
```

### Dockerfile 改修

`backend/Dockerfile`:
```dockerfile
# multi-stage
FROM python:3.12-slim AS builder
WORKDIR /build
RUN pip install --no-cache-dir poetry==1.8.0
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt
RUN pip wheel --wheel-dir=/wheels -r requirements.txt

FROM python:3.12-slim AS runtime
RUN useradd -u 10001 -m app
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/*.whl && rm -rf /wheels
WORKDIR /app
COPY --chown=app:app app ./app
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini ./
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8000/healthz || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
```

### Terraform レイアウト
```
infra/
├── modules/
│   ├── network/        # VPC, subnets, NAT, security groups
│   ├── database/       # Aurora cluster, parameter groups, backup
│   ├── compute/        # ECS cluster, services, task definitions
│   ├── storage/        # S3 buckets w/ lifecycle, KMS keys
│   ├── observability/  # CloudWatch, OTel collector, Grafana workspace
│   └── secrets/        # Secrets Manager + KMS
├── environments/
│   ├── dev/            # マルチテナント共有
│   ├── staging/
│   ├── prod-shared/    # マルチテナント本番
│   └── prod-dedicated/ # 顧客ごとの専用環境テンプレ
└── shared/             # IAM, account baseline
```

### Helm Chart (k8s 派の顧客向け)
```
charts/aentro/
├── Chart.yaml
├── values.yaml
├── values-prod.yaml
└── templates/
    ├── backend-deployment.yaml
    ├── backend-hpa.yaml
    ├── frontend-deployment.yaml
    ├── ingress.yaml
    ├── secrets-external.yaml  # External Secrets Operator
    ├── postgres-statefulset.yaml  # 自前 postgres 派
    └── ...
```

### Secrets 管理

**SOPS (Mozilla) 採用**：
- `secrets/{env}.yaml.enc`：AWS KMS で暗号化
- CI で `sops -d` → env として注入
- 本番は AWS Secrets Manager / Vault に移行（手順書あり）

NG パターン:
- `.env` を git に commit
- `docker-compose.yml` に直書き
- Terraform state に平文

### Observability
- **OpenTelemetry SDK** を backend / frontend に組込み
- `app/observability.py`：OTel collector に metrics / traces / logs を送信
- Grafana ダッシュボード（initial set）：
  - API latency p50/p95/p99
  - DB connection pool / slow query
  - LLM cost (per tenant per day)
  - Ingestion job success rate
  - Custom KPI compute time
- アラート: PagerDuty / Slack
  - p95 latency > 2s 5min
  - error rate > 1% 5min
  - LLM 月予算 80% 到達
  - ingestion 連続失敗

### バックアップ / DR
- Aurora: PITR 7日 + 日次スナップショット 30日保持
- S3 cross-region replication（東京 → 大阪）
- Disaster recovery runbook：`docs/runbooks/dr.md`
  - RDS failover 手順
  - リージョン切り替え手順
  - 復旧確認チェックリスト

### CI/CD
- GitHub Actions:
  - `lint`: ruff, mypy, eslint, tsc
  - `test`: pytest, vitest
  - `security`:
    - `trivy` for container scan
    - `bandit` for python SAST
    - `pip-audit` / `npm audit` for SCA
  - `build`: multi-arch docker (amd64, arm64) → ECR
  - `deploy-staging`: 自動 (main push)
  - `deploy-prod`: 手動承認 + canary 10% → 全展開
- DB migration: pre-deploy step で `alembic upgrade head`

---

## 指示書（実装手順）

### Step 1: Dockerfile 改修
1. backend/frontend を multi-stage に
2. non-root user
3. healthcheck
4. `frontend/next.config.js` に `output: 'standalone'`

### Step 2: Terraform 基盤
1. `infra/modules/network/` から着手（VPC, 3AZ, public/private/data subnet）
2. `modules/database/` で Aurora PostgreSQL 16 + pgvector
3. `modules/compute/` で ECS Fargate cluster
4. `modules/storage/`、`secrets/`、`observability/`
5. `environments/dev/` で1セット成立、apply で動作確認

### Step 3: Helm Chart
1. `helm create charts/aentro` から start
2. backend / frontend deployment
3. External Secrets Operator で Secrets Manager から注入
4. HPA: cpu 70%
5. Ingress: cert-manager で Let's Encrypt

### Step 4: SOPS 導入
1. `.sops.yaml` で KMS key 設定
2. `secrets/dev.yaml.enc`, `secrets/prod.yaml.enc`
3. dev: `make decrypt-secrets` で .env 生成
4. CI: `sops -d` のみ、コミット禁止

### Step 5: OpenTelemetry
1. `app/observability.py`：opentelemetry-instrumentation-fastapi
2. resource attributes に `tenant_id` を付ける（cardinality 注意）
3. `frontend/src/lib/otel.ts`：browser SDK
4. OTel collector を terraform で立てる
5. Grafana ダッシュボードを `infra/grafana/dashboards/*.json`

### Step 6: バックアップ
1. Aurora の `backup_retention_period = 7`、`copy_tags_to_snapshot = true`
2. S3 lifecycle: 30日後 IA、90日後 Glacier、365日後 削除
3. クロスリージョンレプリケーション設定
4. backup test を月次で実行（restore 検証）

### Step 7: CI/CD
1. `.github/workflows/ci.yml`：lint + test + security
2. `.github/workflows/cd.yml`：build + push + deploy
3. `actions-aws-credentials` で OIDC（IAM access key 不要）
4. canary deploy: ECS の deployment circuit breaker

### Step 8: ランブック
1. `docs/runbooks/`：
   - `incident-response.md`
   - `dr.md`
   - `db-migration.md`
   - `secret-rotation.md`
   - `tenant-onboarding.md`
2. on-call rotation を PagerDuty で設定

### Step 9: SOC2 / セキュリティドキュメント
1. `docs/security/`：control matrix
2. アクセスレビュー: 四半期ごとに roles 棚卸し
3. ペネトレーションテスト：年1回（外部委託）
4. 既存 `docs/poc/03-enterprise-security-data-handling-brief.md` を更新

---

## 完了基準
- [ ] `terraform apply` で空の AWS アカウントから 30分以内に prod-shared が立ち上がる
- [ ] `helm install aentro charts/aentro -f values-prod.yaml` で同等構成が k8s に立つ
- [ ] secrets が grep で平文ヒットしない（CI で gitleaks 通過）
- [ ] Grafana で「API p95 latency」ダッシュボードが live で見える
- [ ] LLM コスト dashboard が tenant 別に表示
- [ ] DR drill：RDS を別リージョンに復元 → 4時間以内に完了
- [ ] CI が SAST/SCA/Container scan を全部回す
- [ ] canary deploy で本番反映時にエラー率が閾値超えたら自動 rollback
- [ ] 全 secrets が KMS / Secrets Manager 経由
- [ ] runbook 5本完成

## 工数見積
- Step 1-2 (Docker + Terraform): 8日
- Step 3 (Helm): 4日
- Step 4 (SOPS): 2日
- Step 5 (OTel): 5日
- Step 6 (Backup): 2日
- Step 7 (CI/CD): 4日
- Step 8-9 (Runbooks + Security): 3日
- **合計: 約 6週間（1人 / インフラ経験者）**

## 注意
- 一度本番運用始めると Terraform の破壊的変更は危険。state 分割をしっかり
- 顧客の規模次第で「dedicated VPC」を要求される。テンプレを `prod-dedicated/` に用意
- on-prem (顧客 DC) 派の大手向けに OpenShift 版も視野
