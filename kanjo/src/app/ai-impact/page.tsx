"use client";

import { ebitdaImpact, monthlyPL } from "@/lib/mock-data";
import { AnimatedNumber, LiveDot } from "@/components/live-sales";
import { Expandable, TabSwitcher } from "@/components/expandable";

function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }
function oku(n: number) { return `${(n / 100000000).toFixed(2)}億`; }

export default function AIImpactPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">AI IMPACT ANALYSIS</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">AI導入効果レポート</h1>
        <p className="text-xs text-slate-400">2026年4月度 累計</p>
      </div>

      {/* Hero */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <LiveDot />
          <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase">EBITDA IMPROVEMENT</p>
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] text-slate-400">月間改善額</p>
            <p className="text-4xl kpi-value text-emerald-400">
              +<AnimatedNumber value={ebitdaImpact.totalImprovement} />
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              年間換算: +{oku(ebitdaImpact.totalImprovement * 12)}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-[9px] text-emerald-300 tracking-wider">ROI</p>
            <p className="text-2xl kpi-value text-emerald-400">{ebitdaImpact.roi.roiMultiple}x</p>
          </div>
        </div>

        {/* Cost vs Return */}
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-400">月額利用料</span>
            <span className="kpi-value text-slate-300">{man(ebitdaImpact.roi.monthlyCost)}円</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-400">月間改善効果</span>
            <span className="kpi-value text-emerald-400">+{man(ebitdaImpact.roi.monthlyReturn)}円</span>
          </div>
          <div className="h-px bg-slate-700 my-2" />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">ネット効果</span>
            <span className="kpi-value text-emerald-400">+{man(ebitdaImpact.roi.monthlyReturn - ebitdaImpact.roi.monthlyCost)}円/月</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">改善効果の内訳</p>
        <div className="space-y-3">
          {ebitdaImpact.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="kpi-value text-emerald-600">+{man(item.amount)}</span>
                  <span className="text-[10px] text-slate-400">{item.pct}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend */}
      <Expandable title="EBITDA月次推移" defaultOpen>
        <TabSwitcher tabs={[
          {
            label: "チャート",
            content: (
              <div>
                <div className="flex items-end gap-2 h-24">
                  {ebitdaImpact.monthlyTrend.map((m) => {
                    const maxE = Math.max(...ebitdaImpact.monthlyTrend.map((t) => t.ebitda));
                    const totalH = (m.ebitda / maxE) * 100;
                    const aiH = m.aiContribution > 0 ? (m.aiContribution / maxE) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] kpi-value text-slate-400">{man(m.ebitda)}</span>
                        <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                          <div className="bg-slate-200 rounded-t" style={{ height: `${totalH * 0.72}px` }}>
                            {aiH > 0 && <div className="bg-emerald-500 rounded-t w-full" style={{ height: `${aiH * 0.72}px` }} />}
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400">{m.month.replace("月", "")}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded" />EBITDA全体</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" />AI寄与分</span>
                </div>
              </div>
            ),
          },
          {
            label: "テーブル",
            content: (
              <div>
                <div className="grid grid-cols-4 text-[10px] text-slate-400 pb-1 border-b border-slate-100 mb-1">
                  <span>月</span><span className="text-right">EBITDA</span><span className="text-right">AI寄与</span><span className="text-right">AI比率</span>
                </div>
                {ebitdaImpact.monthlyTrend.map((m) => {
                  const aiPct = m.ebitda > 0 ? ((m.aiContribution / m.ebitda) * 100).toFixed(1) : "0";
                  return (
                    <div key={m.month} className="grid grid-cols-4 text-[11px] py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">{m.month}</span>
                      <span className="text-right kpi-value">{man(m.ebitda)}</span>
                      <span className="text-right kpi-value text-emerald-600">+{man(m.aiContribution)}</span>
                      <span className="text-right text-slate-400">{aiPct}%</span>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]} />
      </Expandable>

      {/* Per-module detail */}
      {ebitdaImpact.breakdown.map((item) => (
        <Expandable key={item.label} title={item.label} badge={<span className="text-[9px] text-emerald-600 kpi-value">+{man(item.amount)}/月</span>} defaultOpen={false}>
          <div className="text-xs text-slate-500 leading-relaxed">
            {item.label === "食材ロス削減" && "需要予測の精度向上により、仕入れ量の最適化を実現。特に肉類・魚類の廃棄が大幅減少。全48店舗の平均廃棄率を導入前15.2%→現在9.8%に改善。"}
            {item.label === "需要予測による仕入れ最適化" && "天気・曜日・イベント・過去データを組み合わせた予測モデルにより、店舗別・メニュー別の発注量を自動推奨。欠品率を8.5%→2.1%に低減しつつ廃棄も削減。"}
            {item.label === "シフト最適化(人件費削減)" && "時間帯別の需要予測に基づき、必要最小限のシフト配置を提案。アイドルタイムの過剰配置を解消し、人件費率を29.5%→27.8%に改善。"}
            {item.label === "ダイナミックプライシング効果" && "ランチ/アイドル/ディナーの3段階価格設定により、アイドルタイムの集客を+22%改善。全体の客単価は維持しつつ席回転率が向上。"}
            {item.label === "メニュー改廃による粗利改善" && "4象限分析により退場候補メニューを特定・廃止。原価率の高いメニューの価格改定を実施。メニュー粗利率を平均67.2%→69.8%に改善。"}
          </div>
        </Expandable>
      ))}
    </div>
  );
}
