"use client"

import { useEffect, useState } from "react"
import { svApi, type ManagerCoachingRecord } from "@/lib/sv-api"
import { GraduationCap, MessageSquare, Plus, TrendingUp, Calendar } from "lucide-react"

export default function SVCoachingPage() {
  const [records, setRecords] = useState<ManagerCoachingRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [noteForm, setNoteForm] = useState<{ open: boolean; topic: string; note: string }>({ open: false, topic: "", note: "" })
  const [drafts, setDrafts] = useState<Record<string, { date: string; topic: string; note: string }[]>>({})

  useEffect(() => {
    svApi.listManagerCoaching().then((r) => {
      setRecords(r)
      setSelected(r[0]?.manager_id || null)
    })
  }, [])

  const current = records.find((r) => r.manager_id === selected)

  function addNote() {
    if (!current) return
    const today = new Date().toISOString().slice(0, 10)
    const next = { ...drafts, [current.manager_id]: [{ date: today, topic: noteForm.topic, note: noteForm.note }, ...(drafts[current.manager_id] || [])] }
    setDrafts(next)
    setNoteForm({ open: false, topic: "", note: "" })
  }

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-white/90">店長コーチ</h1>
        <p className="text-[12px] text-white/40 mt-0.5">担当店長の OJT 進捗・成長度合い・指導記録</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Manager list */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-[13px] font-semibold text-white/85">担当店長 ({records.length})</h2>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {records.map((r) => (
              <button
                key={r.manager_id}
                onClick={() => setSelected(r.manager_id)}
                className={`w-full px-4 py-3 text-left hover:bg-white/[0.03] ${selected === r.manager_id ? "bg-blue-500/[0.05] border-l-2 border-blue-400" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white/85">{r.manager_name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${r.growth_score >= 75 ? "bg-emerald-500/15 text-emerald-400" : r.growth_score >= 60 ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"}`}>
                    成長 {r.growth_score}
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5 truncate">{r.store_name}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${r.ojt_progress_pct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-white/40 mt-0.5">
                  <span>OJT {r.ojt_progress_pct}%</span>
                  <span>前回 {r.last_meeting_at}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-4">
          {current ? (
            <>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-[18px] font-bold text-white/90 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-400" />{current.manager_name}
                    </h2>
                    <p className="text-[12px] text-white/50 mt-1">{current.store_name}</p>
                  </div>
                  <button onClick={() => setNoteForm({ open: true, topic: "", note: "" })} className="px-3 py-1.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[12px] font-semibold flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />指導記録を追加
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Stat label="OJT 進捗" value={`${current.ojt_progress_pct}%`} icon={Calendar} />
                  <Stat label="成長スコア" value={`${current.growth_score}`} icon={TrendingUp} tone={current.growth_score >= 75 ? "emerald" : "amber"} />
                  <Stat label="前回面談" value={current.last_meeting_at || "-"} icon={MessageSquare} />
                </div>
              </div>

              {noteForm.open && (
                <div className="rounded-lg border border-blue-400/20 bg-blue-500/[0.04] p-4">
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <input
                      placeholder="トピック (例: シフト, QSC, 原価)"
                      value={noteForm.topic}
                      onChange={(e) => setNoteForm({ ...noteForm, topic: e.target.value })}
                      className="col-span-3 px-3 py-1.5 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85"
                    />
                  </div>
                  <textarea
                    placeholder="指導内容・約束事項..."
                    value={noteForm.note}
                    onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                    className="w-full h-24 px-3 py-2 rounded bg-black/30 border border-white/[0.06] text-[13px] text-white/85 resize-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setNoteForm({ open: false, topic: "", note: "" })} className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/70">キャンセル</button>
                    <button onClick={addNote} disabled={!noteForm.note} className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-[12px] font-semibold disabled:opacity-50">追加</button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="text-[13px] font-semibold text-white/85 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />指導記録
                  </h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[...(drafts[current.manager_id] || []), ...current.recent_notes].map((n, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-white/40 font-mono">{n.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70">{n.topic}</span>
                      </div>
                      <p className="text-[13px] text-white/80">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-8 text-center text-[12px] text-white/40">
              店長を選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: any; tone?: "default" | "emerald" | "amber" }) {
  const cls = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-white/85"
  return (
    <div className="rounded border border-white/[0.06] bg-black/20 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/50 uppercase">{label}</span>
        <Icon className="w-3.5 h-3.5 text-white/30" />
      </div>
      <span className={`text-[18px] font-mono font-bold ${cls}`}>{value}</span>
    </div>
  )
}
