"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { stores, skus, incidents } from "@/lib/mock-data";
import {
  TrendingUp, AlertTriangle, Package, Clock, ArrowUpRight,
  ArrowDownRight, Filter, ChevronDown,
} from "lucide-react";

const demandInsights: AIInsight[] = [
  {
    id: "dem-1",
    finding: "SKU「牛バラ」が明日15:00時点で23店舗欠品予測。需要増+12%と定期発注量のギャップが原因。",
    evidence: [
      "現在庫: 対象23店舗で平均1.2日分 (安全在庫2日分を下回る)",
      "需要予測: 明日の消費量は通常比+12%",
      "次回定期入荷: 明後日朝便 (間に合わない)",
    ],
    recommended_action: "案A: 朝便で+12ケース前倒し補充 → 欠品23→4店舗\n案B: 券売機推奨変更 → 欠品23→11店舗\n案C: 工場追加生産 → 欠品0店舗",
    expected_impact: "案Aで欠品23店舗→4店舗。売上機会損失420万円を回避。",
    confidence: "High",
    requires_approval: true,
    generated_at: "09:45",
  },
  {
    id: "dem-2",
    finding: "揚げ油の廃棄リスクが8店舗で上昇。松のや店舗の夜帯需要低下で消費ペースが鈍化。",
    evidence: [
      "対象8店舗の揚げ油消費: 予測比-18%",
      "賞味期限内使い切り見込み: 3店舗で期限超過リスク",
      "夜帯フライメニュー販売: 前週比-22%",
    ],
    recommended_action: "対象3店舗の次回発注量を30%削減。近隣消費量の多い店舗への在庫移管を検討。",
    expected_impact: "廃棄コスト削減: 推定12万円/週",
    confidence: "Medium",
    requires_approval: false,
    generated_at: "11:00",
  },
];

// Generate forecast data
const forecastSkus = skus.filter(s => ["牛肉","豚肉","米穀","野菜"].includes(s.category)).slice(0, 20);

interface ForecastRow {
  sku: typeof skus[number];
  current_stock_days: number;
  demand_forecast_pct: number;
  stockout_time: string | null;
  waste_risk: number;
  recommended_replenish: number;
  confidence_band: [number, number];
}

const forecastData: ForecastRow[] = forecastSkus.map((sku, i) => {
  const isBeef = sku.category === "牛肉";
  const stockDays = isBeef && i < 3 ? 1.2 + i * 0.3 : 2.5 + Math.random() * 3;
  const demandPct = isBeef && i === 0 ? 12 : Math.round((Math.random() - 0.3) * 15);
  return {
    sku,
    current_stock_days: Math.round(stockDays * 10) / 10,
    demand_forecast_pct: demandPct,
    stockout_time: stockDays < 2 ? `明日 ${Math.round(10 + Math.random() * 10)}:00` : null,
    waste_risk: sku.storage_type === "冷蔵" ? Math.round(Math.random() * 40) : Math.round(Math.random() * 15),
    recommended_replenish: stockDays < 2 ? Math.round(8 + Math.random() * 15) : 0,
    confidence_band: [Math.round((1 - Math.random() * 0.15) * 100), Math.round((1 + Math.random() * 0.15) * 100)],
  };
});

export default function DemandPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "demand">("risk");

  const filtered = categoryFilter === "all"
    ? forecastData
    : forecastData.filter(f => f.sku.category === categoryFilter);

  const sorted = [...filtered].sort((a, b) =>
    sortBy === "risk"
      ? a.current_stock_days - b.current_stock_days
      : b.demand_forecast_pct - a.demand_forecast_pct
  );

  const stockoutCount = forecastData.filter(f => f.stockout_time).length;
  const wasteRiskCount = forecastData.filter(f => f.waste_risk > 25).length;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader title="Demand & Inventory Planner" subtitle="需要予測・在庫リスク・補充計画" storeCount={stores.length} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-white/40">需要予測平均</span>
              </div>
              <div className="kpi-value text-xl text-emerald-400">+6.8%</div>
              <div className="text-[10px] text-white/30 mt-0.5">全SKU加重平均</div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-[10px] text-white/40">欠品リスクSKU</span>
              </div>
              <div className="kpi-value text-xl text-red-400">{stockoutCount}品目</div>
              <div className="text-[10px] text-white/30 mt-0.5">48時間以内に在庫切れ予測</div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] text-white/40">廃棄リスク</span>
              </div>
              <div className="kpi-value text-xl text-amber-400">{wasteRiskCount}品目</div>
              <div className="text-[10px] text-white/30 mt-0.5">賞味期限内消化見込みなし</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] text-white/40">次回発注締切</span>
              </div>
              <div className="kpi-value text-xl text-blue-400">16:00</div>
              <div className="text-[10px] text-white/30 mt-0.5">明日朝便分</div>
            </div>
          </div>

          {/* Scenario comparison for beef SKU */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03]">
            <div className="px-4 py-2 border-b border-red-500/10 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="section-title text-red-400">Critical: 牛バラ (SKU-001) 欠品対応シナリオ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/[0.06]">
                    <th className="text-left px-4 py-2 font-medium">案</th>
                    <th className="text-left px-3 py-2 font-medium">内容</th>
                    <th className="text-right px-3 py-2 font-medium">期待効果</th>
                    <th className="text-left px-3 py-2 font-medium">リスク</th>
                    <th className="text-center px-3 py-2 font-medium">信頼度</th>
                    <th className="text-center px-3 py-2 font-medium">承認</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">A</td>
                    <td className="px-3 py-2.5 text-white/60">朝便で対象SKUを+12ケース再配分</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">欠品23→4店舗</td>
                    <td className="px-3 py-2.5 text-white/40">配送積載率+8%</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">High</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <button className="text-[9px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">承認</button>
                    </td>
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">B</td>
                    <td className="px-3 py-2.5 text-white/60">都心店舗の券売機推奨を一部変更</td>
                    <td className="px-3 py-2.5 text-right text-amber-400 font-mono">欠品23→11店舗</td>
                    <td className="px-3 py-2.5 text-white/40">売上機会損失の可能性</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">Medium</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <button className="text-[9px] px-2 py-1 rounded bg-white/[0.06] text-white/40 hover:bg-white/[0.1]">承認</button>
                    </td>
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">C</td>
                    <td className="px-3 py-2.5 text-white/60">工場追加生産を実施</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">欠品23→0店舗</td>
                    <td className="px-3 py-2.5 text-white/40">残業・原価増</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">High</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <button className="text-[9px] px-2 py-1 rounded bg-white/[0.06] text-white/40 hover:bg-white/[0.1]">承認</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            {["all","牛肉","豚肉","米穀","野菜"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
                  categoryFilter === cat ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.06]"
                }`}
              >
                {cat === "all" ? "全カテゴリ" : cat}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-white/30">Sort:</span>
              <button
                onClick={() => setSortBy("risk")}
                className={`text-[10px] px-2 py-1 rounded ${sortBy === "risk" ? "bg-red-500/10 text-red-400" : "text-white/40"}`}
              >
                欠品リスク順
              </button>
              <button
                onClick={() => setSortBy("demand")}
                className={`text-[10px] px-2 py-1 rounded ${sortBy === "demand" ? "bg-emerald-500/10 text-emerald-400" : "text-white/40"}`}
              >
                需要増順
              </button>
            </div>
          </div>

          {/* Forecast table */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/[0.06]">
                    <th className="text-left px-4 py-2 font-medium">SKU</th>
                    <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
                    <th className="text-left px-3 py-2 font-medium">保管</th>
                    <th className="text-right px-3 py-2 font-medium">在庫日数</th>
                    <th className="text-right px-3 py-2 font-medium">需要予測</th>
                    <th className="text-right px-3 py-2 font-medium">信頼区間</th>
                    <th className="text-left px-3 py-2 font-medium">欠品予測</th>
                    <th className="text-right px-3 py-2 font-medium">廃棄リスク</th>
                    <th className="text-right px-3 py-2 font-medium">推奨補充</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.sku.sku_id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${
                      row.stockout_time ? "bg-red-500/[0.03]" : ""
                    }`}>
                      <td className="px-4 py-2">
                        <div className="text-white/70 font-medium">{row.sku.name}</div>
                        <div className="text-[9px] text-white/30">{row.sku.sku_id}</div>
                      </td>
                      <td className="px-3 py-2 text-white/50">{row.sku.category}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          row.sku.storage_type === "冷凍" ? "bg-blue-400/10 text-blue-400" :
                          row.sku.storage_type === "冷蔵" ? "bg-cyan-400/10 text-cyan-400" : "bg-white/[0.06] text-white/40"
                        }`}>
                          {row.sku.storage_type}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${
                        row.current_stock_days < 2 ? "text-red-400" :
                        row.current_stock_days < 3 ? "text-amber-400" : "text-white/50"
                      }`}>
                        {row.current_stock_days}日
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={`flex items-center justify-end gap-1 ${
                          row.demand_forecast_pct > 0 ? "text-emerald-400" : row.demand_forecast_pct < -5 ? "text-amber-400" : "text-white/50"
                        }`}>
                          {row.demand_forecast_pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : row.demand_forecast_pct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                          {row.demand_forecast_pct > 0 ? "+" : ""}{row.demand_forecast_pct}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white/30 text-[10px]">
                        {row.confidence_band[0]}-{row.confidence_band[1]}%
                      </td>
                      <td className="px-3 py-2">
                        {row.stockout_time ? (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            {row.stockout_time}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.waste_risk > 0 && (
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.waste_risk > 25 ? "bg-amber-400/60" : "bg-white/20"}`}
                                style={{ width: `${row.waste_risk}%` }}
                              />
                            </div>
                            <span className={`font-mono text-[10px] ${row.waste_risk > 25 ? "text-amber-400" : "text-white/30"}`}>
                              {row.waste_risk}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.recommended_replenish > 0 ? (
                          <span className="text-blue-400">+{row.recommended_replenish}cs</span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AIPanel insights={demandInsights} />
    </div>
  );
}
