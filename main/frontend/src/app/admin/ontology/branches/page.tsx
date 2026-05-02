"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import BranchDiff from "@/components/ontology/BranchDiff"
import { ontologyAPI, type OntoBranch, type OntoBranchDiff, type BranchStatus } from "@/lib/ontology-api"
import { GitBranch, GitMerge, Plus, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react"

const statusBadge: Record<BranchStatus, string> = {
  active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  merged: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  abandoned: "bg-white/[0.04] text-white/40 border-white/[0.1]",
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<OntoBranch[]>([])
  const [leftId, setLeftId] = useState<string>("br-main")
  const [rightId, setRightId] = useState<string>("")
  const [diff, setDiff] = useState<OntoBranchDiff | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ name: "", base: "main", description: "" })
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<OntoBranch | null>(null)
  const [mergeDone, setMergeDone] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    ontologyAPI.listBranches().then((bs) => {
      setBranches(bs)
      const featBranch = bs.find((b) => b.name !== "main" && b.status === "active")
      if (featBranch) setRightId(featBranch.id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!leftId || !rightId) { setDiff(null); return }
    const left = branches.find((b) => b.id === leftId)
    const right = branches.find((b) => b.id === rightId)
    if (!left || !right) return
    ontologyAPI.branchDiff(left.name, right.name).then(setDiff).catch(() => {})
  }, [leftId, rightId, branches])

  const flashMsg = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 1800) }

  const handleCreate = async () => {
    const created = await ontologyAPI.createBranch({
      name: form.name.startsWith("feature/") ? form.name : `feature/${form.name}`,
      base: form.base,
      description: form.description,
    })
    setBranches((prev) => [...prev, created])
    setNewOpen(false)
    setForm({ name: "", base: "main", description: "" })
    setRightId(created.id)
    flashMsg("ブランチを作成しました")
  }

  const handleMerge = async () => {
    if (!mergeTarget) return
    await ontologyAPI.mergeBranch(mergeTarget.id)
    setBranches((prev) => prev.map((b) => b.id === mergeTarget.id ? { ...b, status: "merged", merged_at: new Date().toISOString() } : b))
    setMergeDone(true)
    setTimeout(() => { setMergeOpen(false); setMergeDone(false); setMergeTarget(null) }, 1500)
  }

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.name === "main") return -1
      if (b.name === "main") return 1
      if (a.status !== b.status) return a.status === "active" ? -1 : 1
      return a.created_at < b.created_at ? 1 : -1
    })
  }, [branches])

  const left = branches.find((b) => b.id === leftId)
  const right = branches.find((b) => b.id === rightId)

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader
        title="オントロジー / ブランチ"
        description="スキーマ変更のバージョン管理"
        actions={
          <div className="flex items-center gap-2">
            {flash && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{flash}</span>}
            <Link href="/admin/ontology">
              <Button size="sm" variant="outline" className="bg-white/[0.04] border-white/[0.1] text-white/60 hover:bg-white/[0.08] text-[12px] h-8">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />オントロジーへ
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left — Branch list */}
        <div className="w-[300px] border-r border-white/[0.06] bg-[#0b0f15] flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">ブランチ ({branches.length})</span>
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 text-[11px] h-7">
                  <Plus className="w-3 h-3 mr-1" />新規
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-md">
                <DialogHeader><DialogTitle className="text-white/90">新規ブランチ</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">名前 (feature/ プレフィックス自動)</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="例: add-loyalty-tier" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">ベースブランチ</label>
                    <select
                      value={form.base}
                      onChange={(e) => setForm({ ...form, base: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-[12px] text-white/80"
                    >
                      {branches.filter((b) => b.status !== "abandoned").map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">説明 (任意)</label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" />
                  </div>
                  <Button onClick={handleCreate} className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!form.name}>作成</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {sortedBranches.map((b) => (
              <div
                key={b.id}
                className={`px-3 py-2.5 border-l-2 ${rightId === b.id ? "bg-white/[0.06] border-blue-400" : leftId === b.id ? "bg-white/[0.03] border-emerald-400" : "border-transparent hover:bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GitBranch className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <span className="text-[12px] font-mono text-white/85 truncate">{b.name}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${statusBadge[b.status]}`}>{b.status}</span>
                </div>
                {b.description && <div className="text-[11px] text-white/40 truncate mb-1">{b.description}</div>}
                <div className="flex items-center gap-3 text-[10px] text-white/30 mb-2">
                  {b.base && <span>base: {b.base}</span>}
                  {b.created_by && <span>by {b.created_by}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLeftId(b.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${leftId === b.id ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/30" : "bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]"}`}
                  >base</button>
                  <button
                    onClick={() => setRightId(b.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${rightId === b.id ? "bg-blue-400/10 text-blue-400 border-blue-400/30" : "bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]"}`}
                  >compare</button>
                  {b.name !== "main" && b.status === "active" && (
                    <button
                      onClick={() => { setMergeTarget(b); setMergeOpen(true) }}
                      className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-400/30 hover:bg-blue-500/20 ml-auto flex items-center gap-1"
                    >
                      <GitMerge className="w-2.5 h-2.5" />merge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Diff */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0b0f15] flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">差分ビュー</span>
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="font-mono text-emerald-400">{left?.name || "—"}</span>
              <span className="text-white/30">→</span>
              <span className="font-mono text-blue-400">{right?.name || "—"}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {!leftId || !rightId || leftId === rightId ? (
              <div className="text-[12px] text-white/30 py-12 text-center">
                左の一覧から base / compare ブランチを選択してください
              </div>
            ) : diff ? (
              <BranchDiff diff={diff} leftLabel={left?.name} rightLabel={right?.name} />
            ) : (
              <div className="text-[12px] text-white/30 py-12 text-center">読み込み中...</div>
            )}
          </div>
        </div>
      </div>

      {/* Merge confirmation */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
          {mergeDone ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
              <p className="text-[14px] text-white/80">マージ完了</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white/90 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />マージしますか？
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13px] text-white/60 mt-2">
                <span className="font-mono text-white/85">{mergeTarget?.name}</span> を{" "}
                <span className="font-mono text-white/85">{mergeTarget?.base || "main"}</span> にマージします。
              </p>
              <div className="flex gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button>
                </DialogClose>
                <Button onClick={handleMerge} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">マージ実行</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
