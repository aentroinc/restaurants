"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { Analysis, CustomKPIDef, CohortDef } from "@/lib/types"
import { Plus, Eye, FlaskConical } from "lucide-react"

const visibilityBadge: Record<string, string> = {
  private: "text-white/50 bg-white/[0.06]",
  team: "text-blue-400 bg-blue-400/10",
  public: "text-emerald-400 bg-emerald-400/10",
}

const statusBadge: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  draft: "text-amber-400 bg-amber-400/10",
  archived: "text-white/40 bg-white/[0.06]",
}

export default function WorkspacePage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [kpis, setKpis] = useState<CustomKPIDef[]>([])
  const [cohorts, setCohorts] = useState<CohortDef[]>([])

  useEffect(() => {
    fetchAPI<Analysis[]>("/api/v1/workspace/analyses").then(setAnalyses)
    fetchAPI<CustomKPIDef[]>("/api/v1/workspace/custom-kpis").then(setKpis)
    fetchAPI<CohortDef[]>("/api/v1/workspace/cohorts").then(setCohorts)
  }, [])

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="分析ワークスペース" description="カスタム分析・KPI定義・コホート管理" />

      <div className="px-5 py-5">
        <Tabs defaultValue="analyses" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="analyses" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">マイ分析</TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">カスタムKPI</TabsTrigger>
            <TabsTrigger value="cohorts" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">コホート</TabsTrigger>
          </TabsList>

          {/* マイ分析 */}
          <TabsContent value="analyses" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map((a) => (
                <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-[14px] font-semibold text-white/90">{a.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${visibilityBadge[a.visibility] || visibilityBadge.private}`}>{a.visibility}</span>
                  </div>
                  {a.description && <p className="text-[12px] text-white/40 mb-3 line-clamp-2">{a.description}</p>}
                  <div className="text-[10px] text-white/30 font-mono tabular-nums">{formatDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* カスタムKPI */}
          <TabsContent value="kpis" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-white/40">{kpis.length}件のカスタムKPI</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
                  <DialogHeader><DialogTitle className="text-white/90">カスタムKPI作成</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><label className="text-[11px] text-white/50 block mb-1">KPI名</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: ピーク時間効率" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">計算式</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="例: peak_sales / peak_labor_hours" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">対象オブジェクト</label>
                      <select className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                        <option value="store">店舗</option><option value="brand">ブランド</option><option value="area">エリア</option>
                      </select>
                    </div>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">作成</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">API名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">表示名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">計算式</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">Ver</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium"></th>
                </tr></thead>
                <tbody>
                  {kpis.map((k) => (
                    <tr key={k.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[12px] text-white/60">{k.api_name}</td>
                      <td className="px-4 py-3 text-white/80">{k.display_name}</td>
                      <td className="px-4 py-3"><code className="text-[11px] bg-white/[0.06] px-2 py-0.5 rounded text-cyan-400/80 font-mono">{k.formula}</code></td>
                      <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge[k.status] || statusBadge.draft}`}>{k.status}</span></td>
                      <td className="px-4 py-3 text-white/40 font-mono">v{k.version}</td>
                      <td className="px-4 py-3"><button className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Eye className="w-3 h-3" />プレビュー</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* コホート */}
          <TabsContent value="cohorts" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-white/40">{cohorts.length}件のコホート</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
                  <DialogHeader><DialogTitle className="text-white/90">コホート作成</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><label className="text-[11px] text-white/50 block mb-1">コホート名</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: 高収益店舗群" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">対象オブジェクト</label>
                      <select className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                        <option value="store">店舗</option><option value="brand">ブランド</option>
                      </select>
                    </div>
                    <div><label className="text-[11px] text-white/50 block mb-1">ブランド</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="全て" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">リージョン</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="全て" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] text-white/50 block mb-1">健全度スコア（下限）</label><Input type="number" className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="0" /></div>
                      <div><label className="text-[11px] text-white/50 block mb-1">健全度スコア（上限）</label><Input type="number" className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="100" /></div>
                    </div>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">作成</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">コホート名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">対象タイプ</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">インスタンス数</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">フィルタ</th>
                </tr></thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-white/50">{c.object_type}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/60">{c.instance_count ?? "-"}</td>
                      <td className="px-4 py-3"><code className="text-[11px] bg-white/[0.06] px-2 py-0.5 rounded text-cyan-400/80 font-mono">{JSON.stringify(c.filter_spec)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
