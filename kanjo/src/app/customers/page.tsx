"use client";

import { customerData } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { Expandable, TabSwitcher } from "@/components/expandable";
import { AnimatedNumber } from "@/components/live-sales";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export default function CustomersPage() {
  const { role } = useRole();
  const d = customerData;
  const isOwner = role === "owner";
  const isManager = role === "manager";

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">CUSTOMER ANALYTICS</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">
          {isManager ? "お客さんのようす" : "顧客・リピート分析"}
        </h1>
        <p className="text-xs text-slate-400">4月度 / {isManager ? "渋谷センター街店" : "全48店舗"}</p>
      </div>

      {/* Hero metrics */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-400">{isManager ? "今月のお客さん" : "月間来客数"}</p>
            <p className="text-2xl kpi-value"><AnimatedNumber value={isManager ? 4480 : d.totalMonthly} /></p>
            <p className="text-[10px] text-slate-400">名</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">{isManager ? "また来てくれた人" : "リピート率"}</p>
            <p className="text-2xl kpi-value text-emerald-600">{isManager ? "78.5" : d.repeatRate}%</p>
            <p className="text-[10px] text-emerald-600">前月比 +{(d.repeatRate - d.repeatRateLastMonth).toFixed(1)}pt</p>
          </div>
        </div>
      </div>

      {isManager ? (
        <>
          {/* Manager: simple view */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">どんなお客さんが来てる?</p>
            {d.segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <p className="text-xs font-medium">{seg.label}</p>
                  <p className="text-[10px] text-slate-400">1回あたり {yen(seg.avgSpend)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-slate-700 h-full rounded-full" style={{ width: `${seg.pct}%` }} />
                  </div>
                  <span className="text-xs kpi-value w-8 text-right">{seg.pct}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800">ヒント</p>
            <p className="text-xs text-amber-700 mt-0.5">ヘビーユーザーは客単価が高い。「いつもありがとう」の声かけで常連になってもらおう</p>
          </div>
        </>
      ) : (
        <>
          {/* Owner/Area: detailed */}
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <p className="text-[10px] tracking-[0.15em] text-slate-400 uppercase font-medium mb-2">CUSTOMER LTV</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400">{isOwner ? "全社平均LTV" : "エリア平均LTV"}</p>
                <p className="text-3xl kpi-value text-emerald-400">{yen(d.ltvAvg)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">平均来店回数</p>
                <p className="text-lg kpi-value text-white">{d.avgVisitsPerRepeater}回/月</p>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-12 mt-3">
              {d.ltvTrend.map((m) => {
                const maxL = Math.max(...d.ltvTrend.map((t) => t.ltv));
                const h = (m.ltv / maxL) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full bg-slate-700 rounded-t" style={{ height: `${h * 0.4}px` }}>
                      <div className="bg-emerald-500 rounded-t w-full" style={{ height: `${h * 0.15}px` }} />
                    </div>
                    <span className="text-[8px] text-slate-500">{m.month.replace("月", "")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Expandable title="セグメント分析" defaultOpen>
            <div className="space-y-2">
              {d.segments.map((seg) => (
                <div key={seg.label} className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">{seg.label}</span>
                    <span className="text-xs kpi-value">{seg.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                    <div className="bg-slate-700 h-full rounded-full" style={{ width: `${seg.pct * 2.5}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{seg.count.toLocaleString()}名</span>
                    <span>客単価 {yen(seg.avgSpend)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Expandable>

          <Expandable title="店舗別リピート率" defaultOpen={false}>
            <div className="space-y-1.5">
              {d.storeRepeatRanking.map((s, i) => (
                <div key={s.store} className="flex items-center gap-2">
                  <span className={`text-[10px] kpi-value w-4 ${i < 3 ? "text-amber-500" : "text-slate-300"}`}>{i + 1}</span>
                  <span className="text-xs flex-1 truncate">{s.store}</span>
                  <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${s.rate >= 80 ? "bg-emerald-500" : s.rate >= 75 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${(s.rate / 100) * 100}%` }} />
                  </div>
                  <span className={`text-[11px] kpi-value w-10 text-right ${s.rate >= 80 ? "text-emerald-600" : s.rate >= 75 ? "text-amber-500" : "text-red-500"}`}>
                    {s.rate}%
                  </span>
                </div>
              ))}
            </div>
          </Expandable>
        </>
      )}
    </div>
  );
}
