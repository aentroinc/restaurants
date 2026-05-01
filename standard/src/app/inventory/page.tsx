"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { inventory, stores, chain } from "@/lib/mock-data";
import { useToast } from "@/components/toast";
import { AlertTriangle, Check } from "lucide-react";

const statusStyle = {
  ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  low: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  out: "bg-red-500/15 text-red-400 border-red-500/20",
};

const statusLabel = { ok: "適正", low: "残少", out: "欠品" };

export default function InventoryPage() {
  const [orderedCells, setOrderedCells] = useState<Set<string>>(new Set());
  const { show } = useToast();

  const handleOrder = (itemName: string, storeId: string) => {
    const key = `${itemName}-${storeId}`;
    setOrderedCells(prev => new Set(prev).add(key));
    const store = stores.find(s => s.id === storeId);
    show(`${store?.name}への${itemName}の発注を開始しました`, "success");
  };

  const totalLow = inventory.reduce((s, item) => s + item.stores.filter(st => st.status === "low").length, 0);
  const totalOut = inventory.reduce((s, item) => s + item.stores.filter(st => st.status === "out").length, 0);

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="在庫・発注" subtitle="全店在庫状況" storeCount={chain.store_count} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">管理品目 Items</div>
            <div className="kpi-value text-[28px] text-white/90 mt-2">{inventory.length}<span className="text-[15px] text-white/40 ml-1">品目</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">残りわずか</div>
            <div className="kpi-value text-[28px] text-amber-400 mt-2">{totalLow}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">欠品 Out of Stock</div>
            <div className="kpi-value text-[28px] text-red-400 mt-2">{totalOut}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">発注済 Ordered</div>
            <div className="kpi-value text-[28px] text-emerald-400 mt-2">{orderedCells.size}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
        </div>

        {/* Matrix table */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-left">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">品目 Item</div>
                </th>
                <th className="px-5 py-3.5 text-left">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">単位</div>
                </th>
                {stores.map(store => (
                  <th key={store.id} className="px-4 py-3.5 text-center">
                    <div className="text-[11px] font-bold tracking-[0.06em] text-white/50">{store.name.replace("店", "")}</div>
                    <div className="text-[11px] text-white/25">{store.id}</div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-center">
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/50 uppercase">合計</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const totalStock = item.stores.reduce((s, st) => s + st.stock, 0);
                const hasIssue = item.stores.some(st => st.status !== "ok");
                return (
                  <tr key={item.name} className={`border-b border-white/[0.04] ${hasIssue ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {hasIssue && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span className="text-[14px] font-bold text-white/90">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[12px] text-white/40">{item.unit}</span>
                    </td>
                    {item.stores.map(st => {
                      const key = `${item.name}-${st.store_id}`;
                      const ordered = orderedCells.has(key);
                      return (
                        <td key={st.store_id} className="px-2 py-3 text-center">
                          <div
                            onClick={() => {
                              if (st.status !== "ok" && !ordered) handleOrder(item.name, st.store_id);
                            }}
                            className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
                              ordered
                                ? "border-emerald-500/30 bg-emerald-500/10"
                                : statusStyle[st.status]
                            } ${st.status !== "ok" && !ordered ? "cursor-pointer hover:scale-105 tap-scale" : ""}`}
                          >
                            <span className={`kpi-value text-[16px] ${ordered ? "text-emerald-400" : ""}`}>
                              {st.stock}
                            </span>
                            <span className="text-[11px] text-white/30">
                              {ordered ? (
                                <span className="flex items-center gap-0.5 text-emerald-400">
                                  <Check className="w-3 h-3" /> 発注済
                                </span>
                              ) : (
                                <>残{st.days_left}日</>
                              )}
                            </span>
                            {st.status !== "ok" && !ordered && (
                              <span className="text-[8px] text-white/20">{statusLabel[st.status]}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-5 py-4 text-center">
                      <span className="kpi-value text-[18px] text-white/70">{totalStock}<span className="text-[12px] text-white/30 ml-0.5">{item.unit}</span></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500/30" /> 適正 OK
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500/30" /> 残少 Low — クリックで発注
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500/30" /> 欠品 Out — クリックで緊急発注
          </div>
        </div>
      </div>
    </div>
  );
}
