"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, MessageSquare } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid, type QuickOption } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"

const quickFeedback: (QuickOption & { sentiment: "positive" | "neutral" | "negative"; rating: number })[] = [
  { value: "delicious", label: "美味しかった", icon: "🥰", tone: "good", sentiment: "positive", rating: 5 },
  { value: "fast", label: "提供が早い", icon: "⚡", tone: "good", sentiment: "positive", rating: 5 },
  { value: "kind", label: "店員の対応◎", icon: "😊", tone: "good", sentiment: "positive", rating: 5 },
  { value: "cold", label: "冷めてた", icon: "🥶", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "slow", label: "提供が遅い", icon: "⏳", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "rude", label: "店員態度", icon: "😠", tone: "bad", sentiment: "negative", rating: 1 },
  { value: "dirty", label: "店内が汚い", icon: "🧹", tone: "warn", sentiment: "negative", rating: 2 },
  { value: "wrong", label: "提供間違い", icon: "❌", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "other", label: "その他", icon: "💬", tone: "default", sentiment: "neutral", rating: 3 },
]

export default function StaffVoicePage() {
  const router = useRouter()
  const [picked, setPicked] = useState("")
  const [detail, setDetail] = useState("")
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const opt = quickFeedback.find((q) => q.value === picked)

  async function submit() {
    if (!opt) return
    setSubmitting(true)
    await staffApi.submitVoice({
      store_id: "store-001",
      employee_id: staffIdentity.employeeId,
      content: detail || opt.label,
      sentiment: opt.sentiment,
      source: "staff_app",
      rating: opt.rating,
    })
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="px-4 py-10 space-y-6 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold">送信完了</h2>
        <div className="text-white/60">お客様の声を記録しました</div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <BigTapButton
            tone="primary"
            label="続けて記録"
            onClick={() => {
              setPicked("")
              setDetail("")
              setDone(false)
            }}
          />
          <BigTapButton tone="ghost" label="ホームに戻る" onClick={() => router.push("/staff")} />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-sky-400" />
        <h1 className="text-2xl font-bold">お客様の声</h1>
      </div>
      <p className="text-sm text-white/60">該当を1つ選択してください</p>

      <QuickRadioGrid options={quickFeedback} value={picked} onChange={setPicked} columns={3} />

      {picked && (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold mb-2">詳細メモ（任意）</div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={4}
              placeholder="例: 4人席 / 50代男性 / 牛丼並"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <BigTapButton
            tone="success"
            label={submitting ? "送信中..." : "送信"}
            onClick={submit}
            disabled={submitting}
          />
        </div>
      )}
    </div>
  )
}
