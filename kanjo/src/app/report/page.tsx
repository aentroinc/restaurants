"use client";

import { areaData, monthlyPL, ebitdaImpact, monthlyTrendByArea } from "@/lib/mock-data";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }
function oku(n: number) { return `${(n / 100000000).toFixed(2)}億`; }

export default function ReportPage() {
  const salesGrowth = Math.round(((monthlyPL.sales - monthlyPL.salesLastYear) / monthlyPL.salesLastYear) * 100);
  const ebitdaGrowth = Math.round(((monthlyPL.ebitda - monthlyPL.ebitdaLastYear) / monthlyPL.ebitdaLastYear) * 100);
  const ebitdaMargin = ((monthlyPL.ebitda / monthlyPL.sales) * 100).toFixed(1);

  const plItems = [
    { label: "売上高", value: monthlyPL.sales, bold: true },
    { label: "原材料費", value: monthlyPL.costOfGoods, bold: false },
    { label: "人件費", value: monthlyPL.laborCost, bold: false },
    { label: "賃料", value: monthlyPL.rent, bold: false },
    { label: "水道光熱費", value: monthlyPL.utilities, bold: false },
    { label: "減価償却費", value: monthlyPL.depreciation, bold: false },
    { label: "その他経費", value: monthlyPL.other, bold: false },
    { label: "EBITDA", value: monthlyPL.ebitda, bold: true },
    { label: "営業利益", value: monthlyPL.profit, bold: true },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">MONTHLY REPORT</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">月次レポート</h1>
        <p className="text-xs text-slate-400">2026年4月度 / 全48店舗</p>
      </div>

      {/* Summary */}
      <div className="bg-slate-900 rounded-xl p-4 text-white">
        <p className="text-[10px] tracking-[0.15em] text-slate-400 uppercase font-medium mb-3">EXECUTIVE SUMMARY</p>
        <p className="text-xs text-slate-300 leading-relaxed">
          売上は前年同月比+{salesGrowth}%の{oku(monthlyPL.sales)}。
          EBITDAは+{ebitdaGrowth}%の{oku(monthlyPL.ebitda)}、マージン{ebitdaMargin}%。
          AI効果による月間改善額は{man(ebitdaImpact.totalImprovement)}円(ROI {ebitdaImpact.roi.roiMultiple}x)。
          埼玉・千葉エリアの原価率改善が次月の課題。
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "売上高", value: oku(monthlyPL.sales), growth: `+${salesGrowth}%` },
          { label: "EBITDA", value: oku(monthlyPL.ebitda), growth: `+${ebitdaGrowth}%` },
          { label: "マージン", value: `${ebitdaMargin}%`, growth: null },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-2.5 shadow-sm">
            <p className="text-[9px] text-slate-400 tracking-wider">{k.label}</p>
            <p className="text-sm kpi-value mt-0.5">{k.value}</p>
            {k.growth && <p className="text-[9px] text-emerald-600">{k.growth} YoY</p>}
          </div>
        ))}
      </div>

      {/* P/L */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">損益計算書</p>
        <div className="space-y-0.5">
          {plItems.map((item, i) => {
            const ratio = ((item.value / monthlyPL.sales) * 100).toFixed(1);
            const isCost = i >= 1 && i <= 6;
            return (
              <div key={item.label} className={`flex items-center justify-between py-1.5 ${item.bold ? "border-t border-slate-200 font-medium" : "pl-3"}`}>
                <span className={`text-xs ${item.bold ? "font-bold" : "text-slate-500"}`}>{item.label}</span>
                <div className="flex gap-3">
                  <span className="text-xs kpi-value w-14 text-right">{isCost ? `(${man(item.value)})` : man(item.value)}</span>
                  <span className="text-[10px] text-slate-400 w-10 text-right">{ratio}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Area Performance */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 pb-2">
          <p className="text-xs font-bold text-slate-600">エリア別実績</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50">
              <tr>
                {["エリア", "店舗", "月売上", "原価率", "人件費率", "ロス変動"].map((h) => (
                  <th key={h} className="p-2 text-left font-medium text-slate-400 tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areaData.map((area) => (
                <tr key={area.id} className="border-b border-slate-50">
                  <td className="p-2 font-medium">{area.name}</td>
                  <td className="p-2 kpi-value">{area.stores}</td>
                  <td className="p-2 kpi-value">{man(area.monthlySales)}</td>
                  <td className="p-2">
                    <span className={area.costRate <= 30.5 ? "text-emerald-600" : "text-red-500"}>
                      {area.costRate}%
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={area.laborRate <= 29 ? "text-emerald-600" : "text-red-500"}>
                      {area.laborRate}%
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={area.wasteChange <= 0 ? "text-emerald-600" : "text-red-500"}>
                      {area.wasteChange <= 0 ? "▼" : "▲"}{man(Math.abs(area.wasteChange))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Impact */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">AI改善効果</p>
        <div className="space-y-2">
          {ebitdaImpact.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-600">{item.label}</span>
                <span className="kpi-value text-emerald-600">+{man(item.amount)}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">半期売上推移</p>
        {monthlyTrendByArea.map((m) => {
          const total = Object.entries(m).filter(([k]) => k !== "month").reduce((s, [, v]) => s + (v as number), 0);
          return (
            <div key={m.month} className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 w-7 kpi-value">{m.month.replace("月", "")}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(total / 700000000) * 100}%` }} />
              </div>
              <span className="text-[10px] kpi-value w-10 text-right">{oku(total)}</span>
            </div>
          );
        })}
      </div>

      {/* Key actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">来月の重点施策</p>
        {[
          { priority: "最優先", label: "埼玉・千葉の原価率改善", detail: "仕入れルート見直し + 需要予測精度向上" },
          { priority: "最優先", label: "大宮店の食材ロス対策", detail: "肉類の解凍フロー改善 + 発注量自動調整" },
          { priority: "重要", label: "GW商戦の振り返りと5月計画", detail: "5/3-6実績をもとに来年の仕入れ計画策定" },
          { priority: "改善", label: "退場候補メニュー2品の判断", detail: "グリーンサラダ・マンゴープリンの廃止/改良" },
        ].map((a) => (
          <div key={a.label} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border mt-0.5 ${
              a.priority === "最優先" ? "bg-red-50 text-red-600 border-red-200" :
              a.priority === "重要" ? "bg-amber-50 text-amber-600 border-amber-200" :
              "bg-blue-50 text-blue-600 border-blue-200"
            }`}>{a.priority}</span>
            <div>
              <p className="text-xs font-medium">{a.label}</p>
              <p className="text-[10px] text-slate-400">{a.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-slate-800 text-white text-xs py-2.5 rounded-lg active:bg-slate-700">PDFに出す</button>
        <button className="flex-1 border border-slate-200 text-xs py-2.5 rounded-lg text-slate-500">Excelに出す</button>
      </div>
    </div>
  );
}
