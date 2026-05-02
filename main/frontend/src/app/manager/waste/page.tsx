"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle2, Trash2 } from "lucide-react"
import { managerApi, type WasteListItem } from "@/lib/manager-api"
import { managerOffline } from "@/lib/manager-offline"
import { PhotoCapture } from "@/components/manager/PhotoCapture"

const products = [
  { id: "p-rice", name: "ごはん", unit: "杯", price: 80 },
  { id: "p-beef", name: "牛肉（並盛用）", unit: "kg", price: 4050 },
  { id: "p-negitoro", name: "ねぎとろ", unit: "kg", price: 2480 },
  { id: "p-lettuce", name: "サラダ用レタス", unit: "玉", price: 220 },
  { id: "p-misoshiru", name: "味噌汁", unit: "杯", price: 60 },
  { id: "p-egg", name: "卵", unit: "個", price: 28 },
  { id: "p-pasta", name: "パスタ生麺", unit: "g", price: 1.4 },
  { id: "p-other", name: "その他", unit: "個", price: 100 },
]

const reasons = ["売れ残り", "賞味期限切れ", "鮮度低下", "オーダーミス", "その他"]

export default function WastePage() {
  const router = useRouter()
  const [productId, setProductId] = useState<string>(products[0].id)
  const [qty, setQty] = useState<number | "">(1)
  const [reason, setReason] = useState<string>("")
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [history, setHistory] = useState<WasteListItem[]>([])
  const [storeId, setStoreId] = useState<string>("")

  useEffect(() => {
    const sid = (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    setStoreId(sid)
    managerApi.listWasteLast7Days(sid).then(setHistory)
  }, [])

  const product = products.find((p) => p.id === productId)!
  const cost = typeof qty === "number" ? Math.round(qty * product.price) : 0

  async function submit() {
    if (!reason || typeof qty !== "number" || qty <= 0) return
    setSubmitting(true)
    const payload = {
      store_id: storeId,
      date: new Date().toISOString().slice(0, 10),
      product_id: productId,
      product_name: product.name,
      qty,
      unit: product.unit,
      reason,
      cost_estimate: cost,
    }
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await managerOffline.enqueue("waste_log", payload, photo || undefined)
      } else {
        await managerApi.postWasteLog(payload)
      }
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } catch {
      await managerOffline.enqueue("waste_log", payload, photo || undefined)
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } finally {
      setSubmitting(false)
    }
  }

  const total7d = history.reduce((s, x) => s + x.cost_estimate, 0)

  if (done) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400" />
        <p className="text-lg font-semibold">廃棄を記録しました</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* form */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">商品</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-3 text-base focus:outline-none focus:border-white/30"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0a0e14]">
                {p.name}（{p.unit}）
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">数量</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => (typeof q === "number" ? Math.max(0, q - 1) : 0))}
              className="w-12 h-12 rounded-lg border border-white/10 bg-white/[0.04] text-xl"
            >
              −
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={qty}
              onChange={(e) => setQty(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value)))}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-3 text-center text-xl font-mono tabular-nums focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => setQty((q) => (typeof q === "number" ? q + 1 : 1))}
              className="w-12 h-12 rounded-lg border border-white/10 bg-white/[0.04] text-xl"
            >
              ＋
            </button>
            <span className="text-white/50 text-sm w-10 shrink-0">{product.unit}</span>
          </div>
          <div className="text-[11px] text-white/40 mt-2 text-right">
            推定コスト ¥{cost.toLocaleString()}
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">理由</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-2 py-3 rounded-lg border text-sm transition-colors ${
                  reason === r
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">写真（任意）</label>
          <PhotoCapture onChange={setPhoto} label="廃棄物を撮影" />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !reason || typeof qty !== "number" || qty <= 0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-black font-bold text-base disabled:opacity-40 active:scale-[0.99] transition"
        >
          <Send className="w-5 h-5" />
          {submitting ? "送信中…" : "廃棄を記録"}
        </button>
      </section>

      {/* history */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[11px] uppercase tracking-wider text-white/40">過去7日間</h2>
          <span className="text-sm font-mono tabular-nums text-amber-400">
            合計 ¥{total7d.toLocaleString()}
          </span>
        </div>
        <ul className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
          {history.map((h) => (
            <li key={h.id} className="px-4 py-3 flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-amber-400/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/85 truncate">{h.product_name}</div>
                <div className="text-[11px] text-white/40 font-mono tabular-nums">
                  {h.date} · {h.qty}{h.unit} · {h.reason}
                </div>
              </div>
              <span className="text-sm font-mono tabular-nums text-white/70 shrink-0">
                ¥{h.cost_estimate.toLocaleString()}
              </span>
            </li>
          ))}
          {history.length === 0 && (
            <li className="px-4 py-6 text-center text-white/40 text-sm">記録なし</li>
          )}
        </ul>
      </section>
    </div>
  )
}
