"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import {
  factories, distributionCenters, deliveryRoutes, stores, skus, incidents,
} from "@/lib/mock-data";
import {
  Factory, Warehouse, Truck, Store, AlertTriangle, Clock,
  ArrowRight, ChevronDown, ChevronRight, Package, Zap,
} from "lucide-react";

const scInsights: AIInsight[] = [
  {
    id: "sc-1",
    finding: "六甲センター→関西エリア午後便に天候起因の遅延リスク。R-15,R-16,R-17の3ルート、計24店舗に影響。",
    evidence: [
      "気象庁予報: 関西地方 14:00-20:00 強雨 (降水確率85%)",
      "過去同条件の平均遅延: 47分 (最大92分)",
      "影響店舗のディナー帯在庫: 7店舗で安全在庫割れ予測",
    ],
    recommended_action: "案A: 大阪DC経由ルートに切替 (遅延90分→15分)\n案B: 出荷2時間前倒し (遅延90分→30分)\n案C: 対象7店舗のメニュー推奨を在庫豊富品に変更",
    expected_impact: "ディナー帯欠品リスク24店舗→3店舗",
    confidence: "Medium",
    requires_approval: true,
    generated_at: "08:35",
  },
  {
    id: "sc-2",
    finding: "川島生産物流センターの稼働率が87%に上昇。需要増が継続する場合、3日後に製造キャパシティ超過リスク。",
    evidence: [
      "現在稼働率: 87% (通常75-80%)",
      "首都圏需要増: 前週比+12%が3日間継続",
      "牛バラ製造ライン: フル稼働中、予備ライン未使用",
    ],
    recommended_action: "嵐山工場の予備ラインを明日から稼働させ、牛バラ製造の一部を移管。",
    expected_impact: "川島稼働率87%→72%。キャパ超過リスク解消。",
    confidence: "High",
    requires_approval: true,
    generated_at: "09:15",
  },
];

const statusColors = {
  "on-time": "text-emerald-400 bg-emerald-400/10",
  "delayed": "text-red-400 bg-red-400/10",
  "at-risk": "text-amber-400 bg-amber-400/10",
};

export default function SupplyChainTwin() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const delayedRoutes = deliveryRoutes.filter(r => r.status !== "on-time");
  const weatherIncident = incidents.find(i => i.type === "weather-delay");

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader
          title="Supply Chain Twin"
          subtitle="工場・配送・店舗ネットワーク"
          region="全国"
          storeCount={stores.length}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Network overview cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Factory className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                <span className="section-title">Factories</span>
              </div>
              <div className="space-y-2">
                {factories.map((f) => (
                  <button
                    key={f.factory_id}
                    onClick={() => setSelectedNode(f.factory_id)}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                      selectedNode === f.factory_id ? "bg-blue-500/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="text-[11px] text-white/70">{f.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.utilization > 0.85 ? "bg-amber-400/60" : "bg-emerald-400/60"}`}
                          style={{ width: `${f.utilization * 100}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono ${f.utilization > 0.85 ? "text-amber-400" : "text-white/40"}`}>
                        {(f.utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Warehouse className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                <span className="section-title">Distribution Centers</span>
              </div>
              <div className="space-y-2">
                {distributionCenters.map((dc) => (
                  <button
                    key={dc.dc_id}
                    onClick={() => setSelectedNode(dc.dc_id)}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                      selectedNode === dc.dc_id ? "bg-cyan-500/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="text-[11px] text-white/70">{dc.name}</div>
                    <div className="text-[10px] text-white/30">{dc.region} · 処理能力: {dc.throughput_capacity}/日</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                <span className="section-title">Route Status</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="kpi-value text-lg text-emerald-400">
                    {deliveryRoutes.filter(r => r.status === "on-time").length}
                  </div>
                  <div className="text-[9px] text-white/30">On-time</div>
                </div>
                <div className="text-center">
                  <div className="kpi-value text-lg text-amber-400">
                    {deliveryRoutes.filter(r => r.status === "at-risk").length}
                  </div>
                  <div className="text-[9px] text-white/30">At-risk</div>
                </div>
                <div className="text-center">
                  <div className="kpi-value text-lg text-red-400">
                    {deliveryRoutes.filter(r => r.status === "delayed").length}
                  </div>
                  <div className="text-[9px] text-white/30">Delayed</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div className="bg-emerald-400/60" style={{ width: `${(deliveryRoutes.filter(r => r.status === "on-time").length / deliveryRoutes.length) * 100}%` }} />
                <div className="bg-amber-400/60" style={{ width: `${(deliveryRoutes.filter(r => r.status === "at-risk").length / deliveryRoutes.length) * 100}%` }} />
                <div className="bg-red-400/60" style={{ width: `${(deliveryRoutes.filter(r => r.status === "delayed").length / deliveryRoutes.length) * 100}%` }} />
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                <span className="section-title">Inventory Risk</span>
              </div>
              <div className="space-y-1.5">
                {skus.filter(s => s.category === "牛肉").slice(0, 5).map((sku, i) => {
                  const risk = i === 0 ? 0.92 : i === 1 ? 0.45 : Math.random() * 0.3;
                  return (
                    <div key={sku.sku_id} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/50 w-16 truncate">{sku.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${risk > 0.7 ? "bg-red-400/60" : risk > 0.4 ? "bg-amber-400/60" : "bg-emerald-400/60"}`}
                          style={{ width: `${risk * 100}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono w-8 text-right ${risk > 0.7 ? "text-red-400" : risk > 0.4 ? "text-amber-400" : "text-white/30"}`}>
                        {(risk * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Network visualization */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="section-title">Supply Network Graph</span>
              {weatherIncident && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {weatherIncident.title}
                </div>
              )}
            </div>
            <div className="relative h-[300px] bg-[#080c12] p-6">
              {/* Simplified network flow visualization */}
              <div className="flex items-center justify-between h-full">
                {/* Factories column */}
                <div className="space-y-4 w-40">
                  <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase text-center mb-2">Factory</div>
                  {factories.map((f) => (
                    <div key={f.factory_id} className={`rounded border px-3 py-2 text-center transition-colors cursor-pointer ${
                      f.utilization > 0.85
                        ? "border-amber-400/30 bg-amber-400/[0.05]"
                        : "border-white/[0.08] bg-white/[0.03]"
                    }`}>
                      <div className="text-[10px] text-white/70">{f.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${f.utilization > 0.85 ? "text-amber-400" : "text-white/40"}`}>
                        {(f.utilization * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrows */}
                <div className="flex-1 flex flex-col justify-center items-center gap-1">
                  {[0,1,2,3,4,5].map(i => (
                    <ArrowRight key={i} className="w-4 h-4 text-white/10" />
                  ))}
                </div>

                {/* DCs column */}
                <div className="space-y-4 w-36">
                  <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase text-center mb-2">DC</div>
                  {distributionCenters.map((dc) => (
                    <div key={dc.dc_id} className="rounded border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center">
                      <div className="text-[10px] text-white/70">{dc.name}</div>
                      <div className="text-[10px] font-mono text-white/40 mt-0.5">{dc.region}</div>
                    </div>
                  ))}
                </div>

                {/* Arrows */}
                <div className="flex-1 flex flex-col justify-center items-center gap-1">
                  {[0,1,2,3,4,5].map(i => {
                    const hasDelay = i < delayedRoutes.length;
                    return (
                      <ArrowRight key={i} className={`w-4 h-4 ${hasDelay ? "text-amber-400/50" : "text-white/10"}`} />
                    );
                  })}
                </div>

                {/* Stores column */}
                <div className="space-y-2 w-44">
                  <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase text-center mb-2">Stores</div>
                  {["首都圏","関西","東海","九州","その他"].map((region) => {
                    const count = stores.filter(s => s.region === region || (region === "その他" && !["首都圏","関西","東海","九州"].includes(s.region))).length;
                    const riskCount = stores.filter(s => (s.region === region || (region === "その他" && !["首都圏","関西","東海","九州"].includes(s.region))) && s.stockout_risk).length;
                    return (
                      <div key={region} className="rounded border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-white/70">{region}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-white/40">{count}店</span>
                          {riskCount > 0 && (
                            <span className="text-[9px] font-mono text-red-400">{riskCount}⚠</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery routes detail */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="section-title">Delivery Routes</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-white/30">{deliveryRoutes.length} routes</span>
                <span className="text-red-400">{delayedRoutes.length} issues</span>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto">
              {deliveryRoutes
                .sort((a, b) => (a.status === "delayed" ? -1 : b.status === "delayed" ? 1 : a.status === "at-risk" ? -1 : 1))
                .slice(0, 20)
                .map((route) => (
                <div key={route.route_id}>
                  <button
                    onClick={() => setExpandedRoute(expandedRoute === route.route_id ? null : route.route_id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    {expandedRoute === route.route_id
                      ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    }
                    <span className="text-[11px] font-mono text-white/50 w-10">{route.route_id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${statusColors[route.status]}`}>
                      {route.status}
                    </span>
                    <span className="text-[10px] text-white/40 flex-1 truncate">
                      {route.origin} → {route.destination_area}
                    </span>
                    <span className="text-[10px] text-white/30">{route.departure_time}</span>
                    <span className="text-[10px] font-mono text-white/30">{route.eta_hours.toFixed(1)}h</span>
                    {route.delay_minutes > 0 && (
                      <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />+{route.delay_minutes}min
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-white/30">{(route.load_pct * 100).toFixed(0)}%積載</span>
                  </button>
                  {expandedRoute === route.route_id && (
                    <div className="px-4 pb-3 pl-12 animate-fade-in">
                      <div className="grid grid-cols-3 gap-3 text-[10px]">
                        <div>
                          <div className="text-white/30 mb-1">配送先店舗</div>
                          {route.destination_stores.map(sid => {
                            const store = stores.find(s => s.store_id === sid);
                            return <div key={sid} className="text-white/50">{store?.name || sid}</div>;
                          })}
                        </div>
                        <div>
                          <div className="text-white/30 mb-1">影響メニュー</div>
                          <div className="text-white/50">牛めし系メニュー全般</div>
                          <div className="text-white/50">定食メニュー (一部SKU)</div>
                        </div>
                        <div>
                          <div className="text-white/30 mb-1">対応案</div>
                          {route.status !== "on-time" ? (
                            <>
                              <div className="text-amber-400">ルート変更を検討中</div>
                              <div className="text-white/40 mt-1">→ Action Queueへ</div>
                            </>
                          ) : (
                            <div className="text-emerald-400">対応不要</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Scenario comparison */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="section-title">Scenario Comparison — 関西配送遅延対応</span>
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
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">A</td>
                    <td className="px-3 py-2.5 text-white/60">大阪DC経由ルートに切替</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">遅延90分→15分</td>
                    <td className="px-3 py-2.5 text-white/40">積載率+8%、コスト+3.2万円</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">High</span></td>
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">B</td>
                    <td className="px-3 py-2.5 text-white/60">出荷を2時間前倒し</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-mono">遅延90分→30分</td>
                    <td className="px-3 py-2.5 text-white/40">工場の出荷スケジュール変更</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">Medium</span></td>
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-blue-400 font-medium">C</td>
                    <td className="px-3 py-2.5 text-white/60">対象7店舗のメニュー推奨を変更</td>
                    <td className="px-3 py-2.5 text-right text-amber-400 font-mono">欠品リスク軽減</td>
                    <td className="px-3 py-2.5 text-white/40">売上機会損失の可能性</td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">Medium</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AIPanel insights={scInsights} />
    </div>
  );
}
