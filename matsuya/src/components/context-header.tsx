"use client";

import { Clock, Shield, Radio } from "lucide-react";

interface ContextHeaderProps {
  title: string;
  subtitle?: string;
  region?: string;
  brandFilter?: string;
  storeCount?: number;
}

export function ContextHeader({ title, subtitle, region, brandFilter, storeCount }: ContextHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#0c1017] shrink-0">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-[15px] font-bold text-white/90 tracking-wide">{title}</h1>
          {subtitle && <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        {region && (
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/50">{region}</span>
        )}
        {brandFilter && (
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/50">{brandFilter}</span>
        )}
        {storeCount !== undefined && (
          <span className="text-[11px] text-white/40">{storeCount}店舗</span>
        )}
      </div>
      <div className="flex items-center gap-5 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse-subtle" />
          LIVE
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          15分更新
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          信頼度: High
        </span>
        <span>2026-05-01 15:45</span>
      </div>
    </header>
  );
}
