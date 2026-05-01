"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { stores, areas } from "@/lib/mock-data";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("ja-JP");

export default function StorePage() {
  const [selectedId, setSelectedId] = useState(stores[0].id);
  const store = stores.find((s) => s.id === selectedId)!;
  const area = areas.find((a) => a.id === store.area_id)!;
  const areaStores = stores.filter((s) => s.area_id === store.area_id);
  const areaAvgSales = Math.round(areaStores.reduce((s, st) => s + st.daily_sales, 0) / areaStores.length);
  const areaAvgTicket = Math.round(areaStores.reduce((s, st) => s + st.avg_ticket, 0) / areaStores.length);
  const areaAvgFoodCost = Math.round(areaStores.reduce((s, st) => s + st.food_cost_pct, 0) / areaStores.length * 10) / 10;

  // Mock weekly sales data
  const weeklySales = [
    { day: "月", sales: Math.round(store.daily_sales * 0.85) },
    { day: "火", sales: Math.round(store.daily_sales * 0.90) },
    { day: "水", sales: Math.round(store.daily_sales * 0.92) },
    { day: "木", sales: Math.round(store.daily_sales * 0.95) },
    { day: "金", sales: Math.round(store.daily_sales * 1.15) },
    { day: "土", sales: Math.round(store.daily_sales * 1.30) },
    { day: "日", sales: Math.round(store.daily_sales * 1.10) },
  ];
  const maxSales = Math.max(...weeklySales.map((d) => d.sales));

  const trendLabel = store.trend === "up" ? "上昇" : store.trend === "down" ? "下降" : "横ばい";
  const TrendIcon = store.trend === "up" ? TrendingUp : store.trend === "down" ? TrendingDown : Minus;
  const trendColor = store.trend === "up" ? "text-emerald-400" : store.trend === "down" ? "text-red-400" : "text-white/40";

  const diffSales = store.daily_sales - areaAvgSales;
  const diffPct = ((diffSales / areaAvgSales) * 100).toFixed(1);

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="店舗詳細" subtitle={store.name} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Store selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none bg-[#0f1419] border border-white/[0.08] rounded-lg px-4 py-2.5 pr-10 text-[14px] text-white/80 focus:outline-none focus:border-emerald-400/40 cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0f1419]">
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>
          <span className="text-[12px] text-white/30">
            {area.name} / {area.manager}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "日商", value: `¥${fmt(store.daily_sales)}`, sub: `エリア平均 ¥${fmt(areaAvgSales)}` },
            { label: "客数", value: `${store.customers}人`, sub: `席数 ${store.seats}席` },
            { label: "客単価", value: `¥${fmt(store.avg_ticket)}`, sub: `エリア平均 ¥${fmt(areaAvgTicket)}` },
            { label: "原価率", value: `${store.food_cost_pct}%`, sub: `エリア平均 ${areaAvgFoodCost}%` },
            { label: "人件費率", value: `${store.labor_cost_pct}%`, sub: `トレンド: ${trendLabel}` },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-4 hover:border-white/[0.12] transition-colors cursor-pointer"
            >
              <div className="text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase mb-2">
                {kpi.label}
              </div>
              <div className="kpi-value text-[24px] text-white/90">{kpi.value}</div>
              <div className="text-[11px] text-white/30 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Comparison to area average */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5">
          <h3 className="section-title mb-4">エリア平均との比較</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendIcon className={`w-5 h-5 ${trendColor}`} />
              <span className={`text-[15px] font-semibold ${trendColor}`}>{trendLabel}</span>
            </div>
            <div className="h-8 border-l border-white/[0.06]" />
            <div>
              <span className="text-[13px] text-white/50">日商差: </span>
              <span className={`kpi-value text-[15px] ${diffSales >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {diffSales >= 0 ? "+" : ""}¥{fmt(diffSales)} ({diffSales >= 0 ? "+" : ""}{diffPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Sales Bar Chart */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5">
          <h3 className="section-title mb-4">週間売上</h3>
          <div className="flex items-end gap-3 h-48">
            {weeklySales.map((d) => {
              const height = (d.sales / maxSales) * 100;
              const isMax = d.sales === maxSales;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-[11px] font-mono text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    ¥{fmt(d.sales)}
                  </div>
                  <div className="w-full relative" style={{ height: "160px" }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${
                        isMax ? "bg-emerald-400/60" : "bg-white/10 group-hover:bg-white/20"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={`text-[12px] ${d.day === "土" || d.day === "日" ? "text-emerald-400/60" : "text-white/30"}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
