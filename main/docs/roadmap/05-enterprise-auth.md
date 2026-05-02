# 05 — エンタープライズ認証 / RBAC（+7点）

## 課題
現状 `app/auth.py` は JWT のみ、tenant_id で分離してるだけ。日本の外食大手（売上1000億超）は **SAML/OIDC SSO + AD/Azure AD 連携 + 行レベル/列レベル ACL** を必須要件にする。これがないと提案すら通らない。

## ゴール
- SSO: SAML 2.0 + OIDC（Azure AD / Okta / Google Workspace）
- ローカル認証: パスワード + MFA (TOTP)
- RBAC: role × resource × action の matrix
- 行レベル ACL: 「関東エリア統括は関東の店舗のみ」が宣言的に表現できる
- 列レベル ACL: PII（顧客名 / 従業員氏名）を role でマスク
- 全 access に audit_log（誰が・いつ・どのデータ）

---

## 仕様書

### 認証方式

| 方式 | 用途 | 実装ライブラリ |
|------|------|---------------|
| OIDC | Azure AD / Google Workspace | `authlib` |
| SAML 2.0 | Okta / Auth0 / 自社 IdP | `python3-saml` |
| Local + MFA | 管理者 / フォールバック | `pyotp` + bcrypt |
| API Key | システム間連携 | 既存の token を Service Account 化 |

### データモデル

```python
class Role(Base):
    __tablename__ = "roles"
    id, tenant_id
    name: Mapped[str]                  # admin, brand_manager, area_manager, sv, store_staff, viewer
    description
    is_system: Mapped[bool]            # 削除不可
    created_at

class Permission(Base):
    __tablename__ = "permissions"
    id, tenant_id
    role_id (fk)
    resource: Mapped[str]              # ontology.Store | api.kpi | feature.ai_analyst
    action: Mapped[str]                # read | write | delete | execute
    scope: Mapped[dict | None]         # 行レベル: {"region": "{user.region}"}

class UserRole(Base):
    __tablename__ = "user_roles"
    user_id, role_id, tenant_id
    granted_by, granted_at, expires_at

class IdentityProvider(Base):
    __tablename__ = "identity_providers"
    id, tenant_id
    type: Mapped[str]                  # oidc | saml | local
    name
    config: Mapped[dict]               # client_id, metadata_url, cert, etc.
    is_default: Mapped[bool]
    role_mapping: Mapped[dict]         # IdP group → role
    enabled: Mapped[bool]

class MFASecret(Base):
    user_id (pk)
    secret_encrypted
    method: Mapped[str]                # totp | webauthn
    backup_codes_encrypted
    last_used_at

class AccessLog(Base):
    __tablename__ = "access_logs"
    id, tenant_id, user_id
    timestamp
    resource, action
    object_ids: Mapped[list]           # アクセスした row id 群（行レベル）
    columns: Mapped[list]              # アクセスした列名（列レベル）
    result: Mapped[str]                # allow | deny
    deny_reason
    ip, user_agent
    request_id
```

### Role 定義（標準セット）

| Role | 説明 | 主な権限 |
|------|------|---------|
| `admin` | テナント管理者 | 全リソース read/write |
| `executive` | 経営層 | 全データ read、写真 / PII 含む |
| `brand_manager` | ブランド責任者 | 担当ブランドの全店 r/w |
| `area_manager` | エリア統括 (SV上長) | 担当 region の全店 r/w |
| `sv` | スーパーバイザ | 担当店舗群 r/w |
| `store_staff` | 店舗スタッフ | 自店のみ read |
| `viewer` | 閲覧専用 | 集計データのみ read（個別店舗データは集計レベル） |
| `analyst` | アナリスト | workspace 全権限、ontology 読みのみ |

### Policy 表現

OPA (Open Policy Agent) ライクな宣言的記述、ただし実装は内製で十分：

```python
# app/services/policy/rules.py の例
from policy import policy

@policy.rule("ontology.Store.read")
def can_read_store(user, store, scope):
    if user.has_role("admin"): return True
    if user.has_role("executive"): return True
    if user.has_role("brand_manager") and store.brand_id in user.brand_ids: return True
    if user.has_role("area_manager") and store.region in user.regions: return True
    if user.has_role("sv") and store.id in user.assigned_store_ids: return True
    if user.has_role("store_staff") and store.id == user.home_store_id: return True
    return False

@policy.rule("ontology.Store.read.column")
def column_filter(user, store, columns):
    if user.has_role("admin", "executive"):
        return columns  # 全列
    return [c for c in columns if c not in PII_COLUMNS]
```

### 列マスキング

`pii_level` を ontology の PropertyType に持たせる（01 と連携）：
- `none`: 全 role
- `low`: viewer 以外
- `high`: admin, executive, brand_manager のみ

API レスポンス生成時に middleware で自動マスキング。生 SQL は `*****` を返す。

### MFA フロー
1. login ID/PW → 一次認証成功
2. MFA 必須 role → TOTP コード入力画面
3. コード検証 → 二次認証成功 → JWT 発行（access 15min / refresh 12h）
4. 連続失敗 5回でアカウントロック（30分）

---

## 指示書（実装手順）

### Step 1: 依存追加
```bash
pip install authlib python3-saml pyotp passlib[bcrypt] cryptography
```

### Step 2: モデル + マイグレーション
1. roles, permissions, user_roles, identity_providers, mfa_secrets, access_logs テーブル
2. system role を seed（admin / executive / ...）
3. system role の permission を yaml で管理：`app/seed/permissions.yaml`

### Step 3: Policy エンジン
1. `app/services/policy/__init__.py`：rule registry
2. `app/services/policy/decorators.py`：`@requires("ontology.Store.read")` decorator
3. 全 API エンドポイントに decorator を適用
4. row-level filter: SQLAlchemy の `select` に `.where(scope_filter(user))` を自動注入

### Step 4: 列マスキング
1. `app/middleware/column_mask.py`：response middleware
2. ontology PropertyType の `pii_level` を見て field を `***` に
3. exception list（admin role）

### Step 5: SSO（OIDC）
1. `app/api/v1/auth_oidc.py`：authlib で flow
   - `GET /api/v1/auth/oidc/start?provider_id=...`
   - `GET /api/v1/auth/oidc/callback`
2. ID token claims から user lookup or 自動作成
3. group claim → role mapping

### Step 6: SSO（SAML）
1. `app/api/v1/auth_saml.py`：python3-saml
   - `POST /api/v1/auth/saml/acs`（assertion consumer service）
   - `GET /api/v1/auth/saml/metadata`
2. attribute statement → role mapping

### Step 7: MFA
1. `app/api/v1/auth_mfa.py`：
   - `POST /api/v1/auth/mfa/enroll` → secret 生成 + QR code
   - `POST /api/v1/auth/mfa/verify` → TOTP 検証
2. login flow に MFA step 追加

### Step 8: 監査
1. `app/middleware/access_log.py`：全 API request を AccessLog に
2. row-level の object_ids も記録（select の WHERE clause から推定）
3. 集約バッチ：1時間ごとに rolling aggregate（user × resource × hour）
4. admin/audit ページに検索 / export

### Step 9: UI
1. `/admin/users`：ユーザー管理（role 付与 / 失効）
2. `/admin/roles`：role 編集 / permission 表
3. `/admin/identity-providers`：IdP 設定
4. `/admin/access-logs`：アクセスログ閲覧
5. login flow を SSO 対応 UI に

### Step 10: テスト
1. integration: store_staff が他店データにアクセスできない（403）
2. integration: viewer のレスポンスから PII カラムがマスクされる
3. SAML / OIDC は Okta dev / Azure AD test tenant で実動作確認

---

## 完了基準
- [ ] Azure AD で SSO ログインが完走する
- [ ] Okta SAML でも完走する
- [ ] admin が role を作成 → user に付与 → ログアウト/再ログインで権限反映
- [ ] store_staff のユーザーで `/api/v1/stores` を叩くと 自店のみ返る
- [ ] viewer のユーザーで /api/v1/stores の response から `customer_name` 等が `***`
- [ ] MFA 必須 role の admin user が TOTP 入力なしでログインできない
- [ ] access_logs に全 API request が記録される
- [ ] 連続ログイン失敗 5回でロック → 30分後解除
- [ ] /admin/audit でログ検索が機能

## 工数見積
- Step 1-3 (基盤 + policy): 6日
- Step 4 (列マスク): 2日
- Step 5-6 (SSO): 5日
- Step 7 (MFA): 2日
- Step 8 (監査): 3日
- Step 9 (UI): 5日
- Step 10 (テスト): 3日
- **合計: 約 5〜6週間（1人）**

## 注意
- SAML は実装が複雑。authlib + python3-saml の組み合わせで十分
- column-level masking は SQL レベルでなく response レベルでも OK（性能劣化少）
- IdP の attribute mapping は顧客ごとに違う。yaml で個別設定可能に
