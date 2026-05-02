"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import type {
  WorkspaceAnalysis,
  WorkspaceCohort,
  WorkspaceCohortInstances,
  WorkspaceCustomKPI,
  WorkspaceSavedQuery,
  WorkspaceSavedQueryRun,
} from "@/lib/types"
import {
  BadgeCheck,
  Calculator,
  Database,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Users,
} from "lucide-react"

type PreviewRow = Record<string, string | number | null>

const defaultCohortFilter = `{
  "trade_area_type": "駅前",
  "labor_cost_rate_gt": 35
}`

const defaultQuerySpec = `{
  "object_type": "Product",
  "join": ["Store", "DailyProductSales"],
  "order_by": "theoretical_cogs_rate desc",
  "limit": 20
}`

function parseJSON(value: string): Record<string, unknown> {
  return JSON.parse(value) as Record<string, unknown>
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  return new Date(value).toLocaleString("ja-JP")
}

export default function WorkspacePage() {
  const [analyses, setAnalyses] = useState<WorkspaceAnalysis[]>([])
  const [customKPIs, setCustomKPIs] = useState<WorkspaceCustomKPI[]>([])
  const [cohorts, setCohorts] = useState<WorkspaceCohort[]>([])
  const [savedQueries, setSavedQueries] = useState<WorkspaceSavedQuery[]>([])
  const [cohortInstances, setCohortInstances] = useState<WorkspaceCohortInstances | null>(null)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [queryRun, setQueryRun] = useState<WorkspaceSavedQueryRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [cohortForm, setCohortForm] = useState({
    name: "駅前・人件費率35%超",
    filter_spec: defaultCohortFilter,
  })
  const [kpiForm, setKpiForm] = useState({
    api_name: "gross_profit_per_guest",
    display_name: "客単位粗利",
    formula: "({net_sales} - {cogs}) / {customer_count}",
    unit: "円",
    aggregation_axis: "brand,store",
    filters: `{
  "brand": "すき家"
}`,
  })
  const [queryForm, setQueryForm] = useState({
    name: "商品粗利ワースト店舗",
    query_spec: defaultQuerySpec,
  })

  useEffect(() => {
    loadWorkspace()
  }, [])

  async function loadWorkspace() {
    setLoading(true)
    setError(null)
    try {
      const [analysisRows, kpiRows, cohortRows, queryRows] = await Promise.all([
        fetchAPI<WorkspaceAnalysis[]>("/api/v1/workspace/analyses"),
        fetchAPI<WorkspaceCustomKPI[]>("/api/v1/workspace/custom-kpis"),
        fetchAPI<WorkspaceCohort[]>("/api/v1/workspace/cohorts"),
        fetchAPI<WorkspaceSavedQuery[]>("/api/v1/workspace/saved-queries"),
      ])
      setAnalyses(analysisRows)
      setCustomKPIs(kpiRows)
      setCohorts(cohortRows)
      setSavedQueries(queryRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "ワークスペースの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function createCohort() {
    setBusy("cohort")
    setError(null)
    try {
      const created = await fetchAPI<WorkspaceCohort>("/api/v1/workspace/cohorts", {
        method: "POST",
        body: JSON.stringify({
          name: cohortForm.name,
          object_type: "Store",
          filter_spec: parseJSON(cohortForm.filter_spec),
        }),
      })
      setCohorts((prev) => [created, ...prev])
      await loadCohortInstances(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "コホート作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function loadCohortInstances(id: string) {
    setBusy(`cohort-${id}`)
    try {
      const result = await fetchAPI<WorkspaceCohortInstances>(`/api/v1/workspace/cohorts/${id}/instances`)
      setCohortInstances(result)
    } finally {
      setBusy(null)
    }
  }

  async function createCustomKPI() {
    setBusy("kpi")
    setError(null)
    try {
      const created = await fetchAPI<WorkspaceCustomKPI>("/api/v1/workspace/custom-kpis", {
        method: "POST",
        body: JSON.stringify({
          api_name: kpiForm.api_name,
          display_name: kpiForm.display_name,
          formula: kpiForm.formula,
          target_object_type: "Store",
          aggregation_axis: kpiForm.aggregation_axis.split(",").map((v) => v.trim()).filter(Boolean),
          filters: parseJSON(kpiForm.filters),
          unit: kpiForm.unit,
          status: "draft",
        }),
      })
      setCustomKPIs((prev) => [created, ...prev])
      await previewKPI(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "カスタムKPI作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function previewKPI(id: string) {
    setBusy(`kpi-${id}`)
    try {
      const rows = await fetchAPI<PreviewRow[]>(`/api/v1/workspace/custom-kpis/${id}/preview`, {
        method: "POST",
        body: JSON.stringify({ date_from: "2026-04-01", date_to: "2026-04-30", limit: 20 }),
      })
      setPreviewRows(rows)
    } finally {
      setBusy(null)
    }
  }

  async function createSavedQuery() {
    setBusy("query")
    setError(null)
    try {
      const created = await fetchAPI<WorkspaceSavedQuery>("/api/v1/workspace/saved-queries", {
        method: "POST",
        body: JSON.stringify({
          name: queryForm.name,
          query_type: "ontology",
          query_spec: parseJSON(queryForm.query_spec),
        }),
      })
      setSavedQueries((prev) => [created, ...prev])
      await runSavedQuery(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存クエリ作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function runSavedQuery(id: string) {
    setBusy(`query-${id}`)
    try {
      const result = await fetchAPI<WorkspaceSavedQueryRun>(`/api/v1/workspace/saved-queries/${id}/run`, { method: "POST" })
      setQueryRun(result)
      setSavedQueries((prev) => prev.map((q) => q.id === id ? { ...q, row_count: result.row_count, last_run_at: new Date().toISOString() } : q))
    } finally {
      setBusy(null)
    }
  }

  async function saveAnalysis() {
    setBusy("analysis")
    setError(null)
    try {
      const created = await fetchAPI<WorkspaceAnalysis>("/api/v1/workspace/analyses", {
        method: "POST",
        body: JSON.stringify({
          name: "ゼンショー想定: 店舗改善ワークスペース",
          description: "コホート、カスタムKPI、商品粗利クエリをまとめた分析ビュー",
          visibility: "team",
          spec: {
            cohort_id: cohorts[0]?.id,
            custom_kpi_id: customKPIs[0]?.id,
            saved_query_id: savedQueries[0]?.id,
            ai_tools: ["get_product_margin_outliers", "get_labor_compliance_summary", "get_qsc_summary", "get_haccp_summary"],
          },
        }),
      })
      setAnalyses((prev) => [created, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析ビュー保存に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const latestAnalysis = analyses[0]

  return (
    <div>
      <ContextHeader
        title="分析ワークスペース"
        description="店舗コホート・カスタムKPI・保存クエリを組み合わせて、外食チェーン向け分析を運用"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadWorkspace} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />更新
            </Button>
            <Button size="sm" onClick={saveAnalysis} disabled={busy === "analysis"}>
              {busy === "analysis" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              分析ビュー保存
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">分析ビュー</div><div className="mt-1 text-2xl font-semibold">{analyses.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">店舗コホート</div><div className="mt-1 text-2xl font-semibold">{cohorts.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">カスタムKPI</div><div className="mt-1 text-2xl font-semibold">{customKPIs.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">保存クエリ</div><div className="mt-1 text-2xl font-semibold">{savedQueries.length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="cohorts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cohorts"><Users className="h-4 w-4 mr-1" />コホート</TabsTrigger>
          <TabsTrigger value="kpis"><Calculator className="h-4 w-4 mr-1" />カスタムKPI</TabsTrigger>
          <TabsTrigger value="queries"><Search className="h-4 w-4 mr-1" />保存クエリ</TabsTrigger>
          <TabsTrigger value="analyses"><Table2 className="h-4 w-4 mr-1" />分析ビュー</TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">店舗コホート作成</div>
                  <div className="text-xs text-gray-500">ゼンショー想定で、駅前・人件費率高止まり店舗を抽出</div>
                </div>
                <Input value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} />
                <Textarea value={cohortForm.filter_spec} onChange={(e) => setCohortForm({ ...cohortForm, filter_spec: e.target.value })} className="min-h-[150px] font-mono text-xs" />
                <Button onClick={createCohort} disabled={busy === "cohort"} className="w-full">
                  {busy === "cohort" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  コホート作成
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>条件</TableHead>
                      <TableHead>件数</TableHead>
                      <TableHead>スナップショット</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((cohort) => (
                      <TableRow key={cohort.id}>
                        <TableCell className="font-medium">{cohort.name}</TableCell>
                        <TableCell><code className="text-xs">{pretty(cohort.filter_spec)}</code></TableCell>
                        <TableCell>{cohort.instance_count ?? "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDateTime(cohort.snapshot_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => loadCohortInstances(cohort.id)} disabled={busy === `cohort-${cohort.id}`}>
                            <Play className="h-3.5 w-3.5 mr-1" />抽出
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {cohortInstances && (
                  <div className="border-t p-4 text-sm">
                    <Badge variant="success" className="mr-2">{cohortInstances.instance_count}店舗</Badge>
                    <span className="text-gray-600">{cohortInstances.instance_ids.join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kpis">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">カスタムKPI作成</div>
                  <div className="text-xs text-gray-500">本部で見たい指標を式として登録し、店舗軸でプレビュー</div>
                </div>
                <Input value={kpiForm.display_name} onChange={(e) => setKpiForm({ ...kpiForm, display_name: e.target.value })} />
                <Input value={kpiForm.api_name} onChange={(e) => setKpiForm({ ...kpiForm, api_name: e.target.value })} className="font-mono" />
                <Input value={kpiForm.formula} onChange={(e) => setKpiForm({ ...kpiForm, formula: e.target.value })} className="font-mono" />
                <Input value={kpiForm.aggregation_axis} onChange={(e) => setKpiForm({ ...kpiForm, aggregation_axis: e.target.value })} />
                <Textarea value={kpiForm.filters} onChange={(e) => setKpiForm({ ...kpiForm, filters: e.target.value })} className="min-h-[90px] font-mono text-xs" />
                <Button onClick={createCustomKPI} disabled={busy === "kpi"} className="w-full">
                  {busy === "kpi" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  KPI作成・プレビュー
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>表示名</TableHead>
                      <TableHead>式</TableHead>
                      <TableHead>軸</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customKPIs.map((kpi) => (
                      <TableRow key={kpi.id}>
                        <TableCell className="font-medium">{kpi.display_name}</TableCell>
                        <TableCell><code className="text-xs">{kpi.formula}</code></TableCell>
                        <TableCell>{kpi.aggregation_axis.join(", ")}</TableCell>
                        <TableCell><Badge variant="outline">{kpi.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => previewKPI(kpi.id)} disabled={busy === `kpi-${kpi.id}`}>
                            <Play className="h-3.5 w-3.5 mr-1" />プレビュー
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewRows.length > 0 && (
                  <div className="border-t p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <BadgeCheck className="h-4 w-4 text-emerald-500" />プレビュー結果
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {previewRows.slice(0, 6).map((row, i) => (
                        <div key={i} className="rounded border bg-gray-50 p-3 text-sm">
                          <div className="font-medium">{String(row.store || row.brand || `Row ${i + 1}`)}</div>
                          <div className="mt-1 text-lg font-semibold text-blue-700">{row.value ?? "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">保存クエリ作成</div>
                  <div className="text-xs text-gray-500">商品別粗利、店舗、日次販売を横断する再利用クエリ</div>
                </div>
                <Input value={queryForm.name} onChange={(e) => setQueryForm({ ...queryForm, name: e.target.value })} />
                <Textarea value={queryForm.query_spec} onChange={(e) => setQueryForm({ ...queryForm, query_spec: e.target.value })} className="min-h-[210px] font-mono text-xs" />
                <Button onClick={createSavedQuery} disabled={busy === "query"} className="w-full">
                  {busy === "query" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  クエリ保存・実行
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>行数</TableHead>
                      <TableHead>最終実行</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedQueries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell className="font-medium">{query.name}</TableCell>
                        <TableCell><Badge variant="outline">{query.query_type}</Badge></TableCell>
                        <TableCell>{query.row_count ?? "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDateTime(query.last_run_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => runSavedQuery(query.id)} disabled={busy === `query-${query.id}`}>
                            <Play className="h-3.5 w-3.5 mr-1" />実行
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {queryRun && (
                  <div className="border-t p-4 text-sm">
                    <Badge variant="success" className="mr-2">{queryRun.status}</Badge>
                    <span className="text-gray-600">{queryRun.row_count}行を返しました</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analyses">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead>公開範囲</TableHead>
                      <TableHead>更新日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell className="font-medium">{analysis.name}</TableCell>
                        <TableCell className="max-w-md text-sm text-gray-600">{analysis.description || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{analysis.visibility}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDateTime(analysis.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Database className="h-4 w-4 text-blue-600" />最新分析ビューSpec
                </div>
                <pre className="max-h-[460px] overflow-auto rounded bg-slate-50 p-3 text-xs leading-relaxed">
                  {pretty(latestAnalysis?.spec || {})}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
