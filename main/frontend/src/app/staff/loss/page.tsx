"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Check, Trash2 } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { QuickRadioGrid } from "@/components/staff/QuickRadioGrid"
import { staffApi, staffIdentity } from "@/lib/staff-api"

const itemSuggestions = [
  { name: "牛丼の具", cost: 220 },
  { name: "玉ねぎ", cost: 80 },
  { name: "ご飯", cost: 60 },
  { name: "味噌汁", cost: 40 },
  { name: "サラダ", cost: 120 },
  { name: "卵", cost: 30 },
]

const reasons = [
  { value: "expired", label: "期限切れ", tone: "bad" as const },
  { value: "spillage", label: "こぼした", tone: "warn" as const },
  { value: "burnt", label: "焦げた・失敗", tone: "warn" as const },
  { value: "wrong_order", label: "オーダーミス", tone: "bad" as const },
  { value: "other", label: "その他", tone: "default" as const },
]

export default function StaffLossPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | "done">(1)
  const [item, setItem] = useState("")
  const [unitCost, setUnitCost] = useState(0)
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
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
    setSubmitting(false)
    setStep("done")
  }

  if (step === "done") {
    return (
      <div className="px-4 py-10 space-y-6 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold">送信完了</h2>
        <div className="text-white/60">ロス報告を記録しました（推定 ¥{(unitCost * qty).toLocaleString()}）</div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <BigTapButton
            tone="primary"
            label="続けて報告"
            onClick={() => {
              setItem("")
              setUnitCost(0)
              setQty(1)
              setReason("")
              setPhoto(null)
              setStep(1)
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
        <Trash2 className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold">ロス報告</h1>
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
            <div className="text-sm font-semibold mb-2">商品名</div>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="例: 牛丼の具"
              className="w-full h-14 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-base focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">よく使う商品</div>
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
                  <div className="text-[10px] text-white/50 mt-0.5">¥{s.cost}/個</div>
                </button>
              ))}
            </div>
          </div>
          <BigTapButton tone="primary" label="次へ: 数量" onClick={() => setStep(2)} disabled={!item} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">数量</div>
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
              推定金額: ¥{(unitCost * qty).toLocaleString()}（@¥{unitCost}）
            </div>
            {unitCost === 0 && (
              <div className="mt-3">
                <div className="text-xs text-white/60 mb-1">単価（円・任意）</div>
                <input
                  type="number"
                  value={unitCost || ""}
                  onChange={(e) => setUnitCost(parseInt(e.target.value) || 0)}
                  placeholder="100"
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <BigTapButton tone="ghost" label="戻る" onClick={() => setStep(1)} />
            <BigTapButton tone="primary" label="次へ: 理由" onClick={() => setStep(3)} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">理由を選択</div>
            <QuickRadioGrid options={reasons} value={reason} onChange={setReason} columns={2} />
          </div>
          <div>
            <label className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 px-4 py-3 cursor-pointer hover:bg-white/[0.04] min-h-[60px]">
              <Camera className="h-5 w-5 text-white/60" />
              <span className="text-sm text-white/70">
                {photo ? `写真選択済: ${photo.name}` : "写真を撮影 (任意)"}
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
            <BigTapButton tone="ghost" label="戻る" onClick={() => setStep(2)} />
            <BigTapButton
              tone="success"
              label={submitting ? "送信中..." : "送信"}
              onClick={submit}
              disabled={!reason || submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
