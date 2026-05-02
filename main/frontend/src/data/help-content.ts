export type HelpCategory =
  | "clock"
  | "shift"
  | "waste"
  | "complaint"
  | "loss"
  | "equipment"
  | "emergency"
  | "settings"

export type HelpEntry = {
  id: string
  category: HelpCategory
  question: string
  answer: string // markdown supported
  related?: string[] // related ids
  apps?: ("staff" | "manager" | "sv")[]
}

export const HELP_CATEGORIES: { id: HelpCategory; label: string; emoji: string }[] = [
  { id: "clock", label: "打刻", emoji: "🕒" },
  { id: "shift", label: "シフト", emoji: "📅" },
  { id: "waste", label: "廃棄", emoji: "🗑" },
  { id: "complaint", label: "クレーム", emoji: "📣" },
  { id: "loss", label: "ロス", emoji: "📉" },
  { id: "equipment", label: "修理", emoji: "🔧" },
  { id: "emergency", label: "緊急", emoji: "🚨" },
  { id: "settings", label: "設定", emoji: "⚙️" },
]

export const HELP_ENTRIES: HelpEntry[] = [
  // ---------- clock (7) ----------
  {
    id: "clock-pin-forgot",
    category: "clock",
    question: "PIN を忘れてしまいました",
    answer: `## PIN を忘れた場合

1. ログイン画面で「PIN を忘れた」をタップ
2. 登録メール / SMS にワンタイムコードが届きます
3. コードを入力して新しい PIN を設定

それでも入れない場合は店長へ連絡してください。店長アプリの「スタッフ管理」から PIN リセットを依頼できます。`,
    related: ["clock-device-change", "settings-login"],
    apps: ["staff"],
  },
  {
    id: "clock-gps-fail",
    category: "clock",
    question: "GPS が取得できず打刻できません",
    answer: `## GPS が取得できないとき

- ブラウザ / アプリの位置情報権限を許可してください（iOS: 設定 > プライバシー > 位置情報サービス）
- 屋内の場合は窓際に移動して再試行
- どうしても取得できない場合は「店舗 Wi-Fi に接続して打刻」が代替手段になります
- それも不可なら店長に「手動打刻申請」を依頼してください`,
    apps: ["staff"],
  },
  {
    id: "clock-face-fail",
    category: "clock",
    question: "顔認証が失敗します",
    answer: `## 顔認証が通らないとき

1. 明るい場所で正面から撮影してください
2. 髪・マスク・帽子を一度外して再試行
3. それでも失敗する場合は「PIN フォールバック」をタップ
4. 再登録は設定 > プロフィール > 顔データ更新 から可能です`,
    apps: ["staff"],
  },
  {
    id: "clock-wrong-time",
    category: "clock",
    question: "打刻時間を間違えました",
    answer: `## 打刻ミスの修正

スタッフ自身では編集できません。店長アプリの「打刻承認」から修正申請を出してください。

1. 打刻履歴画面で該当行をタップ
2. 「修正を依頼」ボタン
3. 正しい時刻 + 理由を入力
4. 店長が承認後に反映`,
    apps: ["staff"],
  },
  {
    id: "clock-break",
    category: "clock",
    question: "休憩の打刻はどうやりますか",
    answer: `## 休憩打刻

打刻画面の「休憩開始」「休憩終了」を使ってください。労基法で 6 時間超勤務時は 45 分以上、8 時間超は 60 分以上の休憩が必要です。アプリは自動でアラートします。`,
    apps: ["staff"],
  },
  {
    id: "clock-late",
    category: "clock",
    question: "遅刻しそうなときは？",
    answer: `## 遅刻時の対応

1. すぐに店長へ連絡（電話 or アプリのチャット）
2. 到着したら通常通り出勤打刻
3. 後で店長が「遅刻フラグ」を付与します（給与計算に反映）`,
    apps: ["staff"],
  },
  {
    id: "clock-device-change",
    category: "clock",
    question: "端末を変更しました（機種変更）",
    answer: `## 端末変更時の手順

1. 新端末でアプリを開き、メールアドレスでログイン
2. 旧端末で受け取ったワンタイム認証コードを入力
3. 新端末で PIN を再設定
4. 顔データは再登録が必要です（設定 > プロフィール）`,
    apps: ["staff", "manager"],
  },

  // ---------- shift (6) ----------
  {
    id: "shift-request-off",
    category: "shift",
    question: "希望休を出したい",
    answer: `## 希望休の提出

1. シフトタブ > 「希望休を提出」
2. カレンダーで休みたい日をタップ
3. 理由（通院・私用など）を入力（任意）
4. 提出締切は毎月 25 日です（翌月分）

店長が承認すると確定。シフト確定後の変更は店長承認が必要になります。`,
    apps: ["staff"],
  },
  {
    id: "shift-swap",
    category: "shift",
    question: "シフトを他の人と交代したい",
    answer: `## シフト交代

1. シフトタブ > 該当の自分のシフトを開く
2. 「交代を依頼」ボタン
3. 候補者を選択して送信
4. 相手と店長の両方の承認で確定`,
    apps: ["staff"],
  },
  {
    id: "shift-published-change",
    category: "shift",
    question: "公開済みシフトを変更したい（店長）",
    answer: `## 公開済みシフトの修正

労基チェックが再度走ります。変更後は影響メンバーに自動で通知が飛びます。

1. シフト > 該当週を開く
2. 「修正モード」をオン
3. シフトを編集
4. 「再公開」を押すと差分のみが本人へ通知

直前 24 時間以内の変更は理由記入が必須です（監査ログ）。`,
    apps: ["manager"],
  },
  {
    id: "shift-labor-law",
    category: "shift",
    question: "労基違反のアラートが出ました",
    answer: `## 労基アラートの解消

主なチェック項目:
- 連続勤務 6 日超
- 1 日 8 時間超 (時間外)
- インターバル 11 時間未満
- 月 45 時間超の残業
- 法定休憩不足

該当行に赤マークが付きます。タップで詳細表示 → シフトを修正 or 「例外承認」で記録を残せます。`,
    apps: ["manager", "sv"],
  },
  {
    id: "shift-publish",
    category: "shift",
    question: "シフトを公開する手順は？",
    answer: `## シフト公開フロー

1. AI ドラフト生成 → 手動調整
2. 労基チェックをすべてクリア
3. 「公開プレビュー」で内容確認
4. 「公開」ボタン → 各メンバーへ通知配信

公開期限はシフト開始の 7 日前を推奨します。`,
    apps: ["manager"],
  },
  {
    id: "shift-paid-leave",
    category: "shift",
    question: "有給休暇を申請したい",
    answer: `## 有給申請

1. シフトタブ > 「有給を申請」
2. 取得日 + 残日数を確認
3. 店長承認後に確定 → シフトから自動で外れます

法定 5 日取得義務のリマインドは年 1 回 6 月に通知されます。`,
    apps: ["staff"],
  },

  // ---------- waste (5) ----------
  {
    id: "waste-record",
    category: "waste",
    question: "廃棄を記録する手順",
    answer: `## 廃棄記録

1. 廃棄タブ > 「新規記録」
2. 商品名 / 食材を選択（バーコード or 検索）
3. 数量と単位を入力
4. 廃棄理由（賞味期限切れ・調理ミス・予測外れ・落下・その他）
5. 写真撮影（任意）
6. 送信 → 原価が自動算出され FL に反映`,
    apps: ["staff", "manager"],
  },
  {
    id: "waste-bulk",
    category: "waste",
    question: "閉店時の一括廃棄を入力したい",
    answer: `## 一括廃棄

閉店処理画面の「一括廃棄」から複数アイテムを 1 度に入力できます。前回の廃棄パターンを AI が予測して候補表示します。`,
    apps: ["staff", "manager"],
  },
  {
    id: "waste-correction",
    category: "waste",
    question: "廃棄記録を間違えました",
    answer: `## 廃棄修正

提出から 1 時間以内ならスタッフ自身で削除・修正可能です。それ以降は店長承認が必要です。監査ログには変更履歴が残ります。`,
    apps: ["staff", "manager"],
  },
  {
    id: "waste-rate-high",
    category: "waste",
    question: "廃棄率が高いと指摘されました",
    answer: `## 廃棄率が高いとき

ダッシュボードの「廃棄分析」で原因別 / 商品別に内訳を確認:
- 予測外れ → 需要予測の見直し（仕込み数調整）
- 賞味期限切れ → 発注ロット見直し
- 調理ミス → スタッフ研修

AI が改善案を 3 つ提示します。`,
    apps: ["manager", "sv"],
  },
  {
    id: "waste-cost-calc",
    category: "waste",
    question: "廃棄の原価はどう計算されますか",
    answer: `## 原価計算ロジック

商品: 直近 30 日の平均原価
食材: BOM レシピ × 仕入単価
特殊価格 (キャンペーン中など): その時点の有効価格を使用

詳細はダッシュボード > 廃棄 > 集計設定 で確認できます。`,
    apps: ["manager"],
  },

  // ---------- complaint (3) ----------
  {
    id: "complaint-record",
    category: "complaint",
    question: "クレームを記録する",
    answer: `## クレーム記録

1. クレームタブ > 「新規」
2. 受付チャネル（来店 / 電話 / SNS / 食べログ）
3. 重大度（軽 / 中 / 重）
4. 内容と対応を記入
5. 「フォローアップ要」をチェックすると 24h で店長にリマインド

重大度「重」は SV へ自動エスカレーション。`,
    apps: ["staff", "manager"],
  },
  {
    id: "complaint-anger",
    category: "complaint",
    question: "お客様が激しく怒っているときは",
    answer: `## 激高対応の基本

1. まず謝罪 → 場所を移動（他のお客様への配慮）
2. 話を最後まで聞く（途中で遮らない）
3. 事実関係を確認 → 即時対応か持ち帰りか判断
4. 重大度「重」を選択 → 店長 / SV へ即時通知
5. 「緊急マニュアル」も合わせて参照`,
    apps: ["staff", "manager"],
  },
  {
    id: "complaint-allergy",
    category: "complaint",
    question: "アレルギー関連のクレームは",
    answer: `## アレルギークレーム

最重要案件として扱います。
1. お客様の体調を最優先で確認 → 必要なら救急
2. 提供食品 / 調理過程 / 容器を確保（廃棄しない）
3. 重大度「重」で記録 → 本部 / SV / 法務に自動通知
4. 緊急マニュアルの「アレルギー事故」フローを参照`,
    apps: ["staff", "manager"],
  },

  // ---------- loss (3) ----------
  {
    id: "loss-report",
    category: "loss",
    question: "落としてしまった・割れた商品の報告",
    answer: `## ロス報告

廃棄とは別カテゴリです。
1. ロスタブ > 「新規」
2. 商品名 / 数量 / 理由（落下・破損・盗難疑い）
3. 写真は強く推奨
4. 送信

月末の棚卸差異と突合されます。`,
    apps: ["staff", "manager"],
  },
  {
    id: "loss-theft-suspect",
    category: "loss",
    question: "盗難の疑いがあります",
    answer: `## 盗難疑い時の手順

1. ロスタブで「盗難疑い」を選択
2. 状況・時刻・該当商品を記録
3. 監視カメラ確認は店長 / SV に依頼
4. 警察通報が必要なケースは緊急マニュアル参照`,
    apps: ["staff", "manager"],
  },
  {
    id: "loss-vs-waste",
    category: "loss",
    question: "ロスと廃棄の違いは？",
    answer: `## ロス vs 廃棄

| 区分 | 例 | 記録先 |
|------|----|--------|
| 廃棄 | 賞味期限切れ・調理ミス・予測外れ | 廃棄タブ |
| ロス | 落下・破損・盗難・紛失 | ロスタブ |

集計上は両方とも「フードコスト悪化要因」として扱われます。`,
    apps: ["staff", "manager"],
  },

  // ---------- equipment (3) ----------
  {
    id: "equipment-broken",
    category: "equipment",
    question: "厨房設備が故障しました",
    answer: `## 設備故障の報告

1. 設備タブ > 「故障報告」
2. 設備名（リストから選択）
3. 重大度（営業継続不可 / 一部影響 / 軽微）
4. 状況と写真
5. 送信 → 修理業者へ自動見積依頼が発行（営業継続不可の場合）

緊急修理は本部承認なしで 5 万円まで実施可能です。`,
    apps: ["staff", "manager"],
  },
  {
    id: "equipment-status",
    category: "equipment",
    question: "修理の進捗を確認したい",
    answer: `## 修理進捗

設備タブ > 該当案件をタップで:
- 業者連絡済み
- 訪問予定日
- 部品手配中
- 修理完了

修理完了後は「動作確認 OK」を必ずチェック。`,
    apps: ["manager"],
  },
  {
    id: "equipment-emergency-cool",
    category: "equipment",
    question: "冷蔵庫 / 冷凍庫が止まりました",
    answer: `## 冷蔵 / 冷凍故障

食材廃棄リスクが大きいので最優先対応:
1. 重大度「営業継続不可」で即時報告
2. 中身を別の冷蔵 / 隣店舗へ移送
3. 温度ロガー記録を確認（HACCP）
4. 廃棄が発生したら通常の廃棄記録 + 「設備起因」フラグ`,
    apps: ["staff", "manager"],
  },

  // ---------- emergency (4) ----------
  {
    id: "emergency-fire",
    category: "emergency",
    question: "火災が発生したら",
    answer: `## 火災発生時

1. **お客様の避難を最優先** — 大声で呼びかけ
2. 119 番通報
3. 初期消火（小規模かつ天井に届かない火のみ）
4. 火元の電源 / ガスを遮断
5. 避難完了後に本部 / SV / 店長へ即時報告
6. 緊急マニュアル「火災」のチェックリストを順次実施`,
    apps: ["staff", "manager"],
  },
  {
    id: "emergency-injury-customer",
    category: "emergency",
    question: "お客様が怪我をした",
    answer: `## お客様の怪我

1. 怪我の状態を確認
2. 出血 / 意識喪失なら 119 通報
3. 軽傷でも医師の診察を勧める
4. お客様情報・怪我内容を記録
5. 重大度「重」のインシデントとして記録 → 本部・法務通知

絶対に「自社責任を認める発言」をしないこと。事実確認を優先。`,
    apps: ["staff", "manager"],
  },
  {
    id: "emergency-injury-staff",
    category: "emergency",
    question: "スタッフが怪我した",
    answer: `## スタッフ労災

1. 応急処置 → 必要なら救急搬送
2. 状況・時刻・原因を記録
3. 労災保険申請を本部に依頼
4. インシデント記録「労災」カテゴリで登録

軽微でも記録すること（後日の労災申請に必要）。`,
    apps: ["staff", "manager"],
  },
  {
    id: "emergency-foodpoison",
    category: "emergency",
    question: "食中毒の疑いの連絡が入った",
    answer: `## 食中毒疑い

最重要案件です。
1. お客様情報 / 喫食日時 / 症状を聞き取り
2. 該当時間帯の調理担当 / 食材を即時特定
3. 検体（残品）があれば冷蔵保管
4. 保健所連絡は本部判断 → SV にすぐエスカレーション
5. クレームは「重」+ アレルギー / 衛生フラグ

絶対に独断で示談しないこと。`,
    apps: ["staff", "manager"],
  },

  // ---------- settings (3) ----------
  {
    id: "settings-login",
    category: "settings",
    question: "ログインできません",
    answer: `## ログイン不可

1. メールアドレス・PIN の打ち間違いを確認
2. パスワードリセット → メール / SMS のワンタイムコード
3. アカウントロック (5 回失敗) は 15 分後に自動解除
4. それでもダメならサポート (0120-XXX-XXX) へ`,
    apps: ["staff", "manager", "sv"],
  },
  {
    id: "settings-notification",
    category: "settings",
    question: "通知設定を変えたい",
    answer: `## 通知設定

設定 > 通知 で以下をオン / オフ:
- シフト公開・変更
- クレーム重大度「重」
- 廃棄率アラート
- 労基違反アラート
- AI 改善提案

サイレント時間（22:00 - 7:00）も設定可能です。`,
    apps: ["staff", "manager", "sv"],
  },
  {
    id: "settings-restart-tour",
    category: "settings",
    question: "オンボーディングをもう一度見たい",
    answer: `## チュートリアル再表示

設定 > ヘルプ > 「オンボーディングを再開」をタップ。

各画面右下の「？」ボタンからもアクセスできます。`,
    apps: ["staff", "manager", "sv"],
  },
]

export function getEntriesByCategory(cat: HelpCategory): HelpEntry[] {
  return HELP_ENTRIES.filter((e) => e.category === cat)
}

export function getEntryById(id: string): HelpEntry | undefined {
  return HELP_ENTRIES.find((e) => e.id === id)
}

export function searchEntries(query: string): HelpEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return HELP_ENTRIES.filter(
    (e) =>
      e.question.toLowerCase().includes(q) ||
      e.answer.toLowerCase().includes(q),
  )
}
