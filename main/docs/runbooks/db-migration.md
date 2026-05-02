# Runbook: DB マイグレーション

## トリガー
- 機能追加に伴う schema 変更
- 緊急 hot-fix（インデックス追加など）
- restoring after data corruption

## 必要権限
- Eng: alembic コマンド実行可（dev / staging）
- SRE: production DB の deployment role
- CTO: 破壊的 migration の最終承認

## 通常デプロイのマイグレーション手順

### 0. 開発時
```bash
# モデル変更後、リビジョン生成
cd main/backend
alembic revision --autogenerate -m "add column foo to bar"
# 生成された migration を **手動レビュー**: drop / rename を意図しているか
```

### 1. 事前確認
- [ ] PR が main にマージされている
- [ ] CI green（pytest + ai-eval）
- [ ] migration ファイルのコードレビュー済み（最低 2 名）
- [ ] staging で同 migration を実行済み + 動作確認済み
- [ ] staging で performance regression なし（locust 比較）

### 2. バックアップ（必須）
```bash
# Aurora の場合: PITR で十分だが念のため snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier aentro-prod \
  --db-cluster-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M)
```

### 3. デプロイ
- ECS task definition に `alembic upgrade head` を pre-task として配置
- canary 10% で実行 → 異常なければ全展開
- rolling update（新旧バージョンが 5 分共存）に耐えうる migration のみ

**rolling-safe** でない例（一発 down 必要）:
- カラム rename / drop（古いコードが古い名前を参照）
- 必須 NOT NULL 追加（既存行が NULL のまま）
- enum 値の削除

→ これらは **メンテナンス窓を設ける**:
1. status page で「メンテ予告」（24h 前）
2. ECS service desired_count=0
3. migration 実行
4. 新コード deploy
5. desired_count を戻す

### 4. 検証
- API health 確認: `curl https://api.aentro.co.jp/health`
- `tests/acceptance/golden_paths/` を staging から本番向けに走らせる
- Grafana で 30 分間 error rate / latency 監視

## ロールバック

### Forward fix が望ましい
migration を取り消すより前進修正のほうが安全。

### どうしても downgrade
```bash
alembic downgrade -1
```
- データ損失なし migration（カラム追加のみ）: 安全
- データ損失あり: PITR から復元
  ```bash
  aws rds restore-db-cluster-to-point-in-time \
    --source-db-cluster-identifier aentro-prod \
    --db-cluster-identifier aentro-prod-rollback \
    --restore-to-time 2026-05-02T10:30:00Z
  ```
- DNS を rollback cluster に切替
- application 再起動

## 検証チェックリスト
- [ ] `SELECT count(*) FROM <changed_table>` が migration 前後で整合
- [ ] tests/integration/test_tenant_isolation.py 全 pass
- [ ] grafana dashboard で 1 時間 error rate < 0.5%
- [ ] customer-facing API のサンプル 5 endpoint が応答正常

## エスカレーション先
- 30 分以内に成功しない → SRE Lead + CTO
- データ整合性が疑われる → 即座に DB write を停止 + 全 oncall 招集

## 関連ドキュメント
- `runbooks/incident-response.md`
- `docs/architecture/db-schema-evolution.md`
