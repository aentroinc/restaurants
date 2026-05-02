"use client"

import { cn } from "@/lib/utils"

export interface QuickOption {
  value: string
  label: string
  icon?: React.ReactNode
  tone?: "default" | "good" | "bad" | "warn"
}

interface Props {
  options: QuickOption[]
  value?: string
  onChange?: (v: string) => void
  columns?: 2 | 3
  multi?: boolean
  values?: string[]
  onMultiChange?: (vs: string[]) => void
}

const toneClass = {
  default: "border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  bad: "border-red-500/30 bg-red-500/10 text-red-200",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
}

const activeClass = "ring-2 ring-emerald-400 bg-emerald-500/20 border-emerald-400 text-white"

export function QuickRadioGrid({
  options,
  value,
  onChange,
  columns = 2,
  multi = false,
  values = [],
  onMultiChange,
}: Props) {
  function toggle(v: string) {
    if (multi && onMultiChange) {
      if (values.includes(v)) onMultiChange(values.filter((x) => x !== v))
      else onMultiChange([...values, v])
    } else if (onChange) {
      onChange(v)
    }
  }

  return (
    <div className={cn("grid gap-3", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => {
        const active = multi ? values.includes(o.value) : value === o.value
        const tone = o.tone || "default"
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "min-h-[72px] rounded-xl border px-3 py-3 text-sm font-medium transition-all active:scale-[0.97] flex flex-col items-center justify-center gap-1",
              toneClass[tone],
              active && activeClass,
            )}
          >
            {o.icon ? <span className="text-xl">{o.icon}</span> : null}
            <span className="text-center leading-tight">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
