# S-D — オントロジーUI刷新（+2点 / 2日）

## 現状
- v2モデル（ObjectType/PropertyType/LinkType/Instance/Link）DB永続化済
- 17 API + バリデーション + バージョニング + 影響分析 + マイグレーションジョブ 全部ある
- **UIが古い1-tab表示のまま**: v2 APIの機能がUIに反映されていない

## ゴール
3-paneレイアウトで型/プロパティをCRUD、影響範囲をリアルタイム表示、publish/migrationフロー完結。

---

## 実装手順

### Step 1: 3-pane レイアウト（4時間）

`frontend/src/app/admin/ontology/page.tsx` を全面書き換え:

```
┌─ 左 (220px) ─────────┬─ 中央 ─────────────────────┬─ 右 (300px) ──────┐
│ Object Types          │ プロパティ編集              │ 影響範囲          │
│ ──────────────        │                             │                   │
│ ▶ Store        v2  ● │ api_name   type  required   │ KPI: 5本参照      │
│   Brand        v3  ● │ ─────────────────────────── │ Lineage: 23件     │
│   Product      v1  ● │ store_code string  ✓        │ Instance: 100件   │
│   Employee     v1  ● │ name       string  ✓        │ Link: 7種         │
│   Task         v1  ● │ prefecture string  ○        │                   │
│   ...               │ seat_count int     ○        │ ⚠ 削除は Breaking │
│                       │ trade_area enum    ○        │                   │
│ [+ 新規タイプ]        │ ...                         │                   │
│                       │ [+ プロパティ追加]           │                   │
│                       │                             │                   │
│                       │ [Draft保存] [Publish]       │                   │
└───────────────────────┴─────────────────────────────┴───────────────────┘
```

**左パネル:**
- ObjectType一覧をAPIから取得
- 各行: display_name, version badge, status dot（active=green, draft=yellow, deprecated=gray）
- クリックで中央/右パネルを更新
- 下部「+ 新規タイプ」ボタン → ダイアログ

**中央パネル:**
- 選択ObjectTypeのPropertyType一覧を表示
- 各行: api_name, display_name, data_type（ドロップダウン）, required（チェック）, pii_level（select）
- 行の追加/削除/並べ替え
- data_type: string / int / float / bool / timestamp / enum の選択
- enum選択時: enum_values入力フィールドが展開
- 行削除時: 影響範囲が右パネルに即反映
- 下部: 「Draft保存」→ POST/PUT、「Publish」→ POST /{id}/publish

**右パネル:**
- GET /ontology/object-types/{id}/impact の結果を表示
- KPI定義の参照数
- Lineageイベント数
- Instance数（このタイプのontology_instances数）
- LinkType数（from/toとして参照されるlink type数）
- プロパティ削除やtype変更があれば「⚠ Breaking Change」警告

### Step 2: 新規タイプ作成（1時間）

ダイアログ:
- api_name（英数スネークケース）
- display_name（日本語）
- icon（アイコン選択 or テキスト入力）
- 作成後、即座に左パネルに追加 → 中央でプロパティ追加開始

### Step 3: プロパティ追加/編集（2時間）

中央パネルの行追加:
- 「+ プロパティ追加」クリック → 行が追加、各フィールド入力
- api_name: テキスト（英数）
- display_name: テキスト（日本語）
- data_type: select（string/int/float/bool/timestamp/enum）
- required: チェックボックス
- pii_level: select（none/low/high）
- validation: 展開可能な小フォーム（min/max/regex）

既存プロパティの編集:
- クリックで inline 編集
- 変更あれば「未保存の変更があります」バナー

### Step 4: Publish + Migration フロー（2時間）

「Publish」ボタンクリック時:
1. 影響範囲APIを呼ぶ
2. breaking change検知 → 「マイグレーションが必要です」ダイアログ:
   - 変更内容の一覧（追加/削除/型変更）
   - 影響を受けるインスタンス数
   - 「マイグレーション実行」ボタン → POST /ontology/migrate
   - 進捗表示（processed / failed）
   - 完了 → Publish自動実行
3. breaking changeなし → 確認ダイアログ → publish実行

### Step 5: Linkタイプ表示（1時間）

3-paneの下部にタブ追加: 「リレーション」タブ
- このObjectTypeが関係するLinkType一覧
- from/to の表示
- 新規Link追加ボタン

### Step 6: Ontology Graphページ更新（1時間）

`frontend/src/app/admin/ontology/graph/page.tsx`:
- v2 APIからObjectType + LinkTypeを取得
- 現在のハードコードをAPI呼び出しに差し替え
- ノードにversion badge表示

---

## 完了基準
- [ ] 3-pane UIで左クリック → 中央にプロパティ一覧 → 右に影響範囲が表示
- [ ] 新規ObjectType作成 → プロパティ5つ追加 → Publish が完走
- [ ] プロパティ削除 → 右パネルに「Breaking Change」警告 → Migration実行 → 完了
- [ ] enum型プロパティの作成/編集が動作
- [ ] pii_level設定がプロパティごとに保存される
- [ ] Ontology Graphが v2 APIデータから描画
