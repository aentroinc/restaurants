"use client";

import { stores, todayAlerts, hourlySales } from "@/lib/mock-data";
import { Expandable, TabSwitcher } from "@/components/expandable";
import { LiveSalesCounter, LiveDot } from "@/components/live-sales";
import Link from "next/link";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export function HomeManager() {
  const store = stores[0];
  const progress = Math.round((store.todaySales / store.targetSales) * 100);
  const diff = store.todaySales - store.yesterdaySales;
  const diffPct = Math.round((diff / store.yesterdaySales) * 100);
  const myAlerts = todayAlerts.filter((a) => a.storeId === store.id);
  const remaining = Math.max(store.targetSales - store.todaySales, 0);
  const maxH = Math.max(...hourlySales.map((h) => h.sales));

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">田中さん、おつかれ！</p>

      {/* Sales */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400">いまの売上</p>
          <LiveDot />
        </div>
        <LiveSalesCounter base={store.todaySales} />

        <p className={`text-sm font-medium mt-2 ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          きのうより {Math.abs(diffPct)}% {diff >= 0 ? "おおい" : "すくない"}
        </p>
        <p className="text-xs text-slate-400">{store.customers}人きた / 1人 {yen(store.avgSpend)}</p>

        {/* Goal bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">今日のゴール</span>
            <span className="kpi-value">{progress}%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right mt-0.5">
            あと {yen(remaining)} でゴール
          </p>
        </div>
      </div>

      {/* Time-of-day sales - interactive */}
      <Expandable title="今日の時間帯べつ" defaultOpen>
        <TabSwitcher tabs={[
          {
            label: "グラフ",
            content: (
              <div className="space-y-1">
                {hourlySales.map((h) => (
                  <div key={h.hour} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-5 kpi-value text-right">{h.hour}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-slate-700 h-full rounded-full transition-all" style={{ width: `${(h.sales / maxH) * 100}%` }} />
                    </div>
                    <span className="text-[10px] kpi-value w-12 text-right">{yen(h.sales)}</span>
                  </div>
                ))}
              </div>
            ),
          },
          {
            label: "リスト",
            content: (
              <div className="space-y-0.5">
                {hourlySales.map((h) => (
                  <div key={h.hour} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-500">{h.hour}:00</span>
                    <div className="flex gap-4">
                      <span className="text-slate-400">{h.customers}人</span>
                      <span className="kpi-value">{yen(h.sales)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]} />
      </Expandable>

      {/* Alerts */}
      {myAlerts.length > 0 && (
        <Expandable title="いま気になること" badge={<span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">{myAlerts.length}</span>} defaultOpen>
          <div className="space-y-2">
            {myAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-3 ${
                  alert.severity === "danger" ? "bg-red-50 border-l-2 border-red-400" :
                  alert.severity === "warning" ? "bg-amber-50 border-l-2 border-amber-400" :
                  "bg-blue-50 border-l-2 border-blue-300"
                }`}
              >
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">{alert.detail}</p>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Action items - big tap targets */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">やること</p>
        <div className="space-y-2">
          {[
            { href: "/stock", label: "仕入れをチェック", sub: "2件、まだ確認してない", bg: "bg-amber-50", border: "border-amber-200" },
            { href: "/shift", label: "来週のシフトを決める", sub: "金曜ディナー 1人たりない", bg: "bg-blue-50", border: "border-blue-200" },
            { href: "/menu", label: "メニューを見直す", sub: "出てないやつが2つある", bg: "bg-purple-50", border: "border-purple-200" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`${item.bg} border ${item.border} rounded-xl p-4 flex items-center justify-between tap-scale`}>
                <div>
                  <p className="text-sm font-bold text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                </div>
                <span className="text-slate-400">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center tap-scale">
          <p className="text-xs text-slate-400">材料費</p>
          <p className={`text-xl kpi-value ${store.costRate > store.costRateTarget ? "text-red-500" : "text-emerald-600"}`}>
            {store.costRate}%
          </p>
          <p className="text-[10px] text-slate-400">
            {store.costRate > store.costRateTarget ? `目標${store.costRateTarget}%よりちょい高い` : "いい感じ"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center tap-scale">
          <p className="text-xs text-slate-400">もったいない</p>
          <p className={`text-xl kpi-value ${store.wasteReduction >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {store.wasteReduction >= 0 ? "↓" : "↑"}
          </p>
          <p className="text-[10px] text-slate-400">
            {store.wasteReduction >= 0 ? `先月より${yen(store.wasteReduction)}へった` : "ちょっとふえてる"}
          </p>
        </div>
      </div>

      {/* New feature quick links */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/customers">
          <div className="bg-white rounded-xl p-2.5 shadow-sm tap-scale text-center">
            <p className="text-[9px] text-slate-400">リピーター</p>
            <p className="text-sm kpi-value text-emerald-600">78%</p>
          </div>
        </Link>
        <Link href="/reviews">
          <div className="bg-white rounded-xl p-2.5 shadow-sm tap-scale text-center">
            <p className="text-[9px] text-slate-400">口コミ</p>
            <p className="text-sm kpi-value">3.88★</p>
          </div>
        </Link>
        <Link href="/delivery">
          <div className="bg-white rounded-xl p-2.5 shadow-sm tap-scale text-center">
            <p className="text-[9px] text-slate-400">テイクアウト</p>
            <p className="text-sm kpi-value">42%</p>
          </div>
        </Link>
      </div>

      {/* LINE */}
      <Expandable title="朝LINEでとどくよ" defaultOpen={false}>
        <p className="text-[10px] text-slate-400 mb-2">毎朝 6:00</p>
        <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
{`おはよう 渋谷センター街店

明日はこんな感じ
お客さん 148人くらいきそう
売上は 58万いけそう

よく出そうなやつ
1. チキンカツカレー → 42食
2. ビーフカレー → 36食
3. キーマカレー → 28食

鶏むね、多めに頼んどいて！`}
        </div>
        <Link href="/stock">
          <button className="mt-2 w-full bg-slate-800 text-white rounded-lg py-2.5 text-sm font-medium tap-scale">
            仕入れをみる →
          </button>
        </Link>
      </Expandable>
    </div>
  );
}
