"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { ontologyRelationships, stores, menuItems, skus, factories, distributionCenters, deliveryRoutes, campaigns } from "@/lib/mock-data";
import { Network, ChevronRight, Circle } from "lucide-react";

const ontologyInsights: AIInsight[] = [
  {
    id: "ont-1",
    finding: "牛バラSKUの影響範囲を追跡。1つのSKU欠品が55店舗・12メニュー・8配送ルートに波及。",
    evidence: [
      "SKU-001(牛バラ) → 12メニュー品目で使用",
      "12メニュー → 55店舗(松屋全店)で販売",
      "補充ルート: 8ルート (川島DC経由4本, 横浜DC経由4本)",
    ],
    recommended_action: "SKU-001の安全在庫水準を現在の1.5倍に引き上げ。代替SKUの自動切替ルールを設定。",
    expected_impact: "牛バラ欠品時の影響店舗55→12に削減",
    confidence: "High",
    requires_approval: false,
    generated_at: "09:00",
  },
];

interface OntologyNode {
  id: string;
  type: string;
  label: string;
  detail: string;
  color: string;
}

const exampleNodes: OntologyNode[] = [
  { id: "store-1024", type: "Store", label: "M-1024 新宿南口店", detail: "松屋 · 駅前 · 42席", color: "bg-emerald-400" },
  { id: "brand-matsuya", type: "Brand", label: "松屋", detail: "牛丼 · 55店舗", color: "bg-blue-400" },
  { id: "menu-001", type: "MenuItem", label: "牛めし並盛", detail: "¥400 · 粗利65%", color: "bg-purple-400" },
  { id: "menu-007", type: "MenuItem", label: "カルビ焼肉定食", detail: "¥730 · 粗利58%", color: "bg-purple-400" },
  { id: "menu-013", type: "MenuItem", label: "牛ステーキ丼", detail: "¥880 · 粗利52%", color: "bg-purple-400" },
  { id: "sku-001", type: "SKU", label: "牛バラ", detail: "冷凍 · ¥1,200/kg", color: "bg-red-400" },
  { id: "sku-005", type: "SKU", label: "玉ねぎ", detail: "冷蔵 · ¥180/kg", color: "bg-red-400" },
  { id: "sku-009", type: "SKU", label: "白米", detail: "常温 · ¥320/kg", color: "bg-red-400" },
  { id: "sku-tare", type: "SKU", label: "タレA", detail: "常温 · ¥450/L", color: "bg-red-400" },
  { id: "factory-01", type: "Factory", label: "川島生産物流センター", detail: "稼働率87%", color: "bg-amber-400" },
  { id: "factory-02", type: "Factory", label: "嵐山工場", detail: "稼働率79%", color: "bg-amber-400" },
  { id: "route-01", type: "DeliveryRoute", label: "R-01 朝便", detail: "川島DC→首都圏", color: "bg-cyan-400" },
  { id: "route-02", type: "DeliveryRoute", label: "R-02 朝便", detail: "川島DC→渋谷エリア", color: "bg-cyan-400" },
  { id: "shift-lunch", type: "Shift", label: "11:00-14:00 Crew", detail: "5名配置 · 充足率86%", color: "bg-pink-400" },
  { id: "campaign-01", type: "Campaign", label: "春のランチ強化", detail: "4/15-5/15 · リフト+8.2%", color: "bg-yellow-400" },
];

const edges = [
  { from: "store-1024", to: "brand-matsuya", rel: "belongs_to" },
  { from: "store-1024", to: "menu-001", rel: "sells" },
  { from: "store-1024", to: "menu-007", rel: "sells" },
  { from: "store-1024", to: "menu-013", rel: "sells" },
  { from: "menu-001", to: "sku-001", rel: "consumes" },
  { from: "menu-001", to: "sku-005", rel: "consumes" },
  { from: "menu-001", to: "sku-009", rel: "consumes" },
  { from: "menu-001", to: "sku-tare", rel: "consumes" },
  { from: "menu-007", to: "sku-001", rel: "consumes" },
  { from: "menu-013", to: "sku-001", rel: "consumes" },
  { from: "sku-001", to: "factory-01", rel: "produced_at" },
  { from: "sku-001", to: "factory-02", rel: "produced_at" },
  { from: "route-01", to: "store-1024", rel: "delivers_to" },
  { from: "route-02", to: "store-1024", rel: "delivers_to" },
  { from: "shift-lunch", to: "store-1024", rel: "covers" },
  { from: "campaign-01", to: "menu-001", rel: "promotes" },
];

const typeColors: Record<string, string> = {
  Store: "#22c55e", Brand: "#3b82f6", MenuItem: "#a855f7", SKU: "#ef4444",
  Factory: "#f59e0b", DeliveryRoute: "#06b6d4", Shift: "#ec4899", Campaign: "#eab308",
};

// Layout nodes in concentric layers
const nodePositions: Record<string, { x: number; y: number }> = {
  "store-1024": { x: 400, y: 250 },
  "brand-matsuya": { x: 180, y: 100 },
  "menu-001": { x: 250, y: 350 },
  "menu-007": { x: 400, y: 420 },
  "menu-013": { x: 550, y: 350 },
  "sku-001": { x: 150, y: 480 },
  "sku-005": { x: 300, y: 500 },
  "sku-009": { x: 450, y: 500 },
  "sku-tare": { x: 600, y: 480 },
  "factory-01": { x: 100, y: 600 },
  "factory-02": { x: 250, y: 620 },
  "route-01": { x: 620, y: 180 },
  "route-02": { x: 680, y: 280 },
  "shift-lunch": { x: 620, y: 100 },
  "campaign-01": { x: 120, y: 230 },
};

export default function OntologyPage() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>("store-1024");

  const connectedEdges = selectedNode
    ? edges.filter(e => e.from === selectedNode || e.to === selectedNode)
    : [];
  const connectedNodeIds = new Set(connectedEdges.flatMap(e => [e.from, e.to]));

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader title="Ontology Graph" subtitle="業務オブジェクトの接続可視化" />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Relationship schema */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-blue-400" />
              <span className="section-title">Object Relationships</span>
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {ontologyRelationships.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-white/60 font-medium">{r.from}</span>
                  <ChevronRight className="w-3 h-3 text-blue-400/50" />
                  <span className="text-blue-400/70 italic">{r.rel}</span>
                  <ChevronRight className="w-3 h-3 text-blue-400/50" />
                  <span className="text-white/60 font-medium">{r.to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Graph visualization */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="section-title">Example: M-1024 新宿南口店 — Connected Objects</span>
              <div className="flex items-center gap-3 text-[9px]">
                {Object.entries(typeColors).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                    {type}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative bg-[#060a10]" style={{ height: 680 }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 680">
                {/* Edges */}
                {edges.map((edge, i) => {
                  const from = nodePositions[edge.from];
                  const to = nodePositions[edge.to];
                  if (!from || !to) return null;
                  const isHighlighted = selectedNode && (edge.from === selectedNode || edge.to === selectedNode);
                  return (
                    <g key={i}>
                      <line
                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={isHighlighted ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.06)"}
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                      />
                      <text
                        x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}
                        fill={isHighlighted ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.12)"}
                        fontSize="8" textAnchor="middle" fontStyle="italic"
                      >
                        {edge.rel}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {exampleNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const isHovered = hoveredNode === node.id;
                const color = typeColors[node.type] || "#888";
                const opacity = selectedNode ? (isSelected || isConnected ? 1 : 0.3) : 1;

                return (
                  <button
                    key={node.id}
                    className="absolute transition-all duration-200"
                    style={{
                      left: pos.x - 60,
                      top: pos.y - 18,
                      opacity,
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                  >
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
                      isSelected
                        ? "border-blue-400/50 bg-blue-500/10"
                        : isHovered
                          ? "border-white/20 bg-white/[0.06]"
                          : "border-white/[0.08] bg-white/[0.03]"
                    }`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <div className="text-[10px] text-white/80 whitespace-nowrap font-medium">{node.label}</div>
                        <div className="text-[8px] text-white/30 whitespace-nowrap">{node.detail}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Object type counts */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { type: "Store", count: stores.length, icon: "🏪" },
              { type: "MenuItem", count: menuItems.length, icon: "🍽" },
              { type: "SKU", count: skus.length, icon: "📦" },
              { type: "Factory", count: factories.length, icon: "🏭" },
              { type: "DC", count: distributionCenters.length, icon: "🏢" },
              { type: "Route", count: deliveryRoutes.length, icon: "🚛" },
              { type: "Campaign", count: campaigns.length, icon: "📢" },
              { type: "Relationship Types", count: ontologyRelationships.length, icon: "🔗" },
            ].map((item) => (
              <div key={item.type} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="kpi-value text-lg text-white/80">{item.count}</div>
                  <div className="text-[10px] text-white/40">{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIPanel insights={ontologyInsights} />
    </div>
  );
}
