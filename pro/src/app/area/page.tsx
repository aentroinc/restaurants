"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { areas, stores } from "@/lib/mock-data";
import {
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, AlertTriangle, User,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("ja-JP");
const pct = (cur: number, prev: number) => {
  const v = ((cur - prev) / prev) * 100;
  return { value: v, label: (v >= 0 ? "+" : "") + v.toFixed(1) + "%" };
};

const trendIcon = (t: "up" | "flat" | "down") => {
  if (t === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (t === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
};

export default function AreaPage() {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="エリアビュー" subtitle="3エリア・28店舗" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {areas.map((area) => {
          const expanded = expandedArea === area.id;
          const areaStores = stores.filter((s) => s.area_id === area.id);
          const change = pct(area.monthly_sales, area.monthly_prev);

          return (
            <div
              key={area.id}
              className="rounded-lg border border-white/[0.06] bg-[#0f1419] overflow-hidden"
            >
              {/* Area Header */}
              <button
                onClick={() => setExpandedArea(expanded ? null : area.id)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <div>
                    <div className="text-[15px] font-semibold text-white/90">{area.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {area.manager}
                      </span>
                      <span>{area.store_count}店舗</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-[11px] text-white/30 mb-1">月間売上</div>
                    <div className="kpi-value text-[20px] text-white/90">¥{fmt(area.monthly_sales)}</div>
                    <div className={`text-[12px] mt-0.5 ${change.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {change.label} 前月比
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/30 mb-1">原価率</div>
                    <div className={`kpi-value text-[18px] ${area.avg_food_cost > 32 ? "text-red-400" : "text-white/80"}`}>
                      {area.avg_food_cost}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/30 mb-1">人件費率</div>
                    <div className="kpi-value text-[18px] text-white/80">{area.avg_labor_cost}%</div>
                  </div>
                  {area.alert_count > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[12px] text-amber-400 font-medium">{area.alert_count}</span>
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded Store List */}
              {expanded && (
                <div className="border-t border-white/[0.06] animate-slide-down">
                  {/* Monthly trend mini bars */}
                  <div className="px-6 py-4 border-b border-white/[0.04] bg-white/[0.01]">
                    <div className="text-[11px] font-bold tracking-[0.08em] text-white/30 uppercase mb-3">
                      月間売上推移（直近6ヶ月）
                    </div>
                    <div className="flex items-end gap-2 h-16">
                      {[0.82, 0.88, 0.91, 0.85, 0.95, 1.0].map((ratio, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-sm ${i === 5 ? "bg-emerald-400/60" : "bg-white/10"}`}
                            style={{ height: `${ratio * 100}%` }}
                          />
                          <span className="text-[11px] text-white/20">
                            {["11月", "12月", "1月", "2月", "3月", "4月"][i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Store table */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["店舗名", "タイプ", "席数", "日商", "客数", "客単価", "原価率", "人件費率", "トレンド"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-[12px] font-bold tracking-[0.06em] text-white/25 uppercase px-4 py-2.5 text-left"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {areaStores.map((store) => (
                        <tr
                          key={store.id}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2.5 text-[13px] text-white/80 font-medium">{store.name}</td>
                          <td className="px-4 py-2.5 text-[12px] text-white/40">{store.type}</td>
                          <td className="px-4 py-2.5 text-[12px] font-mono text-white/40">{store.seats}</td>
                          <td className="px-4 py-2.5 text-[13px] font-mono text-white/80">¥{fmt(store.daily_sales)}</td>
                          <td className="px-4 py-2.5 text-[12px] font-mono text-white/50">{store.customers}</td>
                          <td className="px-4 py-2.5 text-[12px] font-mono text-white/50">¥{fmt(store.avg_ticket)}</td>
                          <td className="px-4 py-2.5 text-[12px] font-mono">
                            <span className={store.food_cost_pct > 32 ? "text-red-400" : store.food_cost_pct > 31 ? "text-amber-400" : "text-white/50"}>
                              {store.food_cost_pct}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] font-mono">
                            <span className={store.labor_cost_pct > 30 ? "text-amber-400" : "text-white/50"}>
                              {store.labor_cost_pct}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{trendIcon(store.trend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
