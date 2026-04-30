"use client";

import { areaData, ebitdaImpact } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }

const wasteDetails = [
  { category: "肉類", amount: 520000, reason: "解凍後の未使用", trend: "down" as const, reduced: 85000 },
  { category: "野菜", amount: 380000, reason: "仕入れすぎ", trend: "down" as const, reduced: 120000 },
  { category: "米・ナン生地", amount: 280000, reason: "炊きすぎ・仕込みすぎ", trend: "down" as const, reduced: 45000 },
  { category: "スパイス・ルー", amount: 180000, reason: "期限切れ", trend: "flat" as const, reduced: 8000 },
  { category: "サラダ・トッピング", amount: 240000, reason: "セット残し", trend: "up" as const, reduced: -32000 },
];

const monthlyWaste = [
  { month: "11月", amount: 2800000 },
  { month: "12月", amount: 2520000 },
  { month: "1月", amount: 2280000 },
  { month: "2月", amount: 2050000 },
  { month: "3月", amount: 1880000 },
  { month: "4月", amount: 1750000 },
];

export default function WastePage() {
  const { role } = useRole();
  const isOwner = role === "owner";
  const totalReduction = areaData.reduce((s, a) => s + a.wasteChange, 0);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">WASTE MANAGEMENT</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">{isOwner ? "食材ロス管理" : "もったいない"}</h1>
        <p className="text-xs text-slate-400">{isOwner ? "全48店舗 / 4月度" : "東京23区 / 4月"}</p>
      </div>

      {/* Impact */}
      <div className="bg-slate-900 rounded-xl p-4 text-white">
        <p className="text-[10px] tracking-[0.15em] text-slate-400 uppercase font-medium">CUMULATIVE WASTE REDUCTION</p>
        <p className="text-3xl kpi-value text-emerald-400 mt-1">▼ {man(Math.abs(ebitdaImpact.breakdown[0].amount))}円<span className="text-sm text-slate-400">/月</span></p>
        <p className="text-xs text-slate-400 mt-1">
          {isOwner ? "年間換算: 約1億円のコスト改善効果" : "ムダが毎月へっています"}
        </p>
        <div className="mt-3 bg-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
          {isOwner ? "EBITDA寄与: 食材ロス削減は改善効果全体の33.5%を占める" : "いままでに840万円ぶん、ムダが減りました"}
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">{isOwner ? "カテゴリ別ロス内訳" : "なにがもったいなかった?"}</p>
        <div className="space-y-2.5">
          {wasteDetails.map((item) => (
            <div key={item.category}>
              <div className="flex justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{item.category}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    item.trend === "down" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    item.trend === "up" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {item.trend === "down" ? "改善" : item.trend === "up" ? "悪化" : "横ばい"}
                  </span>
                </div>
                <span className="text-xs kpi-value">{yen(item.amount)}</span>
              </div>
              <p className="text-[10px] text-slate-400">{isOwner ? `主因: ${item.reason}` : item.reason}</p>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full ${item.reduced >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                  style={{ width: `${(item.amount / 520000) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Area/Store breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">{isOwner ? "エリア別ロス" : "店舗ごと"}</p>
        <div className="space-y-2">
          {areaData.map((area) => (
            <div key={area.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div>
                <span className="text-xs font-medium">{area.name}</span>
                <span className="text-[10px] text-slate-400 ml-1">{area.stores}店舗</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs kpi-value">{yen(area.waste)}</span>
                <span className={`text-[10px] kpi-value ${area.wasteChange <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {area.wasteChange <= 0 ? "▼" : "▲"}{man(Math.abs(area.wasteChange))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">半年間の推移</p>
        {monthlyWaste.map((m) => (
          <div key={m.month} className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-400 w-7 kpi-value">{m.month.replace("月", "")}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="bg-red-300 h-full rounded-full" style={{ width: `${(m.amount / 2800000) * 100}%` }} />
            </div>
            <span className="text-[10px] kpi-value w-10 text-right">{man(m.amount)}</span>
          </div>
        ))}
        <p className="text-[10px] text-slate-400 mt-2 bg-emerald-50 p-2 rounded">
          {isOwner ? "6ヶ月で37.5%改善。需要予測の精度向上と発注自動化が寄与" : "半年でだいぶ減った！仕入れの精度がよくなってきた"}
        </p>
      </div>
    </div>
  );
}
