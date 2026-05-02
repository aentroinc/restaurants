"use client"

import { useState } from "react"
import { ACTION_LABELS, type ActionStep, type ActionType } from "@/lib/aip-logic-api"
import { Plus, ArrowUp, ArrowDown, Trash2, GripVertical } from "lucide-react"

const ALL_TYPES: ActionType[] = [
  "call_ai_chat",
  "create_task",
  "send_notification",
  "query_kpi",
  "run_pipeline",
]

type Props = {
  value: ActionStep[]
  onChange: (next: ActionStep[]) => void
}

function defaultParams(t: ActionType): Record<string, any> {
  switch (t) {
    case "call_ai_chat":
      return { prompt: "原因仮説を3点出してください。" }
    case "create_task":
      return { title: "[AI] 改善タスク", priority: "high", description: "" }
    case "send_notification":
      return { channel: "sv", message: "通知メッセージ" }
    case "query_kpi":
      return { name: "net_sales" }
    case "run_pipeline":
      return { pipeline_id: "" }
    default:
      return {}
  }
}

function ParamsEditor({ step, onChange }: { step: ActionStep; onChange: (s: ActionStep) => void }) {
  const update = (k: string, v: any) =>
    onChange({ ...step, params: { ...step.params, [k]: v } })

  const baseInput = "bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1 w-full"

  switch (step.type) {
    case "call_ai_chat":
      return (
        <div className="space-y-1">
          <label className="text-[10px] text-white/50">プロンプト</label>
          <textarea
            className={baseInput + " min-h-[60px]"}
            value={step.params?.prompt ?? ""}
            onChange={(e) => update("prompt", e.target.value)}
          />
        </div>
      )
    case "create_task":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/50">タイトル</label>
            <input className={baseInput} value={step.params?.title ?? ""} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-white/50">優先度</label>
            <select className={baseInput} value={step.params?.priority ?? "medium"} onChange={(e) => update("priority", e.target.value)}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-white/50">説明 (任意)</label>
            <textarea className={baseInput} value={step.params?.description ?? ""} onChange={(e) => update("description", e.target.value)} />
          </div>
        </div>
      )
    case "send_notification":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/50">チャンネル</label>
            <select className={baseInput} value={step.params?.channel ?? "sv"} onChange={(e) => update("channel", e.target.value)}>
              <option value="sv">SV</option>
              <option value="manager">店長</option>
              <option value="exec">経営</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-white/50">メッセージ</label>
            <input className={baseInput} value={step.params?.message ?? ""} onChange={(e) => update("message", e.target.value)} />
          </div>
        </div>
      )
    case "query_kpi":
      return (
        <div>
          <label className="text-[10px] text-white/50">KPI 名</label>
          <input className={baseInput} value={step.params?.name ?? ""} onChange={(e) => update("name", e.target.value)} />
        </div>
      )
    case "run_pipeline":
      return (
        <div>
          <label className="text-[10px] text-white/50">Pipeline ID (UUID)</label>
          <input className={baseInput} value={step.params?.pipeline_id ?? ""} onChange={(e) => update("pipeline_id", e.target.value)} />
        </div>
      )
    default:
      return null
  }
}

export default function ActionChainEditor({ value, onChange }: Props) {
  const [drag, setDrag] = useState<number | null>(null)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i: number) => {
    const next = [...value]
    next.splice(i, 1)
    onChange(next)
  }

  const update = (i: number, s: ActionStep) => {
    const next = [...value]
    next[i] = s
    onChange(next)
  }

  const add = (t: ActionType) => {
    onChange([...value, { type: t, params: defaultParams(t) }])
  }

  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (drag === null || drag === i) return
    const next = [...value]
    const [moved] = next.splice(drag, 1)
    next.splice(i, 0, moved)
    setDrag(i)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-white/50">
        アクションチェーン — 上から順に実行されます。ドラッグまたは矢印で並べ替え可能。
      </div>

      <div className="space-y-2">
        {value.length === 0 && (
          <div className="rounded border border-dashed border-white/10 p-4 text-[12px] text-white/40 text-center">
            まだアクションがありません。下から追加してください。
          </div>
        )}
        {value.map((step, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDrag(i)}
            onDragEnd={() => setDrag(null)}
            onDragOver={(e) => onDragOver(e, i)}
            className="rounded border border-white/10 bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <GripVertical className="w-3 h-3 text-white/30 cursor-grab" />
              <span className="text-[10px] text-white/40 tabular-nums">#{i + 1}</span>
              <select
                value={step.type}
                onChange={(e) => update(i, { type: e.target.value as ActionType, params: defaultParams(e.target.value as ActionType) })}
                className="bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1"
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                ))}
              </select>
              <label className="ml-2 inline-flex items-center gap-1 text-[10px] text-white/50">
                <input
                  type="checkbox"
                  checked={!!step.stop_on_error}
                  onChange={(e) => update(i, { ...step, stop_on_error: e.target.checked })}
                />
                エラー時停止
              </label>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="p-1 text-white/40 hover:text-white"><ArrowUp className="w-3 h-3" /></button>
                <button type="button" onClick={() => move(i, 1)} className="p-1 text-white/40 hover:text-white"><ArrowDown className="w-3 h-3" /></button>
                <button type="button" onClick={() => remove(i)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <ParamsEditor step={step} onChange={(s) => update(i, s)} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => add(t)}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-white/15 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Plus className="w-3 h-3" />{ACTION_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  )
}
