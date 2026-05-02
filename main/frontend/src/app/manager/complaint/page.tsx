"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle2, AlertTriangle } from "lucide-react"
import { managerApi, type Severity, type Channel } from "@/lib/manager-api"
import { managerOffline } from "@/lib/manager-offline"
import { VoiceInput } from "@/components/manager/VoiceInput"

const severities: { value: Severity; label: string; color: string }[] = [
  { value: "low", label: "軽微", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { value: "medium", label: "中", color: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { value: "high", label: "重大", color: "border-red-500/60 bg-red-500/15 text-red-300" },
]

const channels: { value: Channel; label: string }[] = [
  { value: "in_store", label: "来店" },
  { value: "phone", label: "電話" },
  { value: "online", label: "Web" },
  { value: "sns", label: "SNS" },
  { value: "other", label: "その他" },
]

const ageRanges = ["未成年", "20代", "30代", "40代", "50代", "60代+", "不明"]

export default function ComplaintPage() {
  const router = useRouter()
  const [severity, setSeverity] = useState<Severity | "">("")
  const [channel, setChannel] = useState<Channel>("in_store")
  const [age, setAge] = useState<string>("不明")
  const [content, setContent] = useState("")
  const [response, setResponse] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [storeId, setStoreId] = useState<string>("")

  useEffect(() => {
    setStoreId(
      (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    )
  }, [])

  async function submit() {
    if (!severity || !content.trim() || !response.trim()) return
    setSubmitting(true)
    const payload = {
      store_id: storeId,
      date: new Date().toISOString().slice(0, 10),
      customer_age_range: age === "不明" ? undefined : age,
      channel,
      severity,
      content: content.trim(),
      response_taken: response.trim(),
    }
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await managerOffline.enqueue("complaint", payload)
      } else {
        await managerApi.postComplaint(payload)
      }
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } catch {
      await managerOffline.enqueue("complaint", payload)
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
        <p className="text-lg font-semibold">クレームを記録しました</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 重大度 */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
          重大度
        </label>
        <div className="grid grid-cols-3 gap-2">
          {severities.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`py-4 rounded-lg border text-sm font-semibold transition-colors ${
                severity === s.value ? s.color : "border-white/10 bg-white/[0.03] text-white/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {severity === "high" && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>本部に通知されます。即時対応が必要です。</span>
          </div>
        )}
      </section>

      {/* チャネル */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
          受付チャネル
        </label>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannel(c.value)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                channel === c.value
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* 年代 */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
          顧客年代（任意）
        </label>
        <div className="flex flex-wrap gap-2">
          {ageRanges.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAge(a)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                age === a
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/70"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      {/* 内容 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] uppercase tracking-wider text-white/40">
            クレーム内容
          </label>
          <VoiceInput onResult={setContent} />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="お客様の発言・状況を記録"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
        />
      </section>

      {/* 対応内容 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] uppercase tracking-wider text-white/40">対応内容</label>
          <VoiceInput onResult={setResponse} />
        </div>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={3}
          placeholder="現場での対応・お詫び・代替提案など"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
        />
      </section>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !severity || !content.trim() || !response.trim()}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition active:scale-[0.99] disabled:opacity-40 ${
          severity === "high" ? "bg-red-500 text-white" : "bg-emerald-500 text-black"
        }`}
      >
        <Send className="w-5 h-5" />
        {submitting ? "送信中…" : "クレームを記録"}
      </button>
    </div>
  )
}
