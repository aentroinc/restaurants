# Runbook: インシデント対応

## トリガー
- PagerDuty SEV1/SEV2 アラート
- 顧客から「サービスが応答しない」「データがおかしい」報告
- Grafana で error rate > 5% 5min / API p95 > 2s 5min

## 必要権限
- on-call SRE: AWS console (read), Grafana, PagerDuty
- Eng Lead: AWS console (write), DB read replica
- CTO: production DB write, secrets rotation

## SEV 分類

| SEV | 例 | 対応時間 | 通知範囲 |
|-----|-----|---------|----------|
| SEV1 | 全体障害 / データ漏洩 / 認証停止 | 検知 15min / 顧客通知 2h | 全社 + 顧客全員 |
| SEV2 | 部分障害（テナント片寄り）/ ingestion 停止 | 検知 30min / 顧客通知 4h | Eng + 該当顧客 CSM |
| SEV3 | 機能影響あり、回避策あり | 検知 1h / 翌営業日 | Eng |
| SEV4 | 軽微 | 翌営業日 | チーム内 |

## 手順（SEV1/SEV2 共通）

1. **通知（5分以内）**
   - PagerDuty で acknowledge
   - Slack #incident チャンネルに `/incident sev1` で起票
   - status.aentro.co.jp に "investigating" 表示

2. **影響範囲の特定（15分以内）**
   - Grafana `01-platform-overview` で全体 health 確認
   - `02-per-tenant-sli` で影響テナントを特定
   - `04-llm-cost` / `05-db-performance` で局所原因を絞り込み
   - 該当する subprocessor（AWS / Anthropic 等）の status page を確認

3. **緩和（30分以内）**
   - feature flag で問題機能を即座に off（`ai_chat`, `data_sources`, etc）
   - 必要なら read-only モード（`PRODUCTION_READ_ONLY=true`）
   - tenant 単位で隔離可能なら ingestion を pause（`UPDATE data_sources SET status='paused' WHERE tenant_id=...`）

4. **顧客コミュニケーション（SEV1: 2h / SEV2: 4h 以内）**
   - status page 更新
   - 該当 CSM が顧客 admin に電話 + メール
   - 影響範囲・現状・暫定回避策・次回更新時刻を明示

5. **解決**
   - root cause の修正をデプロイ
   - 復旧確認: `tests/acceptance/golden_paths/test_*` を staging で再実行
   - status page を "operational" に戻す

6. **Post-mortem（48h 以内）**
   - `docs/postmortems/YYYY-MM-DD-{slug}.md` テンプレで記述
   - timeline / impact / root cause / lessons / action items
   - blameless 原則、所属より事実に焦点
   - action item は GitHub issue 化、owner + due date 付与

## 検証
- 解決後 30 分: error rate < 1%, p95 < 500ms
- 翌日: 影響顧客の DAU が前週同曜日比 ±10% 以内
- 1 週間: action item の進捗 ≥ 50%

## ロールバック
- 直近のデプロイが原因と判断したら `gh workflow run cd.yml -f rollback=true`
- DB migration が原因なら手動 `alembic downgrade -1`（事前バックアップ要）

## エスカレーション先
- 検知から 30min 解決見込み立たず → CTO
- データ漏洩疑い → CTO + Security Lead 即時、法務 1h 以内
- 個情法事案 → 漏えい等の事案発生から 24h 以内に個人情報保護委員会へ速報

## 関連ドキュメント
- `runbooks/dr-drill.md` （リージョン障害時）
- `runbooks/db-migration.md` （DB 起因の場合）
- `runbooks/secret-rotation.md` （認証障害の場合）
- `docs/security/incident-classification.md`
- `docs/security/breach-notification.md`
