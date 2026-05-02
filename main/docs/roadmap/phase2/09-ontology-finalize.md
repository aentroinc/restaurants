# Phase 2 / S4 — 動的オントロジー仕上げ（+4点 / 1週）

## 課題
Phase 1 で v2 モデル + 17 API + ontology_engine（validate / version / impact）は揃った。残りは：
- **UI が v2 ベースで未刷新**：/admin/ontology は古いシンプル表示のまま、property 編集 / version 管理 / 影響範囲表示が UI に出てない
- **既存ORM型（Brand / Store）の OntologyInstance 移行未実施**：dual-store 状態が続いており、両方更新する必要がある
- **audit_log への schema 変更記録未配線**
- **migration ジョブシステム未実装**：breaking change 時の data migration 手順が手動

## ゴール
顧客管理者が UI から ObjectType / PropertyType / LinkType を CRUD し、影響範囲を確認しながら publish できる。Brand エンティティが ontology_instances ベースで動作している。

---

## 仕様書

### UI 全面刷新

`frontend/src/app/admin/ontology/page.tsx` を 3-pane レイアウトに：

```
┌─ 左 (240px) ────────────┬─ 中央 ───────────────────────┬─ 右 (320px) ────┐
│ Object Types            │  選択 ObjectType の Property │ 影響範囲        │
│   Tenant         v1     │  ┌──────────────────────┐    │                  │
│ ▶ Brand          v3     │  │ □ brand_id   string  │    │ KPI: 5本影響     │
│   Store          v2     │  │ □ name       string  │    │ Lineage: 23 edge │
│   Product        v1     │  │ □ category   enum    │    │ Active dashboards│
│ + 新規                  │  │ + 行追加              │    │                  │
│                         │  └──────────────────────┘    │ ⚠ 削除はBreaking │
│                         │  [draft 保存] [publish]      │                  │
└─────────────────────────┴──────────────────────────────┴──────────────────┘
```

機能：
- 左クリックで ObjectType 切替
- property 行で drag-sort、type select、validation editor（min/max/regex）、pii_level（none/low/high）
- 編集中は draft（version = current+1, status=draft）
- publish 前に impact preview を必ず表示
- breaking 検知時は migration job 起動

### Brand → OntologyInstance 移行

#### Phase A: Dual-write 期間（1週間）
1. 既存 `brands` テーブルへの insert/update/delete を hook して、同内容を `ontology_instances`（object_type='Brand'）にも書く
2. read は引き続き `brands` から
3. 整合性チェック：1日1回、両者の差分を audit log に出して0件か確認

#### Phase B: Read 切替
1. application code の Brand read を OntologyInstance ベースに切替
2. 1週間 monitoring、問題なければ
3. legacy `brands` テーブルは読み取り専用に

#### Phase C: 旧テーブル archive
1. `brands_archived` にリネーム
2. 新規書き込みは ontology_instances のみ
3. 1ヶ月後に `brands_archived` を delete（要承認）

実装：
`app/services/ontology_dual_write.py`:
```python
async def dual_write_brand(db, tenant_id, brand_data: dict, action: str):
    """既存 Brand model 操作と並行して ontology_instances にも書く"""
    if action in ("create", "update"):
        instance_data = {
            "tenant_id": tenant_id,
            "object_type_id": await _get_brand_object_type_id(db, tenant_id),
            "primary_key_value": brand_data["brand_id"],
            "properties": brand_data,
        }
        await pg_insert(OntologyInstance).values(instance_data).on_conflict_do_update(...)
    elif action == "delete":
        await db.execute(
            delete(OntologyInstance).where(
                OntologyInstance.primary_key_value == brand_data["brand_id"]
            )
        )
```

`app/api/v1/admin.py` の Brand CRUD 周辺に hook を入れる。

### Migration Job

breaking change（property 削除 / type 変更 / required 追加）時：

```python
class OntologyMigrationJob(Base):
    __tablename__ = "ontology_migration_jobs"
    id, tenant_id
    object_type_id (fk)
    from_version, to_version
    migration_spec: Mapped[dict] = JSONB     # {"removes": [...], "renames": {...}, "type_changes": [...]}
    status: Mapped[str]                       # pending | running | success | failed | rolled_back
    started_at, finished_at
    rows_processed, rows_failed
    rollback_data: Mapped[dict | None] = JSONB
```

flow:
1. ユーザが breaking change を編集 → publish 試行
2. impact engine が breaking と判定
3. UI で「Migration ジョブを実行する必要があります」ダイアログ
4. `POST /api/v1/ontology/migrate` で job 起動
5. background で OntologyInstance を新 version に変換
6. 成功したら publish 完了
7. 失敗したら rollback

ジョブランナー：APScheduler の延長で実装。tenant_id でスコープ。

### Audit ログ統合

`app/middleware/audit.py` に schema 変更フックを追加：
- ObjectType / PropertyType / LinkType の POST/PUT/DELETE 時
- before / after の diff を JSON で記録
- migration job の起動 / 完了 / 失敗

`/admin/audit` ページで「Schema Changes」フィルタ追加。

### 影響範囲計算の強化

既存 `ontology_engine.compute_impact` を拡張：
```python
def compute_impact(...) -> ImpactReport:
    return ImpactReport(
        kpi_definitions=[...],         # 既存
        lineage_events=...,             # 既存
        instance_count=...,             # 既存
        link_types=[...],               # 既存
        # 新規
        active_dashboards=[...],        # Analysis spec で参照中
        custom_kpis=[...],              # CustomKPI.formula で参照中
        ai_tool_definitions=[...],      # Anthropic tool spec で参照中
        meeting_pack_items=[...],       # auto_refresh な panel
    )
```

---

## 指示書（実装手順）

### Step 1: 影響範囲拡張（半日）
1. `compute_impact` を上記の通り拡張
2. CustomKPI / Analysis / AIToolDef 参照のマッチング実装
3. `/api/v1/ontology/object-types/{id}/impact` endpoint 追加

### Step 2: UI 全面刷新（2.5日）
1. `frontend/src/app/admin/ontology/page.tsx` を 3-pane に
2. 左：ObjectType list with version badge
3. 中央：PropertyType editor（drag-sort + type/validation/pii editor）
4. 右：impact preview（live、property 編集中も更新）
5. publish 前のモーダル：impact 確認 + breaking 検知 → migration job 提案

### Step 3: Migration Job（1.5日）
1. OntologyMigrationJob モデル + Alembic
2. job runner 実装（APScheduler に登録）
3. transformation logic：
   - `remove_property`: `instance.properties.pop(name)`
   - `rename_property`: `instance.properties[new] = instance.properties.pop(old)`
   - `change_type`: best-effort cast、失敗は rows_failed カウント
4. rollback: rollback_data に before snapshot を保存
5. UI: job 進捗 SSE で表示

### Step 4: Brand Dual-Write（1日）
1. seed で Brand object_type を ontology_object_types_v2 に登録
2. `dual_write_brand` 実装
3. admin.py Brand CRUD に hook 挿入
4. 整合性チェッカ：cron で daily 実行、差分を audit に
5. 1週間 monitoring

### Step 5: Brand Read 切替（半日）
1. Brand 関連 service を OntologyInstance ベースに（store.brand_id → instance.primary_key_value lookup）
2. integration test で不整合ないことを確認
3. legacy brands を read-only マーク

### Step 6: Audit 統合（半日）
1. middleware/audit.py に schema フック
2. before/after diff の JSON 化
3. /admin/audit に Schema Changes フィルタ
4. seed で過去の dummy schema change ログ

---

## 完了基準

- [ ] /admin/ontology で ObjectType を新規作成 → property 5本追加 → publish が UI から完走
- [ ] property 編集中に右 pane に影響範囲（KPI / lineage / dashboard）が live 表示
- [ ] property 削除 + publish → "breaking" 検知 → migration ダイアログ → job 起動 → 完了通知
- [ ] migration job 失敗時に rollback が動作（instance が変換前に戻る）
- [ ] Brand を更新すると ontology_instances にも自動的に dual-write される
- [ ] 整合性チェッカが daily 動作、差分0件
- [ ] Brand read が OntologyInstance ベースに切替済（legacy brands は read-only）
- [ ] 全 schema 変更が audit_log に before/after 付きで記録
- [ ] /admin/audit で Schema Changes フィルタ動作

## 工数見積
- Step 1: 半日
- Step 2: 2.5日
- Step 3: 1.5日
- Step 4: 1日
- Step 5: 半日
- Step 6: 半日
- **合計: 6日（1週）**

## 増点内訳
- 01 動的オントロジー：UI 刷新 + dual-write 移行 + migration job + audit で **+4**
- = **+4点**

## 注意
- Brand 移行は dual-write 期間に必ず差分監視。両者乖離が出たら速度を止めてデバッグ
- migration job は idempotent に作る（途中失敗→再実行で同じ結果）
- ontology の breaking change は本番では 1日1回まで（顧客の運用安定性のため）
- Store / Product の dual-write は Phase 3 以降（リスクが大きすぎる、Brand 完走を見て判断）
