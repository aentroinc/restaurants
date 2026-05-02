# 01 — 動的オントロジー（+10点）

## 課題
現状の `app/models/ontology.py` は ORM 型として固定。Foundry の本質は **実行時に型を編集できる**こと。顧客ごとに「うちの業態では『売上』に深夜帯フラグが要る」みたいな要望が来た時に、コード変更なしで対応できる必要がある。

## ゴール
- 顧客管理者が UI から ObjectType / PropertyType / LinkType を CRUD できる
- 型変更は **versioned**（過去のクエリ・分析を破壊しない）
- インスタンスは JSONB で保存し、型 schema で validation
- 型編集すると依存する KPI / Lineage / AI tool definition が自動更新される

---

## 仕様書

### データモデル（追加 / 改修）

`backend/app/models/ontology.py` を以下に置き換え：

```python
class OntologyObjectType(Base):
    __tablename__ = "ontology_object_types"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    api_name: Mapped[str]            # e.g. "Store", "Product"
    display_name: Mapped[str]
    icon: Mapped[str | None]
    primary_key: Mapped[str]         # JSONB key path
    version: Mapped[int]             # bumped on schema change
    status: Mapped[str]              # draft | active | deprecated
    created_at, updated_at

class OntologyPropertyType(Base):
    __tablename__ = "ontology_property_types"
    id, tenant_id, object_type_id (fk)
    api_name: Mapped[str]
    display_name: Mapped[str]
    data_type: Mapped[str]           # string | int | float | bool | timestamp | enum | array | object
    required: Mapped[bool]
    enum_values: Mapped[list | None]
    validation: Mapped[dict | None]  # {min, max, regex, ...}
    pii_level: Mapped[str]           # none | low | high (列マスキング判定用)
    version: Mapped[int]

class OntologyLinkType(Base):
    __tablename__ = "ontology_link_types"
    id, tenant_id
    api_name: Mapped[str]            # e.g. "store_belongs_to_brand"
    from_object_type_id, to_object_type_id
    cardinality: Mapped[str]         # one-to-one | one-to-many | many-to-many
    version: Mapped[int]

class OntologyInstance(Base):
    """汎用インスタンスストア。ORM 型の Store/Brand 等は将来的にここへ移行可能。"""
    __tablename__ = "ontology_instances"
    id, tenant_id
    object_type_id (fk), object_type_version
    primary_key_value: Mapped[str]
    properties: Mapped[dict] = mapped_column(JSONB)
    valid_from, valid_to                # bitemporal
    created_at, updated_at
    __table_args__ = (
        Index("ix_instance_lookup", "tenant_id", "object_type_id", "primary_key_value"),
        Index("ix_instance_props_gin", "properties", postgresql_using="gin"),
    )

class OntologyLink(Base):
    __tablename__ = "ontology_links"
    id, tenant_id
    link_type_id (fk), link_type_version
    from_instance_id, to_instance_id
    properties: Mapped[dict | None] = mapped_column(JSONB)  # link 自体に属性が乗るケース
```

### API

```
GET    /api/v1/ontology/object-types                    一覧
POST   /api/v1/ontology/object-types                    新規（draft）
PUT    /api/v1/ontology/object-types/{id}               編集（version++）
POST   /api/v1/ontology/object-types/{id}/publish       draft → active
DELETE /api/v1/ontology/object-types/{id}               deprecate（物理削除なし）

GET    /api/v1/ontology/object-types/{id}/properties
POST   /api/v1/ontology/object-types/{id}/properties
PUT    /api/v1/ontology/properties/{id}
DELETE /api/v1/ontology/properties/{id}

GET    /api/v1/ontology/link-types
POST   /api/v1/ontology/link-types
...

GET    /api/v1/ontology/instances?object_type=Store&filter=...
POST   /api/v1/ontology/instances
GET    /api/v1/ontology/instances/{id}/links

POST   /api/v1/ontology/migrate                          # version 移行ジョブ起動
GET    /api/v1/ontology/migrate/{job_id}                 # 進捗
```

### バージョニングルール
- **Backward-compatible**（プロパティ追加、enum値追加）→ version++ のみ。既存インスタンス無編集
- **Breaking**（プロパティ削除、型変更、required化）→ migration job 必須。新versionは draft で作成 → migration 完走後 publish
- 過去 version の参照は読み取り専用で残す

### UI（フロント）
`frontend/src/app/admin/ontology/page.tsx` を全面改修：

- 左: ObjectType 一覧（version badge 付き）
- 中: 選択された ObjectType の Property 編集（行追加 / drag-sort / type select / validation rule editor）
- 右: 影響範囲プレビュー（このプロパティを参照する KPI 定義 / AI tool / Lineage ノード）
- 下部に「変更を draft 保存」「publish」「migration ドライラン」ボタン
- `admin/ontology/graph/page.tsx` は dynamic データから生成するように差し替え

### 影響範囲計算
`services/ontology_impact.py` を新設：

```python
def compute_impact(session, property_id) -> ImpactReport:
    return ImpactReport(
        kpi_definitions=[...],          # KPIDefinition.formula で参照されている
        lineage_edges=[...],
        ai_tool_definitions=[...],
        active_dashboards=[...],
    )
```

---

## 指示書（実装手順）

### Step 1: マイグレーション
1. `alembic revision -m "dynamic ontology"` で新 revision 作成
2. 上記モデル4つを CREATE TABLE
3. 既存の `ontology` table は触らない（後方互換）

### Step 2: モデル実装
1. `app/models/ontology.py` を書き換え（既存定義は `_legacy` suffix で残す）
2. `app/schemas/ontology.py` に Pydantic スキーマ追加
3. `app/services/ontology_engine.py` 新設：
   - `validate_instance(properties, object_type_id, version)` で JSON Schema 風 validation
   - `bump_version(object_type_id)` で破壊的変更検知

### Step 3: API
1. `app/api/v1/ontology.py` を上記エンドポイント仕様に拡張
2. `app/api/v1/ontology_instances.py` を分離
3. `app/main.py` に新ルーター登録

### Step 4: 影響分析
1. `app/services/ontology_impact.py` 実装
2. PUT/DELETE 時に必ず impact report を返す

### Step 5: 既存ORM型を dynamic 化（段階的）
1. **Brand → 第一弾**：`brands` テーブルから `ontology_instances WHERE object_type='Brand'` への移行スクリプト
2. dual-write 期間（2週間）→ 切り替え
3. Store / Product / Campaign は同パターンで順次

### Step 6: フロントUI
1. `frontend/src/app/admin/ontology/page.tsx` を書き換え
2. `frontend/src/lib/api/ontology.ts` を新設（型編集用 client）
3. `frontend/src/app/admin/ontology/graph/page.tsx` を dynamic データソースから描画

### Step 7: ガバナンス連携
1. ObjectType 変更時、`audit_log` に actor / before / after を残す
2. Property の `pii_level=high` は admin role のみ閲覧 → middleware で列マスキング

---

## 完了基準

- [ ] ObjectType / PropertyType / LinkType / Instance / Link の5モデルが本番DBに存在
- [ ] UI から ObjectType を新規作成 → property 追加 → publish → instance 投入が完走
- [ ] version=2 を publish した時、version=1 のインスタンスが破壊されない
- [ ] Property 削除時に影響範囲レポートが返り、ユーザーが confirm するまで実行されない
- [ ] Brand エンティティが ontology_instances ベースで動作（Brand 旧テーブル read-only）
- [ ] audit_log に全 schema 変更が記録されている
- [ ] integration test：ObjectType 作成 → publish → migration → query の E2E

## 工数見積
- Step 1-3 (モデル + API): 5日
- Step 4-5 (影響分析 + 移行): 4日
- Step 6 (UI): 4日
- Step 7 (ガバナンス): 2日
- **合計: 約 3週間（1人）**
