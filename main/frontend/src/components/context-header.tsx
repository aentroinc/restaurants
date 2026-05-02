"use client"

import { Clock, Shield, Radio } from "lucide-react"

const REGION_OPTIONS = [
  "全国",
  "首都圏",
  "関西",
  "東海",
  "九州",
  "北海道",
  "東北",
  "中国・四国",
] as const

export type RegionOption = typeof REGION_OPTIONS[number]

interface ContextHeaderProps {
  title: string
  description?: string
  region?: RegionOption | string
  onRegionChange?: (region: RegionOption) => void
  asOf?: string
  liveUpdatedAt?: string
  actions?: React.ReactNode
}

export function ContextHeader({
  title,
  description,
  region,
  onRegionChange,
  asOf,
  liveUpdatedAt,
  actions,
}: ContextHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 h-14 border-b border-white/[0.06] bg-[#0c1017] shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-white/90 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-[11px] text-white/40 mt-0.5 truncate">{description}</p>
          )}
        </div>

        {region !== undefined && onRegionChange && (
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value as RegionOption)}
            className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/70 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-blue-400/40"
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r} value={r} className="bg-[#0c1017] text-white/80">
                {r}
              </option>
            ))}
          </select>
        )}
        {region !== undefined && !onRegionChange && (
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/60">
            {region}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-white/40 shrink-0">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 shrink-0 text-emerald-400 animate-pulse-subtle" />
          <span className="text-emerald-400/90 font-semibold tracking-wider">LIVE</span>
          {liveUpdatedAt && (
            <span className="hidden md:inline text-white/40 font-mono tabular-nums ml-1">
              最終更新 {liveUpdatedAt}
            </span>
          )}
        </span>
        {asOf && (
          <span className="hidden md:flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{asOf}</span>
          </span>
        )}
        <span className="hidden lg:flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          信頼度: High
        </span>
        {actions && <div className="flex items-center gap-2 ml-1 shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
