"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { stores, menuItems, shifts, incidents, brands, type Store } from "@/lib/mock-data";
import {
  Search, ChevronRight, TrendingUp, TrendingDown, Users, Clock,
  Package, UserCheck, AlertTriangle, BarChart3, ArrowUpRight, Zap,
} from "lucide-react";

const store360Insights: AIInsight[] = [
  {
    id: "s360-1",
    finding: "売上は予測比+12%だが、粗利は-2.1pt。高原価メニュー構成比の上昇とピーク帯の人員不足が主因の可能性。",
    evidence: [
      "牛ステーキ丼の構成比: 8.2%→14.7% (+6.5pt)",
      "18:00-20:00のシフト充足率: 72% (目標95%)",
      "提供時間: 平均+2.3分 (前週比)",
    ],
    recommended_action: "券売機表示順の調整（牛ステーキ丼→カルビ焼肉定食）と18:00-20:00の追加人員2名配置を推奨。",
    expected_impact: "粗利率+1.5pt回復、提供時間-1.8分",
    confidence: "High",
    requires_approval: true,
    generated_at: "15:30",
  },
  {
    id: "s360-2",
    finding: "類似店舗5店と比較して廃棄率が1.4倍。夜帯の食材準備量が過剰の可能性。",
    evidence: [
      "廃棄率: 4.2% (類似店舗平均: 3.0%)",
      "21:00以降の客数: 予測比-22%",
      "夜帯仕込み量: 昼帯比60% (類似店舗は45%)",
    ],
    recommended_action: "21:00以降の仕込み量を類似店舗水準に削減。過去データから最適仕込み量を算出。",
    expected_impact: "廃棄率4.2%→2.8%、月間廃棄コスト-18万円",
    confidence: "Medium",
    requires_approval: false,
    generated_at: "14:00",
  },
];

function StoreDetail({ store }: { store: Store }) {
  const storeShifts = shifts.filter(s => s.store_id === store.store_id);
  const todayShifts = storeShifts.filter(s => s.date === "2026-05-01");
  const storeMenus = menuItems.filter(m => m.brand === store.brand);
  const storeIncidents = incidents.filter(i => i.impacted_stores.includes(store.store_id));

  // Derive dynamic sub-values from store data
  const salesDelta = store.daily_sales > 500000 ? `+${((store.daily_sales - 450000) / 450000 * 100).toFixed(1)}%` : `${((store.daily_sales - 500000) / 500000 * 100).toFixed(1)}%`;
  const custDelta = store.daily_customers > 400 ? `+${((store.daily_customers - 380) / 380 * 100).toFixed(1)}%` : `${((store.daily_customers - 420) / 420 * 100).toFixed(1)}%`;
  const ticketDelta = store.avg_ticket > 900 ? `+${((store.avg_ticket - 850) / 850 * 100).toFixed(1)}%` : `${((store.avg_ticket - 900) / 900 * 100).toFixed(1)}%`;
  const marginDelta = store.gross_margin > 0.65 ? `+${((store.gross_margin - 0.64) * 100).toFixed(1)}pt` : `${((store.gross_margin - 0.66) * 100).toFixed(1)}pt`;

  const metrics = [
    { label: "本日売上", value: `¥${store.daily_sales.toLocaleString()}`, sub: `予測比${salesDelta}`, icon: TrendingUp, color: store.daily_sales > 500000 ? "text-emerald-400" : "text-amber-400" },
    { label: "客数", value: store.daily_customers.toString(), sub: `予測比${custDelta}`, icon: Users, color: store.daily_customers > 400 ? "text-blue-400" : "text-amber-400" },
    { label: "客単価", value: `¥${store.avg_ticket.toLocaleString()}`, sub: `予測比${ticketDelta}`, icon: ArrowUpRight, color: store.avg_ticket > 900 ? "text-emerald-400" : "text-white/50" },
    { label: "粗利率", value: `${(store.gross_margin * 100).toFixed(1)}%`, sub: marginDelta, icon: store.gross_margin > 0.65 ? TrendingUp : TrendingDown, color: store.gross_margin > 0.65 ? "text-emerald-400" : "text-amber-400" },
    { label: "廃棄率", value: `${(store.waste_pct * 100).toFixed(1)}%`, sub: store.waste_pct > 0.035 ? "要改善" : "良好", icon: Package, color: store.waste_pct > 0.035 ? "text-amber-400" : "text-emerald-400" },
    { label: "人員充足率", value: `${(store.staff_coverage * 100).toFixed(0)}%`, sub: store.staff_coverage < 0.9 ? "不足" : "充足", icon: UserCheck, color: store.staff_coverage < 0.9 ? "text-red-400" : "text-emerald-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Store Header */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white/90">{store.name}</h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
            <span>{store.store_id}</span>
            <span>{store.location_type}</span>
            <span>{store.region} · {store.area}</span>
            <span>{store.seats}席</span>
            <span>開店: {store.open_date}</span>
            {store.renovation_date && <span className="text-blue-400">改装: {store.renovation_date}</span>}
          </div>
        </div>
        {storeIncidents.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            {storeIncidents.length}件のアラート
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} strokeWidth={1.5} />
              <span className="text-[10px] text-white/40">{m.label}</span>
            </div>
            <div className={`kpi-value text-lg ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Two columns: Menu Mix + Shifts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Menu composition */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="section-title">メニュー構成比</span>
            <span className="text-[10px] text-white/30">{storeMenus.length}品目</span>
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            {storeMenus.slice(0, 12).map((menu, idx) => {
              const share = Math.max(2, 25 - idx * 2 + Math.round((Math.sin(idx * 3.7) + 1) * 5));
              return (
                <div key={menu.menu_id} className="flex items-center gap-3 px-4 py-1.5 border-b border-white/[0.04]">
                  <span className="text-[11px] text-white/60 flex-1 truncate">{menu.name}</span>
                  <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400/60"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40 w-10 text-right">{share}%</span>
                  <span className="text-[10px] font-mono text-white/30 w-12 text-right">¥{menu.price}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift coverage */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="section-title">本日のシフト充足</span>
            <span className="text-[10px] text-white/30">{todayShifts.length} slots</span>
          </div>
          <div className="p-4">
            {todayShifts.length > 0 ? todayShifts.map((shift) => (
              <div key={shift.shift_id} className="flex items-center gap-3 py-1.5">
                <span className="text-[11px] text-white/50 w-24">{shift.slot}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      shift.coverage_ratio >= 0.95 ? "bg-emerald-400/60" :
                      shift.coverage_ratio >= 0.8 ? "bg-amber-400/60" : "bg-red-400/60"
                    }`}
                    style={{ width: `${Math.min(100, shift.coverage_ratio * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/40 w-16 text-right">
                  {shift.assigned}/{shift.required}人
                </span>
                <span className={`text-[10px] font-mono w-10 text-right ${
                  shift.coverage_ratio >= 0.95 ? "text-emerald-400" :
                  shift.coverage_ratio >= 0.8 ? "text-amber-400" : "text-red-400"
                }`}>
                  {(shift.coverage_ratio * 100).toFixed(0)}%
                </span>
              </div>
            )) : (
              <p className="text-[11px] text-white/30">シフトデータなし</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales timeline placeholder */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <span className="section-title">売上タイムライン (15分粒度)</span>
        </div>
        <div className="h-[140px] flex items-end gap-[2px] px-4 py-3">
          {Array.from({ length: 64 }, (_, i) => {
            const hour = 6 + Math.floor(i / 4);
            const isLunch = hour >= 11 && hour <= 13;
            const isDinner = hour >= 18 && hour <= 20;
            const base = isLunch ? 0.8 : isDinner ? 0.65 : 0.2;
            const h = Math.max(5, (base + Math.sin(i * 0.5) * 0.15) * 100);
            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${
                  isLunch ? "bg-emerald-400/50" : isDinner ? "bg-blue-400/50" : "bg-white/10"
                }`}
                style={{ height: `${h}%` }}
                title={`${hour}:${String((i % 4) * 15).padStart(2, "0")}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between px-4 pb-2 text-[9px] text-white/20">
          <span>6:00</span><span>9:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span>
        </div>
      </div>

      {/* Incidents affecting this store */}
      {storeIncidents.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06]">
            <span className="section-title">発生中のアラート</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {storeIncidents.map((inc) => (
              <div key={inc.incident_id} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  inc.severity === "critical" ? "bg-red-500" :
                  inc.severity === "high" ? "bg-amber-500" :
                  inc.severity === "medium" ? "bg-blue-400" : "bg-white/30"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/70">{inc.title}</p>
                  <p className="text-[10px] text-white/30 truncate">{inc.description}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 shrink-0">{inc.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Action button */}
      <div className="flex gap-3">
        <Link
          href="/actions"
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-blue-500/20 text-blue-400 text-[13px] font-semibold hover:bg-blue-500/30 active:scale-[0.97] transition-all"
        >
          <Zap className="w-4 h-4" /> 対応アクションを作成
        </Link>
        <Link
          href="/ontology"
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-white/[0.04] text-white/50 text-[13px] hover:bg-white/[0.06] transition-colors"
        >
          関連オブジェクトを表示
        </Link>
      </div>

      {/* Similar stores */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <span className="section-title">類似店舗比較</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left px-4 py-2 font-medium">店舗</th>
                <th className="text-right px-3 py-2 font-medium">売上</th>
                <th className="text-right px-3 py-2 font-medium">客数</th>
                <th className="text-right px-3 py-2 font-medium">客単価</th>
                <th className="text-right px-3 py-2 font-medium">粗利率</th>
                <th className="text-right px-3 py-2 font-medium">充足率</th>
              </tr>
            </thead>
            <tbody>
              {stores
                .filter(s => s.brand === store.brand && s.location_type === store.location_type && s.store_id !== store.store_id)
                .slice(0, 5)
                .map((s) => (
                  <tr key={s.store_id} className="border-b border-white/[0.04] text-white/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="text-right px-3 py-2 font-mono">¥{s.daily_sales.toLocaleString()}</td>
                    <td className="text-right px-3 py-2 font-mono">{s.daily_customers}</td>
                    <td className="text-right px-3 py-2 font-mono">¥{s.avg_ticket.toLocaleString()}</td>
                    <td className="text-right px-3 py-2 font-mono">{(s.gross_margin * 100).toFixed(1)}%</td>
                    <td className={`text-right px-3 py-2 font-mono ${s.staff_coverage < 0.9 ? "text-amber-400" : ""}`}>
                      {(s.staff_coverage * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Store360Page() {
  return (
    <Suspense>
      <Store360Content />
    </Suspense>
  );
}

function Store360Content() {
  const searchParams = useSearchParams();
  const storeIdFromUrl = searchParams.get("id");
  const initialStore = (storeIdFromUrl && stores.find(s => s.store_id === storeIdFromUrl)) || stores[0];
  const [selectedStore, setSelectedStore] = useState<Store>(initialStore);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (storeIdFromUrl) {
      const found = stores.find(s => s.store_id === storeIdFromUrl);
      if (found) setSelectedStore(found);
    }
  }, [storeIdFromUrl]);

  const filtered = search
    ? stores.filter(s => s.name.includes(search) || s.store_id.includes(search) || s.area.includes(search))
    : stores;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader
          title="Store 360"
          subtitle="店舗統合分析"
          region={selectedStore.region}
          brandFilter={brands.find(b => b.brand_id === selectedStore.brand)?.name}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Store list */}
          <div className="w-64 border-r border-white/[0.06] flex flex-col bg-[#080c12]">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="店舗検索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-400/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.slice(0, 50).map((store) => (
                <button
                  key={store.store_id}
                  onClick={() => setSelectedStore(store)}
                  className={`w-full text-left px-3 py-2 border-b border-white/[0.04] transition-colors ${
                    selectedStore.store_id === store.store_id
                      ? "bg-blue-500/10 border-l-2 border-l-blue-400"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70 truncate">{store.name}</span>
                    {store.stockout_risk && (
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/30">
                    <span>{store.store_id}</span>
                    <span>{store.location_type}</span>
                    <span className="font-mono">¥{(store.daily_sales / 10000).toFixed(0)}万</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-4">
            <StoreDetail store={selectedStore} />
          </div>
        </div>
      </div>

      <AIPanel insights={store360Insights} />
    </div>
  );
}
