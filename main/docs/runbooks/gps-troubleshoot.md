# GPS / ジオフェンス トラブルシュート

打刻時に「店舗から離れています」「GPS精度が低いです」「位置情報が取得できません」と
出るときの対処手順。店長 / SV / フロントスタッフ向け。

## 1. まず確認すること (30秒)

| 症状 | 一次対応 |
|---|---|
| グルグル回って取得できない | 1) 端末の位置情報設定 ON か、2) ブラウザに位置情報の許可を出したか |
| 「精度が低いです (xxxm)」と出る | 屋外に 5〜10 歩出てから「再取得」をタップ |
| 「店舗から離れています」 | 端末を窓際 / 入口に持って行き再取得。改善しなければ §3 へ |
| 「GPS未対応端末」 | ブラウザを Safari / Chrome 最新に更新。WebView 内ブラウザは NG |

## 2. 仕組み (なぜ屋内でズレるか)

- 出力される `accuracy` は 68% 信頼区間の半径。地下店舗・RC 造ビル内では
  Wi-Fi 推定にフォールバックするため平気で 500〜2000m になる。
- AENTRO は `getAccuratePosition()` で 8秒間 watchPosition し、
  最も accuracy の小さいサンプルを採用する設計。じっとしていれば改善する。
- 閾値:
  - `<=100m` : OK (緑)
  - `100m < acc <= 200m` : 警告 (黄) — 屋外移動を促す
  - `>200m` : フォールバック必須 (赤) — Wi-Fi or 店舗QR
- ジオフェンス判定は `radius (100m) + min(accuracy, 150m)` の余裕を持たせるため、
  屋内でも accuracy が 150m 未満なら通常 OK になる。

## 3. それでも取得できない場合のフォールバック

### 3-1. 店舗 Wi-Fi に接続する
店舗 Wi-Fi の SSID が `stores.name` と一致 / 部分一致するように設定されていれば、
バックエンドが SSID から店舗を推定して打刻 OK になる
(`POST /api/v1/geo/wifi-fingerprint`)。
店舗管理者向け: SSID 名は「○○店」「Aentro_○○」などにする。

### 3-2. 店舗 QR コードを読む
レジ脇 / バックヤードの QR を 30秒以内に読み取り、その場で打刻。
QR は store_id を含む 30秒 TTL の短命トークン (`face_auth_engine.issue_qr_token`)。

### 3-3. 管理者に連絡
上記すべて駄目な場合、店長 / SV が手動で `/staff/admin/clock-correction` から
代理打刻 (要 RBAC: `clock:correct`)。すべての手動打刻は audit log に
`auth_method=manual_correction` として残る。

## 4. 開発者・運用者向けデバッグ

### 4-1. ブラウザコンソール
```js
navigator.geolocation.getCurrentPosition(p => console.log(p.coords))
// accuracy が 100m 超なら屋内 GPS の限界
```

### 4-2. clock_events テーブル確認
```sql
select occurred_at, lat, lon, geofence_ok, auth_method
from clock_events
where employee_id = :emp
order by occurred_at desc
limit 10;
```
`geofence_ok=false` で `auth_method=face/qr/pin` のレコードは GPS フォールバックが
発動した可能性大。同タイミングで `logger.warning("clock_in_method=gps_low_accuracy ...")`
が backend ログに出ているか確認。

### 4-3. iOS / Android の差異
- iOS Safari: 「設定 > プライバシー > 位置情報サービス > Safari」で「使用中のみ」
- Android Chrome: タブの URL バー → 鍵アイコン → 「サイトの設定」→ 位置情報

### 4-4. 店舗マスタの座標ズレ
`stores.lat / stores.lng` が建物の入口でなく敷地中心 / 駐車場入口になっていると
50〜200m ズレる。Google Maps で住所検索 → 「右クリック → 座標コピー」で更新。

## 5. エスカレーションフロー
1. 店舗内で 3回以上同じスタッフがフォールバックを使った → 翌営業日に SV に通知
2. 同一店舗で 7日間に 5名以上が `gps_low_accuracy` → 店舗マスタ座標を再確認
3. 全店規模でフォールバック率急増 → backend `/api/v1/geo/ip-locate` の依存
   サービス (Cloudflare hint header) 障害を疑う
