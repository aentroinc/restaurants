"use client"

import type { PortfolioSimulationResult, SimulationInputs } from "@/src/types"
import { SYSTEM_BY_ID } from "@/src/data/courses"
import { formatOkuYen, formatPct, formatYears } from "@/src/lib/formatting"

type Props = {
  portfolio: PortfolioSimulationResult
  inputs: SimulationInputs
}

export function ResultsSummary({ portfolio, inputs }: Props) {
  const hasSelection = portfolio.courseResults.length > 0
  const showOpRatio =
    inputs.operatingProfitOku > 0 && portfolio.opProfitIncreasePctOfCurrentProfit !== null

  if (!hasSelection) {
    return (
      <aside className="panel-dark p-7 space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-accent-400" aria-hidden />
          <span className="label-eyebrow text-accent-200">Investment Thesis</span>
        </div>
        <h3 className="headline text-2xl font-medium leading-tight tracking-tightheadline">
          投資対効果サマリー
        </h3>
        <p className="text-[12.5px] text-ink-300 leading-relaxed">
          中央のカードから AI 導入コースを1つ以上選択してください。初期投資・年間維持費・営業利益改善・キャッシュ回収年数を即時に算出します。
        </p>
      </aside>
    )
  }

  const confidenceLabel =
    inputs.confidenceLevel === "conservative"
      ? "保守的"
      : inputs.confidenceLevel === "aggressive"
        ? "強気"
        : "標準"

  return (
    <aside className="panel-dark p-7 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-accent-400" aria-hidden />
          <span className="label-eyebrow text-accent-200">Investment Thesis</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="headline text-2xl font-medium leading-tight tracking-tightheadline">
            投資対効果サマリー
          </h3>
          <span className="text-[10px] text-ink-400 num">{portfolio.courseResults.length}コース</span>
        </div>
        <p className="text-[10.5px] text-ink-400">
          中央値ベース · 信頼度 {confidenceLabel} · 展開 {Math.round(inputs.rolloutRate * 100)}% · 定着 {Math.round(inputs.adoptionRate * 100)}%
        </p>
      </header>

      <div className="space-y-5">
        <Hero
          label="正味年間効果"
          accent={portfolio.netAnnualOpProfitIncreaseOku > 0 ? "pos" : "neg"}
          value={formatOkuYen(portfolio.netAnnualOpProfitIncreaseOku)}
          sub="営業利益改善 − 年間維持費"
        />
        <div className="grid grid-cols-2 gap-4 border-t border-navy-800 pt-5">
          <Hero
            small
            label="キャッシュ回収"
            value={formatYears(portfolio.paybackYears)}
            sub="初期費用 ÷ 正味効果"
            accent={portfolio.paybackYears && portfolio.paybackYears <= 3 ? "pos" : undefined}
          />
          <Hero
            small
            label="営業利益改善"
            value={formatOkuYen(portfolio.adjustedGrossOpProfitIncreaseOku)}
            sub={
              showOpRatio
                ? `対営業利益 +${portfolio.opProfitIncreasePctOfCurrentProfit!.toFixed(0)}%`
                : "維持費控除前"
            }
            accent="pos"
          />
        </div>
      </div>

      <div className="border-t border-navy-800 pt-5">
        <div className="label-eyebrow text-ink-400 mb-3">主要指標</div>
        <dl className="divide-y divide-navy-800">
          <Row k="初期導入費用" v={formatOkuYen(portfolio.portfolioInitialCostOku)} />
          <Row k="年間維持費" v={formatOkuYen(portfolio.portfolioAnnualMaintenanceOku)} />
          <Row
            k="売上増加見込み"
            v={formatOkuYen(portfolio.adjustedSalesIncreaseOku)}
            sub={`対売上 +${((portfolio.adjustedSalesIncreaseOku / inputs.annualSalesOku) * 100).toFixed(2)}%`}
          />
        </dl>
      </div>

      {(portfolio.initialSavingsOku > 0 || portfolio.maintenanceSavingsOku > 0) && (
        <div className="border-t border-navy-800 pt-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="label-eyebrow text-ink-400">モジュール重複控除</span>
            <span className="text-[10px] text-ink-500">単独合算 → 控除後</span>
          </div>
          <dl className="space-y-2 text-[11.5px]">
            <Saving
              label="初期費用"
              naive={portfolio.naiveInitialSumOku}
              adjusted={portfolio.portfolioInitialCostOku}
              ratio={portfolio.initialSavingsRatio}
            />
            <Saving
              label="年間維持費"
              naive={portfolio.naiveMaintenanceSumOku}
              adjusted={portfolio.portfolioAnnualMaintenanceOku}
              ratio={portfolio.maintenanceSavingsRatio}
            />
          </dl>
        </div>
      )}

      {inputs.includeAccountingView && (
        <div className="border-t border-navy-800 pt-5">
          <div className="label-eyebrow text-ink-400 mb-3">会計上のPL効果（償却ビュー）</div>
          <dl className="divide-y divide-navy-800">
            <Row k="資産計上額" v={formatOkuYen(portfolio.capitalizedCostOku)} />
            <Row k="初年度費用化額" v={formatOkuYen(portfolio.expenseAtStartOku)} />
            <Row k={`年間償却費（${inputs.amortizationYears}年）`} v={formatOkuYen(portfolio.annualAmortizationOku)} />
            <Row
              k="PL改善（償却控除後）"
              v={formatOkuYen(portfolio.plAfterMaintenanceAndAmortizationOku)}
              accent={portfolio.plAfterMaintenanceAndAmortizationOku > 0 ? "pos" : "neg"}
            />
          </dl>
        </div>
      )}

      {portfolio.missingSystemIds.length > 0 && (
        <div className="border-t border-navy-800 pt-5 space-y-2">
          <div className="label-eyebrow text-amber-200">不足している前提システム</div>
          <ul className="space-y-1 text-[11px] text-amber-100/90">
            {portfolio.missingSystemIds.map((sid) => (
              <li key={sid} className="flex items-baseline gap-2">
                <span className="font-mono text-amber-300">{sid}</span>
                <span>{SYSTEM_BY_ID[sid]?.name ?? sid}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {portfolio.suppressedCourseIds.length > 0 && (
        <div className="border-t border-navy-800 pt-5">
          <div className="label-eyebrow text-ink-400 mb-1.5">重複控除コース</div>
          <div className="text-[11px] text-ink-300">
            {portfolio.suppressedCourseIds.join(", ")} はフルコースに内包されるため費用計算から除外
          </div>
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-ink-500 border-t border-navy-800 pt-4">
        シミュレーション上の改善見込み。既存データ品質と現場定着を前提とした概算で、最終見積・効果保証ではありません。
      </p>
    </aside>
  )
}

function Hero({
  label,
  value,
  sub,
  accent,
  small,
}: {
  label: string
  value: string
  sub?: string
  accent?: "pos" | "neg"
  small?: boolean
}) {
  const color =
    accent === "pos" ? "text-accent-200" : accent === "neg" ? "text-rose-300" : "text-white"
  return (
    <div>
      <div className="label-eyebrow text-ink-400">{label}</div>
      <div
        className={`headline num mt-1 ${color} tracking-tightheadline ${
          small ? "text-2xl" : "text-[40px] leading-[1]"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-1.5">{sub}</div>}
    </div>
  )
}

function Row({
  k,
  v,
  sub,
  accent,
}: {
  k: string
  v: string
  sub?: string
  accent?: "pos" | "neg"
}) {
  const color =
    accent === "pos" ? "text-accent-200" : accent === "neg" ? "text-rose-300" : "text-white"
  return (
    <div className="flex items-baseline justify-between py-2 first:pt-0 last:pb-0">
      <div className="text-[11.5px] text-ink-300">
        {k}
        {sub && <div className="text-[10px] text-ink-500 mt-0.5">{sub}</div>}
      </div>
      <span className={`font-semibold num text-sm ${color}`}>{v}</span>
    </div>
  )
}

function Saving({
  label,
  naive,
  adjusted,
  ratio,
}: {
  label: string
  naive: number
  adjusted: number
  ratio: number
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-400 shrink-0 text-[11px]">{label}</span>
      <div className="flex items-baseline gap-1.5 num text-right">
        <span className="text-ink-500 line-through">{formatOkuYen(naive)}</span>
        <span className="text-ink-500">→</span>
        <span className="text-white font-semibold">{formatOkuYen(adjusted)}</span>
        <span className="text-accent-300 text-[10px] ml-1">−{formatPct(ratio * 100, 0)}</span>
      </div>
    </div>
  )
}
