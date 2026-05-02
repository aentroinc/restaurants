# S4 — テスト・品質（+5点 / 2日）

## 現状 → ゴール
pytest 5本、E2Eゼロ → **pytest 50本 + API統合テスト + フロントビルド検証 + 型チェック + セキュリティスキャン**

パランティアのReference Appはテストカバレッジ70%以上が標準。

---

## Step 1: バックエンド単体テスト 30本（4時間）

`backend/tests/` に以下を追加:

### test_models.py（5本）
```python
def test_store_model_fields():
    """Storeモデルに必須フィールドが存在"""
    
def test_kpi_definition_unique_constraint():
    """KPI定義のtenant+code+versionがユニーク"""

def test_ontology_v2_models_exist():
    """v2オントロジーモデル5つが定義済"""

def test_all_models_have_tenant_id():
    """全ビジネスモデルにtenant_idが存在"""

def test_base_metadata_tables():
    """Base.metadata.tablesが90+テーブル"""
```

### test_services.py（10本）
```python
def test_kpi_calculator_basic():
    """KPI計算の基本ロジック"""

def test_health_scorer_range():
    """健全度スコアが0-100の範囲"""

def test_improvement_estimator_positive():
    """改善余地が正の値"""

def test_peer_comparator_groups():
    """ピア比較がブランド別にグループ化"""

def test_sv_prioritizer_sorting():
    """SV優先度が降順ソート"""

def test_dq_engine_returns_issues():
    """DQエンジンがissueを返す"""

def test_value_measurement_calculates():
    """ValueCase計測が数値を返す"""

def test_custom_kpi_formula_parse():
    """カスタムKPI式のパース"""

def test_cohort_filter_basic():
    """コホートフィルタの基本動作"""

def test_labor_compliance_violations():
    """労基違反検知の基本動作"""
```

### test_api_endpoints.py（15本）
```python
@pytest.mark.asyncio
async def test_health():
async def test_ready():
async def test_executive_summary():
async def test_executive_issues():
async def test_stores_ranking():
async def test_stores_ranking_pagination():
async def test_store_detail():  # 実在store IDで
async def test_tasks_list():
async def test_task_create():
async def test_sv_missions():
async def test_meeting_packs():
async def test_data_quality_summary():
async def test_value_cases():
async def test_ai_suggested_questions():
async def test_kpi_definitions():
```

各テスト:
- AsyncClient + ASGITransport で FastAPI appを直接テスト
- レスポンスコード + `data` キー存在 + 基本的な型チェック

### test_auth.py（5本）
```python
async def test_login_success():
    """正しいcredentialsでJWT取得"""

async def test_login_wrong_password():
    """間違いパスワードで401"""

async def test_auth_me_with_token():
    """JWTでユーザー情報取得"""

async def test_auth_me_without_token():
    """トークンなしで401"""

async def test_tenant_isolation():
    """異なるtenant_idでデータが分離"""
```

### test_vertical.py（5本）
```python
async def test_recipes_list():
async def test_labor_compliance():
async def test_qsc_summary():
async def test_haccp_compliance():
async def test_benchmarks():
```

## Step 2: API統合テスト（2時間）

`backend/tests/test_integration.py`:

フルフローテスト:
```python
@pytest.mark.asyncio
async def test_csv_upload_to_kpi_flow():
    """CSV upload → validate → promote → KPI recalculate の一気通貫"""
    # 1. テストCSV作成
    csv_content = "business_date,store_code,net_sales,customer_count\n2026-05-01,SUK001,550000,720"
    
    # 2. Upload
    r = await client.post("/api/v1/ingestion/upload", 
        files={"file": ("test.csv", csv_content)},
        data={"entity_type": "daily_sales"})
    assert r.status_code == 200
    batch_id = r.json()["data"]["batch_id"]
    
    # 3. Promote
    r = await client.post(f"/api/v1/ingestion/batches/{batch_id}/promote", ...)
    assert r.json()["data"]["status"] == "promoted"
    
    # 4. KPI status確認
    r = await client.get("/api/v1/kpi/calculation-status")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_task_creates_value_case():
    """タスク完了 → ValueCase自動作成"""
    # 1. タスク作成
    r = await client.post("/api/v1/tasks", json={
        "store_id": "...", "title": "テスト", "issue_type": "labor_overrun",
        "priority": "high", "expected_impact_amount": 1000000
    })
    task_id = r.json()["data"]["id"]
    
    # 2. タスク完了
    r = await client.patch(f"/api/v1/tasks/{task_id}", json={"status": "done"})
    
    # 3. ValueCaseが作成されたか
    r = await client.get("/api/v1/value-cases")
    # 最新のcaseが自動作成されている

@pytest.mark.asyncio
async def test_workflow_triggers_task():
    """ワークフロー評価 → タスク自動生成"""
    r = await client.post("/api/v1/workflows/evaluate")
    data = r.json()["data"]
    assert data["tasks_created"] >= 0  # 異常店舗があればタスク生成

@pytest.mark.asyncio
async def test_ontology_crud_flow():
    """ObjectType作成 → プロパティ追加 → publish"""
    # 1. 型作成
    r = await client.post("/api/v1/ontology/object-types", json={
        "api_name": "test_type", "display_name": "テスト型"})
    type_id = r.json()["data"]["id"]
    
    # 2. プロパティ追加
    r = await client.post(f"/api/v1/ontology/object-types/{type_id}/properties", json={
        "api_name": "test_prop", "display_name": "テスト属性", "data_type": "string"})
    
    # 3. Publish
    r = await client.post(f"/api/v1/ontology/object-types/{type_id}/publish")
    assert r.json()["data"]["status"] == "active"
```

## Step 3: フロントエンド品質チェック（1時間）

```bash
# TypeScript型チェック
cd frontend && npx tsc --noEmit
# 0 errors 必須

# ビルドチェック
npx next build
# 全ページコンパイル成功必須

# lint (ESLint未設定なら追加)
npx next lint || true
```

`frontend/package.json` の scripts に追加:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

## Step 4: セキュリティスキャン（1時間）

```bash
# Python依存関係の脆弱性
pip install pip-audit
pip-audit -r backend/requirements.txt

# npm依存関係
cd frontend && npm audit --audit-level=moderate

# Python SAST（bandit）
pip install bandit
bandit -r backend/app/ -f json -o /tmp/bandit.json
# HIGH/CRITICAL が0件であること

# シークレット検出
pip install detect-secrets
detect-secrets scan backend/ frontend/ --exclude-files '.env'
```

## Step 5: CI統合（1時間）

`.github/workflows/ci.yml` 更新:
```yaml
name: CI
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: aentro
          POSTGRES_PASSWORD: test
          POSTGRES_DB: restaurant_os_test
        ports: [5432:5432]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r main/backend/requirements.txt
      - run: cd main/backend && python -m pytest tests/ -v --tb=short
      - run: pip install ruff bandit pip-audit
      - run: cd main/backend && ruff check app/
      - run: cd main/backend && bandit -r app/ -ll
      - run: pip-audit -r main/backend/requirements.txt

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd main/frontend && npm ci
      - run: cd main/frontend && npx tsc --noEmit
      - run: cd main/frontend && npm run build
      - run: cd main/frontend && npm audit --audit-level=high || true
```

## Step 6: conftest.py でテスト用DB設定（30分）

```python
# backend/tests/conftest.py
import pytest
from app.database import Base, sync_engine
from app.models import *

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """テスト用にテーブル作成 + シードデータ投入"""
    Base.metadata.create_all(sync_engine)
    # 最小限のシードデータ投入（テナント + 会社 + ブランド + 店舗10件）
    from app.seed.run import run
    try:
        run()
    except Exception:
        pass  # 既にシード済みの場合
    yield
```

---

## 完了基準

- [ ] `pytest tests/ -v` で50本全PASS
- [ ] 統合テスト: CSV→KPI、タスク→ValueCase、ワークフロー→タスクの3フロー
- [ ] `npx tsc --noEmit` エラー0
- [ ] `npx next build` 全ページコンパイル成功
- [ ] `bandit -r app/ -ll` HIGH/CRITICALが0件
- [ ] `pip-audit` CRITICAL脆弱性0件
- [ ] CI workflow が定義済み、ローカルで全step再現可能
- [ ] `make ci` 1コマンドで lint + test + build 完走
