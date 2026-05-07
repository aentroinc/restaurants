"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import ObjectGraph from "@/components/ontology/ObjectGraph"
import { ontologyAPI, type OntoObjectType, type OntoLink, type OntoAction } from "@/lib/ontology-api"
import { Plus, Pencil, GitBranch, ExternalLink, Boxes, Link2, Zap } from "lucide-react"

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  draft: "bg-amber-400",
  deprecated: "bg-white/30",
}

export default function OntologyHomePage() {
  const [objectTypes, setObjectTypes] = useState<OntoObjectType[]>([])
  const [links, setLinks] = useState<OntoLink[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actions, setActions] = useState<OntoAction[]>([])
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ api_name: "", display_name: "", icon: "" })

  useEffect(() => {
    ontologyAPI.listObjectTypes().then((ots) => {
      setObjectTypes(ots)
      if (ots.length > 0) setSelectedId(ots[0].id)
    }).catch(() => {})
    ontologyAPI.listLinks().then(setLinks).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedId) return
    ontologyAPI.listActions(selectedId).then(setActions).catch(() => setActions([]))
  }, [selectedId])

  const selected = useMemo(() => objectTypes.find((t) => t.id === selectedId), [objectTypes, selectedId])
  const relatedLinks = useMemo(
    () => links.filter((l) => l.from_object_type_id === selectedId || l.to_object_type_id === selectedId),
    [links, selectedId]
  )

  const handleCreate = async () => {
    const created = await ontologyAPI.createObjectType({
      api_name: form.api_name,
      display_name: form.display_name || form.api_name,
      icon: form.icon || "📦",
    })
    setObjectTypes((prev) => [...prev, created])
    setSelectedId(created.id)
    setNewOpen(false)
    setForm({ api_name: "", display_name: "", icon: "" })
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader
        title="オントロジー"
        description="ObjectType / Link / Action の管理"
        actions={
          <Link href="/admin/ontology/branches">
            <Button size="sm" variant="outline" className="bg-white/[0.04] border-white/[0.1] text-white/60 hover:bg-white/[0.08] text-[12px] h-8">
              <GitBranch className="w-3.5 h-3.5 mr-1.5" />ブランチ
            </Button>
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left — Object Types */}
        <div className="w-[240px] border-r border-white/[0.06] bg-[#0b0f15] flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Object Types</span>
            <span className="text-[10px] text-white/30 font-mono">{objectTypes.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {objectTypes.map((ot) => (
              <button
                key={ot.id}
                onClick={() => setSelectedId(ot.id)}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors ${selectedId === ot.id ? "bg-white/[0.06] border-l-2 border-blue-400" : "border-l-2 border-transparent"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px]">{ot.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] text-white/85 truncate">{ot.display_name}</div>
                    <div className="text-[10px] text-white/30 font-mono truncate">{ot.api_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-white/30 font-mono">v{ot.version}</span>
                  <span className={`w-2 h-2 rounded-full ${statusDot[ot.status] || statusDot.draft}`} />
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-white/[0.06]">
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-white/[0.04] text-white/60 hover:bg-white/[0.08] border border-white/[0.08] text-[12px] h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />新規 ObjectType
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
                <DialogHeader><DialogTitle className="text-white/90">新規 ObjectType</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">API名（snake_case）</label>
                    <Input value={form.api_name} onChange={(e) => setForm({ ...form, api_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="例: customer" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">表示名</label>
                    <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: 顧客" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">アイコン</label>
                    <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="📦" />
                  </div>
                  <Button onClick={handleCreate} className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!form.api_name}>作成</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Center — Graph */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0e14]">
          <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0b0f15] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">関係グラフ</span>
              <span className="text-[10px] text-white/30">ノードクリックで選択</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span>ObjectType: {objectTypes.length}</span>
              <span>Link: {links.length}</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <ObjectGraph
              objectTypes={objectTypes}
              links={links}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Right — Details */}
        <div className="w-[340px] border-l border-white/[0.06] bg-[#0b0f15] flex flex-col shrink-0 overflow-y-auto">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[18px]">{selected.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white/90 truncate">{selected.display_name}</div>
                    <div className="text-[10px] text-white/40 font-mono truncate">{selected.api_name}</div>
                  </div>
                </div>
                <Link href={`/admin/ontology/object-types/${selected.id}`}>
                  <Button size="sm" className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] text-[11px] h-7">
                    <Pencil className="w-3 h-3 mr-1" />編集
                  </Button>
                </Link>
              </div>

              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <Boxes className="w-3.5 h-3.5 text-blue-400/70" />
                  <span className="text-[11px] uppercase tracking-wider text-white/50 font-medium">プロパティ ({selected.properties?.length ?? 0})</span>
                </div>
                <div className="space-y-1">
                  {(selected.properties ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[12px] py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-white/70 truncate">{p.api_name}</span>
                        {p.required && <span className="text-[9px] px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded">必須</span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-white/40">{p.data_type}</span>
                        {p.pii_level !== "none" && (
                          <span className={`text-[9px] px-1 py-0.5 rounded ${
                            p.pii_level === "high" ? "bg-red-400/10 text-red-400" :
                            p.pii_level === "medium" ? "bg-amber-400/10 text-amber-400" :
                            "bg-emerald-400/10 text-emerald-400"
                          }`}>PII:{p.pii_level}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(selected.properties?.length ?? 0) === 0 && <div className="text-[11px] text-white/30">プロパティ未定義</div>}
                </div>
              </div>

              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-purple-400/70" />
                  <span className="text-[11px] uppercase tracking-wider text-white/50 font-medium">リンク ({relatedLinks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {relatedLinks.map((l) => {
                    const isOut = l.from_object_type_id === selected.id
                    const otherId = isOut ? l.to_object_type_id : l.from_object_type_id
                    const other = objectTypes.find((o) => o.id === otherId)
                    return (
                      <div key={l.id} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-white/40">{isOut ? "→" : "←"}</span>
                          <span className="text-white/70 truncate">{other?.icon} {other?.display_name || otherId}</span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-300/80 shrink-0">{l.cardinality}</span>
                      </div>
                    )
                  })}
                  {relatedLinks.length === 0 && <div className="text-[11px] text-white/30">リンクなし</div>}
                </div>
              </div>

              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400/70" />
                  <span className="text-[11px] uppercase tracking-wider text-white/50 font-medium">アクション ({actions.length})</span>
                </div>
                <div className="space-y-1">
                  {actions.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-[12px] py-1">
                      <span className="font-mono text-white/70 truncate">{a.api_name}</span>
                      {a.requires_approval && <span className="text-[9px] px-1 py-0.5 bg-amber-400/10 text-amber-400 rounded">承認必要</span>}
                    </div>
                  ))}
                  {actions.length === 0 && <div className="text-[11px] text-white/30">アクション未定義</div>}
                </div>
              </div>

              <div className="px-4 py-3 mt-auto">
                <Link href={`/admin/ontology/object-types/${selected.id}`} className="text-[12px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  詳細編集を開く <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-[13px] p-4 text-center">
              ObjectType を選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
