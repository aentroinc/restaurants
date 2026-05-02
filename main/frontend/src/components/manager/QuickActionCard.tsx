"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

interface QuickActionCardProps {
  href: string
  label: string
  hint?: string
  icon: LucideIcon
  badge?: number
  tone?: "default" | "danger" | "warning"
}

const toneRing: Record<NonNullable<QuickActionCardProps["tone"]>, string> = {
  default: "border-white/[0.08] hover:border-white/20 bg-white/[0.02]",
  danger: "border-red-500/40 hover:border-red-500/60 bg-red-500/[0.06]",
  warning: "border-amber-500/40 hover:border-amber-500/60 bg-amber-500/[0.06]",
}

const toneIcon: Record<NonNullable<QuickActionCardProps["tone"]>, string> = {
  default: "text-emerald-400/80",
  danger: "text-red-400",
  warning: "text-amber-400",
}

export function QuickActionCard({
  href,
  label,
  hint,
  icon: Icon,
  badge,
  tone = "default",
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={`relative block rounded-xl border ${toneRing[tone]} p-4 transition-colors active:scale-[0.99]`}
    >
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
          {badge}
        </span>
      )}
      <Icon className={`w-7 h-7 ${toneIcon[tone]}`} strokeWidth={1.5} />
      <div className="mt-3 text-[15px] font-semibold text-white/90 leading-tight">{label}</div>
      {hint && <div className="text-[11px] text-white/45 mt-1 leading-snug">{hint}</div>}
      <ArrowRight className="absolute bottom-3 right-3 w-4 h-4 text-white/30" />
    </Link>
  )
}
