"use client"

import { useMemo, useState } from "react"
import type { SimulationInputs } from "@/src/types"
import { COURSE_BY_ID, SYSTEMS } from "@/src/data/courses"
import { calculatePortfolio, calculateStandaloneCourse, ALL_COURSES } from "@/src/lib/calculator"
import { CompanyInputPanel } from "@/src/components/CompanyInputPanel"
import { SystemsChecklist } from "@/src/components/SystemsChecklist"
import { CourseSelector } from "@/src/components/CourseSelector"
import { ResultsSummary } from "@/src/components/ResultsSummary"
import { Charts } from "@/src/components/Charts"
import { CourseDetailDrawer } from "@/src/components/CourseDetailDrawer"

const INITIAL_INPUTS: SimulationInputs = {
  companyName: "",
  annualSalesOku: 500.0,
  operatingProfitOku: 15.0,
  storeCount: 200,
  selectedCourseIds: [],
  selectedSystemIds: SYSTEMS.map((s) => s.id),
  rolloutRate: 1.0,
  adoptionRate: 0.85,
  confidenceLevel: "standard",
  dataReadinessOverride: null,
  capexRatio: 0.65,
  amortizationYears: 5,
  includeAccountingView: true,
}

export default function Page() {
  const [inputs, setInputs] = useState<SimulationInputs>(INITIAL_INPUTS)
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null)

  const updateInputs = (next: Partial<SimulationInputs>) =>
    setInputs((prev) => ({ ...prev, ...next }))

  const toggleCourse = (id: string) =>
    setInputs((prev) => ({
      ...prev,
      selectedCourseIds: prev.selectedCourseIds.includes(id)
        ? prev.selectedCourseIds.filter((x) => x !== id)
        : [...prev.selectedCourseIds, id],
    }))

  const toggleSystem = (id: string) =>
    setInputs((prev) => ({
      ...prev,
      selectedSystemIds: prev.selectedSystemIds.includes(id)
        ? prev.selectedSystemIds.filter((x) => x !== id)
        : [...prev.selectedSystemIds, id],
    }))

  const portfolio = useMemo(() => calculatePortfolio(inputs), [inputs])

  const allCourseResults = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateStandaloneCourse>> = {}
    for (const c of ALL_COURSES) {
      map[c.id] = calculateStandaloneCourse(c, inputs)
    }
    return map
  }, [inputs])

  const detailCourse = detailCourseId ? COURSE_BY_ID[detailCourseId] ?? null : null
  const detailResult = detailCourseId ? allCourseResults[detailCourseId] ?? null : null

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-paper border-b border-ink-300">
        <div className="mx-auto max-w-container px-10 pt-10 pb-8">
          <div className="flex items-end justify-between gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-12 bg-accent-500" aria-hidden />
                <span className="label-eyebrow text-accent-600">Restaurants AI Portfolio · Vol. 01</span>
              </div>
              <h1 className="headline text-[34px] md:text-[42px] leading-[1.05] font-medium text-navy-950">
                外食AI導入<span className="text-ink-500"> / </span>ROIシミュレーター
              </h1>
              <p className="text-sm text-ink-600 mt-4 leading-relaxed text-pretty">
                経営者が自社の売上・営業利益・店舗数に基づき、AI導入コース C01〜C35 の中から複数組み合わせて選択し、初期投資・年間維持費・営業利益改善・回収年数を即時に試算します。
              </p>
            </div>
            <div className="hidden lg:flex items-end gap-10 pb-2">
              <Indicator label="選択コース" value={inputs.selectedCourseIds.length} of={35} />
              <Indicator label="整備済システム" value={inputs.selectedSystemIds.length} of={11} />
              <Indicator label="店舗" value={inputs.storeCount} unit="店舗" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-container px-10 py-10 grid grid-cols-1 xl:grid-cols-12 gap-x-8 gap-y-10">
        <aside className="xl:col-span-3 space-y-10">
          <Block index="01" title="企業プロファイル">
            <CompanyInputPanel inputs={inputs} onChange={updateInputs} />
          </Block>
          <Block index="02" title="既存システム整備状況">
            <SystemsChecklist
              selectedSystemIds={inputs.selectedSystemIds}
              onToggle={toggleSystem}
              onSetAll={(ids) => setInputs((p) => ({ ...p, selectedSystemIds: ids }))}
            />
          </Block>
        </aside>

        <section className="xl:col-span-6 space-y-10">
          <Block index="03" title="AI導入コース ポートフォリオ">
            <CourseSelector
              selectedCourseIds={inputs.selectedCourseIds}
              results={allCourseResults}
              portfolio={portfolio}
              onToggle={toggleCourse}
              onOpenDetail={(id) => setDetailCourseId(id)}
            />
          </Block>

          {portfolio.courseResults.length > 0 && (
            <Block index="04" title="ファイナンシャル・チャート">
              <Charts portfolio={portfolio} inputs={inputs} />
            </Block>
          )}
        </section>

        <aside className="xl:col-span-3">
          <div className="xl:sticky xl:top-6 space-y-6">
            <ResultsSummary portfolio={portfolio} inputs={inputs} />
            {portfolio.courseResults.length > 0 && (
              <SelectedList
                portfolio={portfolio}
                onRemove={toggleCourse}
                onOpenDetail={(id) => setDetailCourseId(id)}
              />
            )}
          </div>
        </aside>
      </div>

      <footer className="border-t border-ink-300 bg-paper">
        <div className="mx-auto max-w-container px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] text-ink-500">
          <div>
            <div className="label-eyebrow text-ink-700 mb-2">免責事項</div>
            <p className="leading-relaxed">
              本結果は概算シミュレーションであり、最終見積・効果保証ではありません。実際の費用および効果は、システム連携状況、データ品質、現場定着度、競合環境により変動します。
            </p>
          </div>
          <div>
            <div className="label-eyebrow text-ink-700 mb-2">前提</div>
            <p className="leading-relaxed">
              中央値ベース計算、基準店舗数 299、信頼度係数 0.75/1.00/1.20、グループ内逓減 1.0/0.6/0.4/0.25/0.15、営業利益上限 売上の2.0%。
            </p>
          </div>
          <div>
            <div className="label-eyebrow text-ink-700 mb-2">確定プロセス</div>
            <p className="leading-relaxed">
              最終見積はシステム連携・マスタ整備状況の確認を経て確定します。本資料はその前段の方向性把握を目的とします。
            </p>
          </div>
        </div>
      </footer>

      <CourseDetailDrawer
        course={detailCourse}
        result={detailResult}
        selected={detailCourseId ? inputs.selectedCourseIds.includes(detailCourseId) : false}
        onClose={() => setDetailCourseId(null)}
        onToggle={() => detailCourseId && toggleCourse(detailCourseId)}
      />
    </main>
  )
}

function Block({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex items-baseline gap-3 mb-4 border-b border-ink-300 pb-2">
        <span className="font-mono text-[11px] text-accent-600 num">{index}</span>
        <h2 className="label-section">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function Indicator({
  label,
  value,
  of,
  unit,
}: {
  label: string
  value: number
  of?: number
  unit?: string
}) {
  return (
    <div className="text-right">
      <div className="label-eyebrow text-ink-500 mb-1">{label}</div>
      <div className="num text-[22px] leading-none font-medium text-navy-950 tracking-tightheadline">
        {value.toLocaleString("ja-JP")}
        {of !== undefined && (
          <span className="text-ink-400 text-sm font-normal ml-1">/ {of}</span>
        )}
        {unit && <span className="text-ink-400 text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  )
}

function SelectedList({
  portfolio,
  onRemove,
  onOpenDetail,
}: {
  portfolio: ReturnType<typeof calculatePortfolio>
  onRemove: (id: string) => void
  onOpenDetail: (id: string) => void
}) {
  return (
    <section className="panel rounded-none p-6 space-y-3">
      <header className="flex items-baseline justify-between border-b border-ink-200 pb-2">
        <h3 className="label-section">選択中のコース</h3>
        <span className="text-[11px] text-ink-500 num">{portfolio.courseResults.length} 件</span>
      </header>
      <ul className="divide-y divide-ink-200">
        {portfolio.courseResults.map((r) => {
          const suppressed = portfolio.suppressedCourseIds.includes(r.course.id)
          return (
            <li
              key={r.course.id}
              className="flex items-center justify-between gap-2 text-xs py-2"
            >
              <button
                type="button"
                className="text-left flex-1 truncate group"
                onClick={() => onOpenDetail(r.course.id)}
                title={r.course.name}
              >
                <span className="font-mono text-[10.5px] text-accent-600 mr-2">{r.course.id}</span>
                <span className="text-ink-900 group-hover:underline underline-offset-2">
                  {r.course.name}
                </span>
                {suppressed && (
                  <span className="ml-1.5 text-[9.5px] uppercase tracking-wider text-amber-700">
                    内包
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(r.course.id)}
                className="text-ink-400 hover:text-ink-900 text-base leading-none px-1"
                aria-label="削除"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
