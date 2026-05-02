"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, ShieldAlert, AlertTriangle } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid, type QuickOption } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"

const ageRanges: QuickOption[] = [
  { value: "child", label: "子供（〜12）" },
  { value: "teen", label: "10代" },
  { value: "20-40", label: "20-40代" },
  { value: "40-60", label: "40-60代" },
  { value: "60+", label: "60代以上" },
  { value: "unknown", label: "不明" },
]

const allergens: QuickOption[] = [
  { value: "egg", label: "卵", icon: "🥚" },
  { value: "milk", label: "乳", icon: "🥛" },
  { value: "wheat", label: "小麦", icon: "🌾" },
  { value: "shrimp", label: "えび", icon: "🦐" },
  { value: "crab", label: "かに", icon: "🦀" },
  { value: "soba", label: "そば", icon: "🍜" },
  { value: "peanut", label: "落花生", icon: "🥜" },
  { value: "walnut", label: "くるみ", icon: "🌰" },
  { value: "soy", label: "大豆", icon: "🫘" },
  { value: "fish", label: "魚介", icon: "🐟" },
  { value: "beef", label: "牛肉", icon: "🥩" },
  { value: "other", label: "その他", icon: "❓" },
]

const responses: QuickOption[] = [
  { value: "alt_provided", label: "代替メニュー提供", tone: "good" },
  { value: "ingredients_explained", label: "成分説明のみ", tone: "default" },
  { value: "declined", label: "提供不可と説明", tone: "warn" },
  { value: "incident", label: "事故発生→救護", tone: "bad" },
]

export default function StaffAllergyPage() {
  const router = useRouter()
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
        <h2 className="text-3xl font-bold">記録完了</h2>
        <div className="text-white/60">アレルギー対応を記録しました</div>
        {response === "incident" && (
          <Link
            href="/staff/emergency?scenario=anaphylaxis"
            className="block rounded-xl bg-red-500/20 border border-red-500/40 p-4 text-red-100"
          >
            <AlertTriangle className="inline h-5 w-5 mr-2" />
            アナフィラキシー対応マニュアルを開く
          </Link>
        )}
        <BigTapButton tone="ghost" label="ホームに戻る" onClick={() => router.push("/staff")} />
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold">アレルギー対応</h1>
        </div>
        <Link
          href="/staff/emergency?scenario=anaphylaxis"
          className="text-xs text-red-300 underline"
        >
          緊急対応
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
          <div className="text-sm font-semibold">お客様の年齢層</div>
          <QuickRadioGrid options={ageRanges} value={age} onChange={setAge} columns={3} />
          <BigTapButton tone="primary" label="次へ: アレルゲン" onClick={() => setStep(2)} disabled={!age} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">該当アレルゲン（複数選択可）</div>
          <QuickRadioGrid
            options={allergens}
            multi
            values={pickedAllergens}
            onMultiChange={setPickedAllergens}
            columns={3}
          />
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label="戻る" onClick={() => setStep(1)} />
            <BigTapButton
              tone="primary"
              label="次へ"
              onClick={() => setStep(3)}
              disabled={pickedAllergens.length === 0}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">提供メニュー / 注文内容</div>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={4}
            placeholder="例: 牛丼並、味噌汁（卵抜き）"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
          />
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label="戻る" onClick={() => setStep(2)} />
            <BigTapButton tone="primary" label="次へ: 対応" onClick={() => setStep(4)} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold">対応内容</div>
          <QuickRadioGrid options={responses} value={response} onChange={setResponse} columns={2} />
          {response === "incident" && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
              事故発生時はただちに 119 通報、店長へ連絡してください。
            </div>
          )}
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label="戻る" onClick={() => setStep(3)} />
            <BigTapButton
              tone="success"
              label={submitting ? "送信中..." : "送信"}
              onClick={submit}
              disabled={!response || submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
