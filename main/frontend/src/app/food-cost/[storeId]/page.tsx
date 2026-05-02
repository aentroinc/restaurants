"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import {
  fetchStoreDetail,
  type StoreDetailData,
  type RootCauseHint,
} from "@/lib/food-cost-api"
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react"

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

const HINT_REASON: Record<RootCauseHint, string> = {
  over_portion: "実使用が理論より大幅に多い → スタッフの過量盛り / 計量基準のばらつきが疑われます。",
  theft: "理論より実使用が大幅に少ない → 売上未計上 / 横流し / レジ通し漏れの可能性。",
  waste: "理論を僅かに上回り波動も大きい → 廃棄ロス / 仕込み余りの兆候。",
  recipe_drift: "理論よりやや少ない使用が継続 → BOM が現場運用と乖離している可能性（要レシピ改訂）。",
  ok: "理論と実績がほぼ一致しています。",
}

export default function StoreFoodCostDetailPage() {
  const params = useParams<{ storeId: string }>()
  const storeId = params?.storeId as string

  const [data, setData] = useState<StoreDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeId) return
    fetchStoreDetail(storeId, DEFAULT_PERIOD)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [storeId])

  if (loading) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="店舗フードコスト詳細" />
        <LoadingState />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="店舗フードコスト詳細" />
        <ErrorState message={error || undefined} />
      </div>
    )
  }

  const totalActual = data.total_cost_theoretical - data.total_cost_diff
  const maxAbsDiff = Math.max(...data.items.map((i) => Math.abs(i.cost_diff)), 1)

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title={`${data.store.name || "店舗"} フードコスト詳細`}
        description={`期間: ${data.period}`}
      />
      <div className="px-5 py-5 space-y-5">
        <Link
          href="/food-cost"
          className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          全店ヒートマップへ戻る
        </Link>

        {/* waterfall summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">理論原価合計</div>
            <div className="font-mono tabular-nums text-xl text-white/85 mt-1">¥{Math.round(data.total_cost_theoretical).toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40">実績原価（推定）</div>
            <div className="font-mono tabular-nums text-xl text-white/85 mt-1">¥{Math.round(totalActual).toLocaleString()}</div>
          </div>
          <div className={`rounded-lg border p-4 ${data.total_cost_diff < 0 ? "border-red-400/30 bg-red-500/[0.05]" : "border-emerald-400/20 bg-emerald-500/[0.04]"}`}>
            <div className="text-[10px] uppercase tracking-wider text-white/40">差分（理論 − 実績）</div>
            <div className="flex items-center gap-2 mt-1">
              {data.total_cost_diff < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              )}
              <div className={`font-mono tabular-nums text-xl ${data.total_cost_diff < 0 ? "text-red-300" : "text-emerald-300"}`}>
                {data.total_cost_diff < 0 ? "-" : "+"}¥{Math.abs(Math.round(data.total_cost_diff)).toLocaleString()}
              </div>
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              {data.total_cost_diff < 0 ? "実績が理論超過 → 漏れが大きい" : "理論内に収まっている"}
            </div>
          </div>
        </div>

        {/* per-ingredient waterfall */}
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <span className="text-[12px] font-semibold text-white/85">食材別 ウォーターフォール</span>
            <span className="ml-2 text-[10px] text-white/40">理論 → 実績 → 差分内訳</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.items.map((it) => {
              const widthPct = Math.round((Math.abs(it.cost_diff) / maxAbsDiff) * 100)
              const isLoss = it.cost_diff < 0
              return (
                <div key={it.ingredient_id} className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[12px] text-white/85 font-medium min-w-[120px]">{it.ingredient_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${HINT_COLOR[it.root_cause_hint]}`}>
                      {HINT_LABEL[it.root_cause_hint]}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono tabular-nums">
                      {(it.variance_pct * 100).toFixed(1)}%
                    </span>
                    <span className={`ml-auto text-[12px] font-mono tabular-nums ${isLoss ? "text-red-300" : "text-emerald-300"}`}>
                      {isLoss ? "-" : "+"}¥{Math.abs(Math.round(it.cost_diff)).toLocaleString()}
                    </span>
                  </div>

                  {/* mini waterfall bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-16 shrink-0">理論</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-blue-400/50" style={{ width: "100%" }} />
                    </div>
                    <span className="text-[10px] text-white/50 font-mono tabular-nums w-24 text-right">
                      ¥{Math.round(it.cost_theoretical).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/40 w-16 shrink-0">差分</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={`h-full ${isLoss ? "bg-red-500/60" : "bg-emerald-400/50"}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums w-24 text-right ${isLoss ? "text-red-300" : "text-emerald-300"}`}>
                      {isLoss ? "-" : "+"}¥{Math.abs(Math.round(it.cost_diff)).toLocaleString()}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                    {HINT_REASON[it.root_cause_hint]}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
