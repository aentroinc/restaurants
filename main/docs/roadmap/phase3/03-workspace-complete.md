# S-C — ワークスペースUI完成（+3点 / 3日）

## 現状
- Analysis / CustomKPI / Cohort / SavedQuery モデル + API + 基本UIあり
- カスタムKPIエンジン（式パーサ）動作
- コホートエンジン（フィルタ→SQL）動作
- **Pivot panel 未実装**: line_chart のみ
- **CSVエクスポート未実装**
- **Meeting Pack統合未実装**: 分析を経営会議資料に貼れない
- **Custom KPI昇格UI未実装**

## ゴール
アナリストが「粗利率の月次推移を首都圏×ブランドで見たい」→ workspace で作成 → CSV出力 → 経営会議パックに添付。

---

## 実装手順

### Step 1: Panel タイプ追加（4時間）

`frontend/src/app/workspace/page.tsx` を拡張。分析詳細のpanel表示に以下を追加:

**bar_chart**: 棒グラフ（recharts BarChart）
- spec: `{type: "bar_chart", kpi: "cogs_rate", group_by: "brand", period: {...}}`
- ブランド別比較に最適

**pivot_table**: 行×列のクロス集計
- spec: `{type: "pivot_table", rows: ["brand"], columns: ["month"], values: ["net_sales", "cogs_rate"]}`
- HTMLテーブルで実装（react-grid不要）。行/列ヘッダーをソート可能に
- 合計行/列を表示

**metric_card**: 単一KPI値 + 前期比
- spec: `{type: "metric_card", kpi: "fl_ratio", scope: {...}}`
- 大きい数値 + 上下矢印 + 前月比%

**scatter**: 散布図（KPI相関分析）
- spec: `{type: "scatter", x: "labor_cost_rate", y: "health_score", color: "brand"}`
- recharts ScatterChart

各panelコンポーネント: `frontend/src/components/workspace/`
- `BarPanel.tsx`
- `PivotPanel.tsx`
- `MetricPanel.tsx`
- `ScatterPanel.tsx`

### Step 2: Panel追加UIの改善（2時間）

分析詳細画面に「+ パネル追加」ボタン:
1. クリック → パネルタイプ選択モーダル（4種のカード）
2. タイプ選択 → spec設定フォーム:
   - KPI選択（ドロップダウン: net_sales, cogs_rate, labor_cost_rate, fl_ratio, health_score, avg_ticket等）
   - スコープ（ブランド、エリア、期間）
   - group_by（brand, region, store, month）
3. 「プレビュー」ボタン → APIで実行 → 結果表示
4. 「追加」ボタン → Analysis.spec.panels に追加 → API PUT で保存

### Step 3: CSVエクスポート（3時間）

**バックエンド**: `backend/app/api/v1/workspace.py` に追加:
```python
@router.post("/analyses/{id}/export")
async def export_analysis(id, format: str = Query("csv"), db, tenant_id):
    analysis = await _get_or_404(db, id, tenant_id)
    # 各panelのデータを取得
    # CSV: 各panelのデータをシート的に結合
    # StreamingResponseで返す
```

CSVフォーマット:
```
# Panel: 月次売上推移
月,すき家,はま寿司,ココス,なか卯,ジョリーパスタ
2026-01,650000000,320000000,...
2026-02,...
```

**フロントエンド**: 分析詳細画面に「CSVダウンロード」ボタン追加。
`window.open(apiUrl + "/workspace/analyses/{id}/export?format=csv")` で直接ダウンロード。

### Step 4: Meeting Pack統合（3時間）

**バックエンド**: `backend/app/api/v1/meeting.py` に追加:
```python
@router.post("/meeting-packs/{pack_id}/items/from-analysis")
async def add_analysis_to_pack(pack_id, body: AnalysisPanelRef, db, tenant_id):
    # body: {analysis_id, panel_index, title}
    item = BoardMeetingItem(
        pack_id=pack_id,
        item_type="analysis",
        title=body.title,
        content={"analysis_id": str(body.analysis_id), "panel_index": body.panel_index},
        sort_order=next_order,
    )
    db.add(item)
    await db.commit()
```

**フロントエンド**:
1. workspace の各panel右上に「📎 会議パックに追加」ボタン
2. クリック → 会議パック選択モーダル（既存パック一覧）
3. 選択 → API呼出 → 成功表示
4. `/meeting-packs/[id]` で `item_type=analysis` のとき、analysis APIからデータ取得して描画

### Step 5: Custom KPI昇格UI（1時間）

ワークスペースのカスタムKPIタブ:
- 各KPIの行に「KPI Registryに昇格」ボタン（status=activeのもののみ）
- クリック → 確認ダイアログ「この式を公式KPIとして登録します。全ダッシュボードから参照可能になります。」
- 確認 → `POST /workspace/custom-kpis/{id}/promote` 呼出
- 成功 → ステータスを `promoted` に変更、バッジ表示

### Step 6: コホート改善（1時間）

コホートタブ:
- 「新規コホート」ダイアログのフィルタビルダーを改善
- フィルタ条件: ブランド（select）, エリア（select）, 健全度（range slider or 数値入力）, FL比率（数値入力）, 立地タイプ（select）
- 「プレビュー」ボタン → 該当店舗数 + 店舗名リスト表示
- 「保存」ボタン → API POST → 一覧に追加

---

## 完了基準
- [ ] bar_chart / pivot_table / metric_card / scatter の4種panelが動作
- [ ] パネル追加UIでKPI/スコープ/group_byを選択 → プレビュー → 保存
- [ ] CSVエクスポートボタンでデータがダウンロードされる
- [ ] workspaceのpanelを経営会議パックに追加 → /meeting-packs/[id] で表示される
- [ ] Custom KPIを「昇格」→ KPI Registryに登録される
- [ ] コホート作成で「首都圏 + すき家 + 健全度<50」→ 該当店舗が正しくフィルタされる
