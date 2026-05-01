"use client";

import Link from "next/link";
import { X, ArrowRight, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { type Store, brands } from "@/lib/mock-data";

interface StorePopupProps {
  store: Store;
  position: { x: number; y: number };
  onClose: () => void;
}

export function StorePopup({ store, position, onClose }: StorePopupProps) {
  const brand = brands.find(b => b.brand_id === store.brand);

  return (
    <div
      className="absolute z-30 animate-fade-in"
      style={{
        left: Math.min(position.x, 70) + "%",
        top: Math.min(position.y + 2, 75) + "%",
      }}
    >
      <div className="relative bg-[#141a24]/95 backdrop-blur-sm border border-white/[0.1] rounded-lg shadow-2xl w-72 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <div>
            <div className="text-[13px] font-semibold text-white/90">{store.name}</div>
            <div className="text-[11px] text-white/40">{brand?.name} / {store.location_type} / {store.seats}席</div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.04] mx-3 my-3 rounded overflow-hidden">
          <div className="bg-[#0e1420] p-2.5 text-center">
            <div className="text-[10px] text-white/40">売上</div>
            <div className="kpi-value text-[15px] text-emerald-400 mt-0.5">¥{(store.daily_sales / 10000).toFixed(0)}万</div>
          </div>
          <div className="bg-[#0e1420] p-2.5 text-center">
            <div className="text-[10px] text-white/40">客数</div>
            <div className="kpi-value text-[15px] text-blue-400 mt-0.5">{store.daily_customers}</div>
          </div>
          <div className="bg-[#0e1420] p-2.5 text-center">
            <div className="text-[10px] text-white/40">客単価</div>
            <div className="kpi-value text-[15px] text-white/70 mt-0.5">¥{store.avg_ticket}</div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="px-4 pb-2 space-y-1.5">
          {store.stockout_risk && (
            <div className="flex items-center gap-2 text-[11px] text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              欠品リスクあり
            </div>
          )}
          {store.staff_coverage < 0.9 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400">
              <Users className="w-3.5 h-3.5" />
              人員充足率 {(store.staff_coverage * 100).toFixed(0)}%
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <TrendingUp className="w-3.5 h-3.5" />
            粗利率 {(store.gross_margin * 100).toFixed(1)}%
          </div>
        </div>

        {/* Action */}
        <Link
          href={`/store360?id=${store.store_id}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-white/[0.06] text-[12px] text-blue-400 hover:bg-blue-500/10 transition-colors"
        >
          詳細を見る <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
