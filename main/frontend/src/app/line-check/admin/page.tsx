"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import {
  ChecklistItem, ChecklistTemplate, ScheduleType, lineCheckApi,
} from "@/lib/line-check-api"
import { Plus, Trash2, Save, Camera, Thermometer } from "lucide-react"

const SCHEDULES: ScheduleType[] = ["opening", "4h", "closing", "weekly"]
const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  opening: "開店", "4h": "4h品質", closing: "閉店", weekly: "週次",
}

interface DraftItem {
  text: string
  required: boolean
  requires_photo: boolean
  requires_temperature: boolean
  min_temp: number | ""
  max_temp: number | ""
}

const blankItem: DraftItem = {
  text: "",
  required: true,
  requires_photo: false,
  requires_temperature: false,
  min_temp: "",
  max_temp: "",
}

export default function LineCheckAdmin() {
  const [tpls, setTpls] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<ChecklistTemplate | null>(null)
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [draftName, setDraftName] = useState("")
  const [draftSchedule, setDraftSchedule] = useState<ScheduleType>("opening")

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setLoading(true)
    lineCheckApi.listTemplates()
      .then(setTpls)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  function startEdit(t: ChecklistTemplate) {
    setEditing(t)
    setDraftName(t.name)
    setDraftSchedule(t.schedule_type)
    setDraftItems(t.items.map((i) => ({
      text: i.text,
      required: i.required,
      requires_photo: i.requires_photo,
      requires_temperature: i.requires_temperature,
      min_temp: i.min_temp ?? "",
      max_temp: i.max_temp ?? "",
    })))
  }

  function startNew() {
    setEditing({ id: "new", name: "", schedule_type: "opening", brand_id: null, store_id: null, active: true, items: [] } as ChecklistTemplate)
    setDraftName("")
    setDraftSchedule("opening")
    setDraftItems([{ ...blankItem }])
  }

  async function save() {
    try {
      const items = draftItems
        .filter((i) => i.text.trim())
        .map((i, idx) => ({
          order: idx,
          text: i.text,
          required: i.required,
          requires_photo: i.requires_photo,
          requires_temperature: i.requires_temperature,
          min_temp: i.min_temp === "" ? null : Number(i.min_temp),
          max_temp: i.max_temp === "" ? null : Number(i.max_temp),
        }))
      await lineCheckApi.createTemplate({
        name: draftName || "新規チェックリスト",
        schedule_type: draftSchedule,
        items: items as unknown as ChecklistItem[],
      })
      setEditing(null)
      refresh()
    } catch (e) {
      alert("保存に失敗しました: " + (e as Error).message)
    }
  }

  if (loading) return <Shell><LoadingState /></Shell>
  if (error) return <Shell><ErrorState message={error} /></Shell>

  return (
    <Shell>
      <div className="px-5 py-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold">
              テンプレート一覧
            </h2>
            <button
              onClick={startNew}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-500 text-white text-[12px]"
            >
              <Plus className="w-3.5 h-3.5" /> 新規
            </button>
          </div>
          <div className="space-y-2">
            {tpls.map((t) => (
              <button
                key={t.id}
                onClick={() => startEdit(t)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  editing?.id === t.id
                    ? "border-blue-400/60 bg-blue-400/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                    {SCHEDULE_LABEL[t.schedule_type]}
                  </span>
                  <span className="text-[10px] text-white/40">{t.items.length}項目</span>
                </div>
                <div className="text-[14px] font-medium text-white/90">{t.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: editor */}
        <div>
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold">
                  {editing.id === "new" ? "新規テンプレート" : "編集"}
                </h2>
                <button
                  onClick={save}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-[12px]"
                >
                  <Save className="w-3.5 h-3.5" /> 保存
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">名前</label>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">頻度</label>
                  <select
                    value={draftSchedule}
                    onChange={(e) => setDraftSchedule(e.target.value as ScheduleType)}
                    className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08]"
                  >
                    {SCHEDULES.map((s) => (
                      <option key={s} value={s} className="bg-[#0c1017]">
                        {SCHEDULE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-wider text-white/40">項目</label>
                  <button
                    onClick={() => setDraftItems([...draftItems, { ...blankItem }])}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 追加
                  </button>
                </div>
                {draftItems.map((it, idx) => (
                  <div key={idx} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 w-4">{idx + 1}</span>
                      <input
                        value={it.text}
                        onChange={(e) =>
                          setDraftItems(draftItems.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                        }
                        placeholder="チェック項目"
                        className="flex-1 text-[13px] px-2 py-1.5 rounded bg-white/[0.04] border border-white/[0.08]"
                      />
                      <button
                        onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}
                        className="text-white/40 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[12px]">
                      <label className="flex items-center gap-1 text-white/60">
                        <input
                          type="checkbox"
                          checked={it.requires_photo}
                          onChange={(e) =>
                            setDraftItems(draftItems.map((x, i) => (i === idx ? { ...x, requires_photo: e.target.checked } : x)))
                          }
                        />
                        <Camera className="w-3.5 h-3.5" /> 写真必須
                      </label>
                      <label className="flex items-center gap-1 text-white/60">
                        <input
                          type="checkbox"
                          checked={it.requires_temperature}
                          onChange={(e) =>
                            setDraftItems(draftItems.map((x, i) => (i === idx ? { ...x, requires_temperature: e.target.checked } : x)))
                          }
                        />
                        <Thermometer className="w-3.5 h-3.5" /> 温度測定
                      </label>
                      {it.requires_temperature && (
                        <>
                          <input
                            type="number"
                            placeholder="min"
                            value={it.min_temp}
                            onChange={(e) =>
                              setDraftItems(draftItems.map((x, i) => (i === idx ? { ...x, min_temp: e.target.value === "" ? "" : Number(e.target.value) } : x)))
                            }
                            className="w-20 text-[12px] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08]"
                          />
                          <span className="text-white/40">〜</span>
                          <input
                            type="number"
                            placeholder="max"
                            value={it.max_temp}
                            onChange={(e) =>
                              setDraftItems(draftItems.map((x, i) => (i === idx ? { ...x, max_temp: e.target.value === "" ? "" : Number(e.target.value) } : x)))
                            }
                            className="w-20 text-[12px] px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08]"
                          />
                          <span className="text-white/40 text-[11px]">℃</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-white/40 px-3 py-8 text-center border border-dashed border-white/[0.08] rounded-lg">
              左から編集するテンプレートを選択するか「新規」をクリック
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="現場チェック / テンプレート編集" description="開店・閉店・4h品質チェックリストの設計" />
      {children}
    </div>
  )
}
