"use client"

import { useEffect, useState } from "react"
import { Save, CheckCircle2, ChevronRight } from "lucide-react"
import { managerApi, type StaffEvaluationDraft } from "@/lib/manager-api"
import { VoiceInput } from "@/components/manager/VoiceInput"

export default function EvaluationPage() {
  const [list, setList] = useState<StaffEvaluationDraft[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [rating, setRating] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    const sid = (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    managerApi.listStaffEvaluations(sid).then(setList)
  }, [])

  const selected = list.find((e) => e.id === selectedId) || null

  function open(item: StaffEvaluationDraft) {
    setSelectedId(item.id)
    setNotes(item.notes || "")
    setRating(item.rating || 0)
    setSavedId(null)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      await managerApi.saveStaffEvaluation({
        staff_id: selected.staff_id,
        notes,
        rating: rating || undefined,
      })
      setList((prev) =>
        prev.map((e) =>
          e.id === selected.id
            ? { ...e, notes, rating: rating || undefined, last_review_date: new Date().toISOString().slice(0, 10) }
            : e
        )
      )
      setSavedId(selected.id)
      setTimeout(() => {
        setSelectedId(null)
        setSavedId(null)
      }, 1200)
    } finally {
      setSaving(false)
    }
  }

  if (selected) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="text-lg font-semibold">{selected.staff_name}</div>
          <div className="text-[11px] text-white/40 mt-0.5">
            {selected.role} · 前回 {selected.last_review_date}
          </div>
        </div>

        <section>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-2">
            評価（5段階）
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`py-4 rounded-lg border text-lg font-semibold transition-colors ${
                  rating >= n
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-white/60"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] uppercase tracking-wider text-white/40">面談記録</label>
            <VoiceInput onResult={setNotes} />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder="今月のフィードバック・成長点・改善点・本人からの相談"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex-1 py-3 rounded-xl border border-white/15 bg-white/[0.04] text-white/80"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !notes.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中…" : "保存"}
          </button>
        </div>

        {savedId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>保存しました</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/60">スタッフを選択して月次面談記録を追加</p>
      <ul className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => open(e)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-sm font-semibold shrink-0">
                {e.staff_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90 truncate">{e.staff_name}</div>
                <div className="text-[11px] text-white/40">
                  {e.role} · 前回 {e.last_review_date}
                  {e.rating ? ` · ★${e.rating}` : ""}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-4 py-6 text-center text-white/40 text-sm">スタッフ未登録</li>
        )}
      </ul>
    </div>
  )
}
