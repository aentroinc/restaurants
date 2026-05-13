"use client"

import { useMemo, useState } from "react"
import type { Course, CourseSimulationResult, PortfolioSimulationResult } from "@/src/types"
import { COURSES } from "@/src/data/courses"
import { CourseCard } from "./CourseCard"

type Filter = {
  id: string
  label: string
  match: (c: Course) => boolean
}

const FILTERS: Filter[] = [
  { id: "all", label: "全コース", match: () => true },
  {
    id: "diagnosis",
    label: "診断・前提整備",
    match: (c) =>
      c.group === "diagnosis" || c.group === "foundation" || c.group === "control",
  },
  { id: "cogs", label: "原価・粗利", match: (c) => c.group === "cogs" || c.group === "menu" },
  { id: "labor", label: "人件費・需要", match: (c) => c.group === "labor" || c.group === "demand" },
  { id: "ops", label: "店舗標準化", match: (c) => c.group === "ops" },
  { id: "growth", label: "売上成長", match: (c) => c.group === "growth" },
  { id: "scm", label: "SCM・食品安全", match: (c) => c.group === "scm" || c.group === "risk" },
  { id: "advanced", label: "高度AI", match: (c) => c.group === "advanced" },
]

type Props = {
  selectedCourseIds: string[]
  results: Record<string, CourseSimulationResult>
  portfolio: PortfolioSimulationResult
  onToggle: (id: string) => void
  onOpenDetail: (id: string) => void
}

export function CourseSelector({
  selectedCourseIds,
  results,
  portfolio,
  onToggle,
  onOpenDetail,
}: Props) {
  const [filter, setFilter] = useState<string>("all")
  const [query, setQuery] = useState<string>("")

  const supersededByMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const inc of portfolio.incrementals) {
      if (inc.suppressedBySupersedes && inc.supersededBy) {
        map[inc.course.id] = inc.supersededBy
      }
    }
    return map
  }, [portfolio])

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0]
    return COURSES.filter((c) => {
      if (!f.match(c)) return false
      if (query.trim().length === 0) return true
      const q = query.trim().toLowerCase()
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      )
    }).sort((a, b) => {
      const an = parseInt(a.id.replace("C", ""), 10)
      const bn = parseInt(b.id.replace("C", ""), 10)
      return an - bn
    })
  }, [filter, query])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-3 justify-between">
        <div>
          <p className="text-[13px] text-ink-700 leading-relaxed max-w-md">
            複数選択時はモジュール重複に応じて費用が控除されます。<span className="text-accent-600 font-semibold">supersedes</span>を持つフルコースは内包される個別コースを自動で重複計算から除外します。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-600 num">
          <span>
            <span className="text-navy-950 font-semibold">{selectedCourseIds.length}</span> 選択
          </span>
          <span className="text-ink-300">·</span>
          <span>全 {COURSES.length} コース</span>
          <span className="text-ink-300">·</span>
          <span>表示 {filtered.length}</span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap items-center">
          {FILTERS.map((f, idx) => {
            const on = filter === f.id
            const count = COURSES.filter(f.match).length
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`relative text-[11px] tracking-wide px-3 py-1.5 transition ${
                  on
                    ? "text-navy-950 font-semibold"
                    : "text-ink-500 hover:text-navy-950"
                } ${idx > 0 ? "before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-px before:bg-ink-200" : ""}`}
              >
                {f.label}
                <span className={`ml-1 num ${on ? "text-accent-600" : "text-ink-400"}`}>{count}</span>
                {on && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent-500" />}
              </button>
            )
          })}
        </div>

        <div className="relative md:w-72">
          <input
            type="search"
            placeholder="C01〜C35・名称・カテゴリで検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pr-6"
          />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-400 text-xs">⌕</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-px bg-ink-200 border-t border-b border-ink-200">
        {filtered.map((c) => {
          const result = results[c.id]
          if (!result) return null
          return (
            <CourseCard
              key={c.id}
              course={c}
              result={result}
              selected={selectedCourseIds.includes(c.id)}
              suppressed={Boolean(supersededByMap[c.id])}
              supersededBy={supersededByMap[c.id]}
              onToggle={() => onToggle(c.id)}
              onOpenDetail={() => onOpenDetail(c.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
