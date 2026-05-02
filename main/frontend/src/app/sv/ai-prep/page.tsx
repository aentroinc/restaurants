"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { svApi, type SVStore } from "@/lib/sv-api"
import { streamChat } from "@/lib/ai-stream"
import { Sparkles, Loader2, MapPin, Send, RotateCcw } from "lucide-react"
import { formatCurrencyCompact, formatPercent } from "@/lib/utils"

function buildPrompt(store: SVStore): string {
  return `${store.name}の最新状況・前回SV指摘・最近のクレーム・直近のKPI悪化を要約して、次回訪問で見るべきポイントを3つ出して。
店舗情報: ブランド ${store.brand_name} / エリア ${store.area_name} ${store.prefecture} / 店長 ${store.manager_name}
直近KPI: 売上 ${formatCurrencyCompact(store.kpi.net_sales)} / 健全度 ${store.kpi.health_score} / FL比率 ${formatPercent(store.kpi.fl_ratio)} / 客数 ${store.kpi.customer_count}
課題タグ: ${store.kpi.issue_types.join(", ") || "特になし"}
前回訪問: ${store.last_visit_at || "未訪問"}`
}

function FallbackBrief({ store }: { store: SVStore }) {
  return (
    <div className="space-y-4">
      <Section title="現状サマリー" tone="blue">
        <p className="text-[13px] text-white/80 leading-relaxed">
          {store.name} は健全度 {store.kpi.health_score} 点。FL比率 {formatPercent(store.kpi.fl_ratio)} で
          {store.kpi.fl_ratio > 60 ? "業界平均を上回り収益圧迫中" : "目安内に収まっている"}。
          売上は {store.kpi.net_sales_trend >= 0 ? "前月比 +" : "前月比 "}{store.kpi.net_sales_trend.toFixed(1)}% で
          {store.kpi.net_sales_trend < 0 ? "減収傾向" : "堅調"}。
        </p>
      </Section>
      <Section title="前回SV指摘 / 直近クレーム" tone="amber">
        <ul className="space-y-1 text-[13px] text-white/80">
          {store.kpi.issue_types.length > 0 ? store.kpi.issue_types.map((t, i) => (
            <li key={i}>• {t} に関するアラートが継続。改善タスクの進捗確認が必要。</li>
          )) : <li>• 直近の重大指摘なし。健全度維持を確認。</li>}
        </ul>
      </Section>
      <Section title="次回訪問で見るべき3点" tone="emerald" highlight>
        <ol className="space-y-2 text-[13px] text-white/85">
          <li><span className="font-bold text-emerald-400">1.</span> {store.kpi.labor_cost_rate > 28 ? "シフト充足率と人件費の実態確認 (ピーク帯の配置を実地で観察)" : "QSCチェックの実地スコア取得"}</li>
          <li><span className="font-bold text-emerald-400">2.</span> {store.kpi.cogs_rate > 32 ? "原価超過の根本原因 (廃棄・誤発注・盛付) のヒアリング" : "在庫水準の適正化と発注精度の検証"}</li>
          <li><span className="font-bold text-emerald-400">3.</span> 店長 {store.manager_name} との 1on1 で前回宿題の実装状況を確認、次の改善タスクを合意</li>
        </ol>
      </Section>
    </div>
  )
}

function AIPrepInner() {
  const searchParams = useSearchParams()
  const initialStoreId = searchParams.get("store_id")

  const [stores, setStores] = useState<SVStore[]>([])
  const [storeId, setStoreId] = useState<string | null>(initialStoreId)
  const [briefing, setBriefing] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    svApi.listStores().then((s) => {
      setStores(s)
      if (!storeId && s.length) setStoreId(s[0].id)
    })
  }, [])

  const store = stores.find((s) => s.id === storeId)

  async function ask() {
    if (!store) return
    setLoading(true)
    setBriefing("")
    setUsedFallback(false)
    const prompt = buildPrompt(store)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      if (!apiUrl) {
        setUsedFallback(true)
        setLoading(false)
        return
      }
      let acc = ""
      for await (const ev of streamChat(prompt, null, apiUrl)) {
        if (ev.type === "text" && ev.content) {
          acc += ev.content
          setBriefing(acc)
        }
        if (ev.type === "error") {
          setUsedFallback(true)
          break
        }
      }
      if (!acc) setUsedFallback(true)
    } catch {
      setUsedFallback(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[20px] font-bold text-white/90 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />AI: この店、何見てくる？
        </h1>
        <p className="text-[12px] text-white/40 mt-0.5">店舗を選ぶ → AIが訪問前ブリーフィングカードを生成</p>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-[11px] text-white/60 mb-1 block">対象店舗</label>
            <select
              value={storeId || ""}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0c1017]">{s.name} (健全度 {s.kpi.health_score})</option>
              ))}
            </select>
          </div>
          <button
            onClick={ask}
            disabled={loading || !store}
            className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-emerald-500 hover:opacity-90 text-white text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {briefing || usedFallback ? "再生成" : "ブリーフを生成"}
          </button>
        </div>
        {store && (
          <div className="mt-3 px-3 py-2 rounded bg-black/20 border border-white/[0.04] flex items-center gap-3 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[12px] text-white/70">{store.brand_name}・{store.area_name}・店長 {store.manager_name}</span>
            <span className="text-[10px] text-white/40">前回 {store.last_visit_at || "未訪問"}</span>
            <Link href={`/sv/visit/${store.id}`} className="ml-auto text-[11px] px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400">この店舗を訪問する</Link>
          </div>
        )}
      </div>

      {/* Briefing card */}
      {(briefing || usedFallback) && store && (
        <div className="rounded-lg border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.04] to-blue-500/[0.04] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-white/90 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />訪問前ブリーフ：{store.name}
            </h2>
            <button onClick={ask} className="text-[11px] text-white/50 hover:text-white/80 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />再生成
            </button>
          </div>
          {usedFallback ? (
            <FallbackBrief store={store} />
          ) : (
            <div className="prose prose-invert max-w-none text-[13px] text-white/85 whitespace-pre-wrap leading-relaxed">{briefing}</div>
          )}
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] text-white/40">このブリーフはこの店舗のKPIと過去の指摘から自動生成されています</span>
            <Link href={`/sv/visit/${store.id}`} className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-white text-[12px] font-bold">訪問を開始 →</Link>
          </div>
        </div>
      )}

      {!briefing && !usedFallback && !loading && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center text-[12px] text-white/40">
          上の「ブリーフを生成」を押すと、選択した店舗の訪問前ブリーフィングカードが表示されます
        </div>
      )}
    </div>
  )
}

function Section({ title, tone, highlight, children }: { title: string; tone: "blue" | "amber" | "emerald"; highlight?: boolean; children: React.ReactNode }) {
  const cls = tone === "blue" ? "border-blue-400/20 bg-blue-500/[0.04]"
    : tone === "amber" ? "border-amber-400/20 bg-amber-500/[0.04]"
    : "border-emerald-400/20 bg-emerald-500/[0.04]"
  return (
    <div className={`rounded-lg border p-4 ${cls} ${highlight ? "ring-1 ring-emerald-400/30" : ""}`}>
      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2 text-white/70">{title}</h3>
      {children}
    </div>
  )
}

export default function SVAIPrepPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/40">Loading...</div>}>
      <AIPrepInner />
    </Suspense>
  )
}
