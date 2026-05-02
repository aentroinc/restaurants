"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, AlertTriangle, ExternalLink, Send } from "lucide-react"
import { managerApi, type ShiftDraftSlim } from "@/lib/manager-api"

export default function ShiftPage() {
  const [draft, setDraft] = useState<ShiftDraftSlim | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    // Try to load the most recent draft.
    // In real impl, we'd list drafts then pick latest. For now use a known mock id.
    managerApi
      .getShiftDraft("draft-mock-001")
      .then(setDraft)
      .finally(() => setLoading(false))
  }, [])

  async function publish() {
    if (!draft) return
    setPublishing(true)
    try {
      const updated = await managerApi.publishShiftDraft(draft.id)
      setDraft(updated)
      setPublished(true)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
          今週のシフトドラフト
        </div>
        {loading || !draft ? (
          <div className="h-32 animate-pulse bg-white/5 rounded" />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-lg font-semibold font-mono tabular-nums">
                  週開始 {draft.week_start}
                </div>
                <div className="text-[11px] text-white/40">ID: {draft.id}</div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                  draft.status === "published"
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-amber-400 bg-amber-400/10"
                }`}
              >
                {draft.status === "published" ? "公開済" : "ドラフト"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <Stat label="充足率" value={`${draft.fill_rate_pct}%`} positive={draft.fill_rate_pct >= 95} />
              <Stat label="未割当" value={`${draft.unfilled_slots} 枠`} positive={draft.unfilled_slots === 0} />
              <Stat label="人件費" value={`¥${draft.cost_estimate_yen.toLocaleString()}`} />
            </div>

            {draft.unfilled_slots > 0 && draft.status !== "published" && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>未割当が {draft.unfilled_slots} 枠あります。シフトビルダーで調整してください。</span>
              </div>
            )}
          </>
        )}
      </section>

      <Link
        href="/labor/shift-builder"
        className="flex items-center justify-between px-4 py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition"
      >
        <div>
          <div className="text-sm font-semibold">シフトビルダーで編集</div>
          <div className="text-[11px] text-white/40">枠の追加・スタッフ変更・スワップ</div>
        </div>
        <ExternalLink className="w-4 h-4 text-white/50" />
      </Link>

      <button
        type="button"
        onClick={publish}
        disabled={!draft || publishing || draft?.status === "published"}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 text-black font-bold text-base disabled:opacity-40 active:scale-[0.99] transition"
      >
        <Send className="w-5 h-5" />
        {draft?.status === "published"
          ? "公開済"
          : publishing
          ? "公開中…"
          : "シフトを公開"}
      </button>

      {published && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>シフトを公開しました。スタッフに通知されます。</span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-2 border border-white/[0.04]">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div
        className={`font-mono tabular-nums text-base font-semibold mt-0.5 ${
          positive === undefined
            ? "text-white"
            : positive
            ? "text-emerald-400"
            : "text-amber-400"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
