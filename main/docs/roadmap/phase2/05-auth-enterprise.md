# Phase 2 / S3 — エンタープライズ認証完成（+5点 / 2週）

## 課題
Phase 1 で Role / Permission / UserRole + policy_engine + 基本 RBAC 8 API は揃った。残りは：
- **SSO (OIDC / SAML) 未実装**：大手の購買部門の必須要件
- **MFA (TOTP) 未実装**：admin/executive role に必須
- **列マスキング未実装**：PII 列を role で自動マスク
- **AccessLog（行レベル監査）未実装**：誰がどの行・列にアクセスしたか
- **IdentityProvider モデル未実装**：IdP 設定が UI から CRUD できない
- **ロックアウト機構なし**：連続失敗でアカウントロック

## ゴール
日本の外食大手（売上1000億超）の購買部門が要求する認証・監査要件をクリア。

---

## 仕様書

### 追加データモデル

```python
class IdentityProvider(Base):
    __tablename__ = "identity_providers"
    id, tenant_id
    type: Mapped[str]                        # oidc | saml | local
    name: Mapped[str]                        # 表示名（"社内 Azure AD" 等）
    config: Mapped[dict] = JSONB             # client_id, metadata_url, cert, ...
    is_default: Mapped[bool]
    role_mapping: Mapped[dict] = JSONB       # {"engineering": "analyst", "exec": "executive"}
    enabled: Mapped[bool]
    created_at, updated_at

class MFASecret(Base):
    user_id (pk fk)
    secret_encrypted: Mapped[bytes]
    method: Mapped[str]                      # totp | webauthn
    backup_codes_encrypted: Mapped[bytes]
    last_used_at, enrolled_at

class AccessLog(Base):
    __tablename__ = "access_logs"
    id, tenant_id, user_id (fk)
    timestamp
    method: Mapped[str]                      # GET/POST/PUT/DELETE
    path: Mapped[str]
    resource: Mapped[str]                    # ontology.Store | api.kpi
    action: Mapped[str]                      # read | write | delete
    object_ids: Mapped[list[str]] = JSONB    # アクセスした row id 群
    columns: Mapped[list[str]] = JSONB       # アクセスした列名（列レベル）
    result: Mapped[str]                      # allow | deny
    deny_reason: Mapped[str | None]
    ip, user_agent, request_id

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id, tenant_id
    email: Mapped[str]                       # 試行された ID
    ip
    success: Mapped[bool]
    failure_reason: Mapped[str | None]
    attempted_at

class AccountLock(Base):
    user_id (pk)
    locked_until: Mapped[datetime]
    reason: Mapped[str]
```

### SSO（OIDC）

`app/api/v1/auth_oidc.py`：
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
# IdentityProvider から動的登録

@router.get("/oidc/start/{provider_id}")
async def oidc_start(provider_id, request, db, ...):
    provider = await _get_provider(db, provider_id)
    client = oauth.create_client(provider.config["client_name"])
    redirect_uri = settings.OIDC_REDIRECT_URI
    return await client.authorize_redirect(request, redirect_uri,
                                           state=_sign_state(provider_id))

@router.get("/oidc/callback")
async def oidc_callback(request, db, ...):
    provider_id = _verify_state(request.query_params["state"])
    provider = await _get_provider(db, provider_id)
    client = oauth.create_client(...)
    token = await client.authorize_access_token(request)
    user_info = token["userinfo"]  # {sub, email, groups, ...}
    
    # ユーザ lookup or 自動作成
    user = await _upsert_user_from_oidc(db, provider, user_info)
    
    # role mapping
    groups = user_info.get("groups", [])
    target_roles = []
    for g in groups:
        if g in provider.role_mapping:
            target_roles.append(provider.role_mapping[g])
    await _sync_user_roles(db, user.id, target_roles)
    
    # JWT 発行
    access_token = create_jwt(user, expires_in=900)
    refresh_token = create_refresh_jwt(user, expires_in=12*3600)
    
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={access_token}")
```

### SSO（SAML）

`app/api/v1/auth_saml.py`：
```python
from saml2 import BINDING_HTTP_POST
from saml2.client import Saml2Client
from saml2.config import Config

@router.get("/saml/metadata/{provider_id}")
async def saml_metadata(provider_id, db):
    provider = await _get_provider(db, provider_id)
    config = _build_saml_config(provider.config)
    cli = Saml2Client(config=config)
    return Response(content=cli.metadata, media_type="application/xml")

@router.post("/saml/acs/{provider_id}")
async def saml_acs(provider_id, request, db):
    saml_response = (await request.form())["SAMLResponse"]
    provider = await _get_provider(db, provider_id)
    cli = Saml2Client(config=_build_saml_config(provider.config))
    auth_response = cli.parse_authn_request_response(saml_response, BINDING_HTTP_POST)
    
    attrs = auth_response.get_identity()
    email = attrs["email"][0]
    groups = attrs.get("groups", [])
    
    user = await _upsert_user_from_saml(db, provider, attrs)
    await _sync_user_roles(db, user.id, [provider.role_mapping[g] for g in groups if g in provider.role_mapping])
    
    access_token = create_jwt(user)
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={access_token}")
```

### MFA

`app/api/v1/auth_mfa.py`：
```python
import pyotp

@router.post("/mfa/enroll")
async def mfa_enroll(user, db):
    secret = pyotp.random_base32()
    encrypted = encrypt(secret)
    backup_codes = [secrets.token_urlsafe(8) for _ in range(10)]
    
    db.add(MFASecret(
        user_id=user.id,
        secret_encrypted=encrypted,
        method="totp",
        backup_codes_encrypted=encrypt(json.dumps(backup_codes)),
    ))
    
    qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name="AENTRO"
    )
    return {"qr_uri": qr_uri, "backup_codes": backup_codes}

@router.post("/mfa/verify")
async def mfa_verify(code: str, user, db):
    rec = await _get_mfa_secret(db, user.id)
    secret = decrypt(rec.secret_encrypted)
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        # backup code チェック
        codes = json.loads(decrypt(rec.backup_codes_encrypted))
        if code in codes:
            codes.remove(code)
            rec.backup_codes_encrypted = encrypt(json.dumps(codes))
            await db.commit()
            return {"verified": True, "via": "backup"}
        raise HTTPException(401, "Invalid MFA code")
    rec.last_used_at = utcnow()
    await db.commit()
    return {"verified": True}
```

login flow を 2-step に：
1. POST `/auth/login` → email/pw 検証 → role が MFA 必須なら `{"mfa_required": true, "mfa_token": "<short-lived>"}`
2. POST `/auth/login/mfa` → code + mfa_token → 検証 → access_token

MFA 必須 role: `admin`, `executive`, `brand_manager`（policy で定義）

### 列マスキング

`app/middleware/column_mask.py`：
```python
class ColumnMaskMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # response が JSON で、ontology API か /stores 等の場合のみマスク
        if not _should_mask(request):
            return response
        
        user = await _resolve_user(request)
        roles = user.roles
        
        # response body を読み込み（streaming は対象外）
        body = await response.body()
        data = json.loads(body)
        
        masked = _mask_pii_fields(data, roles, get_pii_fields_for_response(request))
        return JSONResponse(masked, status_code=response.status_code)

def _mask_pii_fields(data, roles, pii_fields):
    """ontology PropertyType.pii_level に基づいてマスク"""
    if "admin" in roles or "executive" in roles:
        return data  # 全列見える
    for field, level in pii_fields.items():
        if level == "high" and "brand_manager" not in roles:
            data[field] = "***"
        if level == "low" and "viewer" in roles:
            data[field] = "***"
    return data
```

PII 設定は ontology の PropertyType.pii_level（既存）を参照。

### AccessLog middleware

```python
class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = uuid.uuid4()
        request.state.request_id = request_id
        response = await call_next(request)
        
        if not _should_log(request.url.path):
            return response
        
        user = await _resolve_user(request)
        
        # row-level 推定：ResponseCapture middleware で response から ID を抽出
        object_ids = request.state.get("accessed_object_ids", [])
        columns = request.state.get("accessed_columns", [])
        
        await _async_log(AccessLog(
            tenant_id=user.tenant_id, user_id=user.id,
            timestamp=utcnow(),
            method=request.method, path=request.url.path,
            resource=_infer_resource(request),
            action=_infer_action(request.method),
            object_ids=object_ids, columns=columns,
            result="allow" if response.status_code < 400 else "deny",
            ip=request.client.host, user_agent=request.headers.get("user-agent"),
            request_id=str(request_id),
        ))
        return response
```

### ロックアウト

```python
async def check_lockout(db, email):
    recent_failures = await db.execute(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.email == email,
            LoginAttempt.success == False,
            LoginAttempt.attempted_at > utcnow() - timedelta(minutes=10),
        )
    )
    if recent_failures.scalar() >= 5:
        # 30分ロック
        db.add(AccountLock(user_id=..., locked_until=utcnow() + timedelta(minutes=30), reason="too_many_attempts"))
        raise HTTPException(429, "Account locked for 30 minutes")
```

### Frontend

新規ページ：
- `frontend/src/app/auth/login/page.tsx`：通常 + SSO ボタン群
- `frontend/src/app/auth/mfa/page.tsx`：TOTP code 入力
- `frontend/src/app/auth/mfa/enroll/page.tsx`：QR + backup codes
- `frontend/src/app/admin/identity-providers/page.tsx`：IdP CRUD
- `frontend/src/app/admin/users/page.tsx`：ユーザ管理 + role 付与
- `frontend/src/app/admin/access-logs/page.tsx`：監査ログ検索

---

## 指示書（実装手順）

### Step 1: 依存追加（30分）
```
pip install authlib python3-saml pyotp passlib[bcrypt]
```

### Step 2: モデル + マイグレーション（1日）
1. IdentityProvider / MFASecret / AccessLog / LoginAttempt / AccountLock
2. seed: system role の MFA 必須 flag

### Step 3: OIDC（2日）
1. authlib の OAuth client 動的登録
2. start / callback 実装
3. Azure AD test tenant で実動作確認
4. role mapping 動作確認

### Step 4: SAML（2日）
1. python3-saml の Config 動的構築
2. metadata / ACS endpoint
3. Okta dev で実動作確認

### Step 5: MFA（1.5日）
1. enroll / verify endpoint
2. login flow の 2-step 化
3. backup codes
4. /auth/mfa UI

### Step 6: 列マスキング（1日）
1. ontology PropertyType.pii_level の seed（顧客名、従業員氏名 etc.）
2. ColumnMaskMiddleware 実装
3. /admin/audit で「列マスク発動回数」表示

### Step 7: AccessLog（1日）
1. Middleware 実装
2. ResponseCapture で object_ids 抽出
3. /admin/access-logs UI（検索 + export）

### Step 8: ロックアウト（半日）
1. login attempt 記録
2. lockout チェック
3. unlock API（admin のみ）

### Step 9: IdP / Users UI（1.5日）
1. /admin/identity-providers の CRUD
2. /admin/users の role 付与
3. SSO ボタンの動的描画

### Step 10: 統合テスト（1日）
1. SSO フロー
2. MFA フロー
3. 列マスク
4. ロックアウト

---

## 完了基準

- [ ] Azure AD で SSO ログインが完走する
- [ ] Okta SAML で SSO ログインが完走する
- [ ] admin role のユーザは MFA 必須、enroll → TOTP 入力が必要
- [ ] backup code でも MFA バイパス可能
- [ ] viewer role のユーザで /api/v1/stores レスポンスから PII カラムが `***`
- [ ] AccessLog に全 API request が記録され、row-level の object_ids が入る
- [ ] 連続ログイン失敗 5回 → 30分ロック → 期限切れで自動解除
- [ ] /admin/identity-providers から OIDC/SAML を CRUD でき、即時反映
- [ ] /admin/users で role 付与/失効ができ、ユーザ再ログインで権限反映
- [ ] /admin/access-logs で検索 + CSV export 動作

## 工数見積
- Step 1-2: 1日
- Step 3-4: 4日
- Step 5: 1.5日
- Step 6: 1日
- Step 7: 1日
- Step 8: 半日
- Step 9: 1.5日
- Step 10: 1日
- **合計: 11.5日（≈ 2週）**

## 増点内訳
- 05 認証：SSO + MFA + 列マスク + AccessLog + Lockout + IdP UI で **+5**
- = **+5点**

## 注意
- SAML は IdP 設定が顧客ごとに違う。yaml で個別設定
- Azure AD と Okta は属性名が違う（`email` vs `nameid` vs `mail`）。マッピングを設定可能に
- 列マスクは middleware 経由で性能影響 5〜10%。critical path は cache
