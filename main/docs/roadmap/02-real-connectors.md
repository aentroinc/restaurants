# 02 — 実コネクタ実装（+12点 / 最大配点）

## 課題
現状 `app/services/ingestion.py` は seed generator のラッパー。顧客が「で、うちのデータどう入れんの？」と聞いた瞬間に詰む。**1本でも本番のPOS/勤怠/物流の実コネクタが通っていれば、信用が一段上がる。**

## ゴール
- **Phase 1**: Airレジ または スマレジ の本番OAuth接続 → daily / hourly / product sales の自動取り込み
- **Phase 2**: 勤怠（KING OF TIME / ジョブカン）→ labor 取り込み
- **Phase 3**: 物流TMS（Hacobu / LOGISTEED）→ supply_chain 取り込み

このドキュメントは Phase 1 を対象。Phase 2/3 は同パターンで横展開。

---

## 仕様書

### 対象API（Phase 1: スマレジ Platform API を第一候補）
- 理由: 公開ドキュメントが充実、OAuth2、レート制限明記、店舗 / 商品 / 取引データが取れる
- エンドポイント:
  - `GET /pos/transactions` 取引（売上明細）
  - `GET /pos/transactionDetails` 商品別
  - `GET /pos/stores` 店舗マスタ
  - `GET /pos/products` 商品マスタ
- ドキュメント: https://www1.smaregi.dev/apidoc/

### データモデル（追加）

```python
class DataSource(Base):
    __tablename__ = "data_sources"
    id, tenant_id
    type: Mapped[str]                  # smaregi | airregi | square | king_of_time | hacobu
    name: Mapped[str]
    status: Mapped[str]                # connected | disconnected | error
    auth_type: Mapped[str]             # oauth2 | api_key | basic
    credentials_encrypted: Mapped[str] # AES-256-GCM, key in KMS/Vault
    config: Mapped[dict]               # endpoint URLs, contract_id, etc.
    last_sync_at, last_error
    created_by, created_at

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"
    id, tenant_id, data_source_id (fk)
    job_type: Mapped[str]              # initial_sync | incremental | manual_backfill
    status: Mapped[str]                # queued | running | success | failed | partial
    started_at, finished_at
    rows_fetched: Mapped[int]
    rows_loaded: Mapped[int]
    rows_rejected: Mapped[int]
    cursor: Mapped[str | None]         # incremental sync 用 (timestamp / id)
    error_log: Mapped[list]            # JSONB array

class IngestionRecord(Base):
    """生レコードの provenance ストア。Lineage の根。"""
    __tablename__ = "ingestion_records"
    id, tenant_id, ingestion_job_id (fk)
    source_payload: Mapped[dict] = mapped_column(JSONB)  # 生レスポンス
    source_id: Mapped[str]             # smaregi の transaction_id 等
    target_table: Mapped[str]          # daily_sales | product_sales | ...
    target_id: Mapped[UUID | None]     # 投入後の主キー
    ingested_at, processed_at
```

### コネクタ実装規約

`backend/app/connectors/` を新設、各コネクタは以下の interface：

```python
# app/connectors/base.py
class BaseConnector(ABC):
    name: str
    auth_type: str

    @abstractmethod
    def authenticate(self, config: dict) -> AuthResult: ...

    @abstractmethod
    def test_connection(self, credentials: dict) -> bool: ...

    @abstractmethod
    def fetch(self, credentials: dict, cursor: str | None,
              limit: int) -> FetchResult: ...

    @abstractmethod
    def transform(self, raw: dict) -> list[CanonicalRecord]: ...

    @abstractmethod
    def schema(self) -> ConnectorSchema: ...
```

`app/connectors/smaregi/` 構造：
```
connectors/smaregi/
├── __init__.py
├── auth.py          # OAuth2 flow (authorize URL, token exchange, refresh)
├── client.py        # httpx-based API client w/ rate limit + retry
├── fetch.py         # transactions, products, stores の取得
├── transform.py     # smaregi schema → canonical (daily_sales / product_sales)
├── connector.py     # BaseConnector 実装
└── tests/
    ├── fixtures/    # 録画レスポンス JSON
    └── test_*.py
```

### スケジューラ
- **APScheduler** を採用（Celery より軽量、単一プロセスで開始可）
- `app/scheduler.py` で定期 sync (毎日 03:00 JST) を起動
- ロックは postgres advisory lock（tenant_id + data_source_id でハッシュ）

### API

```
POST   /api/v1/data-sources                              新規接続
GET    /api/v1/data-sources                              一覧
GET    /api/v1/data-sources/{id}
PUT    /api/v1/data-sources/{id}
DELETE /api/v1/data-sources/{id}

POST   /api/v1/data-sources/{id}/test                    接続テスト
POST   /api/v1/data-sources/{id}/sync                    手動同期キック
GET    /api/v1/data-sources/{id}/jobs                    job 履歴

GET    /api/v1/oauth/{connector}/start?data_source_id=  認可URLへ redirect
GET    /api/v1/oauth/{connector}/callback                token 交換 + 保存
```

### UI
`frontend/src/app/admin/data-sources/page.tsx` を全面改修：

- 「接続を追加」→ コネクタ選択（カード一覧: Smaregi / Airレジ / Square / KOT / Hacobu）
- OAuth flow: 別タブで認可画面 → callback で接続完了
- 接続済み一覧: status バッジ / 最終同期時刻 / 同期件数 / エラー件数
- 詳細画面: ジョブ履歴 / 失敗レコードの確認 / 手動再同期
- 「フィールドマッピング」UI: source field → ontology property（dynamic）

### セキュリティ
- credentials は **必ず暗号化**：`cryptography.fernet` + マスタキーは env (`INGESTION_MASTER_KEY`)
- 本番では KMS / Vault に移行（→ 06-deployment）
- API トークンは `audit_log` に記録しない（マスキング）
- Webhook 受信 endpoint は HMAC 署名検証必須

---

## 指示書（実装手順）

### Step 1: スマレジ Developer 登録
1. https://developers.smaregi.dev/ で開発者アカウント作成
2. アプリ登録 → client_id / client_secret 取得
3. sandbox 環境のテスト店舗データでフロー検証
4. `INGESTION_SMAREGI_CLIENT_ID` / `_SECRET` を `.env` に保存

### Step 2: モデル + マイグレーション
1. `alembic revision -m "data sources and ingestion jobs"`
2. 上記3モデルを CREATE
3. `app/models/__init__.py` に追加

### Step 3: 暗号化基盤
1. `app/services/secrets.py` 新設：`encrypt(plaintext, tenant_id)` / `decrypt(...)`
2. AES-256-GCM、tenant ごとに salt
3. マスタキー rotation 機構（key_id を credentials に併記）

### Step 4: BaseConnector + スマレジ実装
1. `app/connectors/base.py` で interface 定義
2. `app/connectors/smaregi/auth.py`：
   - `build_authorize_url(state, redirect_uri)`
   - `exchange_code(code) -> {access_token, refresh_token, expires_in}`
   - `refresh(refresh_token) -> {...}`
3. `app/connectors/smaregi/client.py`：
   - httpx.AsyncClient + token refresh middleware
   - レート制限（429）→ exponential backoff
   - 指数backoff: 1s, 2s, 4s, 8s, max=60s, 5回でgive up
4. `app/connectors/smaregi/fetch.py`：
   - `fetch_transactions(since: datetime, until: datetime, page) -> AsyncIterator[dict]`
   - cursor は `transaction_date_time` ベース
5. `app/connectors/smaregi/transform.py`：
   - smaregi `transaction` → canonical `daily_sales` (集約) + `hourly_sales` + `product_sales`
   - 不整合（金額不一致など）は `IngestionRecord.error_log` に記録、続行

### Step 5: ジョブランナー
1. `app/services/ingestion_runner.py`：
   - `run_sync(data_source_id, job_type)` を atomic 実行
   - 各 fetch → transform → bulk insert → IngestionRecord 記録
   - 失敗時は partial commit + retry queue
2. `app/scheduler.py`：APScheduler で `cron("0 3 * * *")` 起動
3. `app/main.py` の startup hook で scheduler.start()

### Step 6: API + OAuth flow
1. `app/api/v1/data_sources.py` 新設（既存 admin/data-sources からロジック分離）
2. `app/api/v1/oauth.py`：authorize / callback handler
3. CSRF: state パラメータで tenant_id + nonce を署名

### Step 7: UI
1. `frontend/src/app/admin/data-sources/page.tsx` 改修
2. OAuth callback 後にユーザーを `/admin/data-sources/{id}` へ redirect
3. ジョブ履歴は SSE or polling (5s) で live update
4. 失敗レコードの drilldown ページ

### Step 8: Lineage 自動配線
1. `IngestionRecord.target_table` から `lineage_edges` を自動生成
2. 既存 `app/services/lineage_tracker.py` に hook
3. UI `/admin/lineage` で「smaregi → daily_sales → KPI engine → dashboard」を可視化

### Step 9: 監査・テスト
1. 全 connector 操作を `audit_log` に記録（actor, action, data_source_id）
2. unit test: transform が正しく canonical 形に変換するか
3. integration test: sandbox 接続 → 1日分 fetch → DB 投入 → KPI engine が再計算

### Step 10: ドキュメント
1. `docs/connectors/smaregi.md`：接続手順 / よくあるエラー
2. 顧客向け「データ要求パック」を Phase 1 対応に更新

---

## 完了基準
- [x] スマレジ Platform API の app access token 取得導線を実装
- [x] 手動同期で daily_sales が DB に投入される
- [x] スマレジ transaction details から hourly_sales / product_sales に集約できる
- [x] POS/DWH CSV 取り込みで hourly_sales / product_sales を canonical table に昇格できる
- [x] POS取り込み後に対象店舗・対象期間のKPI再計算が走る
- [ ] スマレジ sandbox に接続完了
- [ ] 自動同期で hourly_sales / product_sales が DB に投入される
- [ ] 1日分（約1万件）の同期が10分以内に完了
- [ ] 接続切れ時にエラー通知 + 自動 token refresh で復旧
- [ ] credentials が DB 上で暗号化されている（grep で平文が出ない）
- [ ] Lineage UI に「smaregi → KPI」のフローが表示される
- [ ] Airレジ または 大手外食DWH/API Gateway で同じ枠組みが2本目として動く（拡張性検証）

## 2026-05-02 実装メモ
- `app/api/v1/connectors.py`: POSコネクタ設定、接続テスト、手動同期APIを追加
- `app/services/japan_pos_connectors.py`: スマレジ token 取得、取引一覧取得、日次/時間帯別/商品別売上集約、`daily_store_sales` / `hourly_store_sales` / `daily_product_sales` upsert、KPI再計算を追加
- `app/services/ingestion.py`: 大手外食DWH/API Gatewayを想定し、CSV経由の `hourly_sales` / `product_sales` canonical promotion と取り込み後KPI再計算を追加
- `frontend/src/app/admin/data-sources/page.tsx`: POSコネクタ追加/テスト/同期 UI を追加
- ゼンショー級の大手外食では店舗POS単体より本部DWH/API Gateway連携が本命になるため、`enterprise_pos_dwh` provider も並列で定義

## 工数見積
- Step 1-3: 3日
- Step 4-5 (スマレジ実装): 8日
- Step 6-7 (API/UI): 5日
- Step 8-10: 4日
- **合計: 約 4週間（1人）**

## リスク
- **スマレジ Platform API の本番認証は契約必須**：sandbox で実装→本番接続は顧客契約後
- **レート制限**：店舗数が多い顧客は分割同期が必要（store_id でシャーディング）
- **データ品質**：smaregi 側の不整合は珍しくない。`dq_engine` で early detection
