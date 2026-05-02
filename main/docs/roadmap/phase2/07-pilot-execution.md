# Phase 2 / S5 — パイロット実走（+5点 / 8週間）

## 課題
`tests/` ディレクトリは空、value_measurement.py は実装済だが**実顧客で動かしたことがない**。100点を名乗るには「1社で 8週POC を完走 → 統計的有意な改善 → 本契約 commitment」の実績が必要。

## ゴール
パイロット顧客 1社で 8週POC を完走させ、本契約を取る。エンジニアリング側の責任は「動かないものは作らない」「現場の声を即反映」。

これは Phase 1 の `07-customer-pilot.md` と Phase 2 で違う。**Phase 2 は実走そのもの**であり、ドキュメントというより実行計画。

---

## 仕様書

### 候補顧客プロファイル（営業/CEO 責務）

| 条件 | 必須度 |
|------|--------|
| 年商 100億〜500億円 | 必須 |
| 30〜200店舗 | 必須 |
| 1〜3 ブランド展開 | 必須 |
| 既存 POS が smaregi / Airレジ / Square / Square 系 | 必須（02 のコネクタ対応） |
| データ整備に意欲のある経営層スポンサー（社長 or COO 直結） | 必須 |
| 直近1年で IT 投資の予算枠あり | 推奨 |
| 既存 BI / DWH を持っていない or 不満 | 推奨 |

### 契約条件（推奨）
- 期間: 8週間
- 価格: ¥4,000,000（一括）または改善額の 20%（成功報酬型）
- スコープ: 30〜100店舗、1ブランド
- 成果物: 改善効果レポート + 本契約提案書
- 契約書テンプレ: `docs/legal/poc-agreement-template.md` 新設

### 8週間スケジュール

| 週 | 主活動 | 担当 | 成果物 |
|----|--------|------|--------|
| **W0** | 契約 / キックオフ | 営業 + CS | 契約書 / KPI 合意書 |
| **W1** | 環境構築 + データ取り込み開始 | エンジニア + CS | dedicated tenant / データ流入確認 |
| **W2** | 過去6ヶ月バックフィル + DQ レビュー | エンジニア + 顧客 | DQ レポート |
| **W3** | 顧客固有 KPI / オントロジー拡張 | CS + 顧客 | KPI 一覧 + dashboard |
| **W4** | AI Analyst で論点抽出 + 介入候補選定 | CS + 顧客 | 仮説 5本 + 介入計画 |
| **W5** | ValueCase 3本起票 + 現場展開 | CS + 顧客 | SV mission 配布開始 |
| **W6** | 介入実装 + モニタリング | CS + エンジニア | 中間レポート |
| **W7** | 効果計測 + 報告書作成 | CS + データチーム | POC レポート（自動生成） |
| **W8** | 経営報告 + 本契約交渉 | 営業 + CEO | 本契約 LOI |

### W0 — 環境構築自動化

`scripts/provision-pilot.sh`：
```bash
#!/usr/bin/env bash
CUSTOMER_NAME="$1"
TENANT_ID="$2"

# 1. Tenant 登録
psql $DATABASE_URL -c "INSERT INTO tenants (id, name, plan) VALUES ('$TENANT_ID', '$CUSTOMER_NAME', 'pilot')"

# 2. dedicated VPC 起動（option）
cd infra/environments/prod-dedicated
terraform workspace new $CUSTOMER_NAME
terraform apply -var "customer_name=$CUSTOMER_NAME"

# 3. 標準オントロジー投入
python -m app.seed.standard_ontology --tenant-id $TENANT_ID

# 4. 標準 KPI Registry 投入
python -m app.seed.standard_kpis --tenant-id $TENANT_ID

# 5. 標準 role / permission 投入
python -m app.seed.standard_rbac --tenant-id $TENANT_ID

# 6. 顧客テーマ（ロゴ・配色）
mkdir -p frontend/public/tenants/$TENANT_ID
# (logo は手動配置)

# 7. CS チームに通知
slack-notify "#pilot-launches" "Provisioned: $CUSTOMER_NAME ($TENANT_ID)"
```

### ValueCase 標準テンプレ（`docs/value-cases/`）

事前に「効きそうな介入」を6本用意し、顧客 KPI を見て選択：

| ID | 介入 | 対象 KPI | 想定効果 |
|----|------|---------|---------|
| `VC001` | 需要予測 → 在庫補充タイミング最適化 | waste_amount | -25% |
| `VC002` | 廃棄ロス見える化 → 店舗別アラート | waste_amount | -15% |
| `VC003` | シフト最適化 → 人時生産性 | sales_per_labor_hour | +10% |
| `VC004` | 商品ミックス改善 → メニュー工学 | avg_ticket | +4% |
| `VC005` | SV mission 優先順位最適化 | underperforming_store_count | -30% |
| `VC006` | レビュー対応自動化 → リピート率 | repeat_rate | +3pt |

各 ValueCase は `docs/value-cases/VC00X.md` に詳細を持ち、事前に baseline 集計クエリ・介入手順・効果計測方法が定義されている。

### W6 中間レポート / W8 最終報告書

Meeting Pack の `pilot_report` テンプレ：
1. **エグゼクティブサマリ**（自動生成）
   - POC 期間、対象店舗数、3 ValueCase の効果額（推定年間換算）
   - 投資対効果（POC 費用 vs 改善効果）
2. **現状分析**
   - DQ score の改善
   - KPI ベースラインと業界ベンチマーク比較
3. **3 ValueCase の効果**
   - 各 case の baseline / intervention / control 推移グラフ
   - 統計的有意性（p値、95%信頼区間）
4. **本展開ロードマップ**
   - 全社展開時の予測効果（年間 X 億円）
   - 推奨スコープ拡大 + タイムライン

PDF 自動生成：`weasyprint` で HTML → PDF。

### 統計的検証（CFO レビューに耐える）

`app/services/value_measurement.py` 強化：
- baseline period (30〜90日) の KPI 集計
- intervention period の KPI 集計
- control 群との差分検定（Welch's t-test or DiD）
- 季節性調整（同月前年比 or 隣接コホート補正）
- 95% 信頼区間 + p値
- effect size（Cohen's d）

```python
def compute_value(db, value_case_id) -> ValueResult:
    case = await load_value_case(value_case_id)
    
    baseline = aggregate(case.target_scope, case.baseline_period, case.target_kpi)
    intervention = aggregate(case.target_scope, case.intervention_period, case.target_kpi)
    control = aggregate(case.control_scope, case.intervention_period, case.target_kpi) if case.control_scope else None
    
    if control:
        # difference-in-differences
        delta = (intervention - baseline) - (control - aggregate(case.control_scope, case.baseline_period, case.target_kpi))
    else:
        # before/after with seasonality control
        delta = intervention - baseline_seasonal_adjusted
    
    # 統計検定
    t_stat, p_value = scipy.stats.ttest_ind(intervention_samples, baseline_samples, equal_var=False)
    ci_low, ci_high = bootstrap_ci(intervention_samples, baseline_samples, n=1000)
    
    # 金額換算
    annual_value = delta * conversion_factor(case.target_kpi) * 365 / case.intervention_period_days
    
    return ValueResult(
        delta=delta, p_value=p_value, ci=(ci_low, ci_high),
        annual_value_jpy=annual_value, significant=(p_value < 0.05)
    )
```

---

## 指示書（実装手順）

### Pre-W0: 顧客探索（営業 / 1〜2ヶ月、Phase 2 と並行）
1. CEO ネットワーク + 業界カンファレンス（外食ソリューション展、フードシステムソリューション）
2. 候補10社にコンタクト → 5社で詳細ヒアリング → 1〜2社で契約
3. 契約条件の standardize：契約書テンプレ作成

### W0: キックオフ（**契約締結要承認**）
1. 顧客スポンサー meeting（社長 or COO + IT/データ責任者）
2. KPI 合意書サイン
3. `scripts/provision-pilot.sh CUSTOMER_NAME TENANT_ID` 実行（**user 承認**）

### W1: データ取り込み
1. 顧客 POS 接続：smaregi なら 02 のコネクタで OAuth、CSV なら手動 upload
2. 過去30日分 fetch、データ流入確認
3. ingestion error が出たら都度修正（W1 中の修正は急務）

### W2: バックフィル + DQ
1. 過去6ヶ月分を CSV upload or 段階 sync
2. DQ engine で issue 抽出 → 顧客とレビュー会議
3. 不整合（売上欠損、商品マスタずれ）を修正

### W3: 顧客固有 KPI
1. 顧客の経営会議資料を取り寄せ → 使われている KPI を抽出
2. 動的オントロジー（01）で property 追加
3. Custom KPI builder（04）で式を実装
4. 顧客の数値と一致するか確認（誤差 < 0.5%）

### W4: 仮説抽出
1. AI Analyst で「直近1ヶ月で改善余地が大きい店舗・KPI は？」を質問
2. 出てきた仮説を SV / 店長と現場ヒアリング
3. ValueCase 6本テンプレから 3本選定

### W5: 介入実装
1. ValueCase 起票（target_scope / control_scope / baseline / intervention 期間）
2. SV mission を workflow で配布
3. 店舗の SV / 店長に WhatsApp / Slack で日次フォロー

### W6: 中間レポート + モニタリング
1. 4週間経過、value_measurement で中間結果
2. 効きが悪い case はピボット（介入内容変更）
3. 中間レポート Meeting Pack 自動生成 → 顧客送付

### W7: 効果計測
1. value_measurement で final 計算
2. 統計検定（p < 0.05 を目標）
3. 推定年間効果額算出
4. CFO レビュー（数字の妥当性確認）

### W8: 報告書 + 本契約
1. 経営層向けプレゼン資料
2. 本契約提案：全社展開で年間 X 億円、価格は改善額の 5〜10%
3. LOI 取得 → 法務調整 → 本契約締結

### Post-W8: 学び反映
1. `docs/poc/lessons-learned.md` に詰まった点を蓄積
2. 顧客固有 KPI で汎用化できそうなものは標準ライブラリへ
3. 公開可能な事例（匿名 or 実名）→ LP / 営業資料反映

---

## 完了基準

- [ ] パイロット契約 1社締結
- [ ] W1 終了時点でデータが daily 流入している
- [ ] W2 終了時点でバックフィル6ヶ月完了 + DQ レビュー済
- [ ] W3 終了時点で顧客固有 KPI 5本以上が再現
- [ ] W5 終了時点で ValueCase 3本起票 + 介入開始
- [ ] W7 終了時点で **統計的有意（p<0.05）な改善** が ValueCase 3本中 2本以上で確認
- [ ] 推定年間改善額が POC 費用の **3倍以上**
- [ ] W8 で本契約 LOI 取得
- [ ] 公開可能な事例（匿名でも可）が LP に掲載

## 工数見積
- 営業 / CS: 8週間 × 1名（メイン）+ 0.5名（サポート）
- エンジニアリング: W1〜W2 集中 + W4〜W7 ライト = 約4週間相当
- データ分析: W3〜W7 で 2週間相当

## 増点内訳
- 07 パイロット顧客：契約 + 8週POC 完走 + 本契約 LOI で **+5**
- = **+5点**

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 候補顧客が見つからない | スプリント開始遅延 | 並行で2〜3社にアプローチ、最悪 demo 顧客で擬似運用 |
| W2 で DQ issue 多発し W3〜が遅延 | スコープ縮小 | 介入対象を 3 ブランド → 1 ブランドに絞る |
| W5 介入が現場で実施されない | 効果計測不可 | SV / 店長への現場フォローを CS が直接実施、週次 visit |
| W7 で p>0.05 | 本契約難航 | 「結果」ではなく「次に何をすべきか」が明確になった、を成果として再定義（契約書に記載） |
| 顧客スポンサーが交代 | 契約頓挫 | 契約時に「経営層 commitment 維持」を条項に。最低 W4 までは交代不可 |

## 注意
- 契約書には**個人情報・売上数値の取扱い**条項を必ず入れる（GDPR / APPI）
- 顧客のデータは**専用 tenant 隔離**（マルチテナント共有禁止）
- 報告書の数値は CFO レビュー必須（誇張は信用失墜）
- 失敗パターン: 中間管理職どまりのスポンサー → 経営層 commitment が無いと8週で頓挫する
