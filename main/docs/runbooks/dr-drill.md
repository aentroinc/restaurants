# Runbook: 災害復旧訓練（DR drill）

## トリガー
- 四半期に 1 度の定期訓練（Q1/Q2/Q3/Q4 各月の第3水曜）
- 大規模 region 障害（実災害）
- 監査対応（SOC2 / ISMS の継続的有効性確認）

## 必要権限
- SRE Lead: 主導
- CTO: drill 開始承認
- Security Lead: audit log 監視
- 顧客 CSM: 訓練影響を顧客に通知

## RTO / RPO 目標
- RTO（復旧目標時間）: 4 時間
- RPO（許容データ損失）: 1 時間

## 訓練シナリオ（順次ローテーション）

### シナリオ A: 単一 AZ 障害
- ECS service が 1 つの AZ に偏る → 自動 reschedule で復旧（無停止）
- 検証: `aws ecs describe-services` で desired = running、HPA event 確認

### シナリオ B: RDS Aurora プライマリ障害
- failover を手動誘発: `aws rds failover-db-cluster --db-cluster-identifier aentro-prod`
- リーダーが新プライマリに昇格、平均 30 秒
- 検証: `/health` 200 を 5 分以内に再確認

### シナリオ C: 東京 region 全体障害（最重）
- 大阪 region の cross-region replica（read-only）に切替
- 手順:
  1. status page 更新（"region failover in progress"）
  2. RDS の `restore-db-cluster-from-snapshot` で大阪に新クラスター起動
  3. ECS service を大阪 region に再 deploy（Terraform で `prod-osaka` workspace）
  4. Route53 weighted routing を東京 0% / 大阪 100% に
  5. 確認: smoke test（5 endpoint）→ 全 200
  6. 顧客通知（書面 + 電話）

### シナリオ D: データ corruption 検知
- 不正な migration / deletion 後の PITR 復元
- 手順:
  1. 該当時刻を特定（audit_log + Grafana）
  2. 1 時間前の PITR で別クラスター起動
  3. 必要なテーブルだけ移行（`pg_dump --table=...` → `psql`）
  4. 整合性検証（KPI 比較）
  5. application を切替

---

## drill 実施フロー

### T-7 日: 計画
- [ ] CTO 承認、社内アナウンス
- [ ] 顧客 CSM が「訓練のお知らせ」を送付（影響時間帯明示）
- [ ] runbook の最新化を確認
- [ ] シナリオの選定（A→B→C→D ローテ）

### T-1 日: リハーサル
- [ ] staging で同じ手順を一度実施
- [ ] 想定 RTO 内に収まるか計測
- [ ] 必要資材（aws creds / Terraform state / runbook）を Slack pinned

### T0: 実施
- [ ] 開始時刻を Slack #incident-drill にポスト
- [ ] 各ステップを time-stamped で記録
- [ ] 観察者（Security Lead）が audit log を監視
- [ ] 完了時刻を記録、RTO / RPO 達成チェック

### T+1 日: post-drill レビュー
- [ ] `docs/dr-drill/YYYY-Q{n}-report.md` で結果を記録
  - 想定 RTO / 実 RTO
  - つまずいた箇所
  - runbook の改善点
- [ ] action item を GitHub issue 化

## 検証 (drill ごとの完了基準)
- [ ] 4 時間以内に primary endpoint が応答
- [ ] customer-facing API の error rate が drill 後 1 時間で < 0.5%
- [ ] 顧客への影響説明が完了（CSM ログ）
- [ ] post-drill レポートを `docs/dr-drill/` に commit

## ロールバック
- drill が想定外に本番影響を出した場合、即座に `runbooks/incident-response.md` の SEV1 フローへ遷移
- 顧客通知をすぐ切替（"drill" → "incident"）

## エスカレーション先
- drill 中に SLO 違反 → CTO 即座
- 顧客クレーム発生 → CRO + VP CS

## 関連ドキュメント
- `runbooks/incident-response.md`
- `docs/architecture/dr-strategy.md`
- `infra/environments/prod-osaka/` （Terraform DR ターゲット）
