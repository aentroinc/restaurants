"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import {
  fetchHeatmap,
  fetchAlerts,
  type HeatmapData,
  type VarianceAlert,
  type RootCauseHint,
} from "@/lib/food-cost-api"
import { AlertTriangle, ArrowRight, Flame } from "lucide-react"

const DEFAULT_PERIOD = "2026-04-30"

const HINT_LABEL: Record<RootCauseHint, string> = {
  over_portion: "過量盛り",
  theft: "横流し疑い",
  waste: "廃棄/ロス",
  recipe_drift: "レシピ乖離",
  ok: "正常",
}

const HINT_COLOR: Record<RootCauseHint, string> = {
  over_portion: "text-red-300 bg-red-500/15 border-red-400/30",
  theft: "text-orange-300 bg-orange-500/15 border-orange-400/30",
  waste: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  recipe_drift: "text-blue-300 bg-blue-500/15 border-blue-400/30",
  ok: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
}

function cellColor(pct: number): string {
  // Negative pct (actual > theoretical = over usage) -> red.
  // Positive pct (actual < theoretical = potential theft) -> orange.
  // small abs -> green-ish neutral.
  const abs = Math.abs(pct)
  if (abs < 0.03) return "bg-emerald-500/10 text-emerald-200/80"
  if (pct < 0) {
    if (abs >= 0.20) return "bg-red-500/60 text-white"
    if (abs >= 0.10) return "bg-red-500/35 text-red-100"
    return "bg-red-500/15 text-red-200/80"
  }
  if (abs >= 0.25) return "bg-orange-500/60 text-white"
  if (abs >= 0.15) return "bg-orange-500/35 text-orange-100"
  return "bg-amber-500/15 text-amber-200/80"
}

export default function FoodCostHeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [alerts, setAlerts] = useState<VarianceAlert[]>([])
  const [period] = useState<string>(DEFAULT_PERIOD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchHeatmap(period), fetchAlerts("high", 10)])
      .then(([h, a]) => {
        setData(h)
        setAlerts(a)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [period])

  const cellLookup = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Map.prototype.get>>()
    if (!data) return map as unknown as Map<string, HeatmapData["cells"][number]>
    for (const c of data.cells) {
      map.set(`${c.store_id}|${c.ingredient_id}`, c)
    }
    return map as unknown as Map<string, HeatmapData["cells"][number]>
  }, [data])

  if (loading) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="フードコスト分析" description="BOM × 販売 × 棚卸の差分ヒートマップ" />
        <LoadingState />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="フードコスト分析" description="BOM × 販売 × 棚卸の差分ヒートマップ" />
        <ErrorState message={error || undefined} />
      </div>
    )
  }

  const totalLoss = data.cells.reduce((s, c) => s + (c.cost_diff < 0 ? Math.abs(c.cost_diff) : 0), 0)
  const overPortionCount = data.cells.filter((c) => c.root_cause_hint === "over_portion").length
  const theftCount = data.cells.filter((c) => c.root_cause_hint === "theft").length

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title="フードコスト分析"
        description="BOM × 販売数で理論原価を毎日算出 → 実棚卸との差分で漏れを可視化"
      />

      <div className="px-5 py-5 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">分析期間</div>
            <div className="font-mono tabular-nums text-base text-white/85 mt-1">{data.period}</div>
            <div className="text-[10px] text-white/30 mt-1">直近7日 ローリング</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">対象店舗</div>
            <div className="font-mono tabular-nums text-base text-white/85 mt-1">{data.stores.length}店</div>
            <div className="text-[10px] text-white/30 mt-1">食材 {data.ingredients.length}品目</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-red-500/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-wider text-red-300/70">推定機会損失</div>
            <div className="font-mono tabular-nums text-base text-red-200 mt-1">¥{totalLoss.toLocaleString()}</div>
            <div className="text-[10px] text-red-200/50 mt-1">期間内・全店合算</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">高リスク件数</div>
            <div className="font-mono tabular-nums text-base text-white/85 mt-1">
              <span className="text-red-300">過量 {overPortionCount}</span>
              <span className="text-white/30"> / </span>
              <span className="text-orange-300">横流し {theftCount}</span>
            </div>
            <div className="text-[10px] text-white/30 mt-1">推定（root_cause_hint）</div>
          </div>
        </div>

        {/* Top 10 alerts */}
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" strokeWidth={1.5} />
              <span className="text-[12px] font-semibold text-white/85">TOP10 アラート（severity = high）</span>
            </div>
            <span className="text-[10px] text-white/40">クリックで店舗詳細へ</span>
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-white/40">高リスク該当なし</div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/food-cost/${a.store_id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${HINT_COLOR[a.root_cause_hint]}`}>
                      {HINT_LABEL[a.root_cause_hint]}
                    </span>
                    <span className="text-[12px] text-white/85 truncate min-w-[180px]">{a.store_name}</span>
                    <span className="text-[12px] text-white/60 truncate">{a.ingredient_name}</span>
                    <span className="ml-auto text-[12px] font-mono tabular-nums text-white/50">
                      {(a.variance_pct * 100).toFixed(1)}%
                    </span>
                    <span className={`text-[12px] font-mono tabular-nums ${a.cost_diff < 0 ? "text-red-300" : "text-orange-300"}`}>
                      {a.cost_diff < 0 ? "-" : "+"}¥{Math.abs(a.cost_diff).toLocaleString()}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/30" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Heatmap */}
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              <span className="text-[12px] font-semibold text-white/85">店舗 × 食材 ヒートマップ</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/50">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/60" />過量盛り</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500/60" />横流し疑い</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/30" />正常</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left sticky left-0 bg-[#0c1017] px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">
                    店舗
                  </th>
                  {data.ingredients.map((ig) => (
                    <th key={ig.id} className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">
                      {ig.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stores.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.03]">
                    <td className="sticky left-0 bg-[#0a0e14] px-3 py-1.5 align-middle">
                      <Link href={`/food-cost/${s.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                        {s.name}
                      </Link>
                      <div className="text-[9px] text-white/30 font-mono">{s.code}</div>
                    </td>
                    {data.ingredients.map((ig) => {
                      const cell = cellLookup.get(`${s.id}|${ig.id}`)
                      if (!cell) {
                        return (
                          <td key={ig.id} className="px-2 py-1.5 text-center text-white/20">
                            -
                          </td>
                        )
                      }
                      return (
                        <td key={ig.id} className="px-1 py-1">
                          <Link
                            href={`/food-cost/${s.id}`}
                            className={`block text-center font-mono tabular-nums px-2 py-1 rounded border border-transparent hover:border-white/20 transition-colors ${cellColor(cell.variance_pct)}`}
                            title={`${HINT_LABEL[cell.root_cause_hint]} / ¥${cell.cost_diff.toLocaleString()}`}
                          >
                            {(cell.variance_pct * 100).toFixed(0)}%
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/food-cost/inventory-input"
            className="text-[12px] px-3 py-1.5 rounded-md border border-blue-400/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
          >
            棚卸入力フォームへ
          </Link>
        </div>
      </div>
    </div>
  )
}
