"use client";

import { menus } from "@/lib/mock-data";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

const tagStyle = {
  "主役": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "働きもの": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "隠れた優等生": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "退場候補": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
} as const;

type Tag = keyof typeof tagStyle;

export default function MenuPage() {
  const stars = menus.filter((m) => m.tag === "主役");
  const dogs = menus.filter((m) => m.tag === "退場候補");
  const totalProfit = menus.reduce((s, m) => s + m.monthlyProfit, 0);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">MENU ENGINEERING</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">メニューの見直し</h1>
        <p className="text-xs text-slate-400">渋谷センター街店 / 4月実績</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-slate-400">メニュー数</p>
          <p className="text-xl kpi-value">{menus.length}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-[10px] text-slate-400">月の利益</p>
          <p className="text-xl kpi-value">{Math.round(totalProfit / 10000)}万</p>
        </div>
      </div>

      {/* 4-quadrant */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">4つの分類</p>
        <div className="grid grid-cols-2 gap-2">
          {(["主役", "働きもの", "隠れた優等生", "退場候補"] as Tag[]).map((tag) => {
            const items = menus.filter((m) => m.tag === tag);
            const style = tagStyle[tag];
            return (
              <div key={tag} className={`${style.bg} border ${style.border} rounded-lg p-2.5`}>
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-xs font-bold ${style.text}`}>{tag}</span>
                  <span className={`text-[10px] ${style.text}`}>{items.length}</span>
                </div>
                {items.slice(0, 3).map((m) => (
                  <p key={m.id} className="text-[10px] text-slate-600 truncate">{m.name}</p>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {dogs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-bold text-red-700 mb-1">やめるか考えてみませんか?</p>
          {dogs.map((m) => (
            <div key={m.id} className="flex justify-between text-xs text-red-600 py-0.5">
              <span>{m.name}</span>
              <span className="kpi-value">月{m.monthlySales}食 / {yen(m.monthlyProfit)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Menu list */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">ぜんぶのメニュー</p>
        <div className="space-y-2">
          {menus.map((menu) => {
            const style = tagStyle[menu.tag];
            const margin = Math.round(((menu.price - menu.cost) / menu.price) * 100);
            return (
              <div key={menu.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{menu.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>{menu.tag}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>原価 {yen(menu.cost)}</span>
                    <span>利益率 {margin}%</span>
                    <span>月{menu.monthlySales}食</span>
                  </div>
                </div>
                <span className="text-xs kpi-value">{yen(menu.price)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic pricing */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">時間帯の値段(提案)</p>
        <p className="text-[10px] text-slate-400 mb-2">チキンカツカレーの値段を時間帯で変えたら?</p>
        {[
          { time: "ランチ 11-14時", price: 920, note: "いまのまま" },
          { time: "アイドル 14-17時", price: 820, note: "100円さげる" },
          { time: "ディナー 17-22時", price: 1020, note: "100円あげる" },
        ].map((s) => (
          <div key={s.time} className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 mb-1.5 last:mb-0">
            <div>
              <p className="text-xs font-medium">{s.time}</p>
              <p className="text-[10px] text-slate-400">{s.note}</p>
            </div>
            <span className="text-sm kpi-value">{yen(s.price)}</span>
          </div>
        ))}
        <div className="bg-amber-50 rounded-lg p-2 mt-2 text-[11px] text-amber-700">
          この組み合わせで月の売上が約4万円ふえる見込み
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 bg-slate-800 text-white text-xs py-2 rounded-lg active:bg-slate-700">この値段にする</button>
          <button className="flex-1 border border-slate-200 text-xs py-2 rounded-lg text-slate-500">あとで</button>
        </div>
      </div>
    </div>
  );
}
