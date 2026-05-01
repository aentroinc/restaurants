"use client";

import { ContextHeader } from "@/components/context-header";
import { demandForecast } from "@/lib/mock-data";
import { TrendingUp, Shield, Info } from "lucide-react";

const highThreshold = 400;

export default function DemandPage() {
  const { next_week, confidence, notes } = demandForecast;
  const maxTotal = Math.max(...next_week.map((d) => d.total));

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="需要予測" subtitle="来週の客数予測（店舗タイプ別）" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
                週間合計予測
              </span>
            </div>
            <div className="kpi-value text-[28px] text-white/90">
              {next_week.reduce((s, d) => s + d.total, 0).toLocaleString("ja-JP")}
              <span className="text-[14px] text-white/40 font-normal ml-1">人</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
                信頼度
              </span>
            </div>
            <div className="kpi-value text-[28px] text-emerald-400">{confidence}</div>
            <div className="text-[11px] text-white/30 mt-1">モデル精度 94.2%</div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold tracking-[0.08em] text-amber-400/60 uppercase">
                備考
              </span>
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed">{notes}</p>
          </div>
        </div>

        {/* Demand Forecast Table */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="section-title">曜日 x 店舗タイプ別 来客予測（1店舗あたり）</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["曜日", "駅前", "ロードサイド", "商業施設", "合計", "需要レベル"].map((h) => (
                  <th
                    key={h}
                    className="text-[11px] font-bold tracking-[0.06em] text-white/30 uppercase px-6 py-3 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {next_week.map((day) => {
                const isHigh = day.total >= highThreshold;
                const isPeak = day.total === maxTotal;
                return (
                  <tr
                    key={day.dow}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      isPeak ? "bg-emerald-400/[0.03]" : ""
                    }`}
                  >
                    <td className={`px-6 py-4 text-[14px] font-semibold ${
                      day.dow === "土" || day.dow === "日" ? "text-emerald-400" : "text-white/80"
                    }`}>
                      {day.dow}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-mono text-white/70">{day.station}</td>
                    <td className="px-6 py-4 text-[14px] font-mono text-white/70">{day.roadside}</td>
                    <td className="px-6 py-4 text-[14px] font-mono text-white/70">{day.mall}</td>
                    <td className={`px-6 py-4 text-[14px] font-mono font-semibold ${
                      isPeak ? "text-emerald-400" : "text-white/80"
                    }`}>
                      {day.total}
                    </td>
                    <td className="px-6 py-4">
                      {isPeak ? (
                        <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                          ピーク
                        </span>
                      ) : isHigh ? (
                        <span className="text-[11px] px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 font-medium">
                          高需要
                        </span>
                      ) : (
                        <span className="text-[11px] px-2.5 py-1 rounded bg-white/[0.06] text-white/30">
                          通常
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual bar chart */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5">
          <h3 className="section-title mb-4">日別合計予測</h3>
          <div className="flex items-end gap-4 h-40">
            {next_week.map((day) => {
              const height = (day.total / maxTotal) * 100;
              const isPeak = day.total === maxTotal;
              return (
                <div key={day.dow} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-[12px] font-mono text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.total}
                  </div>
                  <div className="w-full relative" style={{ height: "120px" }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${
                        isPeak
                          ? "bg-emerald-400/60"
                          : day.total >= highThreshold
                          ? "bg-amber-400/40"
                          : "bg-white/10 group-hover:bg-white/20"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={`text-[13px] font-medium ${
                    day.dow === "土" || day.dow === "日" ? "text-emerald-400/60" : "text-white/30"
                  }`}>
                    {day.dow}
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
