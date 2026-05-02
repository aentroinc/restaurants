"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { KPIDefinition, KPISimulationResult } from "@/lib/types"
import { Plus, Play, Check, TrendingUp, TrendingDown, Minus } from "lucide-react"

const statusConfig: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "下書き", variant: "secondary" },
  under_review: { label: "レビュー中", variant: "warning" },
  approved: { label: "承認済み", variant: "success" },
  deprecated: { label: "廃止", variant: "destructive" },
}

export default function KPIDefinitionsPage() {
  const [definitions, setDefinitions] = useState<KPIDefinition[]>([])
  const [selected, setSelected] = useState<KPIDefinition | null>(null)
  const [simulation, setSimulation] = useState<KPISimulationResult | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newKPI, setNewKPI] = useState({ kpi_code: "", display_name: "", description: "", formula_expression: "", output_unit: "" })

  useEffect(() => {
    fetchAPI<KPIDefinition[]>("/api/v1/kpi-definitions").then(setDefinitions)
  }, [])

  async function handleApprove(id: string) {
    await fetchAPI(`/api/v1/kpi-definitions/${id}/approve`, { method: "POST" })
    setDefinitions((prev) => prev.map((d) => d.id === id ? { ...d, status: "approved", approved_by: "管理者", approved_at: new Date().toISOString() } : d))
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: "approved", approved_by: "管理者", approved_at: new Date().toISOString() } : null)
  }

  async function handleSimulate(id: string) {
    const result = await fetchAPI<KPISimulationResult>(`/api/v1/kpi-definitions/${id}/simulate`, { method: "POST" })
    setSimulation(result)
  }

  function handleCreate() {
    const created: KPIDefinition = {
      id: `kpi-${Date.now()}`,
      ...newKPI,
      input_objects: [],
      version: 1,
      status: "draft",
    }
    setDefinitions((prev) => [created, ...prev])
    setShowCreate(false)
    setNewKPI({ kpi_code: "", display_name: "", description: "", formula_expression: "", output_unit: "" })
  }

  return (
    <div>
      <ContextHeader
        title="KPI 定義管理"
        description="KPI の計算ロジック・バージョン・承認フローを管理"
        actions={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />新規作成</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>KPI 定義の新規作成</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">KPI コード</label>
                  <Input value={newKPI.kpi_code} onChange={(e) => setNewKPI({ ...newKPI, kpi_code: e.target.value })} placeholder="例: cogs_rate" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">表示名</label>
                  <Input value={newKPI.display_name} onChange={(e) => setNewKPI({ ...newKPI, display_name: e.target.value })} placeholder="例: 原価率" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">説明</label>
                  <Textarea value={newKPI.description} onChange={(e) => setNewKPI({ ...newKPI, description: e.target.value })} placeholder="KPI の説明..." className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">計算式</label>
                  <Input value={newKPI.formula_expression} onChange={(e) => setNewKPI({ ...newKPI, formula_expression: e.target.value })} placeholder="例: cogs / net_sales * 100" className="mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">出力単位</label>
                  <Input value={newKPI.output_unit} onChange={(e) => setNewKPI({ ...newKPI, output_unit: e.target.value })} placeholder="例: %, 円" className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
                <Button onClick={handleCreate} disabled={!newKPI.kpi_code || !newKPI.display_name || !newKPI.formula_expression}>作成</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KPI コード</TableHead>
              <TableHead>表示名</TableHead>
              <TableHead>計算式</TableHead>
              <TableHead>バージョン</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>承認者</TableHead>
              <TableHead>有効開始日</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.map((d) => {
              const cfg = statusConfig[d.status] || statusConfig.draft
              return (
                <TableRow key={d.id} className="cursor-pointer hover:bg-gray-50" onClick={() => { setSelected(d); setSimulation(null) }}>
                  <TableCell className="font-mono text-sm">{d.kpi_code}</TableCell>
                  <TableCell className="font-medium">{d.display_name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-600 max-w-[200px] truncate">{d.formula_expression}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">v{d.version}</Badge></TableCell>
                  <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-600">{d.approved_by || "-"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{d.effective_from || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {d.status === "under_review" && (
                        <Button variant="outline" size="sm" onClick={() => handleApprove(d.id)}>
                          <Check className="h-3 w-3 mr-1" />承認
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setSimulation(null) } }}>
        <SheetContent className="w-[520px] sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.display_name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-mono">{selected.kpi_code}</Badge>
                  <Badge variant={statusConfig[selected.status]?.variant || "secondary"}>
                    {statusConfig[selected.status]?.label || selected.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">v{selected.version}</Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selected.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">説明</h4>
                    <p className="text-sm text-gray-700">{selected.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">計算式</h4>
                  <div className="rounded-lg bg-slate-50 p-3 font-mono text-sm">{selected.formula_expression}</div>
                </div>

                {selected.output_unit && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">出力単位</h4>
                    <span className="text-sm">{selected.output_unit}</span>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">入力オブジェクト</h4>
                  <div className="flex flex-wrap gap-1">
                    {selected.input_objects.map((o) => (
                      <Badge key={o} variant="outline" className="text-xs font-mono">{o}</Badge>
                    ))}
                    {selected.input_objects.length === 0 && <span className="text-xs text-gray-400">未定義</span>}
                  </div>
                </div>

                {selected.approved_by && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">承認者</h4>
                      <span className="text-sm">{selected.approved_by}</span>
                    </div>
                    {selected.approved_at && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">承認日</h4>
                        <span className="text-sm">{formatDate(selected.approved_at)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  {selected.status === "under_review" && (
                    <Button size="sm" onClick={() => handleApprove(selected.id)}>
                      <Check className="h-4 w-4 mr-1" />承認
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleSimulate(selected.id)}>
                    <Play className="h-4 w-4 mr-1" />影響シミュレーション
                  </Button>
                </div>

                {simulation && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">シミュレーション結果</h4>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">{simulation.affected_stores}</div>
                          <div className="text-xs text-gray-500">影響店舗数</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-orange-600">{simulation.ranking_changes}</div>
                          <div className="text-xs text-gray-500">ランキング変動数</div>
                        </CardContent>
                      </Card>
                    </div>
                    <h5 className="text-xs font-medium text-gray-600 mb-2">Before / After サンプル</h5>
                    <div className="space-y-2">
                      {simulation.sample_before_after.map((s) => {
                        const diff = s.new_value - s.old_value
                        return (
                          <div key={s.store_name} className="flex items-center justify-between rounded border p-2 text-sm">
                            <span className="text-gray-700">{s.store_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{s.old_value.toFixed(1)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium">{s.new_value.toFixed(1)}</span>
                              <span className={`text-xs ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-gray-400"}`}>
                                {diff < 0 ? <TrendingDown className="h-3 w-3 inline" /> : diff > 0 ? <TrendingUp className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />}
                                {Math.abs(diff).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
