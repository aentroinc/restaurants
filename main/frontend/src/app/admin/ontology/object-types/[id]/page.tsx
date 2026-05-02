"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import PropertyEditor from "@/components/ontology/PropertyEditor"
import JsonSchemaEditor from "@/components/ontology/JsonSchemaEditor"
import {
  ontologyAPI,
  type OntoObjectType, type OntoProperty, type OntoLink, type OntoAction, type Cardinality,
} from "@/lib/ontology-api"
import { ArrowLeft, Plus, Save, CheckCircle2, Trash2 } from "lucide-react"

const cardinalities: Cardinality[] = ["1:1", "1:N", "N:1", "N:N"]

export default function ObjectTypeEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const [objectTypes, setObjectTypes] = useState<OntoObjectType[]>([])
  const [target, setTarget] = useState<OntoObjectType | null>(null)
  const [properties, setProperties] = useState<OntoProperty[]>([])
  const [links, setLinks] = useState<OntoLink[]>([])
  const [actions, setActions] = useState<OntoAction[]>([])
  const [saved, setSaved] = useState<string | null>(null)

  // Action dialog
  const [actionOpen, setActionOpen] = useState(false)
  const [actionForm, setActionForm] = useState<Partial<OntoAction>>({
    api_name: "", display_name: "", requires_approval: false,
    params_schema: { type: "object", properties: {} },
  })

  // Link dialog
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkForm, setLinkForm] = useState<Partial<OntoLink>>({
    api_name: "", display_name: "", to_object_type_id: "", cardinality: "N:1",
  })

  useEffect(() => {
    if (!id) return
    ontologyAPI.listObjectTypes().then(setObjectTypes).catch(() => {})
    ontologyAPI.getObjectType(id).then((ot) => {
      setTarget(ot)
      setProperties([...ot.properties])
    }).catch(() => {})
    ontologyAPI.listLinks().then(setLinks).catch(() => {})
    ontologyAPI.listActions(id).then(setActions).catch(() => {})
  }, [id])

  const flash = (msg: string) => {
    setSaved(msg)
    setTimeout(() => setSaved(null), 1800)
  }

  // ----- Properties -----
  const addProp = () => {
    setProperties((prev) => [...prev, {
      id: `p-new-${Date.now()}`,
      api_name: "", display_name: "",
      data_type: "string", required: false, pii_level: "none",
    }])
  }
  const updateProp = (idx: number, next: OntoProperty) =>
    setProperties((prev) => prev.map((p, i) => i === idx ? next : p))
  const deleteProp = (idx: number) =>
    setProperties((prev) => prev.filter((_, i) => i !== idx))

  const saveProperties = async () => {
    if (!id) return
    await ontologyAPI.upsertProperties(id, properties)
    flash("プロパティを保存しました")
  }

  // ----- Links -----
  const myLinks = links.filter((l) => l.from_object_type_id === id || l.to_object_type_id === id)

  const submitLink = async () => {
    if (!id || !linkForm.to_object_type_id) return
    const created = await ontologyAPI.createLink({
      ...linkForm,
      from_object_type_id: id,
      api_name: linkForm.api_name || `${target?.api_name}_${objectTypes.find((o) => o.id === linkForm.to_object_type_id)?.api_name}`,
      display_name: linkForm.display_name || `${target?.display_name}→${objectTypes.find((o) => o.id === linkForm.to_object_type_id)?.display_name}`,
    })
    setLinks((prev) => [...prev, created])
    setLinkOpen(false)
    setLinkForm({ api_name: "", display_name: "", to_object_type_id: "", cardinality: "N:1" })
    flash("リンクを作成しました")
  }

  // ----- Actions -----
  const submitAction = async () => {
    if (!id || !actionForm.api_name) return
    const created = await ontologyAPI.createAction(id, actionForm)
    setActions((prev) => [...prev, created])
    setActionOpen(false)
    setActionForm({ api_name: "", display_name: "", requires_approval: false, params_schema: { type: "object", properties: {} } })
    flash("アクションを作成しました")
  }

  if (!target) {
    return (
      <div className="min-h-full bg-[#0a0e14] text-white/50 flex items-center justify-center">
        <span className="text-[12px]">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader
        title={`${target.icon} ${target.display_name}`}
        description={`${target.api_name} · v${target.version} · ${target.status}`}
        actions={
          <div className="flex items-center gap-2">
            {saved && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{saved}</span>}
            <Button size="sm" variant="outline" onClick={() => router.push("/admin/ontology")} className="bg-white/[0.04] border-white/[0.1] text-white/60 hover:bg-white/[0.08] text-[12px] h-8">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />一覧へ
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-9">
            {[
              { v: "properties", label: "Properties" },
              { v: "links", label: "Links" },
              { v: "actions", label: "Actions" },
              { v: "permissions", label: "Permissions" },
              { v: "versions", label: "Versions" },
            ].map((t) => (
              <TabsTrigger
                key={t.v} value={t.v}
                className="text-[12px] text-white/50 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white/90 data-[state=active]:shadow-none px-3 h-7"
              >{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* ===== Properties ===== */}
          <TabsContent value="properties" className="mt-4">
            <div className="bg-[#0b0f15] border border-white/[0.06] rounded-md overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">api_name</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">表示名</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">型</th>
                    <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">必須</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">PII</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">enum</th>
                    <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">validation</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p, i) => (
                    <PropertyEditor
                      key={p.id}
                      property={p}
                      onChange={(next) => updateProp(i, next)}
                      onDelete={() => deleteProp(i)}
                    />
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
                <button onClick={addProp} className="text-[12px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />プロパティ追加
                </button>
                <Button size="sm" onClick={saveProperties} className="bg-blue-500 hover:bg-blue-600 text-white text-[12px] h-7">
                  <Save className="w-3 h-3 mr-1" />保存
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ===== Links ===== */}
          <TabsContent value="links" className="mt-4">
            <div className="bg-[#0b0f15] border border-white/[0.06] rounded-md">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] text-white/60">この ObjectType に関連するリンク ({myLinks.length})</span>
                <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 text-[12px] h-7">
                      <Plus className="w-3 h-3 mr-1" />新規リンク
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-md">
                    <DialogHeader><DialogTitle className="text-white/90">新規リンク</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">参照先 ObjectType</label>
                        <select
                          value={linkForm.to_object_type_id || ""}
                          onChange={(e) => setLinkForm({ ...linkForm, to_object_type_id: e.target.value })}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-[12px] text-white/80"
                        >
                          <option value="">選択してください</option>
                          {objectTypes.filter((o) => o.id !== id).map((o) => (
                            <option key={o.id} value={o.id}>{o.icon} {o.display_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">カーディナリティ</label>
                        <div className="flex gap-1">
                          {cardinalities.map((c) => (
                            <button
                              key={c}
                              onClick={() => setLinkForm({ ...linkForm, cardinality: c })}
                              className={`flex-1 text-[12px] py-1.5 rounded border ${linkForm.cardinality === c ? "bg-blue-500/20 border-blue-400/40 text-blue-300" : "bg-white/[0.04] border-white/[0.08] text-white/60"}`}
                            >{c}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">api_name (任意)</label>
                        <Input value={linkForm.api_name || ""} onChange={(e) => setLinkForm({ ...linkForm, api_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">表示名 (任意)</label>
                        <Input value={linkForm.display_name || ""} onChange={(e) => setLinkForm({ ...linkForm, display_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" />
                      </div>
                      <Button onClick={submitLink} className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={!linkForm.to_object_type_id}>作成</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">方向</th>
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">api_name</th>
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">参照先</th>
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">カーディナリティ</th>
                  </tr>
                </thead>
                <tbody>
                  {myLinks.map((l) => {
                    const isOut = l.from_object_type_id === id
                    const otherId = isOut ? l.to_object_type_id : l.from_object_type_id
                    const other = objectTypes.find((o) => o.id === otherId)
                    return (
                      <tr key={l.id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-2 text-[12px] text-white/50">{isOut ? "→ out" : "← in"}</td>
                        <td className="px-4 py-2 text-[12px] font-mono text-white/70">{l.api_name}</td>
                        <td className="px-4 py-2 text-[12px] text-white/70">{other?.icon} {other?.display_name || otherId}</td>
                        <td className="px-4 py-2 text-[12px] font-mono text-purple-300/80">{l.cardinality}</td>
                      </tr>
                    )
                  })}
                  {myLinks.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-white/30">リンクが定義されていません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ===== Actions ===== */}
          <TabsContent value="actions" className="mt-4">
            <div className="bg-[#0b0f15] border border-white/[0.06] rounded-md">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] text-white/60">アクション ({actions.length})</span>
                <Dialog open={actionOpen} onOpenChange={setActionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 text-[12px] h-7">
                      <Plus className="w-3 h-3 mr-1" />新規アクション
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-lg">
                    <DialogHeader><DialogTitle className="text-white/90">新規アクション</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto">
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">api_name</label>
                        <Input value={actionForm.api_name || ""} onChange={(e) => setActionForm({ ...actionForm, api_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="close_store" />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">表示名</label>
                        <Input value={actionForm.display_name || ""} onChange={(e) => setActionForm({ ...actionForm, display_name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="店舗を閉店" />
                      </div>
                      <label className="flex items-center gap-2 text-[12px] text-white/60">
                        <input
                          type="checkbox"
                          checked={!!actionForm.requires_approval}
                          onChange={(e) => setActionForm({ ...actionForm, requires_approval: e.target.checked })}
                          className="accent-blue-500"
                        />
                        承認を必要とする
                      </label>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">params (JSON Schema)</label>
                        <JsonSchemaEditor
                          value={(actionForm.params_schema as Record<string, unknown>) || {}}
                          onChange={(v) => setActionForm({ ...actionForm, params_schema: v })}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <DialogClose asChild>
                          <Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button>
                        </DialogClose>
                        <Button onClick={submitAction} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" disabled={!actionForm.api_name}>作成</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {actions.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono text-white/85">{a.api_name}</span>
                        <span className="text-[12px] text-white/50">{a.display_name}</span>
                        {a.requires_approval && <span className="text-[10px] px-1.5 py-0.5 bg-amber-400/10 text-amber-400 rounded">承認必要</span>}
                      </div>
                      <button className="text-white/20 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <pre className="text-[11px] font-mono text-white/50 bg-[#0a0e14] border border-white/[0.06] rounded p-2 overflow-x-auto">
{JSON.stringify(a.params_schema, null, 2)}
                    </pre>
                  </div>
                ))}
                {actions.length === 0 && (
                  <div className="px-4 py-6 text-center text-[12px] text-white/30">アクションが定義されていません</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== Permissions ===== */}
          <TabsContent value="permissions" className="mt-4">
            <div className="bg-[#0b0f15] border border-white/[0.06] rounded-md p-4 text-[12px] text-white/50">
              <p className="mb-2">権限の管理は <Link href="/admin/roles" className="text-blue-400 hover:underline">権限・ロール</Link> 画面で行ってください。</p>
              <ul className="space-y-1 text-[11px] text-white/40">
                <li>· read / write / delete</li>
                <li>· オブジェクトタイプ単位の RBAC</li>
                <li>· 列単位（PII）ポリシーは Admin → セキュリティ</li>
              </ul>
            </div>
          </TabsContent>

          {/* ===== Versions ===== */}
          <TabsContent value="versions" className="mt-4">
            <div className="bg-[#0b0f15] border border-white/[0.06] rounded-md">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[12px] text-white/60">バージョン履歴</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {Array.from({ length: target.version }, (_, i) => target.version - i).map((v) => (
                  <div key={v} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-white/70">v{v}</span>
                      {v === target.version && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded">current</span>}
                    </div>
                    <span className="text-[11px] text-white/30 font-mono">2026-0{Math.min(v, 9)}-15</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
