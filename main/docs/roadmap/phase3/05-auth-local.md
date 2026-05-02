# S-E — 認証ローカル完遂（+2点 / 2日）

## 現状
- JWT認証 + 8ロール + 50権限 + policy_engine 実装済
- MFAモデル + lockout モデル + AccessLog モデル 実装済
- **ログイン画面がない**: フロントに `/auth/login` ページがない
- **MFA UIがない**: enrollやverifyの画面がない
- **列マスクが未実装**: pii_level設定はあるがレスポンスマスクなし
- **IdP管理画面がない**: IdentityProvider CRUDのUI

## ゴール
ログイン → MFA → ロール制御 → 列マスク → アクセスログ閲覧の全フローがブラウザで動く。SSO外部接続は不要（ローカルauth + MFA完結）。

---

## 実装手順

### Step 1: ログインページ（3時間）

`frontend/src/app/auth/login/page.tsx` 新設:
- AENTRO ロゴ + 「ゼンショーグループ 経営OS」
- Email / Password フォーム
- 「ログイン」ボタン → `POST /api/v1/auth/login`
- 成功: JWTをlocalStorageに保存 → `/` にリダイレクト
- MFA必要: `/auth/mfa` にリダイレクト（mfa_tokenを渡す）
- ロック: エラーメッセージ「アカウントがロックされています」
- デモ用: フォーム下に小さく「デモアカウント: admin@aentro.jp / demo」

**デザイン**: ダーク背景、中央にカード、プロフェッショナル。

### Step 2: MFAページ（2時間）

`frontend/src/app/auth/mfa/page.tsx` 新設:
- 6桁コード入力フィールド（大きく、等幅フォント）
- 「確認」ボタン → `POST /api/v1/auth/login/mfa`
- 成功: JWT保存 → `/` にリダイレクト
- 失敗: エラー「コードが正しくありません」
- 「バックアップコードを使う」リンク

`frontend/src/app/auth/mfa/enroll/page.tsx` 新設:
- QRコード表示（qr_uriをQRコードに変換 — `qrcode.react` ライブラリ使用、なければURLテキスト表示）
- バックアップコード10個を表示
- 「保存しました」チェックボックス → 「完了」ボタン
- **注**: QRコードライブラリがなければ、provisioning URIをテキストで表示 + コピーボタン

### Step 3: 認証ガード（2時間）

`frontend/src/lib/auth.ts` 新設:
```typescript
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aentro_token");
}

export function setToken(token: string) {
  localStorage.setItem("aentro_token", token);
}

export function clearToken() {
  localStorage.removeItem("aentro_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
```

`frontend/src/lib/api.ts` 修正:
- fetchAPI にAuthorizationヘッダーを追加:
```typescript
const token = getToken();
if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}
```

`frontend/src/components/app-layout.tsx` 修正:
- ヘッダーのユーザーアバターに現在のユーザー名表示
- ドロップダウンに「ログアウト」→ clearToken() + `/auth/login` にリダイレクト
- **重要**: 認証は任意。トークンがなくてもデモモードで動作する（既存の挙動維持）

### Step 4: 列マスクミドルウェア（2時間）

`backend/app/middleware/column_mask.py` 新設:

ミドルウェアではなく、レスポンス後処理として軽量実装:

```python
# 既存のAPIルーターにデコレータ的に適用する方式
PII_FIELDS = {
    "employee_name": "high",
    "email": "high",
    "phone": "high",
    "address": "low",
    "manager_name": "low",
}

def mask_response(data: dict, user_roles: list[str]) -> dict:
    """レスポンスJSONからPIIフィールドをマスク"""
    if "admin" in user_roles or "executive" in user_roles:
        return data  # 全て見える
    
    def _mask(obj):
        if isinstance(obj, dict):
            return {k: "***" if k in PII_FIELDS and _should_mask(k, user_roles) else _mask(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_mask(item) for item in obj]
        return obj
    
    return _mask(data)
```

`/api/v1/stores/ranking` と `/api/v1/stores/{id}` のレスポンスに適用。
viewer ロールで `employee_name` や `email` が `***` になることをテスト。

### Step 5: アクセスログ閲覧ページ（1.5時間）

`frontend/src/app/admin/access-logs/page.tsx` 新設:
- テーブル: 日時, ユーザー, メソッド, パス, アクション, 結果(allow/deny badge), IP
- フィルタ: ユーザー, アクション, 日付範囲
- ページネーション
- データソース: `GET /api/v1/access-logs`

### Step 6: ユーザー管理ページ（1.5時間）

`frontend/src/app/admin/users/page.tsx` 新設:
- テーブル: 名前, メール, ロール(badges), MFA状態(enrolled/not), 最終ログイン
- ロール付与: 行クリック → ロール選択ダイアログ → `POST /api/v1/rbac/users/{id}/roles`
- MFA必須ロールのユーザーにMFA未設定の場合は警告アイコン

### Step 7: サイドバー更新（30分）

`frontend/src/components/sidebar.tsx` に追加:
- 管理セクションに「ユーザー管理」（Users icon → /admin/users）
- 管理セクションに「アクセスログ」（FileText icon → /admin/access-logs）
- 管理セクションに「認証設定」（Key icon → /admin/identity-providers）

---

## 完了基準
- [ ] `/auth/login` でメール/パスワード入力 → ログイン → JWT保存 → `/` 表示
- [ ] admin ロールでログイン → MFA画面 → コード入力 → ログイン完了
- [ ] 5回連続パスワード間違い → 「ロックされました」表示
- [ ] viewer ロールでログイン → `/api/v1/stores` のレスポンスから `employee_name` が `***`
- [ ] ログアウト → localStorageクリア → `/auth/login` にリダイレクト
- [ ] `/admin/access-logs` で過去のAPIアクセスが検索可能
- [ ] `/admin/users` でロール付与が動作
- [ ] デモモード（トークンなし）でも全ページが閲覧可能（既存挙動維持）
