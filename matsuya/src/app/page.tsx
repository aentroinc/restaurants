"use client";

import { useState } from "react";
import Link from "next/link";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import {
  kpiSummary, stores, brands, incidents, actions, factories, distributionCenters,
} from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  Trash2, UserMinus, Truck, Wrench, MapPin, ArrowRight,
  Circle, ChevronRight,
} from "lucide-react";

const kpiCards = [
  { label: "本日売上予測比", value: kpiSummary.today_sales_forecast_pct, icon: DollarSign, positive: true },
  { label: "既存店客数予測比", value: kpiSummary.customer_forecast_pct, icon: Users, positive: true },
  { label: "客単価予測比", value: kpiSummary.avg_ticket_forecast_pct, icon: TrendingUp, positive: true },
  { label: "粗利率前年差", value: kpiSummary.gross_margin_yoy, icon: TrendingDown, positive: false },
  { label: "欠品リスク店舗", value: `${kpiSummary.stockout_risk_stores}店舗`, icon: AlertTriangle, positive: false },
  { label: "廃棄リスク金額", value: `${kpiSummary.waste_risk_myen}万円`, icon: Trash2, positive: false },
  { label: "人員不足スロット", value: `${kpiSummary.staffing_gap_slots}件`, icon: UserMinus, positive: false },
  { label: "配送遅延リスク", value: `${kpiSummary.delivery_delay_routes}ルート`, icon: Truck, positive: false },
  { label: "改装後客単価リフト", value: kpiSummary.renovation_ticket_lift, icon: Wrench, positive: true },
  { label: "出店候補上位", value: `${kpiSummary.expansion_top_candidates}件`, icon: MapPin, positive: true },
];

const severityColor = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-400",
  low: "bg-white/30",
};

const severityBg = {
  critical: "border-red-500/30 bg-red-500/[0.05]",
  high: "border-amber-500/30 bg-amber-500/[0.05]",
  medium: "border-blue-400/20 bg-blue-400/[0.03]",
  low: "border-white/10 bg-white/[0.02]",
};

const aiInsights: AIInsight[] = [
  {
    id: "ai-1",
    finding: "首都圏駅前15店舗でランチ帯客数が予測比+18%。需要増に伴い牛バラSKUの欠品リスクが明日午後に上昇。",
    evidence: [
      "11:30-13:30の客数実績: 予測比+18.2% (15店舗平均)",
      "SKU-001(牛バラ) 在庫回転: 通常の1.4倍ペース",
      "近隣オフィス出勤率: 前週比+8pt (モバイル位置情報推定)",
    ],
    recommended_action: "川島DCから朝便で牛バラ+12ケースを対象店舗へ前倒し補充。並行して券売機の推奨表示をカルビ焼肉定食に一時変更。",
    expected_impact: "欠品23店舗→4店舗。売上機会損失を推定420万円回避。",
    confidence: "High",
    requires_approval: true,
    generated_at: "10:15",
  },
  {
    id: "ai-2",
    finding: "関西地方の午後配送便に天候起因の遅延リスク。六甲センターからの8ルートに影響可能性。",
    evidence: [
      "気象庁: 関西地方 14:00-20:00 強雨予報 (降水確率85%)",
      "過去同条件での遅延実績: 平均47分",
      "影響配送便: R-15, R-16, R-17 (計24店舗)",
    ],
    recommended_action: "午後便を大阪DC経由ルートに切替。影響最小化のため出荷を2時間前倒し。",
    expected_impact: "遅延90分→15分。ディナー帯の欠品リスクを解消。",
    confidence: "Medium",
    requires_approval: true,
    generated_at: "08:30",
  },
  {
    id: "ai-3",
    finding: "改装完了12店舗の客単価が平均+7.4%。セルフレジとレイアウト変更の効果が想定を上回る。",
    evidence: [
      "改装後30日の客単価: ¥892→¥958 (+7.4%)",
      "セルフレジ利用率: 68% (想定55%を上回る)",
      "ピーク帯の回転率: +11.2%",
    ],
    recommended_action: "改装優先順位を更新し、次期候補5店舗の投資承認を前倒し提案。ROI想定を7.4%ベースに上方修正。",
    expected_impact: "年間利益改善: 推定1.2億円 (12店舗ベース)",
    confidence: "High",
    requires_approval: false,
    generated_at: "07:00",
  },
];

// Brand summary
const brandSummary = brands.map(b => ({
  ...b,
  count: stores.filter(s => s.brand === b.brand_id).length,
  avgSales: Math.round(stores.filter(s => s.brand === b.brand_id).reduce((sum, s) => sum + s.daily_sales, 0) / Math.max(1, stores.filter(s => s.brand === b.brand_id).length)),
}));

export default function ExecutiveCommand() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const filteredStores = selectedBrand
    ? stores.filter(s => s.brand === selectedBrand)
    : stores;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader
          title="Executive Command"
          subtitle="全社オペレーション概況"
          region="全国"
          brandFilter={selectedBrand ? brands.find(b => b.brand_id === selectedBrand)?.name : "全ブランド"}
          storeCount={filteredStores.length}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* KPI Grid */}
          <div className="grid grid-cols-5 gap-2">
            {kpiCards.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <kpi.icon className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
                  <span className="text-[10px] text-white/40">{kpi.label}</span>
                </div>
                <div className={`kpi-value text-lg ${kpi.positive ? "text-emerald-400" : "text-amber-400"}`}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          {/* Main grid: Map + Signals */}
          <div className="grid grid-cols-3 gap-4">
            {/* Map placeholder */}
            <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <span className="section-title">Store Network</span>
              </div>
              <div className="relative h-[380px] bg-[#0c1220]">
                {/* Japan map outline placeholder */}
                <svg viewBox="0 0 800 600" className="absolute inset-0 w-full h-full opacity-20">
                  <path d="M400,80 Q450,100 480,150 Q500,200 520,250 Q530,300 510,350 Q490,400 460,430 Q440,450 420,460 Q400,470 380,460 Q360,450 340,430 Q320,400 300,380 Q290,360 280,330 Q270,300 280,270 Q290,240 310,210 Q330,180 350,150 Q370,120 400,80Z" fill="none" stroke="white" strokeWidth="1" />
                </svg>

                {/* Store dots */}
                {filteredStores.map((store) => {
                  const x = ((store.lon - 128) / 18) * 800;
                  const y = ((46 - store.lat) / 14) * 600;
                  const color = store.stockout_risk ? "#ef4444" : store.staff_coverage < 0.85 ? "#f59e0b" : "#22c55e";
                  return (
                    <div
                      key={store.store_id}
                      className="absolute w-2 h-2 rounded-full transition-all duration-300 hover:scale-[2] cursor-pointer"
                      style={{
                        left: `${Math.max(5, Math.min(95, (x / 800) * 100))}%`,
                        top: `${Math.max(5, Math.min(95, (y / 600) * 100))}%`,
                        backgroundColor: color,
                        opacity: 0.7,
                      }}
                      title={`${store.name}\n売上: ¥${store.daily_sales.toLocaleString()}\n客数: ${store.daily_customers}`}
                    />
                  );
                })}

                {/* Factory markers */}
                {factories.map((f) => {
                  const x = ((f.lon - 128) / 18) * 800;
                  const y = ((46 - f.lat) / 14) * 600;
                  return (
                    <div
                      key={f.factory_id}
                      className="absolute w-3 h-3 rotate-45 border border-blue-400 bg-blue-400/20"
                      style={{
                        left: `${Math.max(5, Math.min(95, (x / 800) * 100))}%`,
                        top: `${Math.max(5, Math.min(95, (y / 600) * 100))}%`,
                      }}
                      title={f.name}
                    />
                  );
                })}

                {/* DC markers */}
                {distributionCenters.map((dc) => {
                  const x = ((dc.lon - 128) / 18) * 800;
                  const y = ((46 - dc.lat) / 14) * 600;
                  return (
                    <div
                      key={dc.dc_id}
                      className="absolute w-3 h-3 rounded border border-cyan-400 bg-cyan-400/20"
                      style={{
                        left: `${Math.max(5, Math.min(95, (x / 800) * 100))}%`,
                        top: `${Math.max(5, Math.min(95, (y / 600) * 100))}%`,
                      }}
                      title={dc.name}
                    />
                  );
                })}

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[9px] text-white/40 bg-black/40 rounded px-3 py-1.5">
                  <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />正常</span>
                  <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-amber-500 text-amber-500" />人員不足</span>
                  <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-red-500 text-red-500" />欠品リスク</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rotate-45 bg-blue-400/60 inline-block" />工場</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-400/60 inline-block" />DC</span>
                </div>
              </div>
            </div>

            {/* Signal Feed */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] flex flex-col">
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="section-title">AI Signal Feed</span>
                <span className="text-[10px] text-white/30 font-mono">{incidents.filter(i => i.status === "active").length} active</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {incidents.map((inc) => (
                  <Link
                    key={inc.incident_id}
                    href={inc.type === "stockout-risk" ? "/demand" : inc.type === "staffing-gap" ? "/actions" : "/store360"}
                    className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityColor[inc.severity]} ${inc.status === "active" ? "animate-pulse-subtle" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/70 font-medium">{inc.title}</p>
                      <p className="text-[10px] text-white/35 mt-0.5 line-clamp-2">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${severityBg[inc.severity]} text-white/50`}>
                          {inc.severity}
                        </span>
                        <span className="text-[9px] text-white/25">
                          {inc.impacted_stores.length > 0 && `${inc.impacted_stores.length}店舗`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 mt-1 shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Brand summary + Top Actions */}
          <div className="grid grid-cols-3 gap-4">
            {/* Brand breakdown */}
            <div className="col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <span className="section-title">Brand Portfolio</span>
              </div>
              <div className="p-2">
                {brandSummary.map((b) => (
                  <button
                    key={b.brand_id}
                    onClick={() => setSelectedBrand(selectedBrand === b.brand_id ? null : b.brand_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${
                      selectedBrand === b.brand_id ? "bg-blue-500/10 text-blue-400" : "hover:bg-white/[0.03] text-white/60"
                    }`}
                  >
                    <div>
                      <span className="text-[12px] font-medium">{b.name}</span>
                      <span className="text-[10px] text-white/30 ml-2">{b.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-mono">{b.count}</span>
                      <span className="text-[10px] text-white/30 ml-1">店</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Actions */}
            <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="section-title">Top Actions</span>
                <Link href="/actions" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  すべて表示 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {actions.slice(0, 5).map((act) => {
                  const statusColor = {
                    pending: "text-amber-400 bg-amber-400/10",
                    approved: "text-blue-400 bg-blue-400/10",
                    "in-progress": "text-cyan-400 bg-cyan-400/10",
                    completed: "text-emerald-400 bg-emerald-400/10",
                    rejected: "text-red-400 bg-red-400/10",
                  };
                  return (
                    <div key={act.action_id} className="flex items-center gap-4 px-4 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-medium shrink-0 ${statusColor[act.status]}`}>
                        {act.status}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/70 truncate">{act.title}</p>
                        <p className="text-[10px] text-white/30">{act.owner_role} · {act.owner_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          act.confidence === "High" ? "text-emerald-400 bg-emerald-400/10" :
                          act.confidence === "Medium" ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10"
                        }`}>
                          {act.confidence}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      <AIPanel insights={aiInsights} />
    </div>
  );
}
