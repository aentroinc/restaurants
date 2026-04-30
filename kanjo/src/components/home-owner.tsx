"use client";

import { useState } from "react";
import { company, areaData, monthlyPL, ebitdaImpact, storeIssues, stores, customerData, reviewData, promotionData } from "@/lib/mock-data";
import { Expandable, TabSwitcher } from "@/components/expandable";
import { LiveTicker, AnimatedNumber, LiveDot } from "@/components/live-sales";
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
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Live ticker */}
      <LiveTicker items={[
        { label: "全社売上", value: yen(totalToday), change: `+${Math.round(((totalToday - totalTarget * 0.85) / (totalTarget * 0.85)) * 100)}%`, positive: true },
        { label: "EBITDA", value: oku(monthlyPL.ebitda), change: `+${ebitdaGrowth}%`, positive: true },
        { label: "AI改善効果", value: `+${man(ebitdaImpact.totalImprovement)}`, change: `ROI ${ebitdaImpact.roi.roiMultiple}x`, positive: true },
        { label: "食材ロス", value: `▼${man(Math.abs(areaData.reduce((s, a) => s + a.wasteChange, 0)))}`, positive: true },
      ]} />

      {/* Today's sales with live dot */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="section-title">本日実績 / 全{company.totalStores}店舗</p>
          <LiveDot />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl kpi-value"><AnimatedNumber value={totalToday} prefix="¥" /></p>
          </div>
          <div className="text-right">
            <p className="text-sm kpi-value text-emerald-600">
              <AnimatedNumber value={pctTarget} suffix="%" />
            </p>
            <p className="text-[10px] text-slate-400">目標達成</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-800 rounded-full transition-all duration-1000" style={{ width: `${Math.min(pctTarget, 100)}%` }} />
        </div>
      </div>

      {/* EBITDA Impact - THE HERO CARD */}
      <div className="bg-slate-900 rounded-xl p-4 text-white">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-3">AI IMPACT ON EBITDA</p>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] text-slate-400">月間EBITDA改善額</p>
            <p className="text-3xl kpi-value text-emerald-400 mt-1">
              +<AnimatedNumber value={ebitdaImpact.totalImprovement} />円
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[9px] text-emerald-300">ROI</p>
            <p className="text-lg kpi-value text-emerald-400">{ebitdaImpact.roi.roiMultiple}x</p>
          </div>
        </div>

        <TabSwitcher tabs={[
          {
            label: "改善内訳",
            content: (
              <div className="space-y-2.5">
                {ebitdaImpact.breakdown.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="kpi-value text-emerald-400">+{man(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            label: "EBITDA推移",
            content: (
              <div>
                <div className="flex items-end gap-1.5 h-20">
                  {ebitdaImpact.monthlyTrend.map((m) => {
                    const maxE = Math.max(...ebitdaImpact.monthlyTrend.map((t) => t.ebitda));
                    const totalH = (m.ebitda / maxE) * 100;
                    const aiH = m.aiContribution > 0 ? (m.aiContribution / maxE) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex flex-col justify-end" style={{ height: "64px" }}>
                          <div className="bg-slate-600 rounded-t" style={{ height: `${totalH * 0.64}px` }}>
                            {aiH > 0 && <div className="bg-emerald-500 rounded-t w-full" style={{ height: `${aiH * 0.64}px` }} />}
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500">{m.month.replace("月", "")}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-600 rounded-sm" />EBITDA</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" />AI寄与</span>
                </div>
              </div>
            ),
          },
          {
            label: "コスト",
            content: (
              <div>
                <p className="text-[10px] text-slate-400 mb-2">月額 {man(ebitdaImpact.roi.monthlyCost)}円 → 改善 {man(ebitdaImpact.roi.monthlyReturn)}円</p>
                <div className="h-3 flex rounded overflow-hidden">
                  <div className="bg-slate-600 flex items-center justify-center text-[8px] text-slate-300" style={{ width: "6%" }}>費用</div>
                  <div className="bg-emerald-500 flex-1 flex items-center justify-center text-[8px] text-white">改善効果</div>
                </div>
                <p className="text-[10px] text-emerald-400 mt-2 kpi-value">投資対効果: {ebitdaImpact.roi.roiMultiple}倍</p>
              </div>
            ),
          },
        ]} />
      </div>

      {/* P/L Summary - expandable */}
      <Expandable title="4月度 損益概要" defaultOpen>
        <TabSwitcher tabs={[
          {
            label: "サマリー",
            content: (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "売上高", val: oku(monthlyPL.sales), sub: `+${salesGrowth}% YoY` },
                  { label: "EBITDA", val: oku(monthlyPL.ebitda), sub: `+${ebitdaGrowth}% YoY` },
                  { label: "マージン", val: `${ebitdaMargin}%`, sub: null },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[9px] text-slate-400 tracking-wider">{k.label}</p>
                    <p className="text-sm kpi-value mt-0.5">{k.val}</p>
                    {k.sub && <p className="text-[9px] text-emerald-600">{k.sub}</p>}
                  </div>
                ))}
              </div>
            ),
          },
          {
            label: "コスト構成",
            content: (
              <div>
                <div className="h-5 flex rounded-md overflow-hidden text-[8px] text-white font-medium mb-3">
                  <div className="bg-red-400 flex items-center justify-center" style={{ width: `${(monthlyPL.costOfGoods / monthlyPL.sales * 100).toFixed(0)}%` }}>原価</div>
                  <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${(monthlyPL.laborCost / monthlyPL.sales * 100).toFixed(0)}%` }}>人件費</div>
                  <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${ebitdaMargin}%` }}>EBITDA</div>
                  <div className="bg-slate-300 flex-1" />
                </div>
                {[
                  { label: "原材料費", value: monthlyPL.costOfGoods, target: 30 },
                  { label: "人件費", value: monthlyPL.laborCost, target: 28 },
                  { label: "賃料", value: monthlyPL.rent, target: null },
                  { label: "水道光熱費", value: monthlyPL.utilities, target: null },
                  { label: "減価償却費", value: monthlyPL.depreciation, target: null },
                ].map((item) => {
                  const pct = ((item.value / monthlyPL.sales) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="text-slate-500">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="kpi-value">{man(item.value)}</span>
                        <span className={`text-[10px] px-1 rounded ${
                          item.target ? (Number(pct) > item.target ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600") : "text-slate-400"
                        }`}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]} />
      </Expandable>

      {/* Area Performance - interactive */}
      <Expandable title="エリア別実績" badge={<span className="text-[9px] text-slate-400">{areaData.length}エリア</span>} defaultOpen>
        <div className="space-y-1">
          {areaData.map((area) => {
            const pct = Math.round((area.todaySales / area.target) * 100);
            const costOk = area.costRate <= 30.5;
            const isExpanded = expandedArea === area.id;
            const areaStores = stores.filter((s) => s.area === area.name);

            return (
              <div key={area.id}>
                <button
                  onClick={() => setExpandedArea(isExpanded ? null : area.id)}
                  className="w-full flex items-center gap-2 py-2.5 border-b border-slate-50 tap-scale"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{area.name}</span>
                      <span className="text-xs kpi-value">{yen(area.todaySales)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                      <span className="text-slate-400">{area.stores}店</span>
                      <span className={pct >= 85 ? "text-emerald-600" : pct >= 70 ? "text-amber-500" : "text-red-500"}>{pct}%</span>
                      <span className={costOk ? "text-emerald-600" : "text-red-500"}>原価{area.costRate}%</span>
                      <span className={area.wasteChange <= 0 ? "text-emerald-600" : "text-red-500"}>
                        ロス{area.wasteChange <= 0 ? "▼" : "▲"}
                      </span>
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isExpanded && areaStores.length > 0 && (
                  <div className="pl-3 py-2 animate-slide-down border-l-2 border-slate-100 ml-1 mb-2">
                    {areaStores.map((s) => {
                      const sp = Math.round((s.todaySales / s.targetSales) * 100);
                      return (
                        <div key={s.id} className="flex items-center justify-between py-1.5 text-[11px]">
                          <span className="text-slate-600">{s.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="kpi-value">{yen(s.todaySales)}</span>
                            <span className={`w-8 text-right ${sp >= 85 ? "text-emerald-600" : sp >= 70 ? "text-amber-500" : "text-red-500"}`}>{sp}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Expandable>

      {/* Issues */}
      {dangerIssues.length > 0 && (
        <Expandable
          title="要対応"
          badge={<span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">{dangerIssues.length}</span>}
          defaultOpen
        >
          <div className="space-y-2">
            {dangerIssues.map((issue, i) => (
              <div key={i} className="bg-red-50 rounded-lg p-2.5 border-l-2 border-red-400">
                <p className="text-xs font-medium">{issue.store}</p>
                <p className="text-[11px] text-slate-500">{issue.message}</p>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/report">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">MONTHLY P/L</p>
            <p className="text-xs font-medium mt-0.5">損益の詳細 →</p>
          </div>
        </Link>
        <Link href="/ai-impact">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">AI IMPACT</p>
            <p className="text-xs font-medium mt-0.5">改善レポート →</p>
          </div>
        </Link>
        <Link href="/customers">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">CUSTOMERS</p>
            <p className="text-xs font-medium mt-0.5">リピート率 {customerData.repeatRate}% →</p>
          </div>
        </Link>
        <Link href="/delivery">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">CHANNEL MIX</p>
            <p className="text-xs font-medium mt-0.5">デリバリー収益 →</p>
          </div>
        </Link>
        <Link href="/reviews">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">REPUTATION</p>
            <p className="text-xs font-medium mt-0.5">評価 {reviewData.avgRating} ★ →</p>
          </div>
        </Link>
        <Link href="/promotions">
          <div className="bg-white rounded-xl p-3 shadow-sm tap-scale">
            <p className="text-[10px] text-slate-400">PROMOTIONS</p>
            <p className="text-xs font-medium mt-0.5">実施中 {promotionData.activeCampaigns.length}件 →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
