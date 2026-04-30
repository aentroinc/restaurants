"use client";

import { hourlySales, weeklyTrend, stores } from "@/lib/mock-data";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export default function ForecastPage() {
  const store = stores[0];
  const maxH = Math.max(...hourlySales.map((h) => h.sales));
  const maxW = Math.max(...weeklyTrend.map((w) => w.sales));

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">DEMAND FORECAST</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">明日の見込み</h1>
        <p className="text-xs text-slate-400">5月1日(金) / くもり / {store.name}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-slate-400">お客さん</p>
            <p className="text-2xl kpi-value">148<span className="text-sm text-slate-400">名</span></p>
            <p className="text-[10px] text-emerald-600">去年+8名</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">売上</p>
            <p className="text-2xl kpi-value">58<span className="text-sm text-slate-400">万</span></p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600">
          金曜＋GW前半で客足が増える見込み
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">よく出そうなメニュー</p>
        {[
          { name: "チキンカツカレー", count: 42 },
          { name: "ビーフカレー", count: 36 },
          { name: "キーマカレー", count: 28 },
          { name: "野菜カレー", count: 22 },
          { name: "ナン", count: 65 },
        ].map((m, i) => (
          <div key={m.name} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-[10px] text-slate-400 w-4 text-right">{i + 1}</span>
            <span className="text-xs flex-1">{m.name}</span>
            <span className="text-xs kpi-value">{m.count}食</span>
          </div>
        ))}
        <div className="bg-amber-50 rounded-lg p-2 mt-3 text-xs text-amber-700">
          鶏むねの仕入れ、いつもより多めに
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">時間帯べつ売上(今日)</p>
        <div className="space-y-1.5">
          {hourlySales.map((h) => (
            <div key={h.hour} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-6 kpi-value text-right">{h.hour}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(h.sales / maxH) * 100}%` }} />
              </div>
              <span className="text-[10px] kpi-value w-12 text-right">{yen(h.sales)}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2 rounded">
          12時台がピーク。14-16時は空いてるので値段を工夫すると◎
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">今週の売上</p>
        <div className="space-y-1.5">
          {weeklyTrend.map((w) => (
            <div key={w.day} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-4 text-right">{w.day}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(w.sales / maxW) * 100}%` }} />
              </div>
              <span className="text-[10px] kpi-value w-12 text-right">{yen(w.sales)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
