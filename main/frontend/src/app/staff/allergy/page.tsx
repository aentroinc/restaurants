"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, ShieldAlert, AlertTriangle } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid, type QuickOption } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"
import { useTranslations } from "@/i18n/I18nProvider"

const ageKeys = ["child", "teen", "20-40", "40-60", "60+", "unknown"] as const
const allergenKeys: { value: string; icon: string }[] = [
  { value: "egg", icon: "🥚" },
  { value: "milk", icon: "🥛" },
  { value: "wheat", icon: "🌾" },
  { value: "shrimp", icon: "🦐" },
  { value: "crab", icon: "🦀" },
  { value: "soba", icon: "🍜" },
  { value: "peanut", icon: "🥜" },
  { value: "walnut", icon: "🌰" },
  { value: "soy", icon: "🫘" },
  { value: "fish", icon: "🐟" },
  { value: "beef", icon: "🥩" },
  { value: "other", icon: "❓" },
]
const responseKeys: { value: string; tone: "good" | "default" | "warn" | "bad" }[] = [
  { value: "alt_provided", tone: "good" },
  { value: "ingredients_explained", tone: "default" },
  { value: "declined", tone: "warn" },
  { value: "incident", tone: "bad" },
]

export default function StaffAllergyPage() {
  const router = useRouter()
  const t = useTranslations("allergy")
  const tCommon = useTranslations("common")
  const ageRanges: QuickOption[] = ageKeys.map((k) => ({ value: k, label: t(`ageRange.${k}`) }))
  const allergens: QuickOption[] = allergenKeys.map((a) => ({ ...a, label: t(`allergens.${a.value}`) }))
  const responses: QuickOption[] = responseKeys.map((r) => ({ ...r, label: t(`responses.${r.value}`) }))
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "done">(1)
  const [age, setAge] = useState("")
  const [pickedAllergens, setPickedAllergens] = useState<string[]>([])
  const [items, setItems] = useState("")
  const [response, setResponse] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    await staffApi.submitAllergy({
      store_id: "store-001",
      employee_id: staffIdentity.employeeId,
      customer_age_range: age,
      allergen: pickedAllergens.join(","),
      items_provided_json: { items, allergens: pickedAllergens },
      response_taken: response,
      incident_occurred: response === "incident",
    })
    setSubmitting(false)
    setStep("done")
  }

  if (step === "done") {
    return (
      <div className="px-4 py-10 space-y-6 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold">{t("doneTitle")}</h2>
        <div className="text-white/60">{t("doneDesc")}</div>
        {response === "incident" && (
          <Link
            href="/staff/emergency?scenario=anaphylaxis"
            className="block rounded-xl bg-red-500/20 border border-red-500/40 p-4 text-red-100"
          >
            <AlertTriangle className="inline h-5 w-5 mr-2" />
            {t("openAnaphylaxis")}
          </Link>
        )}
        <BigTapButton tone="ghost" label={tCommon("homeReturn")} onClick={() => router.push("/staff")} />
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <Link
          href="/staff/emergency?scenario=anaphylaxis"
          className="text-xs text-red-300 underline"
        >
          {t("emergencyLink")}
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              step >= (n as 1 | 2 | 3 | 4) ? "bg-emerald-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">{t("step1Title")}</div>
          <QuickRadioGrid options={ageRanges} value={age} onChange={setAge} columns={3} />
          <BigTapButton tone="primary" label={t("step1Next")} onClick={() => setStep(2)} disabled={!age} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">{t("step2Title")}</div>
          <QuickRadioGrid
            options={allergens}
            multi
            values={pickedAllergens}
            onMultiChange={setPickedAllergens}
            columns={3}
          />
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label={tCommon("back")} onClick={() => setStep(1)} />
            <BigTapButton
              tone="primary"
              label={tCommon("next")}
              onClick={() => setStep(3)}
              disabled={pickedAllergens.length === 0}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">{t("step3Title")}</div>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={4}
            placeholder={t("step3Placeholder")}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
          />
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label={tCommon("back")} onClick={() => setStep(2)} />
            <BigTapButton tone="primary" label={t("step3Next")} onClick={() => setStep(4)} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">{t("step4Title")}</div>
          <QuickRadioGrid options={responses} value={response} onChange={setResponse} columns={2} />
          {response === "incident" && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
              {t("incidentWarning")}
            </div>
          )}
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label={tCommon("back")} onClick={() => setStep(3)} />
            <BigTapButton
              tone="success"
              label={submitting ? tCommon("submitting") : tCommon("submit")}
              onClick={submit}
              disabled={!response || submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
