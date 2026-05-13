"use client"

import { useEffect } from "react"
import type { Course, CourseSimulationResult } from "@/src/types"
import { MODULE_BY_ID, SYSTEM_BY_ID, COURSE_BY_ID } from "@/src/data/courses"
import { formatOkuYenShort, formatPct } from "@/src/lib/formatting"

type Props = {
  course: Course | null
  result: CourseSimulationResult | null
  selected: boolean
  onClose: () => void
  onToggle: () => void
}

export function CourseDetailDrawer({ course, result, selected, onClose, onToggle }: Props) {
  useEffect(() => {
    if (!course) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onEsc)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onEsc)
      document.body.style.overflow = ""
    }
  }, [course, onClose])

  if (!course || !result) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl bg-paper h-full overflow-y-auto shadow-2xl border-l border-ink-300">
        <header className="sticky top-0 bg-paper border-b border-ink-300 px-8 py-6 flex items-start justify-between gap-4 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10.5px] text-ink-500 uppercase tracking-[0.18em]">
              <span className="font-mono font-semibold text-accent-600">{course.id}</span>
              <span className="text-ink-300">·</span>
              <span>Level {course.level}</span>
              <span className="text-ink-300">·</span>
              <span>{course.category}</span>
            </div>
            <h3 className="headline text-2xl font-medium text-navy-950 mt-2 tracking-tightheadline leading-tight">
              {course.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-500 hover:text-navy-950 text-2xl leading-none px-1"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="px-8 py-7 space-y-8">
          <section>
            <div className="label-eyebrow mb-3">主要指標（中央値）</div>
            <div className="grid grid-cols-2 gap-px bg-ink-200 border border-ink-200">
              <Metric label="初期費用" value={formatOkuYenShort(result.initialMedianOku)} />
              <Metric label="年間維持費" value={formatOkuYenShort(result.maintenanceMedianOku)} />
              <Metric label="売上インパクト" value={formatPct(result.salesImpactMedianPct, 2)} />
              <Metric label="営業利益インパクト" value={formatPct(result.opProfitImpactMedianPctOfSales, 2)} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-ink-200 pt-5 text-sm">
            <Spec label="初期費用レンジ" value={`${course.initialCostOkuLow.toFixed(2)}〜${course.initialCostOkuHigh.toFixed(2)}億`} />
            <Spec label="維持費レンジ" value={`${course.annualMaintOkuLow.toFixed(2)}〜${course.annualMaintOkuHigh.toFixed(2)}億`} />
            <Spec label="工数" value={`${course.personMonthsLow}〜${course.personMonthsHigh} 人月`} />
            <Spec label="Start Rank" value={course.startRank} />
          </section>

          <section>
            <div className="label-eyebrow mb-3">含まれるモジュール</div>
            <ul className="divide-y divide-ink-200 border-t border-b border-ink-200">
              {course.modules.map((mid) => (
                <li key={mid} className="py-2.5 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-accent-600 w-10">{mid}</span>
                  <span className="text-sm text-navy-950">{MODULE_BY_ID[mid]?.name ?? mid}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="label-eyebrow mb-3">必要な前提システム</div>
            {course.requiredSystems.length === 0 ? (
              <p className="text-sm text-ink-500">特になし</p>
            ) : (
              <ul className="divide-y divide-ink-200 border-t border-b border-ink-200">
                {course.requiredSystems.map((sid) => {
                  const missing = result.missingSystems.includes(sid)
                  return (
                    <li
                      key={sid}
                      className="py-2.5 flex items-center gap-3"
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          missing ? "bg-amber-500" : "bg-positive"
                        }`}
                      />
                      <span className="font-mono text-[11px] text-accent-600 w-14">{sid}</span>
                      <span className="text-sm text-navy-950 flex-1">{SYSTEM_BY_ID[sid]?.name ?? sid}</span>
                      <span
                        className={`text-[10px] uppercase tracking-wider ${
                          missing ? "text-amber-700" : "text-positive"
                        }`}
                      >
                        {missing ? "不足" : "充足"}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {course.prerequisiteCourses.length > 0 && (
            <section>
              <div className="label-eyebrow mb-3">前提コース</div>
              <ul className="divide-y divide-ink-200 border-t border-b border-ink-200">
                {course.prerequisiteCourses.map((pid) => (
                  <li key={pid} className="py-2.5 flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-accent-600 w-10">{pid}</span>
                    <span className="text-sm text-navy-950">{COURSE_BY_ID[pid]?.name ?? pid}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.supersedes && course.supersedes.length > 0 && (
            <section className="bg-amber-50 border-l-2 border-amber-500 p-4">
              <div className="label-eyebrow text-amber-800 mb-1">内包するコース</div>
              <p className="text-xs text-amber-900 leading-relaxed">
                以下のコース範囲を含むため、同時選択時は費用計算から重複控除されます: {course.supersedes.join(", ")}
              </p>
            </section>
          )}

          <section className="border-t border-ink-200 pt-5 text-xs text-ink-600 leading-relaxed">
            <div className="label-eyebrow mb-2">注意点</div>
            数値はベンチマーク中央値です。実際の効果はデータ整備状況、現場定着、競合環境、季節要因に依存します。最終見積はシステム連携・マスタ整備状況確認後に確定します。
          </section>

          <button
            type="button"
            onClick={onToggle}
            className={`w-full py-3.5 text-sm font-semibold tracking-wide transition ${
              selected
                ? "bg-white text-navy-950 border border-ink-400 hover:border-navy-950"
                : "bg-navy-950 text-white hover:bg-navy-900"
            }`}
          >
            {selected ? "このコースの選択を解除" : "このコースをポートフォリオに追加"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500 font-medium">{label}</div>
      <div className="headline num text-xl font-medium text-navy-950 mt-1 tracking-tightheadline">
        {value}
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-medium">{label}</div>
      <div className="num text-sm text-navy-950 font-medium mt-0.5">{value}</div>
    </div>
  )
}
