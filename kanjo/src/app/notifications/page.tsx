"use client";

import { useRole } from "@/lib/role-context";
import Link from "next/link";

const typeStyle: Record<string, { bg: string }> = {
  forecast: { bg: "bg-blue-50" },
  stock: { bg: "bg-amber-50" },
  sales: { bg: "bg-emerald-50" },
  staff: { bg: "bg-red-50" },
  waste: { bg: "bg-orange-50" },
  review: { bg: "bg-purple-50" },
  customer: { bg: "bg-cyan-50" },
  promo: { bg: "bg-pink-50" },
  delivery: { bg: "bg-indigo-50" },
};

const ownerNotifications = [
  { id: "1", time: "08:00", type: "sales", title: "全社日次サマリー", body: "全48店舗: 売上¥20.2M / 目標達成率86%", read: true },
  { id: "2", time: "09:15", type: "waste", title: "ロス悪化検知", body: "大宮店: 食材ロスが前月比+25,000円。肉類の廃棄増加", read: false },
  { id: "3", time: "10:30", type: "review", title: "低評価レビュー検知", body: "池袋東口店: Google ★1「30分待たされた」要対応", read: false },
  { id: "4", time: "11:00", type: "delivery", title: "デリバリー手数料レポート", body: "4月UberEats手数料: ¥1,820万。自社比率向上で¥680万削減可能", read: false },
  { id: "5", time: "14:00", type: "customer", title: "リピート率更新", body: "全社リピート率80.0%(+1.8pt)。新宿西口店が84.2%でトップ", read: true },
  { id: "6", time: "15:00", type: "promo", title: "GWフェア中間報告", body: "売上貢献¥420万 / 目標対比+12.5%。好調推移", read: true },
];

const areaNotifications = [
  { id: "1", time: "07:00", type: "sales", title: "エリア朝レポート", body: "東京23区 18店舗: きのう¥8.42M(目標85%)", read: true },
  { id: "2", time: "09:30", type: "staff", title: "シフト不足", body: "池袋東口店: 金曜ディナー帯ホール1名不足", read: false },
  { id: "3", time: "10:30", type: "review", title: "悪い口コミ", body: "池袋東口店: Google ★1 待ち時間のクレーム。返信してあげて", read: false },
  { id: "4", time: "12:00", type: "waste", title: "ロスが増えてる", body: "池袋東口店: 原価率31.5%(目標+1.5pt)。仕入れ見直して", read: false },
  { id: "5", time: "13:45", type: "sales", title: "ランチ好調", body: "新宿西口店: 先週比+18%。限定カレーが人気", read: true },
  { id: "6", time: "14:00", type: "customer", title: "リピート率", body: "エリア平均82.1%。池袋が74.2%で低い→接客チェック", read: true },
];

const managerNotifications = [
  { id: "1", time: "06:00", type: "forecast", title: "明日の見込み", body: "お客さん148人くらい。チキンカツカレー42食、多めに仕入れて", read: true },
  { id: "2", time: "12:30", type: "waste", title: "サラダがもったいない", body: "セットのサラダ残しが増えてる。盛り付け量を減らしてみて", read: false },
  { id: "3", time: "13:00", type: "review", title: "うれしい口コミ！", body: "Google ★5「チキンカツカレー最高！回転早くて助かる」", read: false },
  { id: "4", time: "14:23", type: "stock", title: "鶏むね少ない", body: "あと12食ぶん。今日の見込みだとあと20食は出るよ", read: false },
  { id: "5", time: "15:00", type: "promo", title: "GWフェア好調！", body: "限定スパイスカレー、今日だけで18食出た。声かけ続けて", read: true },
  { id: "6", time: "15:30", type: "delivery", title: "テイクアウト多め", body: "今日はテイクアウト比率42%。UberEatsより直接の方がもうかるよ", read: true },
];

const ownerLine = [
  {
    time: "毎週月曜 8:00",
    content: `全48店舗 先週の実績

売上: 1.49億(目標比92%)
EBITDA: 2,680万(マージン18.0%)
AI改善効果: +2,505万/月

要注意: 大宮店(原価率32.5%)
好調: 新宿西口店(売上+18%)
口コミ: 池袋★1レビュー要対応

デリバリー手数料: 月¥2,880万
→自社比率向上で¥2,040万削減余地`,
    button: "詳細レポートをみる",
  },
];

const areaLine = [
  {
    time: "毎朝 7:00",
    content: `中村さん、おはようございます

きのうの東京23区 18店舗

◎ 新宿西口店 → 目標クリア、口コミ◎
△ 渋谷センター街店 → あとちょっと
✕ 池袋東口店 → 原価率たかい、口コミ★1

今日やること
→ 池袋の仕入れチェック
→ 池袋の★1レビューに返信
→ 渋谷の金曜シフト1人さがす`,
    button: "くわしくみる",
  },
];

const managerLine = [
  {
    time: "毎朝 6:00",
    content: `おはよう 渋谷センター街店

明日はこんな感じ
お客さん 148人くらいきそう
売上は 58万いけそう

よく出そうなやつ
1. チキンカツカレー → 42食
2. ビーフカレー → 36食
3. キーマカレー → 28食

鶏むね、多めに頼んどいて！
GWフェアの声かけもよろしく`,
    button: "仕入れをみる",
  },
];

export default function NotificationsPage() {
  const { role } = useRole();

  const notifs = role === "owner" ? ownerNotifications : role === "area" ? areaNotifications : managerNotifications;
  const lines = role === "owner" ? ownerLine : role === "area" ? areaLine : managerLine;
  const unread = notifs.filter((n) => !n.read).length;
  const title = role === "owner" ? "通知" : role === "area" ? "おしらせ" : "おしらせ";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-slate-400 text-xs">← もどる</Link>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">NOTIFICATIONS</p>
        <div className="flex items-center gap-2 mt-0.5">
          <h1 className="text-base font-bold text-slate-800">{title}</h1>
          {unread > 0 && (
            <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {notifs.map((notif) => {
          const style = typeStyle[notif.type] || { bg: "bg-slate-50" };
          return (
            <div key={notif.id} className={`rounded-xl p-3 ${!notif.read ? style.bg : "bg-white"} shadow-sm`}>
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-xs ${!notif.read ? "font-bold" : "text-slate-500"}`}>{notif.title}</p>
                <span className="text-[10px] text-slate-400">{notif.time}</span>
              </div>
              <p className="text-[11px] text-slate-500">{notif.body}</p>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">LINEで届く通知</p>
        <div className="space-y-3">
          {lines.map((msg, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 mb-2">{msg.time}</p>
              <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
                {msg.content}
              </div>
              <button className="mt-2 w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-medium tap-scale">
                {msg.button} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
