"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, MessageSquare } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid, type QuickOption } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"
import { useTranslations } from "@/i18n/I18nProvider"

interface FeedbackKey {
  value: string
  icon: string
  tone: "good" | "bad" | "warn" | "default"
  sentiment: "positive" | "neutral" | "negative"
  rating: number
}

const feedbackKeys: FeedbackKey[] = [
  { value: "delicious", icon: "🥰", tone: "good", sentiment: "positive", rating: 5 },
  { value: "fast", icon: "⚡", tone: "good", sentiment: "positive", rating: 5 },
  { value: "kind", icon: "😊", tone: "good", sentiment: "positive", rating: 5 },
  { value: "cold", icon: "🥶", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "slow", icon: "⏳", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "rude", icon: "😠", tone: "bad", sentiment: "negative", rating: 1 },
  { value: "dirty", icon: "🧹", tone: "warn", sentiment: "negative", rating: 2 },
  { value: "wrong", icon: "❌", tone: "bad", sentiment: "negative", rating: 2 },
  { value: "other", icon: "💬", tone: "default", sentiment: "neutral", rating: 3 },
]

export default function StaffVoicePage() {
  const router = useRouter()
  const t = useTranslations("voice")
  const tCommon = useTranslations("common")
  const quickFeedback: (QuickOption & { sentiment: "positive" | "neutral" | "negative"; rating: number })[] =
    feedbackKeys.map((f) => ({ ...f, label: t(`options.${f.value}`) }))
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
        <h2 className="text-3xl font-bold">{t("doneTitle")}</h2>
        <div className="text-white/60">{t("doneDesc")}</div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <BigTapButton
            tone="primary"
            label={t("continueRecord")}
            onClick={() => {
              setPicked("")
              setDetail("")
              setDone(false)
            }}
          />
          <BigTapButton tone="ghost" label={tCommon("homeReturn")} onClick={() => router.push("/staff")} />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-sky-400" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <p className="text-sm text-white/60">{t("pickOne")}</p>

      <QuickRadioGrid options={quickFeedback} value={picked} onChange={setPicked} columns={3} />

      {picked && (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold mb-2">{t("detailLabel")}</div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={4}
              placeholder={t("detailPlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <BigTapButton
            tone="success"
            label={submitting ? tCommon("submitting") : tCommon("submit")}
            onClick={submit}
            disabled={submitting}
          />
        </div>
      )}
    </div>
  )
}
