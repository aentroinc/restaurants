# Runbook: シークレット rotation

## トリガー
- 定期 rotation（年次）
- 退職 / 漏洩疑い時の緊急 rotation
- subprocessor の cert 更新通知

## 対象シークレット

| 種別 | 保管先 | 頻度 | 影響範囲 |
|------|--------|------|---------|
| JWT_SECRET_KEY | Secrets Manager | 年次 | 全ユーザー要再ログイン |
| CONNECTOR_MASTER_KEY (Fernet) | Secrets Manager + KMS | 年次 | DataSource credentials の re-encrypt が必要 |
| ANTHROPIC_API_KEY | Secrets Manager | 年次 / 漏洩時即時 | LLM 一時停止 |
| Smaregi / Square OAuth client_secret | Secrets Manager | IdP の rotation policy に従う | OAuth flow 一時停止 |
| RDS master password | Secrets Manager + RDS | 年次 | DB 接続短時間断 |
| OIDC IdP credentials (Azure AD client secret) | Secrets Manager | 24 ヶ月（IdP 制約） | SSO 一時停止 |
| TLS 証明書 | ACM (auto-renew) | 90 日 | 自動 |

## 必要権限
- SRE: Secrets Manager write
- Security Lead: KMS rotate-key（破壊的）
- CTO: emergency rotation 承認

---

## 手順: JWT_SECRET_KEY rotation

### 1. 新キー生成
```bash
NEW_KEY=$(openssl rand -base64 64)
aws secretsmanager update-secret \
  --secret-id aentro/prod/jwt-secret \
  --secret-string "$NEW_KEY"
```

### 2. 段階展開（grace period 付き）
- backend env: `JWT_SECRET_KEY` (新) + `JWT_SECRET_KEY_PREVIOUS` (旧) を同時に保持
- decode_token 関数を「新→失敗→旧で再試行」に切替（リリース）
- 24 時間後、旧キー削除

### 3. 検証
- `/api/v1/auth/me` が既存 token で 200 を返す（grace 中）
- 新ログインで発行された token が期待通り（jwt.decode で確認）

---

## 手順: CONNECTOR_MASTER_KEY rotation

新しい Fernet キーを発行し、すべての DataSource の credentials を **re-encrypt**:

```python
# scripts/rotate_connector_key.py
async def rotate(old_key: str, new_key: str):
    sources = await db.execute(select(DataSource).where(DataSource.credentials_encrypted.is_not(None)))
    for s in sources.scalars():
        plaintext = decrypt_with(old_key, s.tenant_id, s.credentials_encrypted)
        s.credentials_encrypted = encrypt_with(new_key, s.tenant_id, plaintext)
    await db.commit()
```

実行後 settings.CONNECTOR_MASTER_KEY を新キーに切替。

### 検証
- 各 DataSource で `POST /data-sources/{id}/test` 200
- 一晩 sync を流して全テナントで 失敗 0

---

## 手順: 緊急 rotation（漏洩疑い）

1. 即座に **無効化**:
   - JWT: 全 token revoke list を Redis に push、middleware でチェック
   - OAuth: IdP 側で client revoke
2. **影響評価**: 直近 30 日 access_logs を抽出、不正アクセス痕跡を確認
3. **新キー発行 + 全展開**（通常手順）
4. **post-mortem** + 顧客通知（漏洩確定時、24h 以内）

## エスカレーション先
- rotation 失敗で 認証停止 30 分超 → CTO
- 漏洩確定 → 法務 + 個人情報保護委員会（24h）

## 関連ドキュメント
- `runbooks/incident-response.md`
- `docs/security/key-management.md`
