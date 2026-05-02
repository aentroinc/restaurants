"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { svApi, type SVStore } from "@/lib/sv-api"
import { VisitChecklist, type ChecklistItem, type ChecklistState } from "@/components/sv/VisitChecklist"
import { offlineStore } from "@/lib/offline-store"
import { Camera, Save, ArrowLeft, Plus, MessageSquare, Check, AlertTriangle, Loader2 } from "lucide-react"

export default function SVVisitPage() {
  const params = useParams<{ storeId: string }>()
  const router = useRouter()
  const storeId = params.storeId

  const [store, setStore] = useState<SVStore | null>(null)
  const [checklist, setChecklist] = useState<ChecklistState>({ results: {}, completionRate: 0 })
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([])
  const [managerNote, setManagerNote] = useState("")
  const [overallNote, setOverallNote] = useState("")
  const [issuedTasks, setIssuedTasks] = useState<{ id: string; title: string; comment: string }[]>([])
  const [taskDraft, setTaskDraft] = useState<{ open: boolean; itemLabel: string; comment: string }>({ open: false, itemLabel: "", comment: "" })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    svApi.listStores().then((all) => setStore(all.find((s) => s.id === storeId) || null))
  }, [storeId])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const id = await offlineStore.storePhoto(file)
    const url = URL.createObjectURL(file)
    setPhotos([...photos, { id, url }])
  }

  function openTaskDraft(item: ChecklistItem, comment: string) {
    setTaskDraft({ open: true, itemLabel: item.label, comment })
  }

  async function confirmTask() {
    if (!store) return
    const t = await svApi.createImprovementTask({
      store_id: store.id,
      store_name: store.name,
      title: `[改善] ${taskDraft.itemLabel}`,
      description: taskDraft.comment,
      priority: "high",
    })
    setIssuedTasks([...issuedTasks, { id: t.id, title: t.title, comment: taskDraft.comment }])
    setTaskDraft({ open: false, itemLabel: "", comment: "" })
  }

  async function finishVisit() {
    if (!store) return
    setSubmitting(true)
    try {
      const ngCount = Object.values(checklist.results).filter((r) => r.status === "ng").length
      const okCount = Object.values(checklist.results).filter((r) => r.status === "ok").length
      const qsc = okCount + ngCount > 0 ? Math.round((okCount / (okCount + ngCount)) * 100) : null
      await svApi.createVisit({
        store_id: store.id,
        store_name: store.name,
        visited_at: new Date().toISOString(),
        status: "done",
        qsc_score: qsc,
        notes: [managerNote && `[店長対話]\n${managerNote}`, overallNote && `[総評]\n${overallNote}`].filter(Boolean).join("\n\n") || null,
        photos: photos.map((p) => p.id),
        tasks_issued: issuedTasks.length,
      })
      setDone(true)
      setTimeout(() => router.push("/sv/visit"), 1500)
    } finally {
      setSubmitting(false)
    }
  }

  const completionPct = useMemo(() => Math.round(checklist.completionRate * 100), [checklist])

  if (!store) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-5 pb-24">
      <Link href="/sv/visit" className="inline-flex items-center gap-1 text-[12px] text-white/50 hover:text-white/80">
        <ArrowLeft className="w-3.5 h-3.5" />訪問一覧
      </Link>

      {/* Store header */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[18px] font-bold text-white/90">{store.name}</h1>
            <p className="text-[11px] text-white/50 mt-1">店長: {store.manager_name}・{store.area_name} {store.prefecture}・前回訪問 {store.last_visit_at || "未訪問"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/sv/ai-prep?store_id=${store.id}`} className="px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px] font-semibold">AI訪問前ブリーフ</Link>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${store.kpi.health_score < 60 ? "bg-red-500/15 text-red-400" : store.kpi.health_score < 70 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
              健全度 {store.kpi.health_score}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[11px] text-white/50 mb-1">チェックリスト進捗</div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <span className="text-[14px] font-mono font-bold text-emerald-400">{completionPct}%</span>
      </div>

      {/* Checklist */}
      <div>
        <h2 className="text-[14px] font-semibold text-white/85 mb-2">QSC + 重点チェック</h2>
        <VisitChecklist onChange={setChecklist} onIssueTask={openTaskDraft} />
      </div>

      {/* Photos */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-white/85 flex items-center gap-2"><Camera className="w-4 h-4" />写真記録</h2>
          <label className="px-3 py-1.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[12px] font-semibold cursor-pointer">
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            撮影/追加
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="text-[12px] text-white/40">まだ写真はありません</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="aspect-square rounded overflow-hidden border border-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="visit" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manager dialogue */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h2 className="text-[14px] font-semibold text-white/85 flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4" />店長との対話メモ
        </h2>
        <textarea
          value={managerNote}
          onChange={(e) => setManagerNote(e.target.value)}
          placeholder="店長からのヒアリング・課題感・次回までの宿題..."
          className="w-full h-28 px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85 focus:outline-none focus:border-blue-400/40 resize-none"
        />
      </div>

      {/* Issued tasks */}
      {issuedTasks.length > 0 && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.04] p-4">
          <h2 className="text-[13px] font-semibold text-amber-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />発行済み改善タスク ({issuedTasks.length})
          </h2>
          <ul className="space-y-1.5">
            {issuedTasks.map((t) => (
              <li key={t.id} className="text-[12px] text-white/80">
                <span className="font-semibold">{t.title}</span>
                {t.comment && <span className="text-white/50"> — {t.comment}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h2 className="text-[14px] font-semibold text-white/85 mb-2">総評</h2>
        <textarea
          value={overallNote}
          onChange={(e) => setOverallNote(e.target.value)}
          placeholder="この訪問の総合所感・次回への申し送り..."
          className="w-full h-20 px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85 focus:outline-none focus:border-blue-400/40 resize-none"
        />
      </div>

      {/* Sticky finish bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.06] bg-[#0c1017]/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <span className="text-[11px] text-white/50 hidden md:inline">完了で記録 → 次の店舗へ</span>
        <div className="flex-1" />
        <button
          onClick={finishVisit}
          disabled={submitting || done}
          className="px-5 py-2.5 rounded bg-gradient-to-r from-emerald-500 to-blue-500 hover:opacity-90 text-white text-[13px] font-bold flex items-center gap-2 disabled:opacity-60"
        >
          {done ? <><Check className="w-4 h-4" />訪問完了</> : submitting ? <><Loader2 className="w-4 h-4 animate-spin" />送信中</> : <><Save className="w-4 h-4" />訪問完了して次の店へ</>}
        </button>
      </div>

      {/* Task draft modal */}
      {taskDraft.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={() => setTaskDraft({ open: false, itemLabel: "", comment: "" })}>
          <div className="w-full max-w-md bg-[#0c1017] border border-white/[0.08] rounded-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold text-white/90 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />その場で改善タスク発行
            </h3>
            <p className="text-[11px] text-white/50 mb-3">指摘項目: <span className="text-white/80">{taskDraft.itemLabel}</span></p>
            <textarea
              value={taskDraft.comment}
              onChange={(e) => setTaskDraft({ ...taskDraft, comment: e.target.value })}
              placeholder="改善内容と期日感..."
              className="w-full h-28 px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85 focus:outline-none focus:border-amber-400/40 resize-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setTaskDraft({ open: false, itemLabel: "", comment: "" })} className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/70">キャンセル</button>
              <button onClick={confirmTask} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-white text-[12px] font-semibold">タスク発行</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
