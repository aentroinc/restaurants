"use client"

import { Check, AlertTriangle, Sparkles, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ScenarioMetric {
  metric: string
  value: string | number
  unit?: string
}

export interface Scenario {
  id: string
  label: string
  description: string
  pros: string[]
  cons: string[]
  expected_impact: ScenarioMetric[]
  confidence: "High" | "Medium" | "Low"
  risk: "Low" | "Medium" | "High"
  recommended?: boolean
}

interface ScenarioComparisonProps {
  title: string
  scenarios: Scenario[]
  onSelect: (id: string) => void
  selectedId?: string
}

const confidenceColor = {
  High: "text-emerald-400 bg-emerald-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  Low: "text-red-400 bg-red-400/10",
}

const riskColor = {
  Low: "text-emerald-400 bg-emerald-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  High: "text-red-400 bg-red-400/10",
}

const confidenceLabel = { High: "高", Medium: "中", Low: "低" }
const riskLabel = { Low: "低", Medium: "中", High: "高" }

export function ScenarioComparison({
  title,
  scenarios,
  onSelect,
  selectedId,
}: ScenarioComparisonProps) {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <h3 className="text-[15px] font-semibold tracking-tight text-white/85">{title}</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
          {scenarios.length} シナリオ比較
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const isSelected = selectedId === s.id
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "flex flex-col text-left rounded-lg border p-4 transition-all",
                isSelected
                  ? "border-blue-400/60 bg-blue-500/[0.06] ring-1 ring-blue-400/40"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13px] font-semibold text-white/85 tracking-tight">
                      {s.label}
                    </h4>
                    {s.recommended && (
                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase">
                        推奨
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{s.description}</p>
                </div>
                {isSelected && (
                  <div className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                )}
              </div>

              {/* Confidence / Risk */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-medium",
                    confidenceColor[s.confidence]
                  )}
                >
                  信頼度: {confidenceLabel[s.confidence]}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-medium",
                    riskColor[s.risk]
                  )}
                >
                  リスク: {riskLabel[s.risk]}
                </span>
              </div>

              {/* Expected Impact (table) */}
              <div className="mb-3">
                <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5">
                  期待効果
                </div>
                <div className="rounded-md border border-white/[0.06] overflow-hidden">
                  {s.expected_impact.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 text-[11px]",
                        i !== s.expected_impact.length - 1 && "border-b border-white/[0.04]"
                      )}
                    >
                      <span className="text-white/50">{m.metric}</span>
                      <span className="font-mono tabular-nums text-white/85">
                        {m.value}
                        {m.unit && <span className="text-white/40 ml-0.5">{m.unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros */}
              <div className="mb-2">
                <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400/70" />
                  メリット
                </div>
                <ul className="space-y-1">
                  {s.pros.map((p, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-white/60 flex items-start gap-1.5 leading-relaxed"
                    >
                      <span className="text-emerald-400/70 shrink-0 mt-0.5">+</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="mt-auto">
                <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400/70" />
                  デメリット
                </div>
                <ul className="space-y-1">
                  {s.cons.map((c, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-white/60 flex items-start gap-1.5 leading-relaxed"
                    >
                      <span className="text-amber-400/70 shrink-0 mt-0.5">-</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
