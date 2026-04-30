"use client";

import { stores, todayAlerts } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { LiveSalesCounter } from "@/components/live-sales";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export function HomeManager() {
  const store = stores[0];
  const progress = Math.round((store.todaySales / store.targetSales) * 100);
  const diff = store.todaySales - store.yesterdaySales;
  const diffPct = Math.round((diff / store.yesterdaySales) * 100);
  const myAlerts = todayAlerts.filter((a) => a.storeId === store.id);
  const remaining = Math.max(store.targetSales - store.todaySales, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">田中さん、おつかれ！</p>

      {/* Sales */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <p className="text-xs text-slate-400">いまの売上</p>
        <LiveSalesCounter base={store.todaySales} />

        <div className="mt-1">
          <p className={`text-sm font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            きのうより {Math.abs(diffPct)}% {diff >= 0 ? "おおい" : "すくない"}
          </p>
          <p className="text-xs text-slate-400">{store.customers}人きた / 1人 {yen(store.avgSpend)}</p>
        </div>

        {/* Goal bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">今日のゴール</span>
            <span className="kpi-value">{progress}%</span>
          </div>
          <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right mt-0.5">
            あと {yen(remaining)} でゴール
          </p>
        </div>
      </div>

      {/* Alerts */}
      {myAlerts.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-2">いま気になること</p>
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
        </div>
      )}

      {/* Action items - big tap targets */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">やること</p>
        <div className="space-y-2">
          {[
            { href: "/stock", label: "仕入れをチェック", sub: "2件、まだ確認してない", color: "bg-amber-50 border-amber-200" },
            { href: "/shift", label: "来週のシフトを決める", sub: "金曜ディナー 1人たりない", color: "bg-blue-50 border-blue-200" },
            { href: "/menu", label: "メニューを見直す", sub: "出てないやつが2つある", color: "bg-purple-50 border-purple-200" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`${item.color} border rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform`}>
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

      {/* Simple stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-slate-400">材料費</p>
          <p className={`text-xl kpi-value ${store.costRate > store.costRateTarget ? "text-red-500" : "text-emerald-600"}`}>
            {store.costRate}%
          </p>
          <p className="text-[10px] text-slate-400">
            {store.costRate > store.costRateTarget ? `目標${store.costRateTarget}%よりちょっと高い` : "いい感じ"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-slate-400">もったいない</p>
          <p className={`text-xl kpi-value ${store.wasteReduction >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {store.wasteReduction >= 0 ? "↓" : "↑"}
          </p>
          <p className="text-[10px] text-slate-400">
            {store.wasteReduction >= 0 ? `先月より${yen(store.wasteReduction)}へった` : "ちょっとふえてる"}
          </p>
        </div>
      </div>

      {/* LINE */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-1">朝LINEでとどくよ</p>
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
          <button className="mt-2 w-full bg-slate-800 text-white rounded-lg py-2.5 text-sm font-medium active:bg-slate-700">
            仕入れをみる →
          </button>
        </Link>
      </div>
    </div>
  );
}
