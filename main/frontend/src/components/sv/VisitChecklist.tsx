"use client"

import { useState } from "react"
import { Check, AlertTriangle, Camera, Plus } from "lucide-react"

export interface ChecklistItem {
  id: string
  category: "Q" | "S" | "C" | "他"
  label: string
  required: boolean
}

export const DEFAULT_QSC_CHECKLIST: ChecklistItem[] = [
  { id: "q-1", category: "Q", label: "提供時間 (ピーク時)", required: true },
  { id: "q-2", category: "Q", label: "盛り付け基準遵守", required: true },
  { id: "q-3", category: "Q", label: "料理温度 (適温管理)", required: true },
  { id: "s-1", category: "S", label: "笑顔・挨拶", required: true },
  { id: "s-2", category: "S", label: "オーダーテイク精度", required: true },
  { id: "s-3", category: "S", label: "クレーム対応 (前回指摘)", required: false },
  { id: "c-1", category: "C", label: "店内清掃 (テーブル/床)", required: true },
  { id: "c-2", category: "C", label: "トイレ清掃", required: true },
  { id: "c-3", category: "C", label: "厨房・冷蔵庫整理", required: true },
  { id: "o-1", category: "他", label: "シフト充足率", required: true },
  { id: "o-2", category: "他", label: "在庫水準 (ABC品)", required: false },
  { id: "o-3", category: "他", label: "改善タスク進捗確認", required: true },
]

interface Props {
  items?: ChecklistItem[]
  onChange?: (state: ChecklistState) => void
  onIssueTask?: (item: ChecklistItem, comment: string) => void
}

export interface ChecklistState {
  results: Record<string, { status: "ok" | "ng" | "skip"; comment: string }>
  completionRate: number
}

const CATEGORY_COLORS: Record<ChecklistItem["category"], string> = {
  Q: "text-emerald-400 bg-emerald-500/10",
  S: "text-blue-400 bg-blue-500/10",
  C: "text-purple-400 bg-purple-500/10",
  他: "text-amber-400 bg-amber-500/10",
}

export function VisitChecklist({ items = DEFAULT_QSC_CHECKLIST, onChange, onIssueTask }: Props) {
  const [results, setResults] = useState<Record<string, { status: "ok" | "ng" | "skip"; comment: string }>>({})

  function update(id: string, patch: Partial<{ status: "ok" | "ng" | "skip"; comment: string }>) {
    const next = { ...results, [id]: { status: patch.status ?? results[id]?.status ?? "skip", comment: patch.comment ?? results[id]?.comment ?? "" } }
    setResults(next)
    const completed = Object.values(next).filter((r) => r.status !== "skip").length
    onChange?.({ results: next, completionRate: completed / items.length })
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const r = results[item.id] || { status: "skip", comment: "" }
        return (
          <div key={item.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <span className={`shrink-0 w-7 h-7 rounded font-bold text-[11px] flex items-center justify-center ${CATEGORY_COLORS[item.category]}`}>{item.category}</span>
              <span className="flex-1 text-[14px] text-white/85">{item.label}{item.required && <span className="text-red-400/80 ml-1">*</span>}</span>
              <div className="flex gap-1">
                <button onClick={() => update(item.id, { status: "ok" })} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${r.status === "ok" ? "bg-emerald-500 text-white" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"}`}>
                  <Check className="w-3 h-3 inline mr-0.5" />OK
                </button>
                <button onClick={() => update(item.id, { status: "ng" })} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${r.status === "ng" ? "bg-red-500 text-white" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"}`}>
                  <AlertTriangle className="w-3 h-3 inline mr-0.5" />NG
                </button>
                <button onClick={() => update(item.id, { status: "skip" })} className={`px-2.5 py-1 rounded text-[11px] ${r.status === "skip" ? "bg-white/10 text-white/70" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.06]"}`}>—</button>
              </div>
            </div>
            {r.status === "ng" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={r.comment}
                  onChange={(e) => update(item.id, { comment: e.target.value })}
                  placeholder="指摘内容を記録..."
                  className="flex-1 px-2.5 py-1 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/80 focus:outline-none focus:border-red-400/40"
                />
                <button
                  onClick={() => onIssueTask?.(item, r.comment)}
                  className="shrink-0 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />改善タスク発行
                </button>
                <button className="shrink-0 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/60 text-[11px] flex items-center gap-1">
                  <Camera className="w-3 h-3" />写真
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
