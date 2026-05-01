"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { locationCandidates, renovationProjects, stores } from "@/lib/mock-data";
import {
  MapPin, Wrench, TrendingUp, AlertTriangle, DollarSign,
  Users, Truck, ArrowUpDown, ChevronRight,
} from "lucide-react";

const expInsights: AIInsight[] = [
  {
    id: "exp-1",
    finding: "候補地C-014は想定売上が高いが、既存店M-087とのカニバリが大きい。C-021が総合スコアで優位。",
    evidence: [
      "C-014: 想定売上¥85万/日、カニバリリスク22%、配送距離42km",
      "C-021: 想定売上¥68万/日、カニバリリスク5%、配送距離12km",
      "C-021: 人員確保難易度Low、C-014はHigh",
    ],
    recommended_action: "C-021を第1候補として事業計画を策定。C-014は既存店の改装強化と併せて再評価。",
    expected_impact: "C-021出店: 投資回収22ヶ月、年間利益寄与¥3,200万",
    confidence: "High",
    requires_approval: true,
    generated_at: "09:00",
  },
  {
    id: "exp-2",
    finding: "改装完了12店舗の実績から、セルフレジ+レイアウト変更の組合せが最も高ROI。",
    evidence: [
      "セルフレジ+レイアウト: 客単価+7.4%、回転率+11%",
      "セルフレジのみ: 客単価+3.2%、回転率+5%",
      "レイアウトのみ: 客単価+4.1%、回転率+8%",
    ],
    recommended_action: "次期改装5店舗にセルフレジ+レイアウト変更のパッケージを適用。投資枠¥1.5億を確保。",
    expected_impact: "5店舗合計: 年間利益+¥5,800万、投資回収18ヶ月",
    confidence: "High",
    requires_approval: true,
    generated_at: "08:00",
  },
];

const difficultyColor = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-red-400 bg-red-400/10",
};

const statusColor = {
  completed: "text-emerald-400 bg-emerald-400/10",
  "in-progress": "text-cyan-400 bg-cyan-400/10",
  planned: "text-white/40 bg-white/[0.06]",
};

export default function ExpansionPage() {
  const [tab, setTab] = useState<"expansion" | "renovation">("expansion");
  const [sortKey, setSortKey] = useState<"score" | "sales" | "payback">("score");

  const sortedCandidates = [...locationCandidates].sort((a, b) =>
    sortKey === "score" ? b.total_score - a.total_score :
    sortKey === "sales" ? b.expected_daily_sales - a.expected_daily_sales :
    a.payback_months - b.payback_months
  );

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader title="Expansion & Renovation Planner" subtitle="出店候補・改装投資判断" />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tab switch */}
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("expansion")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-[12px] transition-colors ${
                tab === "expansion" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> 出店候補 ({locationCandidates.length})
            </button>
            <button
              onClick={() => setTab("renovation")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-[12px] transition-colors ${
                tab === "renovation" ? "bg-blue-500/20 text-blue-400" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> 改装計画 ({renovationProjects.length})
            </button>
          </div>

          {tab === "expansion" ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">候補地数</div>
                  <div className="kpi-value text-xl text-white/80">{locationCandidates.length}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">平均総合スコア</div>
                  <div className="kpi-value text-xl text-blue-400">
                    {(locationCandidates.reduce((s, c) => s + c.total_score, 0) / locationCandidates.length).toFixed(1)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">平均想定売上</div>
                  <div className="kpi-value text-xl text-emerald-400">
                    ¥{Math.round(locationCandidates.reduce((s, c) => s + c.expected_daily_sales, 0) / locationCandidates.length / 10000)}万
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">平均回収期間</div>
                  <div className="kpi-value text-xl text-white/70">
                    {Math.round(locationCandidates.reduce((s, c) => s + c.payback_months, 0) / locationCandidates.length)}ヶ月
                  </div>
                </div>
              </div>

              {/* Map placeholder + Table */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="section-title">Location Candidates — Ranked</span>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3 h-3 text-white/20" />
                    {(["score","sales","payback"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSortKey(key)}
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          sortKey === key ? "bg-blue-500/10 text-blue-400" : "text-white/30 hover:text-white/50"
                        }`}
                      >
                        {key === "score" ? "スコア順" : key === "sales" ? "売上順" : "回収順"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-white/30 border-b border-white/[0.06]">
                        <th className="text-center px-2 py-2 font-medium w-8">#</th>
                        <th className="text-left px-3 py-2 font-medium">候補地</th>
                        <th className="text-left px-3 py-2 font-medium">地域</th>
                        <th className="text-right px-3 py-2 font-medium">商圏人口</th>
                        <th className="text-right px-3 py-2 font-medium">競合</th>
                        <th className="text-right px-3 py-2 font-medium">カニバリ</th>
                        <th className="text-right px-3 py-2 font-medium">配送距離</th>
                        <th className="text-center px-3 py-2 font-medium">人員確保</th>
                        <th className="text-right px-3 py-2 font-medium">想定売上</th>
                        <th className="text-right px-3 py-2 font-medium">回収期間</th>
                        <th className="text-right px-3 py-2 font-medium">総合スコア</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCandidates.map((c, i) => (
                        <tr key={c.candidate_id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${i < 3 ? "bg-blue-500/[0.03]" : ""}`}>
                          <td className="text-center px-2 py-2 font-mono text-white/30">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="text-white/70 font-medium">{c.name}</div>
                            <div className="text-[9px] text-white/30">{c.candidate_id}</div>
                          </td>
                          <td className="px-3 py-2 text-white/50">{c.region}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/50">{c.population_radius_1km.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/50">{c.competitor_count}</td>
                          <td className={`px-3 py-2 text-right font-mono ${c.cannibalization_risk > 0.15 ? "text-red-400" : c.cannibalization_risk > 0.08 ? "text-amber-400" : "text-white/50"}`}>
                            {(c.cannibalization_risk * 100).toFixed(0)}%
                          </td>
                          <td className={`px-3 py-2 text-right font-mono ${c.delivery_distance_km > 30 ? "text-amber-400" : "text-white/50"}`}>
                            {c.delivery_distance_km.toFixed(0)}km
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${difficultyColor[c.staff_difficulty]}`}>
                              {c.staff_difficulty}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-400">
                            ¥{(c.expected_daily_sales / 10000).toFixed(0)}万
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-white/50">{c.payback_months}ヶ月</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`kpi-value text-sm ${c.total_score > 80 ? "text-emerald-400" : c.total_score > 65 ? "text-blue-400" : "text-white/50"}`}>
                              {c.total_score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Renovation summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">完了</div>
                  <div className="kpi-value text-xl text-emerald-400">{renovationProjects.filter(r => r.status === "completed").length}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">進行中</div>
                  <div className="kpi-value text-xl text-cyan-400">{renovationProjects.filter(r => r.status === "in-progress").length}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">計画中</div>
                  <div className="kpi-value text-xl text-white/50">{renovationProjects.filter(r => r.status === "planned").length}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 mb-1">完了店舗 平均客単価リフト</div>
                  <div className="kpi-value text-xl text-emerald-400">+7.4%</div>
                </div>
              </div>

              {/* Renovation table */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="px-4 py-2 border-b border-white/[0.06]">
                  <span className="section-title">Renovation Projects — ROI Ranked</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-white/30 border-b border-white/[0.06]">
                        <th className="text-left px-4 py-2 font-medium">店舗</th>
                        <th className="text-center px-3 py-2 font-medium">ステータス</th>
                        <th className="text-right px-3 py-2 font-medium">投資額</th>
                        <th className="text-right px-3 py-2 font-medium">客単価リフト</th>
                        <th className="text-right px-3 py-2 font-medium">客数リフト</th>
                        <th className="text-right px-3 py-2 font-medium">回収期間</th>
                        <th className="text-left px-3 py-2 font-medium">期間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renovationProjects
                        .sort((a, b) => a.payback_months - b.payback_months)
                        .map((proj) => (
                        <tr key={proj.project_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-2">
                            <div className="text-white/70 font-medium">{proj.store_name}</div>
                            <div className="text-[9px] text-white/30">{proj.project_id} · {proj.store_id}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded ${statusColor[proj.status]}`}>
                              {proj.status === "completed" ? "完了" : proj.status === "in-progress" ? "進行中" : "計画"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-white/50">{(proj.capex_myen * 100).toLocaleString()}万円</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-400">+{proj.ticket_lift_pct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-400">+{proj.customer_lift_pct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right font-mono text-white/50">{proj.payback_months}ヶ月</td>
                          <td className="px-3 py-2 text-white/40">{proj.start_date} ~ {proj.end_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AIPanel insights={expInsights} />
    </div>
  );
}
