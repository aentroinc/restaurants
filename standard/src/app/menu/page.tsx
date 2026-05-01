"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { menuItems, stores, chain } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("ja-JP");
const fmtYen = (n: number) => `¥${fmt(n)}`;

type SortKey = "name" | "total_orders" | "revenue" | "margin";

const trendIcon = {
  up: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
  down: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,
  flat: <Minus className="w-3.5 h-3.5 text-white/30" />,
};

const categoryColor: Record<string, string> = {
  "焼肉": "bg-red-500/10 text-red-400",
  "ご飯": "bg-amber-500/10 text-amber-400",
  "麺": "bg-blue-400/10 text-blue-400",
  "サイド": "bg-emerald-500/10 text-emerald-400",
  "ドリンク": "bg-purple-400/10 text-purple-400",
};

export default function MenuPage() {
  const [sortKey, setSortKey] = useState<SortKey>("total_orders");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const getRevenue = (item: typeof menuItems[0]) => item.price * item.total_orders;
  const getMargin = (item: typeof menuItems[0]) => ((item.price - item.cost) / item.price) * 100;

  const sorted = [...menuItems].sort((a, b) => {
    let av: number | string, bv: number | string;
    switch (sortKey) {
      case "name": av = a.name; bv = b.name; break;
      case "total_orders": av = a.total_orders; bv = b.total_orders; break;
      case "revenue": av = getRevenue(a); bv = getRevenue(b); break;
      case "margin": av = getMargin(a); bv = getMargin(b); break;
    }
    if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const maxOrders = Math.max(...menuItems.map(m => m.total_orders));

  const SortHeader = ({ label, sublabel, sKey }: { label: string; sublabel: string; sKey: SortKey }) => (
    <th onClick={() => handleSort(sKey)} className="px-5 py-3.5 text-left cursor-pointer hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-1.5">
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">{label}</div>
          <div className="text-[9px] text-white/25">{sublabel}</div>
        </div>
        {sortKey === sKey && (sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-orange-400" /> : <ChevronDown className="w-3.5 h-3.5 text-orange-400" />)}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="メニュー分析" subtitle="Menu Analytics" storeCount={chain.store_count} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">総メニュー数</div>
            <div className="kpi-value text-[28px] text-white/90 mt-2">{menuItems.length}<span className="text-[15px] text-white/40 ml-1">品</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">本日総注文数</div>
            <div className="kpi-value text-[28px] text-orange-400 mt-2">{fmt(menuItems.reduce((s, m) => s + m.total_orders, 0))}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">メニュー売上合計</div>
            <div className="kpi-value text-[28px] text-white/90 mt-2">{fmtYen(menuItems.reduce((s, m) => s + getRevenue(m), 0))}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">平均粗利率</div>
            <div className="kpi-value text-[28px] text-emerald-400 mt-2">{(menuItems.reduce((s, m) => s + getMargin(m), 0) / menuItems.length).toFixed(1)}%</div>
          </div>
        </div>

        {/* Menu ranking table */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-left w-12">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">#</div>
                </th>
                <SortHeader label="メニュー" sublabel="Menu Item" sKey="name" />
                <th className="px-5 py-3.5 text-left">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">カテゴリ</div>
                </th>
                <th className="px-5 py-3.5 text-left">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">単価</div>
                </th>
                <SortHeader label="注文数" sublabel="Orders" sKey="total_orders" />
                <SortHeader label="売上" sublabel="Revenue" sKey="revenue" />
                <SortHeader label="粗利率" sublabel="Margin" sKey="margin" />
                <th className="px-5 py-3.5 text-left">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">トレンド</div>
                </th>
                <th className="px-5 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const revenue = getRevenue(item);
                const margin = getMargin(item);
                const expanded = expandedId === item.id;
                const barWidth = (item.total_orders / maxOrders) * 100;

                return (
                  <tr key={item.id} className="group">
                    <td colSpan={9} className="p-0">
                      <div
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        className={`flex items-center cursor-pointer transition-colors border-b border-white/[0.04] ${
                          expanded ? "bg-orange-400/[0.06]" : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="px-5 py-4 w-12">
                          <span className="text-[13px] text-white/30 font-mono">{idx + 1}</span>
                        </div>
                        <div className="px-5 py-4 flex-1 min-w-0">
                          <span className="text-[14px] font-bold text-white/90">{item.name}</span>
                        </div>
                        <div className="px-5 py-4 w-24">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${categoryColor[item.category] || "bg-white/10 text-white/50"}`}>{item.category}</span>
                        </div>
                        <div className="px-5 py-4 w-24">
                          <span className="text-[13px] text-white/60 font-mono">{fmtYen(item.price)}</span>
                        </div>
                        <div className="px-5 py-4 w-32">
                          <div className="flex items-center gap-2">
                            <span className="kpi-value text-[16px] text-white/90">{item.total_orders}</span>
                            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400/50 rounded-full" style={{ width: `${barWidth}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 w-32">
                          <span className="kpi-value text-[16px] text-white/90">{fmtYen(revenue)}</span>
                        </div>
                        <div className="px-5 py-4 w-24">
                          <span className={`kpi-value text-[16px] ${margin > 75 ? "text-emerald-400" : margin > 60 ? "text-white/70" : "text-amber-400"}`}>{margin.toFixed(1)}%</span>
                        </div>
                        <div className="px-5 py-4 w-16">{trendIcon[item.trend]}</div>
                        <div className="px-5 py-4 w-10">
                          {expanded ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                        </div>
                      </div>

                      {/* Per-store breakdown */}
                      {expanded && (
                        <div className="px-8 py-4 bg-white/[0.02] border-b border-white/[0.06] animate-slide-down">
                          <div className="text-[10px] font-bold tracking-[0.1em] text-white/30 uppercase mb-3">店舗別注文数 PER-STORE ORDERS</div>
                          <div className="grid grid-cols-5 gap-3">
                            {item.by_store.map(bs => {
                              const store = stores.find(s => s.id === bs.store_id);
                              const pct = (bs.orders / item.total_orders * 100).toFixed(0);
                              const barW = (bs.orders / Math.max(...item.by_store.map(x => x.orders))) * 100;
                              return (
                                <div key={bs.store_id} className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-3">
                                  <div className="text-[12px] font-bold text-white/70">{store?.name || bs.store_id}</div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="kpi-value text-[18px] text-orange-400">{bs.orders}</span>
                                    <span className="text-[11px] text-white/30">{pct}%</span>
                                  </div>
                                  <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400/40 rounded-full" style={{ width: `${barW}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
