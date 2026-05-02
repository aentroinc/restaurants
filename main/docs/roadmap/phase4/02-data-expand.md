# S2 — 合成データ拡充（+8点 / 2日）

## 現状 → ゴール
- 100店舗×2年×5ブランド、異常5種 → **1,000店舗×3年×5ブランド、異常20種、ゼンショーIR完全反映**

パランティアのReference Applicationは「実データがなくても経営者が『うちのデータみたい』と錯覚する」水準。ゼンショーのIR数値（売上1.14兆円、FL比率60-65%、営業利益率6.6%）に合わせた合成データを作る。

---

## Step 1: 店舗数を1,000に拡大（3時間）

`backend/app/seed/generators.py` 修正:

```python
BRANDS = [
    {"name": "すき家", "service_model": "beef_bowl", "store_count": 500,
     "avg_ticket_range": (450, 600), "daily_sales_range": (350000, 900000),
     "cogs_target": 35, "labor_target": 27},
    {"name": "はま寿司", "service_model": "sushi", "store_count": 200,
     "avg_ticket_range": (1000, 1200), "daily_sales_range": (500000, 1500000),
     "cogs_target": 42, "labor_target": 25},
    {"name": "ココス", "service_model": "family_restaurant", "store_count": 150,
     "avg_ticket_range": (1000, 1500), "daily_sales_range": (400000, 1000000),
     "cogs_target": 32, "labor_target": 32},
    {"name": "なか卯", "service_model": "donburi_udon", "store_count": 100,
     "avg_ticket_range": (500, 700), "daily_sales_range": (250000, 600000),
     "cogs_target": 33, "labor_target": 28},
    {"name": "ジョリーパスタ", "service_model": "pasta", "store_count": 50,
     "avg_ticket_range": (900, 1200), "daily_sales_range": (350000, 800000),
     "cogs_target": 30, "labor_target": 30},
]
# 合計: 1,000店舗
```

エリアを50に拡大（現在28）:
- 北海道: 札幌市内, 札幌郊外, 旭川, 函館
- 東北: 仙台市内, 仙台郊外, 盛岡, 郡山, 秋田
- 関東: 宇都宮, 高崎, 水戸, 土浦, 前橋
- 首都圏: 品川, 新宿, 渋谷, 横浜, 千葉, 大宮, 八王子, 町田, 立川, 川崎, 船橋
- 中部: 長野, 新潟, 金沢, 富山
- 東海: 名古屋市内, 名古屋郊外, 静岡, 浜松, 岐阜
- 関西: 大阪市内, 梅田, 難波, 京都, 神戸, 天王寺
- 中国四国: 広島, 岡山, 倉敷, 松山, 高松
- 九州: 福岡市内, 北九州, 熊本, 鹿児島, 長崎

### パフォーマンス対策

1,000店舗×3年(1,095日)= **1,095,000件の日次売上**。シード時間が長くなる。

対策:
- バッチサイズを50,000に増加
- 時間帯別売上（hourly）は直近3ヶ月のみ生成（それ以前は不要）
- 商品別売上（product_sales）は直近6ヶ月のみ
- `PRAGMA synchronous=OFF` 相当のPostgreSQL設定（seed時のみ）

## Step 2: 期間を3年に拡大（1時間）

```python
start_date = date(2023, 4, 1)  # 2024→2023に変更
end_date = date(2026, 4, 30)
```

3年分のデータにより:
- YoY比較が2年分可能
- 季節性パターンが2サイクル見える
- トレンドラインがより説得力を持つ

## Step 3: 異常パターンを20種に拡大（2時間）

現在5種 → 20種に:

```python
ANOMALY_PATTERNS = {
    # 既存5種（維持）
    "labor_overrun": {"stores": 30, "severity": "high"},      # 人件費率超過
    "cogs_overrun": {"stores": 25, "severity": "high"},       # 原価率超過
    "sales_decline": {"stores": 20, "severity": "medium"},     # 売上減少
    "review_decline": {"stores": 15, "severity": "medium"},    # レビュー低下
    "discount_overuse": {"stores": 10, "severity": "low"},     # 値引き過多
    
    # 新規15種
    "improvement_success": {"stores": 25, "severity": "positive"},  # 改善成功（既存拡大）
    
    # すき家固有
    "contamination_impact": {"stores": 15, "brand": "すき家", "severity": "critical"},  # 異物混入影響
    "late_night_labor": {"stores": 20, "brand": "すき家", "severity": "medium"},  # 深夜帯人件費過多
    "takeout_ratio_drop": {"stores": 10, "brand": "すき家", "severity": "low"},  # テイクアウト比率低下
    
    # はま寿司固有
    "rice_cost_surge": {"stores": 30, "brand": "はま寿司", "severity": "high"},  # コメ価格高騰
    "waste_increase": {"stores": 15, "brand": "はま寿司", "severity": "medium"},  # 廃棄増加
    "wait_time_long": {"stores": 10, "brand": "はま寿司", "severity": "medium"},  # 待ち時間長期化
    
    # ココス固有
    "peak_understaffed": {"stores": 15, "brand": "ココス", "severity": "high"},  # ピーク帯人員不足
    "drink_bar_cost": {"stores": 10, "brand": "ココス", "severity": "low"},  # ドリンクバー原価上昇
    
    # なか卯固有
    "udon_season_surge": {"stores": 10, "brand": "なか卯", "severity": "positive"},  # うどん季節需要急増
    "ticket_machine_issue": {"stores": 5, "brand": "なか卯", "severity": "medium"},  # 券売機トラブル
    
    # 全ブランド共通
    "minimum_wage_impact": {"stores": 40, "severity": "medium"},  # 最低賃金改定影響
    "delivery_margin_squeeze": {"stores": 20, "severity": "medium"},  # デリバリー利益率悪化
    "energy_cost_spike": {"stores": 30, "severity": "medium"},  # 光熱費高騰
    "new_store_rampup": {"stores": 15, "severity": "positive"},  # 新店立ち上がり好調
}
```

各異常パターンに対して:
- 対象期間（直近3ヶ月 or 特定月）
- 影響度（KPIへの数値的影響）
- issue_types JSONBへの記録

## Step 4: ゼンショーIR数値との整合（1時間）

合成データの総計がIR公開数値と近い水準になるよう調整:

| 指標 | IR実績(FY2025/3) | 合成目標 | 調整方法 |
|------|-------------------|---------|---------|
| 年間売上 | 1.14兆円 | ~1.1兆円 | daily_sales_rangeで調整 |
| 営業利益率 | 6.6% | 5-7% | PL生成時にoperating_profitを調整 |
| 原価率 | ~45% | 43-47% | cogs_targetで調整 |
| 店舗数 | 5,800(国内) | 1,000(デモ) | 「サンプル1,000店舗」と表示 |

売上の調整:
```python
# 1,000店舗 × 平均日商60万円 × 365日 ≈ 2,190億円
# IR実績は5,800店舗で1.14兆円 → 1店舗平均 = 1.96億円/年 = 日商54万円
# 合成の日商平均を54万円に寄せる
```

## Step 5: レビューテンプレートの拡充（30分）

現在5+5テンプレート → 20+20に:

```python
REVIEW_TEMPLATES_GOOD = [
    # すき家
    "牛丼のタレが絶妙。何度来ても飽きない。",
    "24時間営業がありがたい。深夜でもクオリティが安定している。",
    "テイクアウトの注文が簡単になった。アプリが便利。",
    "セルフレジの導入で回転が速くなった。",
    # はま寿司
    "160円でこの品質は驚き。ネタが新鮮。",
    "タッチパネルの注文が子供でも使いやすい。",
    "期間限定メニューが毎回楽しみ。",
    # ココス
    "包み焼きハンバーグは鉄板メニュー。ジューシーで美味しい。",
    "ドリンクバーの種類が豊富。ゆっくりできる。",
    "子供連れに最適。キッズメニューが充実。",
    # なか卯
    "親子丼の卵がトロトロで最高。",
    "京風うどんのダシが本格的。関西出身としても満足。",
    # ジョリーパスタ
    "生パスタのモチモチ感が他チェーンとは違う。",
    "ランチセットがお得。スープバー付きで嬉しい。",
    # 共通
    "清潔で快適な店内でした。",
    "スタッフの対応が丁寧で気持ちよく食事できました。",
    "コスパが良く、大満足です。",
    "駐車場が広くて停めやすい。",
    "何度来ても安定した美味しさ。",
    "テイクアウトの包装が丁寧。",
]

REVIEW_TEMPLATES_BAD = [
    # すき家（異物混入関連）
    "最近のニュースが気になる。安全管理は大丈夫なのか。",
    "以前より明らかに味が落ちた。コストカットしすぎ。",
    "深夜のワンオペが心配。店員さんが大変そう。",
    # はま寿司
    "値上げ後のコスパが微妙。160円は高く感じる。",
    "待ち時間が30分以上。回転が悪すぎる。",
    "ネタが小さくなった気がする。",
    # ココス
    "ランチの提供が遅い。15分以上待った。",
    "人手不足なのか、呼んでもなかなか来ない。",
    # なか卯
    "券売機の操作がわかりにくい。年配者には厳しい。",
    "うどんの量が減った。",
    # ジョリーパスタ
    "価格に見合わない。もう少し安くしてほしい。",
    # 共通
    "店内が汚れていた。テーブルが拭かれていない。",
    "接客態度が悪い。挨拶もない。",
    "料理が冷めていた。作り置き感がある。",
    "トイレが不衛生。",
    "混雑時の対応が雑。",
    "エアコンが効きすぎて寒い。",
    "メニューの写真と実物が違いすぎる。",
    "配膳間違いがあった。",
    "騒がしい客がいても注意しない。",
    "ポイントカードの案内がしつこい。",
]
```

## Step 6: ValueCaseを10件に拡充（30分）

3件 → 10件に:
```python
VALUE_CASE_DEFS = [
    {"name": "すき家首都圏 異物混入後の客数回復", "issue_type": "contamination_impact", ...},
    {"name": "はま寿司 コメ高騰対策（メニュー最適化）", "issue_type": "rice_cost_surge", ...},
    {"name": "ココス 首都圏シフト最適化", "issue_type": "labor_overrun", ...},
    {"name": "なか卯 テイクアウト比率向上", "issue_type": "takeout_ratio_drop", ...},
    {"name": "ジョリーパスタ 値上げ後の客数維持", "issue_type": "sales_decline", ...},
    {"name": "全社 深夜帯労働コスト最適化", "issue_type": "late_night_labor", ...},
    {"name": "はま寿司 廃棄ロス削減", "issue_type": "waste_increase", ...},
    {"name": "ココス ピーク帯人員配置最適化", "issue_type": "peak_understaffed", ...},
    {"name": "全社 最低賃金改定対応", "issue_type": "minimum_wage_impact", ...},
    {"name": "すき家 新店立ち上がり加速", "issue_type": "new_store_rampup", ...},
]
```

## Step 7: ワークフローインスタンスを30件に拡充（30分）

8件 → 30件に。各異常パターンに対して1-2件のワークフローインスタンス。

## Step 8: パフォーマンスチェック（30分）

シード後に:
```bash
time docker compose exec api python3 -m app.seed.run
# 目標: 10分以内

# テーブル件数確認
docker compose exec api python3 -c "
from app.database import SyncSession
from sqlalchemy import text
s = SyncSession()
for t in ['stores','daily_store_sales','labor_actuals','store_pl','store_daily_kpi','reviews']:
    c = s.execute(text(f'SELECT count(*) FROM {t}')).scalar()
    print(f'{t}: {c:,}')
"
# 期待:
# stores: 1,000
# daily_store_sales: ~1,095,000
# labor_actuals: ~1,095,000
# store_pl: ~36,000
# store_daily_kpi: ~36,000
# reviews: ~60,000
```

API応答時間チェック:
```bash
time curl http://localhost:8000/api/v1/executive/summary  # 目標: < 2s
time curl http://localhost:8000/api/v1/stores/ranking     # 目標: < 2s
```

応答が遅い場合: 主要テーブルにINDEX追加
```sql
CREATE INDEX IF NOT EXISTS ix_daily_sales_date ON daily_store_sales(business_date);
CREATE INDEX IF NOT EXISTS ix_daily_sales_store ON daily_store_sales(store_id);
CREATE INDEX IF NOT EXISTS ix_kpi_date ON store_daily_kpi(business_date);
CREATE INDEX IF NOT EXISTS ix_kpi_store ON store_daily_kpi(store_id);
```

---

## 完了基準

- [ ] `stores` テーブルに1,000店舗
- [ ] `daily_store_sales` に100万件以上
- [ ] 3年分のデータ（2023-04〜2026-04）
- [ ] 異常パターン20種が `issue_types` に反映
- [ ] ValueCase 10件、ワークフロー30件
- [ ] レビュー20種×2（good/bad）のテンプレート
- [ ] シード時間 < 15分
- [ ] `/api/v1/executive/summary` 応答 < 2秒
- [ ] `/api/v1/stores/ranking` 応答 < 2秒
- [ ] 年間売上合計がゼンショーIR水準（~2,000億円/1,000店舗スケール）と整合
