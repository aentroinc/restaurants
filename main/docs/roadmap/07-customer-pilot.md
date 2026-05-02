# 07 — パイロット顧客運用 / 価値計測（+5点）

## 課題
`tests/` ディレクトリが空。`docs/poc/02-eight-week-poc-operating-playbook.md` は良くできているが、**実際に1社で完走した実績がない**。実績がないと商談で「机上の空論」と一蹴される。

## ゴール
- 1社のパイロット顧客で 8週間 POC を完走させる
- 価値計測（売上改善 / コスト削減 / 工数削減）を **数値で**示す
- パイロット運用で得た学びを playbook に反映
- パイロット顧客が **本契約に転換**する

このドキュメントは「Tech 仕様」というより「運営仕様」。エンジニアリング側の対応事項を明記。

---

## 仕様書

### パイロット契約条件（推奨）
- 期間: 8週間
- 価格: ¥3,000,000 〜 ¥5,000,000（成果連動でも可）
- スコープ: 30〜100店舗、1ブランド（後で全社展開判定）
- 成果物: 改善効果レポート + 本契約提案
- 成果連動オプション: 改善額の20%を成功報酬

### POC ステージ

| 週 | 主活動 | エンジニア責任 |
|----|--------|---------------|
| W0 | 契約 / キックオフ | 環境準備（dedicated tenant 作成） |
| W1 | データ取り込み | コネクタ設定 / 過去6ヶ月分バックフィル |
| W2 | データ品質検証 | DQ engine で issue 抽出 / 顧客と擦り合わせ |
| W3 | KPI 構築 | 顧客固有 KPI を Custom KPI で実装 |
| W4 | 仮説出し | AI Analyst で論点抽出 / SV と現場ヒアリング |
| W5 | 介入実装 | 介入ターゲット店舗で運用開始（A/B もしくは pre/post） |
| W6 | 効果計測 | value_measurement で baseline vs 介入差分 |
| W7 | レポート作成 | Meeting Pack で経営報告書を生成 |
| W8 | 本契約交渉 | 拡大スコープ / 価格 / SLA |

### 価値計測フレーム

```python
class ValueCase(Base):  # 既に存在、拡張する
    id, tenant_id
    name
    hypothesis: Mapped[str]
    intervention: Mapped[str]
    target_kpi: Mapped[str]
    baseline_period: Mapped[dict]      # {from, to}
    intervention_period: Mapped[dict]
    target_scope: Mapped[dict]         # store_ids / brand
    control_scope: Mapped[dict | None] # A/B の control 群
    expected_lift: Mapped[float]
    actual_lift: Mapped[float | None]
    actual_value_jpy: Mapped[int | None]
    confidence: Mapped[str]            # statistical confidence label
    status: Mapped[str]                # planned | running | concluded
    learnings: Mapped[str | None]
```

`app/services/value_measurement.py` を強化：
- baseline period の KPI を集計
- intervention period の KPI を集計
- control 群と差分検定（t-test or DiD）
- 統計的有意性の判定
- 推定金額換算（売上 × marginal margin）

### 介入の代表パターン

| パターン | KPI | 期待効果 |
|---------|-----|---------|
| 需要予測精度UP → 廃棄削減 | waste_amount | -15〜-30% |
| 在庫補充タイミング最適化 → 欠品削減 | stockout_count | -50% |
| シフト最適化 → 人件費削減 | labor_cost_ratio | -2〜-3pt |
| 商品ミックス改善 → 客単価UP | avg_ticket | +3〜5% |
| SV mission 優先順位最適化 → 改善店舗数増 | underperforming_store_count | -30% |
| 改装ROI予測精度UP → 投資効率UP | renovation_roi | +0.3pt |

### Meeting Pack 自動生成

`/meeting-packs/[id]` を強化、POC 報告書テンプレ：
1. **エグゼクティブサマリ**：投資対効果、本契約推奨
2. **ベースライン分析**：現状の課題（DQ + KPI 異常）
3. **介入とその実装**：どの店舗で何をやったか
4. **効果検証**：baseline vs intervention、統計的有意性
5. **本展開ロードマップ**：全社展開時の予測効果

PDF export：`weasyprint` で自動生成。

---

## 指示書（実装手順）

### Step 1: パイロット候補リスト作成（営業/CS タスク）
1. 売上 100億〜500億円規模の中堅外食チェーン 10社
2. POS が smaregi / Airレジ のいずれか
3. データ整備に意欲のある経営層がいる
4. 既存知人ネットワーク + 業界カンファレンスで接触

### Step 2: パイロット環境テンプレート
1. `infra/environments/pilot/` を Terraform で作る（dedicated VPC）
2. 30分で立ち上がるスクリプト：`make provision-pilot CUSTOMER=acme`
3. シード role / 標準 ontology を最初から投入
4. 顧客ロゴ / 配色のテーマ切り替え機能

### Step 3: データ取り込み Sprint
1. 顧客の POS が smaregi の場合: 02 のコネクタを使用
2. 顧客の POS が独自の場合: 1週間で **CSV import コネクタ**を別途実装
3. 過去6ヶ月分をバックフィル
4. DQ engine を回して欠損 / 不整合を一覧化、顧客とレビュー

### Step 4: 顧客固有 KPI / オントロジー拡張
1. 顧客のキックオフで「重要な指標」をヒアリング
2. 動的オントロジー (01) で property 追加
3. Custom KPI builder (04) で式を実装
4. 顧客の経営会議で使われている数値を再現できるか検証

### Step 5: 介入実装
1. ValueCase を最低3本走らせる（廃棄削減・人件費・客単価）
2. 対象店舗とコントロール店舗を選定
3. 介入アクションを workflow / SV mission に紐づける
4. SV のスマホ画面で日々のアクション完了を記録

### Step 6: 効果計測
1. value_measurement で 4週間後に baseline vs 介入の差分計算
2. 季節性を control 群で吸収
3. 効果額を推定（年間換算）
4. 顧客 CFO レビュー（数字の妥当性確認）

### Step 7: 報告書 + 提案
1. Meeting Pack で POC 報告書を生成
2. 経営層プレゼンテーション
3. 本契約提案：全社展開で年間 X 億円改善見込み
4. 価格は改善額の 5〜10% を target

### Step 8: 学びを playbook に反映
1. `docs/poc/02-eight-week-poc-operating-playbook.md` を更新
2. 失敗事例を `docs/poc/lessons-learned.md` に蓄積
3. 顧客固有 KPI / Custom KPI で汎用化できそうなものは標準ライブラリへ

### Step 9: 顧客成功の構造化
1. **Customer Success Manager** 専任 1名
2. 月次レビュー / 四半期 QBR
3. NPS 計測
4. 成功事例を匿名化して publish（ブランド構築）

---

## 完了基準
- [ ] パイロット顧客 1社が 8週間 POC を完走
- [ ] ValueCase 3本以上で統計的有意な改善を確認（p<0.05）
- [ ] 推定改善額が POC 費用の 3倍以上
- [ ] POC 報告書（Meeting Pack）を経営層に納品
- [ ] 本契約への転換 commitment 取得
- [ ] エンジニアリング側の対応で「ここが詰まった」を10件以上 issue 化 → 仕様改修
- [ ] 公開可能な事例（匿名 or 実名）として LP / 営業資料に反映

## 工数見積（エンジニアリング側）
- Step 2 (環境テンプレ): 5日
- Step 3 (データ取り込み常駐): POC 中 W1〜W2 で 8日
- Step 4 (KPI 拡張): W3 で 5日
- Step 5 (介入実装): W4〜W5 で 5日
- Step 6 (効果計測): W6 で 3日
- Step 7 (報告書): W7 で 3日
- Step 8-9 (反映): 5日
- **合計: 約 5週間（1人、ただし8週間に分散）+ CS 1人**

## 注意
- 顧客の経営層スポンサー必須。中間管理職どまりだと頓挫
- 「データが綺麗じゃないからまずデータ整備から」と言ってはいけない。汚いまま動かしてみせる
- 8週間で結果が出ないリスクは50%以上ある。**「結果」自体より「次に何をすればいいかが明確になる」を成果として再定義**できるよう契約書に書き込む
