# Customer Data Request Pack
# 外食チェーン経営OS PoC データ依頼書 v1

## 0. この資料の目的

本資料は、外食チェーン経営OSのPoCを開始するにあたり、顧客企業から受領するデータの種類、形式、提出方法、匿名化ルール、品質チェック項目を定義するための資料である。

PoC開始時点では、すべてのデータが完璧に揃っている必要はない。ただし、以下の最低限データがない場合、店舗別の利益改善余地、原因分析、SVミッション、経営会議レポートの精度が大きく下がる。

本資料は、顧客の経営企画、店舗運営、情報システム、経理、商品部、労務/人事、DX部門に共有する前提で作成する。

---

## 1. データ受領の基本方針

## 1.1 最初のPoC対象範囲

PoCでは、いきなり全社全店舗の全データを対象にしない。

推奨対象は以下。

| 項目 | 推奨 |
|---|---:|
| 対象ブランド | 1〜2ブランド |
| 対象店舗 | 20〜50店舗 |
| 対象期間 | 過去13〜25か月 |
| データ粒度 | 日次、可能なら時間帯別 |
| 最低分析対象 | 売上、人件費、原価、店舗別PL |

## 1.2 受領方法

推奨順。

1. SFTP
2. 顧客指定の安全なファイル共有
3. 暗号化ZIP + 別経路でパスワード共有
4. API連携
5. 手動CSVアップロード

メール添付での提出は原則避ける。

## 1.3 ファイル形式

| 項目 | 推奨 |
|---|---|
| 形式 | CSV UTF-8 |
| 区切り文字 | comma |
| 改行コード | LF または CRLF |
| 日付形式 | YYYY-MM-DD |
| 日時形式 | YYYY-MM-DD HH:mm:ss |
| 文字コード | UTF-8 |
| 数値 | カンマなし、円表記なし |
| 空値 | blank または NULL |

避けたい形式。

- セル結合されたExcel
- 複数表が同一シートに混在するExcel
- 集計済みPDF
- 画像/スクリーンショット
- システム画面の手作業コピー

## 1.4 個人情報の扱い

PoCでは、原則として個人情報は不要。

### 提出不要

- 顧客氏名
- 顧客電話番号
- 顧客メールアドレス
- 顧客住所
- 従業員の住所
- 従業員の電話番号
- 従業員のマイナンバー
- 従業員の銀行口座

### 提出可能だが匿名化推奨

- 従業員ID
- 店長ID
- SV ID
- 会員ID
- レビューID

匿名化例。

```text
employee_id: EMP000123
customer_id: CUST_HASH_001239
sv_id: SV0007
```

---

# 2. 必須データ一覧

PoCで最低限必要なデータは以下。

| データ | 必須度 | 主な用途 | 対象期間 |
|---|---|---|---|
| 店舗マスタ | 必須 | 店舗・ブランド・地域・SV紐付け | 最新時点 + 変更履歴があれば尚可 |
| 商品マスタ | 必須 | 商品別売上、粗利、カテゴリ分析 | 最新時点 + 価格改定履歴があれば尚可 |
| 日次売上 | 必須 | 店舗別売上、客数、客単価 | 13〜25か月 |
| 商品別売上 | 必須 | 商品構成、粗利、原価影響 | 13〜25か月 |
| 勤怠/人件費 | 必須 | 人件費率、人時売上、シフト分析 | 13〜25か月 |
| 店舗別PL | 必須 | 利益構造、改善余地 | 13〜25か月、月次でも可 |
| 予算/目標 | 強く推奨 | 予実管理、経営会議資料 | 当期 + 前期 |
| 原価/レシピ | 強く推奨 | 原価率、商品粗利、COGS分析 | 最新時点 + 変更履歴 |
| 仕入/在庫/廃棄 | 推奨 | 原価異常、廃棄、ロス分析 | 6〜25か月 |
| 販促/クーポン | 推奨 | 販促ROI、値引き影響 | 6〜25か月 |
| レビュー/QSC | 推奨 | 顧客体験、売上低下の先行指標 | 6〜25か月 |
| SV巡回履歴 | 推奨 | SV Mission、改善タスク設計 | 6〜25か月 |

---

# 3. CSVテンプレート

## 3.1 store_master.csv

### 目的

店舗、ブランド、地域、商圏、SV、店長の基本情報を統合する。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| store_code | 必須 | string | 顧客側店舗コード | ST0001 |
| store_name | 必須 | string | 店舗名 | 新宿西口店 |
| brand_code | 必須 | string | ブランドコード | MATSUYA |
| brand_name | 必須 | string | ブランド名 | 松屋 |
| region_name | 推奨 | string | 地域/営業部 | 関東第一営業部 |
| prefecture | 推奨 | string | 都道府県 | 東京都 |
| city | 任意 | string | 市区町村 | 新宿区 |
| address | 任意 | string | 住所 | 東京都新宿区... |
| trade_area_type | 推奨 | string | 商圏タイプ | station_front |
| opening_date | 推奨 | date | 開店日 | 2020-04-01 |
| closing_date | 任意 | date | 閉店日 |  |
| store_status | 必須 | string | active/closed/planned | active |
| seat_count | 任意 | integer | 席数 | 34 |
| floor_area | 任意 | number | 面積 | 72.5 |
| parking_capacity | 任意 | integer | 駐車台数 | 12 |
| delivery_flag | 推奨 | boolean | デリバリー対応 | true |
| takeout_flag | 推奨 | boolean | テイクアウト対応 | true |
| drive_through_flag | 任意 | boolean | ドライブスルー対応 | false |
| sv_code | 推奨 | string | 担当SVコード | SV001 |
| sv_name | 推奨 | string | 担当SV名 | 山田太郎 |
| manager_code | 推奨 | string | 店長コード | MGR001 |
| manager_name | 推奨 | string | 店長名 | 佐藤花子 |

### 検証ルール

- store_code は重複不可
- brand_code は空不可
- store_status は active / closed / planned のいずれか
- opening_date が closing_date より後の場合はエラー

---

## 3.2 product_master.csv

### 目的

商品別売上、商品構成、原価、粗利分析の基礎データ。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| product_code | 必須 | string | 商品コード | PRD0001 |
| product_name | 必須 | string | 商品名 | 牛めし並盛 |
| brand_code | 必須 | string | ブランドコード | MATSUYA |
| category_l1 | 推奨 | string | 大分類 | 主食 |
| category_l2 | 推奨 | string | 中分類 | 牛丼 |
| category_l3 | 任意 | string | 小分類 | 並盛 |
| price | 必須 | number | 税込/税抜は別途定義 | 430 |
| tax_type | 任意 | string | included/excluded | included |
| theoretical_cost | 推奨 | number | 理論原価 | 150 |
| active_flag | 必須 | boolean | 現行商品か | true |
| limited_time_offer_flag | 任意 | boolean | 期間限定か | false |
| start_date | 任意 | date | 販売開始日 | 2024-01-01 |
| end_date | 任意 | date | 販売終了日 |  |

### 検証ルール

- product_code は brand_code 内で重複不可
- price は0以上
- theoretical_cost が price を超える場合は警告

---

## 3.3 daily_sales.csv

### 目的

店舗別の日次売上、客数、客単価、チャネル構成を分析する。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| business_date | 必須 | date | 営業日 | 2026-04-01 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| gross_sales | 推奨 | number | 総売上 | 1200000 |
| net_sales | 必須 | number | 純売上 | 1100000 |
| customer_count | 必須 | integer | 客数 | 1380 |
| order_count | 推奨 | integer | 注文件数 | 1420 |
| discount_amount | 推奨 | number | 値引き額 | 25000 |
| dine_in_sales | 任意 | number | 店内売上 | 750000 |
| takeout_sales | 任意 | number | テイクアウト売上 | 220000 |
| delivery_sales | 任意 | number | デリバリー売上 | 130000 |

### 検証ルール

- store_code は store_master に存在すること
- business_date は対象期間内
- net_sales >= 0
- customer_count >= 0
- 客単価が異常に高い/低い場合は警告

---

## 3.4 hourly_sales.csv

### 目的

時間帯別売上、人時売上、シフト過不足、機会損失分析に使う。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| business_date | 必須 | date | 営業日 | 2026-04-01 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| hour | 必須 | integer | 0〜23 | 14 |
| net_sales | 必須 | number | 純売上 | 52000 |
| customer_count | 必須 | integer | 客数 | 68 |
| order_count | 推奨 | integer | 注文件数 | 70 |

### 検証ルール

- hour は0〜23
- 同一 store_code + business_date + hour は重複不可

---

## 3.5 product_sales.csv

### 目的

商品別売上、商品構成、粗利、メニュー戦略分析に使う。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| business_date | 必須 | date | 営業日 | 2026-04-01 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| product_code | 必須 | string | 商品コード | PRD0001 |
| quantity | 必須 | integer | 販売数量 | 320 |
| net_sales | 必須 | number | 純売上 | 137600 |
| discount_amount | 推奨 | number | 値引き額 | 4000 |
| theoretical_cogs | 推奨 | number | 理論原価合計 | 48000 |

### 検証ルール

- product_code は product_master に存在すること
- quantity >= 0
- net_sales >= 0

---

## 3.6 labor_actuals.csv

### 目的

人件費率、人時売上、シフト過不足を分析する。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| business_date | 必須 | date | 営業日 | 2026-04-01 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| labor_hours | 必須 | number | 実労働時間 | 162.5 |
| labor_cost | 必須 | number | 人件費 | 195000 |
| planned_labor_hours | 推奨 | number | 予定労働時間 | 155.0 |
| planned_labor_cost | 推奨 | number | 予定人件費 | 186000 |

### 検証ルール

- labor_hours >= 0
- labor_cost >= 0
- labor_cost / labor_hours が異常な場合は警告

---

## 3.7 store_pl.csv

### 目的

店舗別利益構造、改善余地、経営会議資料に使う。

### カラム定義

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| period_start | 必須 | date | 期間開始 | 2026-04-01 |
| period_end | 必須 | date | 期間終了 | 2026-04-30 |
| period_type | 必須 | string | monthly/weekly/daily | monthly |
| store_code | 必須 | string | 店舗コード | ST0001 |
| sales | 必須 | number | 売上 | 31000000 |
| cogs | 必須 | number | 原価 | 10100000 |
| gross_profit | 必須 | number | 粗利 | 20900000 |
| labor_cost | 必須 | number | 人件費 | 8800000 |
| rent | 推奨 | number | 家賃 | 2300000 |
| utilities | 推奨 | number | 水道光熱費 | 850000 |
| promotion_cost | 推奨 | number | 販促費 | 420000 |
| other_expenses | 推奨 | number | その他費用 | 2200000 |
| operating_profit | 必須 | number | 営業利益 | 6330000 |

### 検証ルール

- sales - cogs = gross_profit と大きく乖離する場合は警告
- gross_profit - labor_cost - rent - utilities - promotion_cost - other_expenses = operating_profit と乖離する場合は警告
- daily_sales の月次合計と sales が±1%超ズレる場合は要確認

---

## 3.8 budget_targets.csv

### 目的

予実分析、経営会議資料に使う。

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| period_start | 必須 | date | 期間開始 | 2026-04-01 |
| period_end | 必須 | date | 期間終了 | 2026-04-30 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| sales_budget | 必須 | number | 売上予算 | 32000000 |
| operating_profit_budget | 推奨 | number | 営業利益予算 | 6500000 |
| labor_cost_budget | 推奨 | number | 人件費予算 | 8700000 |
| cogs_budget | 推奨 | number | 原価予算 | 10000000 |

---

## 3.9 sv_visits.csv

### 目的

SV活動、巡回優先順位、改善タスクの履歴分析に使う。

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| visit_date | 必須 | date | 訪問日 | 2026-04-10 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| sv_code | 必須 | string | SVコード | SV001 |
| visit_type | 推奨 | string | regular/urgent/followup | regular |
| checklist_score | 推奨 | number | チェックリスト点数 | 82 |
| notes | 任意 | string | コメント | 人員配置に課題あり |
| next_action_required | 任意 | boolean | 追加対応必要 | true |

---

## 3.10 reviews.csv

### 目的

QSC、レビュー悪化、売上低下の先行指標分析に使う。

| カラム | 必須 | 型 | 説明 | 例 |
|---|---|---|---|---|
| review_date | 必須 | date | 投稿日 | 2026-04-05 |
| store_code | 必須 | string | 店舗コード | ST0001 |
| source | 必須 | string | Google/アプリ/アンケート等 | Google |
| rating | 必須 | number | 評価 | 3.2 |
| text | 任意 | string | レビュー本文 | 提供が遅かった |
| category | 任意 | string | 分類 | speed |

---

# 4. データ提出チェックリスト

顧客側で提出前に確認する。

## 4.1 共通

- [ ] ファイルはCSV UTF-8である
- [ ] 文字化けがない
- [ ] ヘッダー行がある
- [ ] 日付形式がYYYY-MM-DDで統一されている
- [ ] 金額にカンマや円記号が入っていない
- [ ] 空欄の扱いが統一されている
- [ ] 個人情報を除外または匿名化している

## 4.2 店舗

- [ ] 店舗コードが全ファイルで一致している
- [ ] 閉店店舗/新店の扱いが明記されている
- [ ] ブランド、地域、SV、店長の紐付けがある

## 4.3 商品

- [ ] 商品コードがPOSデータと一致している
- [ ] 販売終了商品も分析期間内は含まれている
- [ ] 商品カテゴリが設定されている
- [ ] 原価または理論原価がある場合は含めている

## 4.4 売上

- [ ] 対象期間の全営業日が含まれている
- [ ] 店舗別売上の月次合計が社内報告値と一致している
- [ ] 客数または注文数が含まれている
- [ ] 値引き額が含まれている

## 4.5 勤怠/人件費

- [ ] 店舗別・日次の人件費が含まれている
- [ ] 実労働時間が含まれている
- [ ] 予定シフトがある場合は含めている

## 4.6 PL

- [ ] 店舗別PLが含まれている
- [ ] 売上、原価、人件費、営業利益が含まれている
- [ ] POS売上との突合差異が説明できる

---

# 5. データ受領後の当社側チェック

受領後、当社側で以下を実施する。

## 5.1 技術チェック

- ファイル読込可否
- 文字コード
- カラム名
- 型推定
- 行数
- 欠損率
- 重複
- 日付範囲

## 5.2 マスタチェック

- store_code不一致
- product_code不一致
- brand_code不一致
- 閉店店舗の売上存在
- 売上データに存在するが店舗マスタにない店舗
- 商品売上に存在するが商品マスタにない商品

## 5.3 数値チェック

- 売上合計
- 客数合計
- 人件費合計
- 原価合計
- 営業利益合計
- POS売上とPL売上の突合
- 商品別売上合計と店舗別売上合計の突合

## 5.4 データ品質レポート

受領後、以下の形式で顧客へ返却する。

| 項目 | 結果 |
|---|---|
| 受領ファイル数 | 10 |
| 読込成功 | 9 |
| 読込失敗 | 1 |
| 重大エラー | 3 |
| 警告 | 18 |
| 分析利用可能データ | 店舗、商品、売上、勤怠、PL |
| 追加依頼データ | 原価、販促、SV巡回 |

---

# 6. 顧客への初回依頼文テンプレート

```text
〇〇株式会社
〇〇様

外食チェーン経営OS PoC開始にあたり、初期分析に必要なデータをご依頼いたします。

まずは全社全データではなく、PoC対象となる1〜2ブランド、20〜50店舗、過去13〜25か月分を対象に、以下のデータをご共有いただけますと幸いです。

必須データ：
1. 店舗マスタ
2. 商品マスタ
3. 日次売上
4. 商品別売上
5. 勤怠/人件費
6. 店舗別PL

可能であれば追加でいただきたいデータ：
1. 原価/レシピ
2. 仕入/在庫/廃棄
3. 予算/目標
4. 販促/クーポン
5. SV巡回履歴
6. レビュー/QSC

個人情報は原則不要です。従業員ID、店長ID、SV IDなどは匿名化コードで問題ございません。

受領後、弊社側でデータ品質チェックと突合を行い、分析に使えるデータ、追加確認が必要なデータをレポートとして返却いたします。

添付のCSVテンプレートに沿ってご準備いただけますと、PoC開始がスムーズになります。

何卒よろしくお願いいたします。
```

---

# 7. 最小PoCデータ判定

以下を満たせば、PoC開始可能。

| 条件 | 判定 |
|---|---|
| 店舗マスタがある | 必須 |
| 商品マスタがある | 必須 |
| 日次売上が13か月以上ある | 必須 |
| 商品別売上が13か月以上ある | 必須 |
| 勤怠/人件費が13か月以上ある | 必須 |
| 店舗別PLが月次で13か月以上ある | 必須 |
| 店舗コードが主要データで一致している | 必須 |
| POS売上とPL売上の差異が説明可能 | 必須 |
| 原価/レシピがある | 推奨 |
| SV巡回履歴がある | 推奨 |

PoC不可条件。

- 店舗コードが不明
- 日次売上がない
- 店舗別PLがない
- 人件費が店舗別に取れない
- データ期間が3か月未満
- 個人情報が大量に含まれ、匿名化ができない

---

# 8. 顧客データ受領前の社内チェックリスト

- [ ] NDA締結済み
- [ ] データ受領方法合意済み
- [ ] データ保存場所決定済み
- [ ] 顧客別テナント作成済み
- [ ] アクセス可能メンバー限定済み
- [ ] データ保持期間合意済み
- [ ] データ削除方法合意済み
- [ ] AI利用範囲合意済み
- [ ] 顧客データをモデル学習に使わない方針説明済み
- [ ] PoC対象店舗/ブランド確定済み
- [ ] KPI定義ワークショップ日程確定済み
