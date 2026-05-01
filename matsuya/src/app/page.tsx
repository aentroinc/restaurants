"use client";

import { useState } from "react";
import Link from "next/link";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { StorePopup } from "@/components/store-popup";
import {
  kpiSummary, stores, brands, incidents, actions, factories, distributionCenters,
  type Store,
} from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  Trash2, UserMinus, Truck, Wrench, MapPin, ArrowRight,
  Circle, ChevronRight,
} from "lucide-react";

const kpiCards = [
  { label: "本日売上", sublabel: "予測比", value: kpiSummary.today_sales_forecast_pct, icon: DollarSign, positive: true, href: "/store360" },
  { label: "客数", sublabel: "予測比", value: kpiSummary.customer_forecast_pct, icon: Users, positive: true, href: "/store360" },
  { label: "客単価", sublabel: "予測比", value: kpiSummary.avg_ticket_forecast_pct, icon: TrendingUp, positive: true, href: "/store360" },
  { label: "粗利率", sublabel: "前年差", value: kpiSummary.gross_margin_yoy, icon: TrendingDown, positive: false, href: "/store360" },
  { label: "欠品リスク", sublabel: "", value: `${kpiSummary.stockout_risk_stores}店舗`, icon: AlertTriangle, positive: false, href: "/demand" },
  { label: "廃棄リスク", sublabel: "", value: `${kpiSummary.waste_risk_myen}万円`, icon: Trash2, positive: false, href: "/demand" },
  { label: "人員不足", sublabel: "", value: `${kpiSummary.staffing_gap_slots}件`, icon: UserMinus, positive: false, href: "/actions" },
  { label: "配送遅延", sublabel: "", value: `${kpiSummary.delivery_delay_routes}ルート`, icon: Truck, positive: false, href: "/supply-chain" },
  { label: "改装効果", sublabel: "客単価リフト", value: kpiSummary.renovation_ticket_lift, icon: Wrench, positive: true, href: "/expansion" },
  { label: "出店候補", sublabel: "上位", value: `${kpiSummary.expansion_top_candidates}件`, icon: MapPin, positive: true, href: "/expansion" },
];

const severityColor = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-400",
  low: "bg-white/30",
};

const severityBg = {
  critical: "border-red-500/30 bg-red-500/[0.06]",
  high: "border-amber-500/30 bg-amber-500/[0.06]",
  medium: "border-blue-400/20 bg-blue-400/[0.04]",
  low: "border-white/10 bg-white/[0.02]",
};

const signalLinks: Record<string, string> = {
  "demand-surge": "/store360",
  "weather-delay": "/supply-chain",
  "stockout-risk": "/demand",
  "menu-performance": "/campaign",
  "renovation-lift": "/expansion",
  "staffing-gap": "/actions",
  "event-surge": "/store360",
  "expansion-constraint": "/expansion",
};

const aiInsights: AIInsight[] = [
  {
    id: "ai-1",
    finding: "首都圏駅前15店舗でランチ帯客数が予測比+18%。牛バラの欠品リスクが明日午後に上昇。",
    evidence: [
      "11:30-13:30の客数: 予測比+18.2% (15店舗平均)",
      "牛バラ在庫回転: 通常の1.4倍ペース",
      "近隣オフィス出勤率: 前週比+8pt",
    ],
    recommended_action: "川島DCから朝便で牛バラ+12ケースを前倒し補充。券売機推奨をカルビ焼肉定食に一時変更。",
    expected_impact: "欠品23店舗→4店舗。売上機会損失420万円を回避。",
    confidence: "High",
    requires_approval: true,
    generated_at: "10:15",
  },
  {
    id: "ai-2",
    finding: "関西の午後配送便に天候起因の遅延リスク。六甲→関西の8ルートに影響。",
    evidence: [
      "関西地方 14:00-20:00 強雨予報 (降水確率85%)",
      "過去同条件の平均遅延: 47分",
      "影響配送便: R-15, R-16, R-17 (計24店舗)",
    ],
    recommended_action: "午後便を大阪DC経由ルートに切替。出荷を2時間前倒し。",
    expected_impact: "遅延90分→15分。ディナー帯の欠品リスク解消。",
    confidence: "Medium",
    requires_approval: true,
    generated_at: "08:30",
  },
  {
    id: "ai-3",
    finding: "改装完了12店舗の客単価+7.4%。セルフレジとレイアウト変更の効果が想定超。",
    evidence: [
      "改装後30日の客単価: ¥892→¥958 (+7.4%)",
      "セルフレジ利用率: 68% (想定55%超)",
      "ピーク帯回転率: +11.2%",
    ],
    recommended_action: "次期改装候補5店舗の投資承認を前倒し。ROI想定を7.4%ベースに上方修正。",
    expected_impact: "年間利益改善: 推定1.2億円 (12店舗ベース)",
    confidence: "High",
    requires_approval: false,
    generated_at: "07:00",
  },
];

const brandSummary = brands.map(b => ({
  ...b,
  count: stores.filter(s => s.brand === b.brand_id).length,
  avgSales: Math.round(stores.filter(s => s.brand === b.brand_id).reduce((sum, s) => sum + s.daily_sales, 0) / Math.max(1, stores.filter(s => s.brand === b.brand_id).length)),
}));

export default function ExecutiveCommand() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [popupStore, setPopupStore] = useState<{ store: Store; x: number; y: number } | null>(null);

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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* KPI Grid — bigger, clickable */}
          <div className="grid grid-cols-5 gap-3">
            {kpiCards.map((kpi) => (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.positive ? "text-emerald-400/60" : "text-amber-400/60"}`} strokeWidth={1.5} />
                  <span className="text-[12px] text-white/50">{kpi.label}</span>
                </div>
                <div className={`kpi-value text-2xl ${kpi.positive ? "text-emerald-400" : "text-amber-400"}`}>
                  {kpi.value}
                </div>
                {kpi.sublabel && (
                  <div className="text-[11px] text-white/30 mt-1">{kpi.sublabel}</div>
                )}
                <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-400/0 group-hover:text-blue-400/60 transition-colors">
                  詳細 <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>

          {/* Main grid: Map + Signals */}
          <div className="grid grid-cols-3 gap-5">
            {/* Map */}
            <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">店舗ネットワーク</span>
                <span className="text-[11px] text-white/30">{filteredStores.length}店舗</span>
              </div>
              <div className="relative h-[400px] bg-[#0c1220]" onClick={() => setPopupStore(null)}>
                {/* Japan outline */}
                <svg viewBox="0 0 800 600" className="absolute inset-0 w-full h-full opacity-15">
                  <path d="M400,80 Q450,100 480,150 Q500,200 520,250 Q530,300 510,350 Q490,400 460,430 Q440,450 420,460 Q400,470 380,460 Q360,450 340,430 Q320,400 300,380 Q290,360 280,330 Q270,300 280,270 Q290,240 310,210 Q330,180 350,150 Q370,120 400,80Z" fill="none" stroke="white" strokeWidth="1" />
                </svg>

                {/* Store dots — clickable */}
                {filteredStores.map((store) => {
                  const xPct = Math.max(5, Math.min(95, ((store.lon - 128) / 18) * 100));
                  const yPct = Math.max(5, Math.min(95, ((46 - store.lat) / 14) * 100));
                  const color = store.stockout_risk ? "#ef4444" : store.staff_coverage < 0.85 ? "#f59e0b" : "#22c55e";
                  const isSelected = popupStore?.store.store_id === store.store_id;
                  return (
                    <button
                      key={store.store_id}
                      className={`absolute rounded-full transition-all duration-200 hover:scale-[2.5] hover:z-20 ${isSelected ? "scale-[2.5] z-20 ring-2 ring-blue-400" : ""}`}
                      style={{
                        left: `${xPct}%`,
                        top: `${yPct}%`,
                        width: isSelected ? 10 : 7,
                        height: isSelected ? 10 : 7,
                        backgroundColor: color,
                        opacity: isSelected ? 1 : 0.7,
                        transform: `translate(-50%, -50%) ${isSelected ? "scale(2.5)" : ""}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopupStore({ store, x: xPct, y: yPct });
                      }}
                    />
                  );
                })}

                {/* Factory markers */}
                {factories.map((f) => {
                  const xPct = Math.max(5, Math.min(95, ((f.lon - 128) / 18) * 100));
                  const yPct = Math.max(5, Math.min(95, ((46 - f.lat) / 14) * 100));
                  return (
                    <div
                      key={f.factory_id}
                      className="absolute w-3.5 h-3.5 rotate-45 border border-blue-400 bg-blue-400/20 cursor-help"
                      style={{ left: `${xPct}%`, top: `${yPct}%`, transform: "translate(-50%, -50%) rotate(45deg)" }}
                      title={`${f.name} (稼働率${(f.utilization * 100).toFixed(0)}%)`}
                    />
                  );
                })}

                {/* DC markers */}
                {distributionCenters.map((dc) => {
                  const xPct = Math.max(5, Math.min(95, ((dc.lon - 128) / 18) * 100));
                  const yPct = Math.max(5, Math.min(95, ((46 - dc.lat) / 14) * 100));
                  return (
                    <div
                      key={dc.dc_id}
                      className="absolute w-3.5 h-3.5 rounded border border-cyan-400 bg-cyan-400/20 cursor-help"
                      style={{ left: `${xPct}%`, top: `${yPct}%`, transform: "translate(-50%, -50%)" }}
                      title={`${dc.name} (${dc.region})`}
                    />
                  );
                })}

                {/* Store popup */}
                {popupStore && (
                  <StorePopup
                    store={popupStore.store}
                    position={{ x: popupStore.x, y: popupStore.y }}
                    onClose={() => setPopupStore(null)}
                  />
                )}

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-5 text-[10px] text-white/40 bg-black/50 rounded-md px-4 py-2">
                  <span className="flex items-center gap-1.5"><Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />正常</span>
                  <span className="flex items-center gap-1.5"><Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />人員不足</span>
                  <span className="flex items-center gap-1.5"><Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />欠品リスク</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-blue-400/60 inline-block" />工場</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-cyan-400/60 inline-block" />DC</span>
                </div>

                {/* Click hint */}
                <div className="absolute top-3 right-3 text-[10px] text-white/20">
                  店舗をクリックで詳細表示
                </div>
              </div>
            </div>

            {/* Signal Feed — bigger text, clickable */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] flex flex-col">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">重要シグナル</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">
                  {incidents.filter(i => i.status === "active").length}件
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {incidents.map((inc) => (
                  <Link
                    key={inc.incident_id}
                    href={signalLinks[inc.type] || "/store360"}
                    className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityColor[inc.severity]} ${inc.status === "active" ? "animate-pulse-subtle" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white/80 font-medium leading-snug">{inc.title}</p>
                      <p className="text-[11px] text-white/35 mt-1 line-clamp-2 leading-relaxed">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${severityBg[inc.severity]} text-white/50 font-medium`}>
                          {inc.severity === "critical" ? "緊急" : inc.severity === "high" ? "重要" : inc.severity === "medium" ? "注意" : "情報"}
                        </span>
                        {inc.impacted_stores.length > 0 && (
                          <span className="text-[10px] text-white/25">{inc.impacted_stores.length}店舗に影響</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-blue-400/60 mt-1 shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Brand + Top Actions */}
          <div className="grid grid-cols-3 gap-5">
            {/* Brand breakdown */}
            <div className="col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">ブランド別</span>
              </div>
              <div className="p-3">
                {brandSummary.map((b) => (
                  <button
                    key={b.brand_id}
                    onClick={() => setSelectedBrand(selectedBrand === b.brand_id ? null : b.brand_id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-all ${
                      selectedBrand === b.brand_id
                        ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-400/20"
                        : "hover:bg-white/[0.04] text-white/60"
                    }`}
                  >
                    <div>
                      <span className="text-[14px] font-medium">{b.name}</span>
                      <span className="text-[11px] text-white/30 ml-2">{b.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[15px] font-mono font-semibold">{b.count}</span>
                      <span className="text-[11px] text-white/30 ml-1">店</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Actions — bigger, more readable */}
            <div className="col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">対応アクション</span>
                <Link href="/actions" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors">
                  すべて表示 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {actions.slice(0, 5).map((act) => {
                  const statusStyles = {
                    pending: { label: "承認待ち", color: "text-amber-400 bg-amber-400/10" },
                    approved: { label: "承認済", color: "text-blue-400 bg-blue-400/10" },
                    "in-progress": { label: "実行中", color: "text-cyan-400 bg-cyan-400/10" },
                    completed: { label: "完了", color: "text-emerald-400 bg-emerald-400/10" },
                    rejected: { label: "却下", color: "text-red-400 bg-red-400/10" },
                  };
                  const s = statusStyles[act.status];
                  return (
                    <Link
                      key={act.action_id}
                      href="/actions"
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                    >
                      <span className={`text-[10px] px-2.5 py-1 rounded font-medium shrink-0 ${s.color}`}>
                        {s.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-white/70 truncate group-hover:text-white/90 transition-colors">{act.title}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{act.owner_role} · {act.owner_name}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                        act.confidence === "High" ? "text-emerald-400 bg-emerald-400/10" :
                        act.confidence === "Medium" ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10"
                      }`}>
                        {act.confidence}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AIPanel insights={aiInsights} />
    </div>
  );
}
