"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAPI } from "@/lib/api"
import type { OntologyObjectTypeV2, OntologyPropertyType, OntologyImpactReport } from "@/lib/types"
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  draft: "bg-amber-400",
  deprecated: "bg-white/30",
}

const dataTypes = ["string", "int", "float", "bool", "timestamp", "enum"]
const piiLevels = ["none", "low", "high"]

export default function OntologyPage() {
  const [objectTypes, setObjectTypes] = useState<OntologyObjectTypeV2[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [properties, setProperties] = useState<OntologyPropertyType[]>([])
  const [impact, setImpact] = useState<OntologyImpactReport | null>(null)
  const [deletedProps, setDeletedProps] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)
  const [newTypeOpen, setNewTypeOpen] = useState(false)
  const [newTypeForm, setNewTypeForm] = useState({ api_name: "", display_name: "", icon: "" })
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDone, setPublishDone] = useState(false)
  const [saveDone, setSaveDone] = useState(false)

  useEffect(() => {
    fetchAPI<OntologyObjectTypeV2[]>("/api/v1/ontology/object-types-v2").then(setObjectTypes)
  }, [])

  const selectedType = objectTypes.find((t) => t.id === selectedId)

  const selectType = (id: string) => {
    setSelectedId(id)
    setDeletedProps(new Set())
    setHasChanges(false)
    setSaveDone(false)
    setPublishDone(false)
    const ot = objectTypes.find((t) => t.id === id)
    if (ot) {
      setProperties([...ot.properties])
      fetchAPI<OntologyImpactReport>(`/api/v1/ontology/object-types/${id}/impact`).then(setImpact)
    }
  }

  const updateProperty = (index: number, field: keyof OntologyPropertyType, value: any) => {
    setProperties((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
    setHasChanges(true)
  }

  const deleteProperty = (index: number) => {
    const prop = properties[index]
    setDeletedProps((prev) => new Set(prev).add(prop.api_name))
    setProperties((prev) => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const addProperty = () => {
    const newProp: OntologyPropertyType = {
      id: `pt-new-${Date.now()}`,
      api_name: "",
      display_name: "",
      data_type: "string",
      required: false,
      pii_level: "none",
    }
    setProperties((prev) => [...prev, newProp])
    setHasChanges(true)
  }

  const handleDraftSave = () => {
    if (selectedType) {
      setObjectTypes((prev) => prev.map((t) => t.id === selectedType.id ? { ...t, properties: [...properties] } : t))
    }
    setHasChanges(false)
    setSaveDone(true)
    setTimeout(() => setSaveDone(false), 2000)
  }

  const breakingChanges = deletedProps.size > 0
  const affectedInstances = impact?.instance_count || 0

  const handlePublish = () => {
    if (selectedId) {
      fetchAPI(`/api/v1/ontology/object-types/${selectedId}/publish`, { method: "POST" })
      setObjectTypes((prev) => prev.map((t) => t.id === selectedId ? { ...t, status: "active", version: t.version + 1, properties: [...properties] } : t))
    }
    setPublishDone(true)
    setDeletedProps(new Set())
    setHasChanges(false)
    setTimeout(() => { setPublishOpen(false); setPublishDone(false) }, 1500)
  }

  const handleCreateType = () => {
    const newType: OntologyObjectTypeV2 = {
      id: `otv2-new-${Date.now()}`,
      api_name: newTypeForm.api_name,
      display_name: newTypeForm.display_name || newTypeForm.api_name,
      icon: newTypeForm.icon || "📦",
      version: 1,
      status: "draft",
      properties: [],
    }
    setObjectTypes((prev) => [...prev, newType])
    setNewTypeOpen(false)
    setNewTypeForm({ api_name: "", display_name: "", icon: "" })
    selectType(newType.id)
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="オントロジー管理" description="オブジェクト型・プロパティ・影響範囲の管理" />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left Panel — Object Types */}
        <div className="w-[220px] border-r border-white/[0.06] bg-[#0b0f15] flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Object Types</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {objectTypes.map((ot) => (
              <button
                key={ot.id}
                onClick={() => selectType(ot.id)}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors ${selectedId === ot.id ? "bg-white/[0.06] border-l-2 border-blue-400" : "border-l-2 border-transparent"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px]">{ot.icon}</span>
                  <span className="text-[13px] text-white/80 truncate">{ot.display_name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-white/30 font-mono">v{ot.version}</span>
                  <span className={`w-2 h-2 rounded-full ${statusDot[ot.status] || statusDot.draft}`} />
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-white/[0.06]">
            <Dialog open={newTypeOpen} onOpenChange={setNewTypeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-white/[0.04] text-white/50 hover:bg-white/[0.08] border border-white/[0.08] text-[12px] h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />新規タイプ
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
                <DialogHeader><DialogTitle className="text-white/90">新規オブジェクトタイプ</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">API名（英数スネークケース）</label>
                    <Input value={newTypeForm.api_name} onChange={(e) => setNewTypeForm({ ...newTypeForm, api_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="例: order_item" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">表示名</label>
                    <Input value={newTypeForm.display_name} onChange={(e) => setNewTypeForm({ ...newTypeForm, display_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: 注文明細" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">アイコン</label>
                    <Input value={newTypeForm.icon} onChange={(e) => setNewTypeForm({ ...newTypeForm, icon: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: 📦" />
                  </div>
                  <Button onClick={handleCreateType} className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!newTypeForm.api_name}>作成</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Center Panel — Properties */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedType ? (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#0b0f15]">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{selectedType.icon}</span>
                  <span className="text-[14px] font-semibold text-white/90">{selectedType.display_name}</span>
                  <span className="text-[10px] text-white/30 font-mono">({selectedType.api_name})</span>
                </div>
                {hasChanges && <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">未保存の変更</span>}
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">api_name</th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">表示名</th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">型</th>
                        <th className="text-center px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">必須</th>
                        <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">PII</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((prop, idx) => (
                        <tr key={prop.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-2">
                            <input
                              value={prop.api_name}
                              onChange={(e) => updateProperty(idx, "api_name", e.target.value)}
                              className="bg-transparent text-[12px] font-mono text-white/70 border-none outline-none w-full focus:text-white/90"
                              placeholder="field_name"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={prop.display_name}
                              onChange={(e) => updateProperty(idx, "display_name", e.target.value)}
                              className="bg-transparent text-[12px] text-white/70 border-none outline-none w-full focus:text-white/90"
                              placeholder="表示名"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={prop.data_type}
                              onChange={(e) => updateProperty(idx, "data_type", e.target.value)}
                              className="text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70"
                            >
                              {dataTypes.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={prop.required}
                              onChange={(e) => updateProperty(idx, "required", e.target.checked)}
                              className="accent-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={prop.pii_level}
                              onChange={(e) => updateProperty(idx, "pii_level", e.target.value)}
                              className="text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70"
                            >
                              {piiLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => deleteProperty(idx)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3">
                  <button onClick={addProperty} className="text-[12px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> プロパティ追加
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0b0f15] flex items-center gap-2">
                <Button size="sm" onClick={handleDraftSave} className="bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/[0.08] text-[12px] h-8">
                  Draft保存
                </Button>
                {saveDone && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />保存しました</span>}
                <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                      Publish
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
                    {publishDone ? (
                      <div className="flex flex-col items-center py-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                        <p className="text-[14px] text-white/80">公開しました</p>
                      </div>
                    ) : breakingChanges ? (
                      <>
                        <DialogHeader><DialogTitle className="text-white/90 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" />マイグレーションが必要です</DialogTitle></DialogHeader>
                        <div className="mt-2 space-y-2">
                          <p className="text-[13px] text-white/60">{affectedInstances}件のインスタンスが影響を受けます。</p>
                          <div className="rounded-md bg-amber-400/5 border border-amber-400/20 p-3">
                            <div className="text-[11px] text-amber-400 font-medium mb-1">削除されるプロパティ:</div>
                            {Array.from(deletedProps).map((p) => <div key={p} className="text-[12px] text-white/50 font-mono">{p}</div>)}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <DialogClose asChild><Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button></DialogClose>
                            <Button onClick={handlePublish} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">実行</Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <DialogHeader><DialogTitle className="text-white/90">公開しますか？</DialogTitle></DialogHeader>
                        <p className="text-[13px] text-white/60 mt-2">{selectedType.display_name} v{selectedType.version + 1} として公開します。</p>
                        <div className="flex gap-2 mt-4">
                          <DialogClose asChild><Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button></DialogClose>
                          <Button onClick={handlePublish} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">公開する</Button>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-[13px]">
              左のリストからオブジェクトタイプを選択してください
            </div>
          )}
        </div>

        {/* Right Panel — Impact */}
        <div className="w-[300px] border-l border-white/[0.06] bg-[#0b0f15] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">影響範囲</span>
          </div>
          {selectedType && impact ? (
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {[
                  { label: "KPI定義", value: `${impact.kpi_count}本参照`, color: "text-blue-400" },
                  { label: "インスタンス", value: `${impact.instance_count}件`, color: "text-emerald-400" },
                  { label: "リンクタイプ", value: `${impact.link_count}種`, color: "text-purple-400" },
                  { label: "リネージュ", value: `${impact.lineage_count}件`, color: "text-cyan-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">{item.label}</span>
                    <span className={`text-[13px] font-mono font-medium ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                {deletedProps.size > 0 ? (
                  <div className="rounded-md bg-red-400/5 border border-red-400/20 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-[12px] text-red-400 font-medium">Breaking Change</span>
                    </div>
                    <div className="text-[11px] text-white/50">
                      {deletedProps.size}件のプロパティが削除されます。{impact.instance_count}件のインスタンスに影響します。
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px] text-white/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
                    変更なし — Breaking Changeはありません
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium block mb-2">ステータス</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusDot[selectedType.status]}`} />
                  <span className="text-[13px] text-white/70 capitalize">{selectedType.status}</span>
                  <span className="text-[11px] text-white/30 font-mono ml-auto">v{selectedType.version}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-[13px] p-4 text-center">
              タイプを選択すると影響範囲が表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
