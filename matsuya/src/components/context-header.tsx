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
    <header className="flex items-center justify-between px-6 h-12 border-b border-white/[0.06] bg-[#0c1017]">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-semibold text-white/90 tracking-wide">{title}</h1>
          {subtitle && <p className="text-[10px] text-white/40">{subtitle}</p>}
        </div>
        {region && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/50">{region}</span>
        )}
        {brandFilter && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/50">{brandFilter}</span>
        )}
        {storeCount !== undefined && (
          <span className="text-[10px] text-white/40">{storeCount} stores</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse-subtle" />
          LIVE
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          15min refresh
        </span>
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Confidence: High
        </span>
        <span>2026-05-01 15:45 JST</span>
      </div>
    </header>
  );
}
