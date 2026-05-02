"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Flame, Activity, ShieldOff, Soup, HeartPulse, Phone } from "lucide-react"
import { useTranslations } from "@/i18n/I18nProvider"

type Scenario = "fire" | "earthquake" | "robbery" | "food_poisoning" | "injury" | "anaphylaxis"

interface ScenarioMeta {
  key: Scenario
  icon: React.ReactNode
  color: string
  hasCall: boolean
}

// Visual config (icon, color) is locale-independent.
// Titles, steps, and the emergency call number are pulled from i18n messages.
const META: ScenarioMeta[] = [
  {
    key: "fire",
    icon: <Flame className="h-6 w-6" />,
    color: "border-red-500/40 bg-red-500/10 text-red-100",
    hasCall: true,
  },
  {
    key: "earthquake",
    icon: <Activity className="h-6 w-6" />,
    color: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    hasCall: false,
  },
  {
    key: "robbery",
    icon: <ShieldOff className="h-6 w-6" />,
    color: "border-purple-500/40 bg-purple-500/10 text-purple-100",
    hasCall: true,
  },
  {
    key: "food_poisoning",
    icon: <Soup className="h-6 w-6" />,
    color: "border-orange-500/40 bg-orange-500/10 text-orange-100",
    hasCall: false,
  },
  {
    key: "injury",
    icon: <HeartPulse className="h-6 w-6" />,
    color: "border-pink-500/40 bg-pink-500/10 text-pink-100",
    hasCall: true,
  },
  {
    key: "anaphylaxis",
    icon: <HeartPulse className="h-6 w-6" />,
    color: "border-red-500/40 bg-red-500/10 text-red-100",
    hasCall: true,
  },
]

// Hard-coded emergency phone numbers — never localized away. Always call 119
// for fire/ambulance and 110 for police in Japan, regardless of UI language.
const CALL_NUMBER: Record<Scenario, string | null> = {
  fire: "119",
  earthquake: null,
  robbery: "110",
  food_poisoning: null,
  injury: "119",
  anaphylaxis: "119",
}

export default function StaffEmergencyPage() {
  const tCommon = useTranslations("common")
  return (
    <Suspense fallback={<div className="px-4 py-5 text-white/60">{tCommon("loading")}</div>}>
      <EmergencyInner />
    </Suspense>
  )
}

function EmergencyInner() {
  const t = useTranslations("emergency")
  const searchParams = useSearchParams()
  const initial = searchParams.get("scenario") as Scenario | null
  const [picked, setPicked] = useState<Scenario | null>(null)

  useEffect(() => {
    if (initial && META.some((s) => s.key === initial)) setPicked(initial)
  }, [initial])

  if (picked) {
    const meta = META.find((x) => x.key === picked)!
    const steps = (t.raw(`scenarios.${picked}.steps`) as string[]) || []
    const callLabel = meta.hasCall ? (t(`scenarios.${picked}.call`) as string) : null
    const callNumber = CALL_NUMBER[picked]
    return (
      <div className={`px-4 py-5 space-y-5`}>
        <button onClick={() => setPicked(null)} className="text-sm text-white/60">
          {t("listBack")}
        </button>
        <div className={`rounded-2xl border ${meta.color} p-5 flex items-center gap-3`}>
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">{meta.icon}</div>
          <h1 className="text-3xl font-bold">{t(`scenarios.${picked}.title`)}</h1>
        </div>

        {callLabel && callNumber && (
          <div className="space-y-2">
            <a
              href={`tel:${callNumber}`}
              className="w-full rounded-2xl bg-red-500 hover:bg-red-400 active:scale-[0.98] text-white font-bold px-5 py-5 flex items-center justify-center gap-3 text-2xl shadow-lg"
            >
              <Phone className="h-7 w-7" /> {callLabel}
            </a>
          </div>
        )}

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex gap-3 items-start"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-base">
                {i + 1}
              </div>
              <div className="text-base leading-relaxed pt-1">{step}</div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60 text-center">
          {t("footer")}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-white/60">{t("subtitle")}</p>
      <div className="space-y-3">
        {META.map((meta) => {
          const steps = (t.raw(`scenarios.${meta.key}.steps`) as string[]) || []
          return (
            <button
              key={meta.key}
              onClick={() => setPicked(meta.key)}
              className={`w-full rounded-2xl border p-5 flex items-center gap-4 text-left active:scale-[0.99] ${meta.color}`}
            >
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                {meta.icon}
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold">{t(`scenarios.${meta.key}.title`)}</div>
                <div className="text-xs opacity-80 mt-1">{t("stepCount", { n: steps.length })}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
