"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { stores, storeWeeklySales, chain } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("ja-JP");
const fmtYen = (n: number) => `¥${fmt(n)}`;

type SortKey = "name" | "daily_sales" | "daily_customers" | "avg_ticket" | "food_cost_pct" | "labor_cost_pct" | "waste_pct" | "staff_coverage";

const trendIcon = {
  up: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
  down: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,
  flat: <Minus className="w-3.5 h-3.5 text-white/30" />,
};

const columns: { key: SortKey; label: string; sublabel: string }[] = [
  { key: "name", label: "店舗名", sublabel: "Store" },
  { key: "daily_sales", label: "日次売上", sublabel: "" },
  { key: "daily_customers", label: "客数", sublabel: "Customers" },
  { key: "avg_ticket", label: "客単価", sublabel: "Ticket" },
  { key: "food_cost_pct", label: "原価率", sublabel: "" },
  { key: "labor_cost_pct", label: "人件費率", sublabel: "Labor" },
  { key: "waste_pct", label: "廃棄率", sublabel: "Waste" },
  { key: "staff_coverage", label: "充足率", sublabel: "Coverage" },
];

export default function ComparePage() {
  const [sortKey, setSortKey] = useState<SortKey>("daily_sales");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...stores].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const maxBarSales = Math.max(...storeWeeklySales.flatMap(s => s.days.map(d => d.sales)));

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="店舗比較" subtitle="全店横断比較" storeCount={chain.store_count} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Comparison table */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3.5 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <div>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">{col.label}</div>
                        <div className="text-[11px] text-white/25">{col.sublabel}</div>
                      </div>
                      {sortKey === col.key && (
                        sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-orange-400" /> : <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">トレンド</div>
                  <div className="text-[11px] text-white/25">Trend</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(store => (
                <tr
                  key={store.id}
                  onClick={() => setSelectedStore(selectedStore === store.id ? null : store.id)}
                  className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                    selectedStore === store.id ? "bg-orange-400/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="text-[14px] font-bold text-white/90">{store.name}</div>
                    <div className="text-[11px] text-white/30 mt-0.5">{store.area} · {store.seats}席</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="kpi-value text-[18px] text-white/90">{fmtYen(store.daily_sales)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="kpi-value text-[18px] text-white/90">{store.daily_customers}<span className="text-[13px] text-white/40 ml-0.5">人</span></span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="kpi-value text-[18px] text-white/90">{fmtYen(store.avg_ticket)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`kpi-value text-[18px] ${store.food_cost_pct > 32 ? "text-red-400" : store.food_cost_pct > 31 ? "text-amber-400" : "text-emerald-400"}`}>{store.food_cost_pct}%</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`kpi-value text-[18px] ${store.labor_cost_pct > 30 ? "text-red-400" : store.labor_cost_pct > 29 ? "text-amber-400" : "text-white/70"}`}>{store.labor_cost_pct}%</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`kpi-value text-[18px] ${store.waste_pct > 3.5 ? "text-red-400" : store.waste_pct > 3 ? "text-amber-400" : "text-emerald-400"}`}>{store.waste_pct}%</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`kpi-value text-[18px] ${store.staff_coverage < 0.85 ? "text-red-400" : store.staff_coverage < 0.9 ? "text-amber-400" : "text-emerald-400"}`}>{Math.round(store.staff_coverage * 100)}%</span>
                  </td>
                  <td className="px-5 py-4">{trendIcon[store.trend]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weekly bar chart per store */}
        <div>
          <div className="section-title mb-3">週間売上推移 WEEKLY SALES</div>
          <div className="grid grid-cols-5 gap-4">
            {storeWeeklySales.map(ws => {
              const store = stores.find(s => s.id === ws.store_id);
              return (
                <div
                  key={ws.store_id}
                  onClick={() => setSelectedStore(selectedStore === ws.store_id ? null : ws.store_id)}
                  className={`rounded-xl border bg-[#0f1419] p-5 cursor-pointer transition-all tap-scale ${
                    selectedStore === ws.store_id ? "border-orange-400/40" : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="text-[13px] font-bold text-white/80 mb-1">{ws.store_name}</div>
                  <div className="text-[11px] text-white/30 mb-4">{store?.area}</div>

                  <div className="flex items-end gap-1.5 h-24">
                    {ws.days.map((day, i) => {
                      const height = day.isClosed ? 0 : (day.sales / maxBarSales) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-sm transition-all ${
                              day.isClosed ? "bg-white/[0.04]" : selectedStore === ws.store_id ? "bg-orange-400/60" : "bg-orange-400/30"
                            }`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={day.isClosed ? "定休日" : `${fmtYen(day.sales)}`}
                          />
                          <span className={`text-[11px] ${day.isClosed ? "text-white/15" : "text-white/30"}`}>{day.dow}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-white/40">
                    週合計 <span className="kpi-value text-[13px] text-white/70 ml-1">{fmtYen(ws.days.reduce((s, d) => s + d.sales, 0))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
