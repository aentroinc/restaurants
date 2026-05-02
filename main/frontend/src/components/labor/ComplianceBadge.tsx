"use client"

import { AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react"

export type ComplianceSeverity = "ok" | "warn" | "block"

const RULE_LABELS: Record<string, string> = {
  ART36_MONTHLY: "36協定 (月)",
  ART36_YEARLY: "36協定 (年)",
  ART36_SPECIAL: "36協定 特別条項",
  BREAK_6H: "休憩 (6h超)",
  BREAK_8H: "休憩 (8h超)",
  MINOR_NIGHT: "未成年深夜",
  CONSECUTIVE_DAYS: "連続勤務",
  INTERVAL_11H: "勤務間インターバル",
  MIN_WAGE: "最低賃金",
}

export function ComplianceBadge({
  severity,
  ruleCode,
  message,
  compact = false,
}: {
  severity: ComplianceSeverity
  ruleCode: string
  message?: string
  compact?: boolean
}) {
  const cfg = {
    ok: { cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Icon: CheckCircle2 },
    warn: { cls: "text-amber-400 bg-amber-400/10 border-amber-400/20", Icon: AlertTriangle },
    block: { cls: "text-red-400 bg-red-400/10 border-red-400/30", Icon: AlertOctagon },
  }[severity]
  const Icon = cfg.Icon
  const label = RULE_LABELS[ruleCode] || ruleCode

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cfg.cls}`}
        title={message || label}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      <span className="font-medium">{label}</span>
      {message && <span className="opacity-80">— {message}</span>}
    </span>
  )
}

export function severityCellClass(severity: ComplianceSeverity | null): string {
  if (severity === "block") return "bg-red-500/30 border-red-500/50 text-red-100"
  if (severity === "warn") return "bg-amber-500/20 border-amber-500/40 text-amber-200"
  return ""
}
