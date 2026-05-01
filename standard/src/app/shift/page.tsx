"use client";

import { ContextHeader } from "@/components/context-header";
import { stores, chain } from "@/lib/mock-data";
import { Users, CalendarDays, AlertTriangle, CheckCircle } from "lucide-react";

export default function ShiftPage() {
  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="シフト管理" subtitle="Shift Management" storeCount={chain.store_count} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info banner */}
        <div className="rounded-xl border border-orange-400/20 bg-orange-400/[0.04] p-5 flex items-start gap-4">
          <CalendarDays className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[14px] font-bold text-white/90">シフト管理は全店舗共通で運用されています</div>
            <div className="text-[12px] text-white/50 mt-1 leading-relaxed">
              各店舗の人員充足率をリアルタイムで監視し、不足が検知された場合はAIアラートに自動通知されます。
              近隣店舗間でのヘルプ調整もこの画面から行えます。
            </div>
          </div>
        </div>

        {/* Staff coverage cards */}
        <div>
          <div className="section-title mb-3">店舗別充足率 STAFF COVERAGE</div>
          <div className="grid grid-cols-5 gap-4">
            {stores.map(store => {
              const pct = Math.round(store.staff_coverage * 100);
              const isLow = pct < 85;
              const isWarn = pct >= 85 && pct < 92;
              const isGood = pct >= 92;

              return (
                <div
                  key={store.id}
                  className={`rounded-xl border bg-[#0f1419] p-5 transition-all tap-scale cursor-pointer hover:border-orange-400/20 ${
                    isLow ? "border-red-500/20" : isWarn ? "border-amber-500/15" : "border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[14px] font-bold text-white/90">{store.name}</div>
                      <div className="text-[11px] text-white/30 mt-0.5">{store.area}</div>
                    </div>
                    {isLow ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : isGood ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Users className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  {/* Circular progress indicator */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke={isLow ? "#f87171" : isWarn ? "#fbbf24" : "#34d399"}
                          strokeWidth="8"
                          strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`kpi-value text-[24px] ${isLow ? "text-red-400" : isWarn ? "text-amber-400" : "text-emerald-400"}`}>{pct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[11px] text-white/40">
                    {store.seats}席 · {store.area}
                  </div>

                  {store.issues.filter(i => i.includes("不足") || i.includes("ホール")).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                      {store.issues.filter(i => i.includes("不足") || i.includes("ホール") || i.includes("人員")).map((issue, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly coverage summary */}
        <div>
          <div className="section-title mb-3">曜日別充足状況 WEEKLY PATTERN</div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="grid grid-cols-7 gap-3">
              {["月", "火", "水", "木", "金", "土", "日"].map((dow, i) => {
                const isClosed = dow === "月";
                const isWeekend = dow === "金" || dow === "土" || dow === "日";
                const coverage = isClosed ? 0 : isWeekend ? 85 : 94;
                return (
                  <div key={dow} className={`rounded-lg border p-4 text-center ${
                    isClosed ? "border-white/[0.04] bg-white/[0.01]" :
                    coverage < 90 ? "border-amber-500/15 bg-amber-500/[0.04]" :
                    "border-white/[0.06] bg-white/[0.02]"
                  }`}>
                    <div className="text-[13px] font-bold text-white/50">{dow}</div>
                    {isClosed ? (
                      <div className="text-[11px] text-white/20 mt-2">定休日</div>
                    ) : (
                      <>
                        <div className={`kpi-value text-[22px] mt-2 ${coverage < 90 ? "text-amber-400" : "text-white/70"}`}>{coverage}%</div>
                        <div className="text-[10px] text-white/30 mt-1">{isWeekend ? "要注意" : "適正"}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
