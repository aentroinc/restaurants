"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle2 } from "lucide-react"
import { managerApi, type ManagerHomeKPI } from "@/lib/manager-api"
import { managerOffline } from "@/lib/manager-offline"
import { VoiceInput } from "@/components/manager/VoiceInput"

const weatherChoices = ["晴れ", "曇り", "雨", "雪", "猛暑", "強風"]

export default function DailyReportPage() {
  const router = useRouter()
  const [kpi, setKpi] = useState<ManagerHomeKPI | null>(null)
  const [weather, setWeather] = useState<string>("")
  const [special, setSpecial] = useState("")
  const [predicted, setPredicted] = useState<number | "">("")
  const [voiceTarget, setVoiceTarget] = useState<"special" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [storeId, setStoreId] = useState<string>("")

  useEffect(() => {
    const sid = (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    setStoreId(sid)
    managerApi.getHomeKPI(sid).then(setKpi)
  }, [])

  async function submit() {
    if (!storeId) return
    setSubmitting(true)
    const today = new Date().toISOString().slice(0, 10)
    const summary = kpi
      ? `売上 ¥${kpi.today_sales_yen.toLocaleString()} (予測比 ${kpi.today_sales_pace_pct >= 0 ? "+" : ""}${kpi.today_sales_pace_pct.toFixed(1)}%) / 客数 ${kpi.customers_today}人 / 人時売上 ¥${kpi.sales_per_labor_hour.toLocaleString()}`
      : ""
    const payload = {
      store_id: storeId,
      date: today,
      sales_summary_text: summary,
      weather: weather || "晴れ",
      special_events_text: special,
      notes: "",
      predicted_customers_tomorrow: typeof predicted === "number" ? predicted : undefined,
    }
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await managerOffline.enqueue("daily_report", payload)
      } else {
        await managerApi.postDailyReport(payload)
      }
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } catch {
      await managerOffline.enqueue("daily_report", payload)
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400" />
        <p className="text-lg font-semibold">日報を提出しました</p>
        <p className="text-sm text-white/50">ホームに戻ります…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 自動表示 */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">本日のサマリ（自動）</div>
        {kpi ? (
          <div className="space-y-1.5 text-sm">
            <Row label="売上" value={`¥${kpi.today_sales_yen.toLocaleString()}`} />
            <Row
              label="予測比"
              value={`${kpi.today_sales_pace_pct >= 0 ? "+" : ""}${kpi.today_sales_pace_pct.toFixed(1)}%`}
              positive={kpi.today_sales_pace_pct >= 0}
            />
            <Row label="客数" value={`${kpi.customers_today} 人 (予測 ${kpi.customers_forecast})`} />
            <Row label="人時売上" value={`¥${kpi.sales_per_labor_hour.toLocaleString()}`} />
          </div>
        ) : (
          <div className="h-20 animate-pulse bg-white/5 rounded" />
        )}
      </section>

      {/* 天気 */}
      <Field label="天気">
        <div className="flex flex-wrap gap-2">
          {weatherChoices.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeather(w)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                weather === w
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </Field>

      {/* 特記事項 */}
      <Field label="特記事項">
        <div className="flex items-center justify-end mb-1">
          <VoiceInput
            onResult={(text) => {
              setSpecial(text)
              setVoiceTarget("special")
            }}
          />
        </div>
        <textarea
          value={special}
          onChange={(e) => {
            setSpecial(e.target.value)
            setVoiceTarget(null)
          }}
          rows={4}
          placeholder="近隣イベント、トラブル、改善点など"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
        />
        {voiceTarget === "special" && (
          <p className="text-[11px] text-white/40 mt-1">音声入力中…テキストに反映されます</p>
        )}
      </Field>

      {/* 明日の客数予測 */}
      <Field label="明日の客数予測">
        <input
          type="number"
          inputMode="numeric"
          value={predicted}
          onChange={(e) =>
            setPredicted(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10)))
          }
          placeholder="例: 580"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-3 text-base font-mono tabular-nums focus:outline-none focus:border-white/30"
        />
      </Field>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !weather}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-black font-bold text-base disabled:opacity-40 active:scale-[0.99] transition"
      >
        <Send className="w-5 h-5" />
        {submitting ? "送信中…" : "日報を提出"}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
        {label}
      </label>
      {children}
    </section>
  )
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-white/50 text-xs">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          positive === undefined ? "text-white/85" : positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
