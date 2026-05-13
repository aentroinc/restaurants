"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PortfolioSimulationResult, SimulationInputs } from "@/src/types"
import { formatOkuYen } from "@/src/lib/formatting"

type Props = {
  portfolio: PortfolioSimulationResult
  inputs: SimulationInputs
}

const TICK = { fontSize: 10.5, fill: "#475569", fontFamily: "ui-sans-serif" }
const GRID = "#e2e8f0"

const TOOLTIP_CONTENT = {
  background: "#040a14",
  border: "1px solid #11253e",
  borderRadius: 0,
  fontSize: 12,
  padding: "10px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
}
const TOOLTIP_LABEL = {
  color: "#bfa264",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  marginBottom: 6,
}
const TOOLTIP_ITEM = { color: "#ffffff", fontWeight: 600 }

export function Charts({ portfolio, inputs }: Props) {
  if (portfolio.courseResults.length === 0) {
    return null
  }

  const beforeAfter = [
    { label: "現状", value: round(inputs.operatingProfitOku), fill: "#94a3b8" },
    {
      label: "AI導入後",
      value: round(inputs.operatingProfitOku + portfolio.netAnnualOpProfitIncreaseOku),
      fill: "#0f6b46",
    },
  ]

  const costVsBenefit = [
    { label: "初期費用", value: round(portfolio.portfolioInitialCostOku), fill: "#0c1b2e" },
    { label: "年間維持費", value: round(portfolio.portfolioAnnualMaintenanceOku), fill: "#456081" },
    { label: "営業利益改善", value: round(portfolio.adjustedGrossOpProfitIncreaseOku), fill: "#a4863f" },
    { label: "正味年間効果", value: round(portfolio.netAnnualOpProfitIncreaseOku), fill: "#0f6b46" },
  ]

  const ranked = portfolio.courseResults
    .filter((r) => !portfolio.suppressedCourseIds.includes(r.course.id))
    .map((r) => ({
      label: `${r.course.id}  ${r.course.name}`,
      value: round(r.standaloneOpProfitIncreaseOku),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-ink-200 border-t border-b border-ink-200">
      <ChartCard
        exhibit="Exhibit A"
        title="Before / After 営業利益"
        sub="単位：億円 · 中央値"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={beforeAfter} margin={{ top: 16, right: 24, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={TICK}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis tick={TICK} tickFormatter={(v) => `${v}`} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(15,23,42,0.04)" }}
              formatter={(v: number) => [formatOkuYen(v), ""]}
              separator=""
              contentStyle={TOOLTIP_CONTENT}
              labelStyle={TOOLTIP_LABEL}
              itemStyle={TOOLTIP_ITEM}
            />
            <Bar dataKey="value">
              {beforeAfter.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        exhibit="Exhibit B"
        title="コストと効果の比較"
        sub="単位：億円"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={costVsBenefit} margin={{ top: 16, right: 24, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ ...TICK, fontSize: 10 }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis tick={TICK} tickFormatter={(v) => `${v}`} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(15,23,42,0.04)" }}
              formatter={(v: number) => [formatOkuYen(v), ""]}
              separator=""
              contentStyle={TOOLTIP_CONTENT}
              labelStyle={TOOLTIP_LABEL}
              itemStyle={TOOLTIP_ITEM}
            />
            <Bar dataKey="value">
              {costVsBenefit.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        exhibit="Exhibit C"
        title="コース別 営業利益貢献ランキング"
        sub="単独効果（重複控除前）· 上位10コース · 単位：億円"
        wide
      >
        <ResponsiveContainer width="100%" height={Math.max(240, ranked.length * 36)}>
          <BarChart data={ranked} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={GRID} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK}
              tickFormatter={(v) => `${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...TICK, fontSize: 11 }}
              width={260}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(15,23,42,0.04)" }}
              formatter={(v: number) => [formatOkuYen(v), ""]}
              separator=""
              contentStyle={TOOLTIP_CONTENT}
              labelStyle={TOOLTIP_LABEL}
              itemStyle={TOOLTIP_ITEM}
            />
            <Bar dataKey="value" fill="#0c1b2e" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function ChartCard({
  exhibit,
  title,
  sub,
  children,
  wide,
}: {
  exhibit: string
  title: string
  sub?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={`bg-white p-6 ${wide ? "lg:col-span-2" : ""}`}>
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-ink-200 pb-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-accent-600 font-semibold">
            {exhibit}
          </div>
          <h3 className="headline text-base font-medium text-navy-950 mt-0.5">{title}</h3>
        </div>
        {sub && <span className="text-[10px] text-ink-500 text-right max-w-[18ch]">{sub}</span>}
      </header>
      {children}
    </div>
  )
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
