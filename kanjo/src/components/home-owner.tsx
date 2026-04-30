"use client";

import { company, areaData, monthlyPL, ebitdaImpact, storeIssues, monthlyTrendByArea } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }
function oku(n: number) { return `${(n / 100000000).toFixed(2)}億`; }

export function HomeOwner() {
  const totalToday = areaData.reduce((s, a) => s + a.todaySales, 0);
  const totalTarget = areaData.reduce((s, a) => s + a.target, 0);
  const pctTarget = Math.round((totalToday / totalTarget) * 100);
  const salesGrowth = Math.round(((monthlyPL.sales - monthlyPL.salesLastYear) / monthlyPL.salesLastYear) * 100);
  const ebitdaGrowth = Math.round(((monthlyPL.ebitda - monthlyPL.ebitdaLastYear) / monthlyPL.ebitdaLastYear) * 100);
  const ebitdaMargin = ((monthlyPL.ebitda / monthlyPL.sales) * 100).toFixed(1);
  const dangerIssues = storeIssues.filter((i) => i.severity === "danger");

  return (
    <div className="space-y-5">
      {/* Today's Snapshot */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="section-title mb-3">本日実績 / 全{company.totalStores}店舗</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl kpi-value">{yen(totalToday)}</p>
            <p className="text-xs text-slate-400 mt-1">目標進捗 {pctTarget}%</p>
          </div>
          <div className="text-right">
            <p className="text-lg kpi-value text-emerald-600">+{Math.round(((totalToday - (totalTarget * 0.85)) / (totalTarget * 0.85)) * 100)}%</p>
            <p className="text-[10px] text-slate-400">vs 前日</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-800 rounded-full transition-all" style={{ width: `${Math.min(pctTarget, 100)}%` }} />
        </div>
      </div>

      {/* EBITDA Impact Card - THE KEY METRIC */}
      <div className="bg-slate-900 rounded-xl p-4 text-white">
        <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-3">AI IMPACT ON EBITDA</p>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400">Kanjo導入による月間EBITDA改善</p>
            <p className="text-3xl kpi-value text-emerald-400 mt-1">+{man(ebitdaImpact.totalImprovement)}円</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">ROI</p>
            <p className="text-xl kpi-value text-emerald-400">{ebitdaImpact.roi.roiMultiple}x</p>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2">
          {ebitdaImpact.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300">{item.label}</span>
                <span className="kpi-value text-emerald-400">+{man(item.amount)}</span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* EBITDA Trend */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <p className="text-[11px] text-slate-400 mb-2">EBITDA推移 (AI寄与分)</p>
          <div className="flex items-end gap-1 h-16">
            {ebitdaImpact.monthlyTrend.map((m) => {
              const maxE = Math.max(...ebitdaImpact.monthlyTrend.map((t) => t.ebitda));
              const totalH = (m.ebitda / maxE) * 100;
              const aiH = (m.aiContribution / maxE) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex flex-col justify-end" style={{ height: "48px" }}>
                    <div className="bg-slate-600 rounded-t-sm" style={{ height: `${totalH * 0.48}px` }}>
                      <div className="bg-emerald-500 rounded-t-sm w-full" style={{ height: `${aiH * 0.48}px` }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500">{m.month.replace("月", "")}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-600 rounded-sm" /> EBITDA</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> AI寄与</span>
          </div>
        </div>

        <div className="mt-3 bg-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
          月額利用料 {man(ebitdaImpact.roi.monthlyCost)}円 → 改善効果 {man(ebitdaImpact.roi.monthlyReturn)}円 = <span className="text-emerald-400 font-bold">ROI {ebitdaImpact.roi.roiMultiple}倍</span>
        </div>
      </div>

      {/* Monthly P/L */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <p className="section-title">4月度 損益概要</p>
          <Link href="/report" className="text-[11px] text-slate-400 tracking-wider">詳細 →</Link>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "売上高", value: monthlyPL.sales, growth: salesGrowth },
            { label: "EBITDA", value: monthlyPL.ebitda, growth: ebitdaGrowth },
            { label: "EBITDAマージン", value: null, display: `${ebitdaMargin}%`, growth: null },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 tracking-wider">{item.label}</p>
              <p className="text-base kpi-value mt-0.5">{item.display || oku(item.value!)}</p>
              {item.growth !== null && (
                <p className={`text-[10px] mt-0.5 ${item.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {item.growth >= 0 ? "+" : ""}{item.growth}% YoY
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Cost structure */}
        <div className="h-4 flex rounded-md overflow-hidden text-[9px] text-white font-medium">
          <div className="bg-red-400 flex items-center justify-center" style={{ width: `${(monthlyPL.costOfGoods / monthlyPL.sales * 100).toFixed(0)}%` }}>
            原価{(monthlyPL.costOfGoods / monthlyPL.sales * 100).toFixed(0)}%
          </div>
          <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${(monthlyPL.laborCost / monthlyPL.sales * 100).toFixed(0)}%` }}>
            人件費{(monthlyPL.laborCost / monthlyPL.sales * 100).toFixed(0)}%
          </div>
          <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${ebitdaMargin}%` }}>
            EBITDA
          </div>
          <div className="bg-slate-300 flex-1" />
        </div>
      </div>

      {/* Area Performance */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="section-title mb-3">エリア別実績</p>
        <div className="space-y-2">
          {areaData.map((area) => {
            const pct = Math.round((area.todaySales / area.target) * 100);
            const costOk = area.costRate <= 30.5;
            return (
              <div key={area.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{area.name}</span>
                    <span className="text-sm kpi-value">{yen(area.todaySales)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">{area.stores}店舗</span>
                      <span className={costOk ? "text-emerald-600" : "text-red-500"}>原価{area.costRate}%</span>
                      <span className={area.wasteChange <= 0 ? "text-emerald-600" : "text-red-500"}>
                        ロス{area.wasteChange <= 0 ? "▼" : "▲"}{man(Math.abs(area.wasteChange))}
                      </span>
                    </div>
                    <span className={`text-[10px] kpi-value ${pct >= 85 ? "text-emerald-600" : pct >= 70 ? "text-amber-500" : "text-red-500"}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues */}
      {dangerIssues.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="section-title">要対応</p>
            <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-1.5">{dangerIssues.length}</Badge>
          </div>
          <div className="space-y-2">
            {dangerIssues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-xs font-medium">{issue.store}</p>
                  <p className="text-[11px] text-slate-500">{issue.message}</p>
                </div>
                <span className="text-[10px] text-slate-400">→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Half-year trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="section-title mb-3">半期売上推移</p>
        {monthlyTrendByArea.map((m) => {
          const total = Object.entries(m).filter(([k]) => k !== "month").reduce((s, [, v]) => s + (v as number), 0);
          const maxTotal = 700000000;
          return (
            <div key={m.month} className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 w-7 kpi-value">{m.month.replace("月", "")}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(total / maxTotal) * 100}%` }} />
              </div>
              <span className="text-[10px] kpi-value w-10 text-right">{oku(total)}</span>
            </div>
          );
        })}
      </div>

      {/* CEO LINE */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="section-title mb-3">週次LINE通知サンプル</p>
        <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
{`山本社長、先週の実績です

全48店舗 / 4月4週
売上: ${oku(monthlyPL.sales / 4)} (目標比92%)
EBITDA: ${man(monthlyPL.ebitda / 4)} (マージン${ebitdaMargin}%)

AI効果: +${man(ebitdaImpact.totalImprovement)}円/月
→ ロス削減 +${man(ebitdaImpact.breakdown[0].amount)}
→ 仕入れ最適化 +${man(ebitdaImpact.breakdown[1].amount)}

要注意: 大宮店(原価率32.5%)
好調: 新宿西口店(売上+18%)`}
        </div>
      </div>
    </div>
  );
}
