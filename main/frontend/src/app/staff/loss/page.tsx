"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Check, Trash2 } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"
import { toast } from "@/components/common/Toast"
import { useTranslations } from "@/i18n/I18nProvider"

const itemSuggestionKeys: { key: string; cost: number }[] = [
  { key: "gyudon", cost: 220 },
  { key: "onion", cost: 80 },
  { key: "rice", cost: 60 },
  { key: "miso", cost: 40 },
  { key: "salad", cost: 120 },
  { key: "egg", cost: 30 },
]

const reasonKeys: { value: string; tone: "bad" | "warn" | "default" }[] = [
  { value: "expired", tone: "bad" },
  { value: "spillage", tone: "warn" },
  { value: "burnt", tone: "warn" },
  { value: "wrong_order", tone: "bad" },
  { value: "other", tone: "default" },
]

export default function StaffLossPage() {
  const router = useRouter()
  const t = useTranslations("loss")
  const tCommon = useTranslations("common")
  const itemSuggestions = itemSuggestionKeys.map((s) => ({
    name: t(`items.${s.key}`),
    cost: s.cost,
  }))
  const reasons = reasonKeys.map((r) => ({ ...r, label: t(`reason.${r.value}`) }))
  const [step, setStep] = useState<1 | 2 | 3 | "done">(1)
  const [item, setItem] = useState("")
  const [unitCost, setUnitCost] = useState(0)
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    // Optimistic UI: 即座に「送信完了」ステップへ遷移し、裏で送信。
    const prevStep = step
    setStep("done")
    try {
      await staffApi.submitLoss({
        store_id: "store-001",
        employee_id: staffIdentity.employeeId,
        item_name: item,
        qty,
        reason,
        cost_estimate: unitCost * qty,
        occurred_at: new Date().toISOString(),
        photo_url: photo ? `local://${photo.name}` : undefined,
      })
      toast.success(t("doneTitle"))
    } catch {
      // 失敗 → ロールバック + 再送信ボタン付きトースト
      setStep(prevStep)
      toast.error(tCommon("retry"), {
        action: { label: tCommon("retry"), onClick: () => submit() },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (step === "done") {
    return (
      <div className="px-4 py-10 space-y-6 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold">{t("doneTitle")}</h2>
        <div className="text-white/60">{t("doneDesc", { amount: (unitCost * qty).toLocaleString() })}</div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <BigTapButton
            tone="primary"
            label={tCommon("continueReport")}
            onClick={() => {
              setItem("")
              setUnitCost(0)
              setQty(1)
              setReason("")
              setPhoto(null)
              setStep(1)
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
        <Trash2 className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              step >= (n as 1 | 2 | 3) ? "bg-emerald-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">{t("step1Item")}</div>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder={t("step1Placeholder")}
              className="w-full h-14 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-base focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">{t("step1Suggestions")}</div>
            <div className="grid grid-cols-3 gap-2">
              {itemSuggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setItem(s.name)
                    setUnitCost(s.cost)
                  }}
                  className={`min-h-[60px] rounded-xl border px-2 py-2 text-xs ${
                    item === s.name
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                  }`}
                >
                  {s.name}
                  <div className="text-[10px] text-white/50 mt-0.5">{t("perUnit", { cost: s.cost })}</div>
                </button>
              ))}
            </div>
          </div>
          <BigTapButton tone="primary" label={t("step1Next")} onClick={() => setStep(2)} disabled={!item} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">{t("step2Qty")}</div>
            <div className="flex items-center justify-center gap-4 my-4">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="h-16 w-16 rounded-2xl bg-white/10 hover:bg-white/20 text-3xl"
              >
                −
              </button>
              <div className="text-6xl font-bold tabular-nums w-24 text-center">{qty}</div>
              <button
                onClick={() => setQty(qty + 1)}
                className="h-16 w-16 rounded-2xl bg-white/10 hover:bg-white/20 text-3xl"
              >
                +
              </button>
            </div>
            <div className="text-center text-sm text-white/60">
              {t("step2Estimate", { amount: (unitCost * qty).toLocaleString(), unit: unitCost })}
            </div>
            {unitCost === 0 && (
              <div className="mt-3">
                <div className="text-xs text-white/60 mb-1">{t("step2UnitLabel")}</div>
                <input
                  type="number"
                  value={unitCost || ""}
                  onChange={(e) => setUnitCost(parseInt(e.target.value) || 0)}
                  placeholder={t("step2UnitPlaceholder")}
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label={tCommon("back")} onClick={() => setStep(1)} />
            <BigTapButton tone="primary" label={t("step2Next")} onClick={() => setStep(3)} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">{t("step3Reason")}</div>
            <QuickRadioGrid options={reasons} value={reason} onChange={setReason} columns={2} />
          </div>
          <div>
            <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 px-4 py-3 cursor-pointer hover:bg-white/[0.04] min-h-[60px]">
              <Camera className="h-5 w-5 text-white/60" />
              <span className="text-sm text-white/70">
                {photo ? t("step3PhotoSelected", { name: photo.name }) : t("step3PhotoLabel")}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label={tCommon("back")} onClick={() => setStep(2)} />
            <BigTapButton
              tone="success"
              label={submitting ? tCommon("submitting") : tCommon("submit")}
              onClick={submit}
              disabled={!reason || submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
