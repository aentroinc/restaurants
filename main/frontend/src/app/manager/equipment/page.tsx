"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle2, Wrench, AlertTriangle } from "lucide-react"
import { managerApi, type EquipmentCategory, type Severity, type EquipmentIssueRecord } from "@/lib/manager-api"
import { managerOffline } from "@/lib/manager-offline"
import { PhotoCapture } from "@/components/manager/PhotoCapture"
import { VoiceInput } from "@/components/manager/VoiceInput"

const categories: { value: EquipmentCategory; label: string }[] = [
  { value: "kitchen", label: "厨房機器" },
  { value: "fryer", label: "フライヤー" },
  { value: "freezer", label: "冷凍庫" },
  { value: "refrigerator", label: "冷蔵庫" },
  { value: "pos", label: "POS" },
  { value: "hvac", label: "空調" },
  { value: "plumbing", label: "配管" },
  { value: "electrical", label: "電気" },
  { value: "other", label: "その他" },
]

const severities: { value: Severity; label: string; color: string }[] = [
  { value: "low", label: "軽微", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { value: "medium", label: "中", color: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  { value: "high", label: "営業に影響", color: "border-red-500/60 bg-red-500/15 text-red-300" },
]

export default function EquipmentPage() {
  const router = useRouter()
  const [category, setCategory] = useState<EquipmentCategory | "">("")
  const [name, setName] = useState("")
  const [severity, setSeverity] = useState<Severity | "">("")
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [repairRequested, setRepairRequested] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [history, setHistory] = useState<EquipmentIssueRecord[]>([])
  const [storeId, setStoreId] = useState("")

  useEffect(() => {
    const sid = (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    setStoreId(sid)
    managerApi.listEquipmentIssues(sid).then(setHistory)
  }, [])

  async function submit() {
    if (!category || !severity || !name.trim() || !description.trim()) return
    setSubmitting(true)
    const payload = {
      store_id: storeId,
      equipment_name: name.trim(),
      equipment_category: category,
      severity,
      description: description.trim(),
      repair_requested: repairRequested,
    }
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await managerOffline.enqueue("equipment_issue", payload, photo || undefined)
      } else {
        await managerApi.postEquipmentIssue(payload)
      }
      setDone(true)
      setTimeout(() => router.push("/manager"), 1200)
    } catch {
      await managerOffline.enqueue("equipment_issue", payload, photo || undefined)
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
        <p className="text-lg font-semibold">設備故障を記録しました</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* カテゴリ */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
          設備カテゴリ
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`px-2 py-3 rounded-lg border text-sm transition-colors ${
                category === c.value
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* 設備名 */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">設備名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: メインフライヤー A"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-3 text-base focus:outline-none focus:border-white/30"
        />
      </section>

      {/* 重大度 */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">重大度</label>
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
            <span>修理業者に緊急通知されます。</span>
          </div>
        )}
      </section>

      {/* 状況 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] uppercase tracking-wider text-white/40">状況の説明</label>
          <VoiceInput onResult={setDescription} />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="症状・発生時刻・影響範囲"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
        />
      </section>

      {/* 写真 */}
      <section>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">写真</label>
        <PhotoCapture onChange={setPhoto} label="故障箇所を撮影" />
      </section>

      {/* 修理依頼 */}
      <section className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <span className="text-sm">修理依頼を出す</span>
        <button
          type="button"
          onClick={() => setRepairRequested((v) => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            repairRequested ? "bg-emerald-500" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              repairRequested ? "translate-x-6" : ""
            }`}
          />
        </button>
      </section>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !category || !severity || !name.trim() || !description.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-black font-bold text-base disabled:opacity-40 active:scale-[0.99] transition"
      >
        <Send className="w-5 h-5" />
        {submitting ? "送信中…" : "故障を報告"}
      </button>

      {/* history */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">修理ステータス</h2>
        <ul className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
          {history.map((h) => (
            <li key={h.id} className="px-4 py-3 flex items-center gap-3">
              <Wrench className="w-4 h-4 text-white/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/85 truncate">{h.equipment_name}</div>
                <div className="text-[11px] text-white/40 truncate">{h.description}</div>
                <div className="text-[10px] text-white/30 font-mono tabular-nums">{h.date}</div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                  h.status === "fixed"
                    ? "text-emerald-400 bg-emerald-400/10"
                    : h.status === "in_progress"
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-amber-400 bg-amber-400/10"
                }`}
              >
                {h.status === "fixed" ? "修理済" : h.status === "in_progress" ? "対応中" : "報告済"}
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
