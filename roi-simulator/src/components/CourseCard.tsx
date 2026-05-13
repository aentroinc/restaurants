"use client"

import type { Course, CourseSimulationResult } from "@/src/types"
import { formatOkuYenShort, formatPct } from "@/src/lib/formatting"

type Props = {
  course: Course
  result: CourseSimulationResult
  selected: boolean
  suppressed?: boolean
  supersededBy?: string
  onToggle: () => void
  onOpenDetail: () => void
}

const RANK_LABEL: Record<string, string> = {
  A: "即実行",
  B: "短期",
  C: "中期",
  D: "高難度",
}

const RANK_DOT: Record<string, string> = {
  A: "bg-positive",
  B: "bg-navy-500",
  C: "bg-accent-500",
  D: "bg-negative",
}

export function CourseCard({
  course,
  result,
  selected,
  suppressed,
  supersededBy,
  onToggle,
  onOpenDetail,
}: Props) {
  return (
    <article
      className={`relative bg-white p-5 transition flex flex-col gap-3.5 ${
        selected ? "ring-1 ring-navy-950" : ""
      } ${suppressed ? "opacity-50" : ""}`}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-500" />}

      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-semibold text-accent-600 tracking-wider">
              {course.id}
            </span>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1 text-[10px] text-ink-600 uppercase tracking-wider">
              <span className={`inline-block h-1 w-1 rounded-full ${RANK_DOT[course.startRank]}`} />
              {course.startRank} {RANK_LABEL[course.startRank]}
            </span>
            <span className="text-ink-300">·</span>
            <span className="text-[10px] text-ink-500 tracking-wide">{course.category}</span>
          </div>
          <h3 className="headline text-[15px] font-medium text-navy-950 leading-snug">
            {course.name}
          </h3>
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          onClick={onToggle}
          className={`shrink-0 h-5 w-5 border flex items-center justify-center transition ${
            selected
              ? "bg-navy-950 border-navy-950 text-white"
              : "bg-white border-ink-400 hover:border-navy-950"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </header>

      {suppressed && supersededBy && (
        <div className="text-[10.5px] text-amber-800 bg-amber-50 border-l-2 border-amber-500 px-2 py-1">
          {supersededBy} に内包 — 費用計算から除外
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-200 pt-3">
        <Metric label="初期費用" value={formatOkuYenShort(result.initialMedianOku)} />
        <Metric label="年間維持費" value={formatOkuYenShort(result.maintenanceMedianOku)} />
        <Metric
          label="売上 Δ%"
          value={formatPct(result.salesImpactMedianPct, 2)}
          accent={result.salesImpactMedianPct > 0 ? "pos" : undefined}
        />
        <Metric
          label="営業利益 Δ%"
          value={formatPct(result.opProfitImpactMedianPctOfSales, 2)}
          accent={result.opProfitImpactMedianPctOfSales > 0 ? "pos" : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {course.modules.map((m) => (
          <span
            key={m}
            className="text-[9.5px] font-mono text-ink-500 px-1 py-px border-b border-ink-200"
          >
            {m}
          </span>
        ))}
      </div>

      {result.missingSystems.length > 0 && (
        <div className="text-[10.5px] text-amber-900 border-l-2 border-amber-500 pl-2 leading-snug">
          <span className="font-semibold tracking-wide uppercase">前提SYS不足 </span>
          {result.missingSystems.join(" · ")}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenDetail}
        className="self-start text-[11px] text-ink-600 hover:text-navy-950 underline underline-offset-4 decoration-ink-300 hover:decoration-navy-950"
      >
        詳細を見る
      </button>
    </article>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "pos" | "neg"
}) {
  const color =
    accent === "pos" ? "text-positive" : accent === "neg" ? "text-negative" : "text-navy-950"
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-500 font-medium">
        {label}
      </div>
      <div className={`text-[15px] font-medium num mt-0.5 ${color} tracking-tightheadline`}>
        {value}
      </div>
    </div>
  )
}
