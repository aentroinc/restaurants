"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAPI } from "@/lib/api"
import { Lock, Plus, KeyRound, Tag, Sparkles } from "lucide-react"

interface Marking {
  id: string
  code: string
  display_name: string
  description?: string
  level: "low" | "medium" | "high"
}

interface Assignment {
  id: string
  resource_type: string
  resource_id: string | null
  column_name: string | null
  marking_code: string
  marking_display_name: string
  marking_level: string
}

interface PurposeView {
  purpose_token: string | null
  granted_markings: string[]
}

const LEVEL_BADGE: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
  high: "text-rose-400 bg-rose-400/10 border border-rose-400/20",
}

const STANDARD_PURPOSES = [
  { token: "operation", desc: "現場運用 — pii.basic / regulatory.haccp" },
  { token: "audit", desc: "監査 — pii.basic / labor.confidential / regulatory.haccp" },
  { token: "executive", desc: "経営層 — pii.basic / labor.confidential / fc.financial" },
  { token: "research", desc: "調査・集計 — marking 解放なし" },
]

export default function MarkingsPage() {
  const [markings, setMarkings] = useState<Marking[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [myPurpose, setMyPurpose] = useState<PurposeView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  // assign form
  const [assignResType, setAssignResType] = useState("kpi")
  const [assignColumn, setAssignColumn] = useState("")
  const [assignMarkingCode, setAssignMarkingCode] = useState("")

  // grant form
  const [grantUserId, setGrantUserId] = useState("")
  const [grantPurpose, setGrantPurpose] = useState("operation")
  const [grantTtl, setGrantTtl] = useState(60)

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, a, p] = await Promise.all([
        fetchAPI<Marking[]>("/api/v1/markings"),
        fetchAPI<Assignment[]>("/api/v1/markings/assignments"),
        fetchAPI<PurposeView>("/api/v1/markings/my-purpose").catch(() => ({ purpose_token: null, granted_markings: [] })),
      ])
      setMarkings(m || [])
      setAssignments(a || [])
      setMyPurpose(p)
      if (m && m.length && !assignMarkingCode) setAssignMarkingCode(m[0].code)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seedStandard = async () => {
    setSeeding(true)
    try {
      await fetchAPI("/api/v1/markings/seed", { method: "POST" })
      await loadAll()
    } catch (e) {
      alert(`seed 失敗: ${(e as Error).message}`)
    } finally {
      setSeeding(false)
    }
  }

  const submitAssign = async () => {
    try {
      await fetchAPI("/api/v1/markings/assign", {
        method: "POST",
        body: JSON.stringify({
          resource_type: assignResType,
          column: assignColumn || undefined,
          marking_code: assignMarkingCode,
        }),
      })
      setAssignColumn("")
      await loadAll()
    } catch (e) {
      alert(`assign 失敗: ${(e as Error).message}`)
    }
  }

  const submitGrant = async () => {
    try {
      await fetchAPI("/api/v1/markings/purpose/grant", {
        method: "POST",
        body: JSON.stringify({
          user_id: grantUserId,
          purpose_token: grantPurpose,
          ttl_minutes: grantTtl,
        }),
      })
      alert(`purpose=${grantPurpose} を ${grantTtl}分付与しました`)
      await loadAll()
    } catch (e) {
      alert(`grant 失敗: ${(e as Error).message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="Marking ACL" description="Foundry的セル粒度ガバナンス" />
        <LoadingState />
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-full bg-[#0a0e14]">
        <ContextHeader title="Marking ACL" description="Foundry的セル粒度ガバナンス" />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="Marking ACL" description="Foundry風: 行/列に marking を貼り、purpose-token と AND 評価" />

      <div className="px-5 py-5 space-y-6">
        {/* Current purpose */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[12px] text-white/60">現在のあなたの purpose</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-mono text-amber-300">
              {myPurpose?.purpose_token || "(none)"}
            </span>
            <span className="text-[11px] text-white/40">
              解放 markings: {myPurpose?.granted_markings?.join(", ") || "(none)"}
            </span>
          </div>
        </div>

        {/* Standard seed button */}
        {markings.length === 0 && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-amber-300 mb-0.5">標準 marking が未投入です</div>
              <div className="text-[11px] text-white/50">5種の標準 marking + 主要列の紐付けを一括投入できます</div>
            </div>
            <Button onClick={seedStandard} disabled={seeding} size="sm" className="bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30">
              {seeding ? "投入中…" : "標準シード投入"}
            </Button>
          </div>
        )}

        {/* Markings */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />Markings ({markings.length})
            </h2>
          </div>
          <div className="rounded-lg border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">code</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">display name</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">level</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">description</th>
                </tr>
              </thead>
              <tbody>
                {markings.map((m) => (
                  <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-cyan-400/90">{m.code}</td>
                    <td className="px-4 py-2.5">{m.display_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${LEVEL_BADGE[m.level] || ""}`}>{m.level}</span>
                    </td>
                    <td className="px-4 py-2.5 text-white/50 text-[12px]">{m.description || "-"}</td>
                  </tr>
                ))}
                {markings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center px-4 py-10 text-white/30 text-[12px]">marking がまだ定義されていません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assignments */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />Marking Assignments ({assignments.length})
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-500/20 text-blue-400 border border-blue-400/20 hover:bg-blue-500/30 text-[12px] h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Assign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
                <DialogHeader><DialogTitle className="text-white/90">Marking を貼る</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">resource_type</label>
                    <Input value={assignResType} onChange={(e) => setAssignResType(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: kpi / store / employee / store_pl" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">column (空欄=テーブル全体)</label>
                    <Input value={assignColumn} onChange={(e) => setAssignColumn(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: operating_profit_rate" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">marking</label>
                    <select value={assignMarkingCode} onChange={(e) => setAssignMarkingCode(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 rounded px-2 py-1.5 text-[13px]">
                      {markings.map((m) => <option key={m.id} value={m.code}>{m.code} ({m.level})</option>)}
                    </select>
                  </div>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={submitAssign}>付与</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">resource_type</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">column</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">resource_id</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">marking</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">level</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-white/70">{a.resource_type}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-cyan-400/90">{a.column_name || <span className="text-white/30">(全列)</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-white/40">{a.resource_id || <span className="text-white/20">(全行)</span>}</td>
                    <td className="px-4 py-2.5">{a.marking_code}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${LEVEL_BADGE[a.marking_level] || ""}`}>{a.marking_level}</span>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center px-4 py-10 text-white/30 text-[12px]">assignment がまだありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Purpose Grant */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />Purpose Grant
            </h2>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-white/50 block mb-1">user_id</label>
                <Input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono text-[12px]" placeholder="UUID" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 block mb-1">purpose</label>
                <select value={grantPurpose} onChange={(e) => setGrantPurpose(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-white/80 rounded px-2 py-1.5 text-[13px]">
                  {STANDARD_PURPOSES.map((p) => <option key={p.token} value={p.token}>{p.token}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-white/50 block mb-1">TTL (分)</label>
                <Input type="number" value={grantTtl} onChange={(e) => setGrantTtl(parseInt(e.target.value) || 60)} className="bg-white/[0.04] border-white/[0.08] text-white/80" />
              </div>
              <div className="flex items-end">
                <Button className="w-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30" onClick={submitGrant} disabled={!grantUserId}>
                  付与
                </Button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.05]">
              <div className="text-[11px] text-white/40 mb-2">標準 purpose:</div>
              <ul className="space-y-1">
                {STANDARD_PURPOSES.map((p) => (
                  <li key={p.token} className="text-[11px] text-white/50">
                    <span className="font-mono text-amber-300">{p.token}</span>
                    <span className="ml-2">— {p.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
