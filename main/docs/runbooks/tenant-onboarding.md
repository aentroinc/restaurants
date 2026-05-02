# Runbook: 新テナント オンボーディング

## トリガー
- 新規顧客契約締結
- POC 環境の作成依頼
- 内部 demo / partner デモ用

## 必要権限
- CSM: Customer info 入力
- SRE: dedicated VPC / DB schema 払い出し（Pro / Enterprise tier）
- Security Lead: identity provider 接続情報受領

## 所要時間
- Standard tier: 30 分
- Pro tier: 2 時間（DB 分離設定）
- Enterprise tier: 1 営業日（dedicated VPC + Terraform apply）

---

## 手順

### 0. 事前情報の収集（前日まで）
- [ ] 顧客名 / company_id（既存企業マスタ）
- [ ] tier（standard / pro / enterprise）
- [ ] 想定店舗数 / ユーザー数
- [ ] 主要 admin user のメールアドレス（≤ 3 名）
- [ ] IdP 接続情報（Pro 以上）: SAML metadata URL or OIDC client_id/secret
- [ ] AI 月次予算（default ¥100,000、tier で調整）
- [ ] 連絡担当 CSM

### 1. Tenant + Company 作成
```python
# scripts/onboard_tenant.py
tenant = Tenant(name=name, tier=tier)
session.add(tenant)
session.flush()

company = Company(tenant_id=tenant.id, name=name, ...)
session.add(company)
```

### 2. 標準 Role + Permission 投入
```bash
python -m app.scripts.seed_rbac --tenant-id <tenant_id>
```
8 標準 role（admin / executive / brand_manager / area_manager / sv / store_staff / viewer / analyst）が seed される。

### 3. 初期 admin ユーザー作成
- 一時パスワードを生成（ランダム 16 文字）
- bcrypt で hash → `users` テーブルへ
- メールで一時パスワード + MFA 登録 URL を送信
- 24h 以内にパスワード変更を要求

### 4. AI 予算の初期化
```sql
INSERT INTO tenant_ai_budgets (tenant_id, monthly_budget_jpy, soft_limit_pct, overage_policy)
VALUES (<id>, 100000, 0.8, 'block');
```

### 5. IdP 設定（Pro 以上）
- `/admin/identity-providers` で provider 登録
- type=oidc / saml、metadata_url、role_mapping を設定
- テストユーザーで SSO ログイン確認

### 6. DataSource プレースホルダ作成
顧客が POS 接続を始められるよう、空の DataSource を catalog から作成
（Smaregi / Square / Air）

### 7. 初期 ontology + KPI seed
- `/api/v1/ontology/dual-write/reconcile-brands` を tenant_id で実行
- 標準 KPI 定義 50 種（gross_margin, fl_ratio, etc.）を seed

### 8. dedicated VPC（Enterprise only）
```bash
cd infra/environments/prod-dedicated
TF_VAR_customer_id=<tenant_id> TF_VAR_customer_name=<name> terraform apply
```
30 分以内に dedicated DB + ALB + secrets が立つ。

### 9. monitoring 設定
- Grafana で per-tenant dashboard を可視化（自動）
- PagerDuty に該当顧客の SLO アラートを追加
- CSM の Slack チャンネルに weekly health report bot を接続

### 10. オンボーディング完了通知
- 顧客 admin に「環境準備完了」メール（URL / 一時 PW / 連絡先）
- CSM が初回 walkthrough をスケジュール（48h 以内）

## 検証
- [ ] admin user で /api/v1/auth/login 成功
- [ ] /api/v1/auth/me が tenant_id と role を返す
- [ ] /api/v1/data-sources/catalog で 5+ コネクタが見える
- [ ] Grafana に新テナントの SLI dashboard が現れる
- [ ] AI チャットで簡単な質問が応答（cost guard 動作）

## ロールバック
- 1 営業日以内なら `python -m app.scripts.delete_tenant --confirm <tenant_id>`
- それ以降は **soft-delete のみ**（90 日後物理削除のジョブで処理）

## エスカレーション先
- IdP 接続が 1 時間で完了しない → Security Lead
- dedicated VPC apply で 1 時間以上の error → SRE Lead + CTO
- 顧客側担当者と疎通取れない → CSM Lead

## 関連ドキュメント
- `docs/security/data-classification.md`
- `runbooks/secret-rotation.md`
- `docs/poc/02-eight-week-poc-operating-playbook.md`
