"use client";

import { useState } from "react";
import { dailySales, menuItems, monthlySummary } from "@/lib/mock-data";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

type SortKey = "orders" | "sales" | "margin";

export default function SalesPage() {
  const [sortBy, setSortBy] = useState<SortKey>("orders");
  const [period, setPeriod] = useState<"week" | "month">("week");

  const sorted = [...menuItems].sort((a, b) => {
    if (sortBy === "orders") return b.today_orders - a.today_orders;
    if (sortBy === "sales") return (b.price * b.today_orders) - (a.price * a.today_orders);
    return ((b.price - b.cost) / b.price) - ((a.price - a.cost) / a.price);
  });

  const displaySales = period === "week" ? dailySales.slice(0, 7) : dailySales;
  const maxSales = Math.max(...displaySales.filter(d => !d.isClosed).map(d => d.sales));

  return (
    <div className="px-4 pt-4 space-y-5">
      <h1 className="text-lg font-bold text-gray-900">売上分析</h1>

      {/* Monthly summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">4月の実績</span>
          <span className="text-xs text-gray-400">確定値</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-400">売上</div>
            <div className="kpi-value text-lg text-gray-900">¥{(monthlySummary.sales / 10000).toFixed(0)}万</div>
            <div className={`text-[11px] font-medium ${monthlySummary.sales > monthlySummary.sales_prev ? "text-emerald-600" : "text-red-500"}`}>
              前月比+{((monthlySummary.sales - monthlySummary.sales_prev) / monthlySummary.sales_prev * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">客数</div>
            <div className="kpi-value text-lg text-gray-900">{monthlySummary.customers}人</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">営業利益(推定)</div>
            <div className="kpi-value text-lg text-emerald-600">¥{(monthlySummary.profit_estimate / 10000).toFixed(0)}万</div>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">日別売上</span>
          <div className="flex gap-1">
            {(["week", "month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  period === p ? "bg-blue-100 text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                {p === "week" ? "1週間" : "1ヶ月"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-[120px]">
          {displaySales.map((d, i) => {
            const pct = d.isClosed ? 0 : (d.sales / maxSales) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                {!d.isClosed && (
                  <span className="text-[8px] text-gray-400 kpi-value">{(d.sales / 10000).toFixed(0)}</span>
                )}
                <div
                  className={`w-full rounded-t ${d.isClosed ? "bg-gray-100" : d.dow === "土" || d.dow === "金" ? "bg-blue-400" : "bg-blue-200"}`}
                  style={{ height: `${Math.max(2, pct)}%` }}
                />
                <span className={`text-[8px] ${d.isClosed ? "text-red-300" : "text-gray-400"}`}>
                  {period === "week" ? d.dow : d.date.split("/")[1]}
                </span>
              </div>
            );
          })}
        </div>
        {period === "week" && (
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400 inline-block" />金土</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-200 inline-block" />平日</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-100 inline-block" />定休</span>
          </div>
        )}
      </div>

      {/* Menu ranking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">メニュー別</span>
          <div className="flex gap-1">
            {([["orders","注文数"],["sales","売上"],["margin","利益率"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key as SortKey)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  sortBy === key ? "bg-blue-100 text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {sorted.slice(0, 10).map((menu, i) => {
            const revenue = menu.price * menu.today_orders;
            const margin = ((menu.price - menu.cost) / menu.price * 100).toFixed(0);
            const trendIcon = menu.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> :
              menu.trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5 text-red-400" /> : null;
            return (
              <div key={menu.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-gray-300 w-5 text-right kpi-value">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-800 font-medium truncate">{menu.name}</span>
                    {trendIcon}
                  </div>
                  <span className="text-xs text-gray-400">{menu.category} · ¥{menu.price}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-gray-700 kpi-value">{menu.today_orders}食</div>
                  <div className="text-[11px] text-gray-400">¥{(revenue).toLocaleString()} · {margin}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
