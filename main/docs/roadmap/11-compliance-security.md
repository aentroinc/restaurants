# 11 — コンプライアンス / セキュリティ（+4 点）

## 課題
売上 100 億円超の外食チェーンの情シスは、提案書の中で必ず「**SOC2 / ISMS / 個情法 / 食品衛生法**」を聞いてくる。POC は SOC2 Type 1 readiness なしでは通らないことが多い。本契約は Type 2 + ISMS が事実上の必要条件。

## ゴール
1. **SOC2 Type 1 readiness** (T+6M)：control matrix 100% 整備、外部監査の gap assessment
2. **SOC2 Type 2 取得** (T+12M)：6 ヶ月間の運用証跡で本監査
3. **個情法対応**：プライバシーマーク or ISMS-JIS Q 15001
4. **食品衛生法ガイダンス**：HACCP / アレルゲン / 食品表示の参考情報提供
5. **業界深掘りリスク回避**：法的グレーゾーンに製品が踏み込まないよう免責設計

---

## A. SOC2 Trust Service Criteria 対応

5 つの TSC（Security / Availability / Processing Integrity / Confidentiality / Privacy）の各 control を製品 + 運用にマッピング。

### A.1 Security (CC1-CC9 + Common Criteria)

| Control | 要件 | 製品実装 | 運用証跡 |
|---------|------|---------|---------|
| CC1.1 | Code of conduct, ethics policy | – | `docs/policies/coc.md` |
| CC2.1 | Org structure, R&R | – | `docs/org-chart.md` |
| CC2.2 | Communication of policies | – | onboarding 完了記録 |
| CC3.1 | Risk identification | – | `docs/risk-register.md` quarterly review |
| CC5.1 | Logical access controls | RBAC + ABAC (05) | access_logs |
| CC5.2 | New user provisioning | SCIM / IdP 連携 (05) | onboarding ticket |
| CC5.3 | User access revocation | 24h 内に失効 | termination ticket + audit |
| CC6.1 | Encryption in transit | TLS 1.3 全経路 | TLS scan |
| CC6.2 | Encryption at rest | KMS-managed AES-256 (RDS, S3, Secrets) | KMS key audit |
| CC6.6 | Vulnerability mgmt | Dependabot + Trivy + bandit | CI logs |
| CC6.7 | Patch mgmt | base image weekly rebuild | Dockerfile FROM digest |
| CC6.8 | Endpoint security | mac/win MDM | MDM report |
| CC7.1 | Incident detection | OTel + alerts | PagerDuty incident |
| CC7.2 | Incident response | runbook + post-mortem | incident report |
| CC7.3 | Security event logging | audit_log (immutable) | log retention 1y |
| CC8.1 | Change mgmt | PR review + CI | merge audit |
| CC9.1 | Vendor risk assessment | – | vendor list + SOC2 of subprocessors |

### A.2 Availability (A1)

| Control | 要件 | 実装 |
|---------|------|------|
| A1.1 | SLA / SLO 定義 | 09 で定義済 |
| A1.2 | Capacity monitoring | Grafana dashboard |
| A1.3 | Backup / DR | PITR 7日 + S3 cross-region (06) |

### A.3 Processing Integrity (PI1)

| Control | 要件 | 実装 |
|---------|------|------|
| PI1.1 | データ正確性 | DQ engine + Reconciliation (09) |
| PI1.2 | データ完全性 | bronze/silver/gold lineage |
| PI1.3 | 入力 validation | Pydantic schema 全 endpoint |

### A.4 Confidentiality (C1)

| Control | 要件 | 実装 |
|---------|------|------|
| C1.1 | Data classification | ontology PropertyType.pii_level (low/high) |
| C1.2 | Confidential data handling | 列マスキング (05) + redaction (10) |

### A.5 Privacy (P1-P8) ※ 個情法対応含む

| Control | 要件 | 実装 |
|---------|------|------|
| P2.1 | Consent obtain | 顧客側責任 + 契約書で明確化 |
| P3.1 | Collection limit | データ要求パックで明示 |
| P4.1 | Use limit | tenant ごとに使用目的固定 |
| P5.1 | Access (subject right) | データ主体請求対応窓口 |
| P5.2 | Correction | API + UI |
| P6.1 | Disclosure to 3rd party | 顧客 admin 承認必須 |
| P7.1 | Quality | DQ engine |
| P8.1 | Monitoring | audit log + 定期レビュー |

---

## B. 個人情報保護法（日本固有）

### B.1 用語マッピング

| 日本法令 | 製品対応 |
|---------|---------|
| 個人情報 | employees.name, reviews 内の固有名詞、顧客 user.email |
| 仮名加工情報 | redaction で該当列を `***` に |
| 匿名加工情報 | benchmark への opt-in 集計時に適用 |
| 第三者提供 | 既定で禁止、明示的同意 + 監査ログ必須 |
| 越境移転 | 海外 region 利用時は事前合意（多くの大手は東京 region 必須） |

### B.2 委託先管理（「適切な監督」）

- **subprocessor 一覧**を `docs/security/subprocessors.md` で公開
  - Anthropic (LLM API): 米国 / data retention 30日 / no training
  - Voyage AI (embedding): 米国 / no training opt-out
  - AWS / GCP: 東京 region 限定
  - Datadog / Grafana Cloud: 監視
- 各 subprocessor の SOC2 / ISO27001 を毎年確認

### B.3 データ主体の権利
- 開示請求: 顧客 admin が UI から自テナントの個人情報をエクスポート
- 訂正・削除: API + 削除ジョブ（30日以内）
- 利用停止: tenant 契約解除時に 90 日後完全削除

---

## C. プライバシーマーク / ISMS

### C.1 取得計画

| 認証 | 取得時期 | 主な準備 |
|-----|---------|---------|
| Pマーク (JIS Q 15001) | T+9M | 個人情報保護方針 + 内部監査 + 教育 |
| ISMS (ISO/IEC 27001) | T+15M | ISMS scope 定義 + 114 controls (Annex A) + リスク評価 |

### C.2 ISMS 主要 control（Annex A）

製品 / 運用への落とし込み:

| 区分 | 本数 | 主要 control 例 |
|------|-----|---------------|
| A.5 情報セキュリティ方針 | 2 | 方針文書 / 経営承認 |
| A.6 組織体制 | 7 | CISO / セキュリティ委員会 |
| A.7 人的資源 | 6 | 入退社 / 機密保持契約 |
| A.8 資産管理 | 10 | 資産目録 / 分類 |
| A.9 アクセス制御 | 14 | RBAC / 特権アカウント / レビュー |
| A.10 暗号 | 2 | 暗号利用 policy / 鍵管理 |
| A.11 物理的セキュリティ | 15 | DC / オフィス / クリアデスク |
| A.12 運用セキュリティ | 14 | 変更管理 / バックアップ / マルウェア |
| A.13 通信セキュリティ | 7 | network 分離 / 通信暗号化 |
| A.14 開発 | 13 | secure SDLC / テスト |
| A.15 サプライヤ | 5 | 委託先管理 |
| A.16 インシデント | 7 | 検知 / 対応 / 学習 |
| A.17 事業継続 | 4 | BCP / DR |
| A.18 順守 | 8 | 法令 / 知財 / 監査 |

各 control について `docs/security/controls/A.{n}.md` で「実装内容 / 証跡 / 責任者」を明記。

---

## D. 食品衛生法 / 業界深掘りの法的整合

### D.1 製品スタンス

- HACCP モニタリング（08-Phase B）は **「事業者の自主管理を支援する記録ツール」**
- アレルゲン情報は **「事業者が登録する情報を集約・表示するシステム」**
- **「製品が法令準拠を保証する」とは謳わない**（事業者責任の明確化）

### D.2 免責表記（UI / 契約書）

```
本機能は食品衛生法施行規則の HACCP に沿った衛生管理を支援する記録ツールです。
当該記録の正確性および法令適合性の最終責任は利用事業者に帰属します。
当社は本機能を用いた管理が法令違反と判定された場合の責を負いません。
```

UI: 該当ページのフッターに常時表示。
契約書: SoW Annex に記載 + 顧客捺印確認。

### D.3 食品表示法

- アレルゲン 28 品目（特定原材料 7 + 特定原材料に準ずる 21）の最新版を年次更新
- 表示義務外の項目（推奨品目）も区別して保存
- 商品マスタの登録は **顧客責任**、AI による自動推定は使わない

### D.4 業界団体連携

- 日本フードサービス協会（JF）: ベンチマーク提供で連携
- 厚労省 HACCP 制度: 公開ガイドラインを定期参照
- 消費者庁 食品表示課: 表示制度改正の追跡

---

## E. インフラ / 製品レベルのセキュリティ要件

### E.1 必須ベースライン (T+3M までに完成)

| 項目 | 実装 | 検証 |
|------|------|------|
| TLS 1.3 全経路 | ALB / Cloud LB | SSL Labs A+ |
| at-rest 暗号化 | RDS / S3 / Secrets / KMS | aws config rule |
| パスワード bcrypt (cost ≥ 12) | passlib | code review |
| MFA TOTP | 05 で実装 | integration test |
| API rate limit | nginx + Redis | load test |
| 監査ログ middleware | 全 mutation request | log sample |
| secrets 暗号化 | SOPS + KMS | gitleaks 通過 |
| dependency scan | Dependabot + pip-audit + npm audit | weekly run |
| SAST | bandit + semgrep | CI pass |
| container scan | Trivy | CI pass |
| DAST | OWASP ZAP (staging 週次) | scan report |
| pen test | 年 1 回外部委託 | report |

### E.2 高度セキュリティ機能 (T+9M までに)

- WAF（AWS WAF / Cloud Armor）
- DDoS 保護（CloudFront / Cloud Armor）
- IP 許可リスト（顧客 admin が設定）
- 異常ログイン検知（地理的飛び）
- 退職者アクセス自動失効（IdP webhook）
- データ暗号化キー rotation（年次）

---

## F. インシデント対応

### F.1 重大度分類

| Severity | 例 | 対応時間 SLA |
|---------|-----|------------|
| SEV1 | データ漏洩 / 全体障害 | 検知 15min / 顧客通知 2h |
| SEV2 | 部分障害 / 認証障害 | 検知 30min / 顧客通知 4h |
| SEV3 | 機能影響あり | 検知 1h / 翌営業日通知 |
| SEV4 | 軽微 | 翌営業日対応 |

### F.2 個人情報漏洩時の対応（個情法）

「漏えい等の事案」発生時：

1. **即時** (1h 内): 影響範囲の特定 / 二次被害防止
2. **24h 内**: 個人情報保護委員会へ速報
3. **30日内**: 確報 + 本人通知（連絡可能な場合）
4. **再発防止**: 原因 / 措置を 90日以内に公表

`runbooks/data-breach.md` で手順化。

---

## G. 顧客向け Trust Center

### G.1 公開ドキュメント (`https://trust.aentro.co.jp` 想定)

| ドキュメント | 内容 |
|------------|------|
| Security Overview | 製品セキュリティ概要 |
| SOC2 Report | 監査報告書（NDA で配布） |
| Subprocessor List | 委託先一覧 |
| Privacy Policy | プライバシーポリシー |
| Data Processing Agreement | DPA テンプレ |
| Vulnerability Disclosure | 脆弱性報告窓口 |
| Status Page | 稼働状況 (statuspage.io 等) |

### G.2 営業対応

- DDQ (Due Diligence Questionnaire) を標準化、新規顧客の質問書 80% は即答可能に
- `docs/security/ddq-templates/`: 100 問テンプレ + 標準回答

---

## 指示書（実装手順）

### Phase 1 (T+3M / 50 点ライン): セキュリティベースライン

#### Step 1: TLS / 暗号化 (3日)
1. ALB / Cloud LB に ACM cert
2. RDS storage_encrypted = true、KMS 鍵
3. S3 bucket 全 SSE-KMS
4. AWS Secrets Manager 全 secret 移管

#### Step 2: 監査ログ middleware (2日)
1. `app/middleware/audit_log.py`
2. POST/PUT/PATCH/DELETE の全 endpoint で actor / before / after を記録
3. immutable: trigger で UPDATE / DELETE 禁止

#### Step 3: SAST / SCA / Container scan (2日)
1. `.github/workflows/security.yml`
2. bandit / semgrep / pip-audit / npm audit / Trivy
3. critical 検知で merge block

#### Step 4: DDQ テンプレ (3日)
1. `docs/security/ddq-templates/standard-100q.yaml`
2. 想定 100 問の標準回答
3. 営業向け training

### Phase 2 (T+6M / 65 点ライン): SOC2 Type 1 readiness

#### Step 5: Control Matrix 整備 (10日)
1. `docs/security/controls/` で全 SOC2 control を文書化
2. 各 control に実装と証跡を紐付け
3. 外部監査 firm（J-SOX 経験ある TPA）に gap assessment 依頼
4. gap を埋める（typically 30-50 件）

#### Step 6: ポリシー文書 (5日)
1. `docs/policies/`:
   - information-security.md
   - access-control.md
   - data-classification.md
   - incident-response.md
   - business-continuity.md
   - vendor-management.md
   - acceptable-use.md
2. CEO 承認 + 全社員 acknowledge

#### Step 7: Trust Center 公開 (3日)
1. `trust.aentro.co.jp` 静的サイト
2. SOC2 Type 1 letter（pre-audit version）
3. subprocessor list

### Phase 3 (T+9M / 80 点ライン): SOC2 Type 2 + Pマーク

#### Step 8: 6 ヶ月運用 (継続)
1. 全 control を 6 ヶ月間運用、証跡を自動収集
2. 月次内部レビュー
3. 半期外部監査

#### Step 9: Pマーク取得 (Step 8 と並行)
1. JIPDEC 申請
2. 個人情報保護方針 / 内部監査 / 教育
3. 訪問審査対応

#### Step 10: WAF / DDoS / 異常検知 (5日)
1. AWS WAF rules（OWASP top 10）
2. CloudFront / Cloud Armor
3. GuardDuty / Cloud SCC

### Phase 4 (T+15M / 100 点ライン): ISMS

#### Step 11: ISMS scope 確定 (10日)
1. ISMS 適用範囲（製品 / 運用 / 開発）
2. 情報資産目録
3. リスクアセスメント

#### Step 12: Annex A 114 controls (30日)
1. 全 control に対する実装 + 証跡
2. CISO 任命 + ISMS 委員会
3. 内部監査員養成

#### Step 13: 認証取得 (60日)
1. JAB 認定機関に申請
2. Stage 1 (文書) + Stage 2 (現地) 審査
3. 年次サーベイランス

---

## 完了基準

### 4 点認定（最高評価）
- [ ] **1 点**: TLS / 暗号化 / 監査 middleware / SAST/SCA/Container scan が CI に組込み
- [ ] **2 点**: SOC2 Type 1 readiness（外部 gap assessment 完了、すべての SOC2 control に実装と証跡）
- [ ] **3 点**: SOC2 Type 2 取得 + Pマーク取得
- [ ] **4 点**: ISMS（ISO27001）取得 + 食品衛生法ガイダンス文書整備 + Trust Center 公開

### 段階点
- 1 点: ベースラインセキュリティ（Phase 1 完了）
- 2 点: SOC2 Type 1
- 3 点: SOC2 Type 2 + Pマーク
- 4 点: ISMS + 食品法整合

---

## 工数見積（Eng + 法務 + 監査）
- Phase 1: 10日（Eng）
- Phase 2: 25日（Eng + 監査 firm）
- Phase 3: 6 ヶ月（並行 + 監査）
- Phase 4: 6 ヶ月（並行 + 認証）
- **合計**: Eng 約 50 人日 + 外部監査費 ¥10-15M / 年

## 注意
- SOC2 / ISMS は **「文書化された運用が継続している」ことを証明**するもの。仕組みだけでは取れない。**6 ヶ月以上の運用証跡が必須**
- 個情法は 2024 年改正で罰則強化、2025 年見直しもある。年次フォローアップ必須
- 食品衛生法 / 食品表示法は厚労省 / 消費者庁の通達変更を要監視。**運用に不安がある場合は法務監修必須**
- T+12M で SOC2 Type 2 + Pマークの両立は現実的、ISMS は T+15M 〜 T+18M
