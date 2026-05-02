"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatCurrencyCompact, formatPercent, formatDate } from "@/lib/utils"
import type { StoreDetail, Task } from "@/lib/types"
import { ArrowLeft, Plus, Target, Presentation, GitBranch, ExternalLink, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts"

const kpiLineageMap: Record<string, { name: string; formula: string; version: number; period: string; source: string; kpi_code: string }> = {
  "原価率": { name: "原価率", formula: "cogs / net_sales * 100", version: 3, period: "2026-04", source: "POS CSV", kpi_code: "cogs_rate" },
  "人件費率": { name: "人件費率", formula: "labor_cost / net_sales * 100", version: 2, period: "2026-04", source: "勤怠管理API", kpi_code: "labor_cost_rate" },
  "FL比率": { name: "FL比率", formula: "cogs_rate + labor_cost_rate", version: 2, period: "2026-04", source: "POS CSV + 勤怠管理API", kpi_code: "fl_ratio" },
  "客単価": { name: "客単価", formula: "net_sales / customer_count", version: 1, period: "2026-04", source: "POS CSV", kpi_code: "avg_ticket" },
  "健全度": { name: "健全度スコア", formula: "weighted_composite(kpis)", version: 1, period: "2026-04", source: "複合指標", kpi_code: "health_score" },
}

const issueTypes = ["人件費超過", "原価超過", "売上減少", "レビュー低下", "値引き過多"]

function KPIWithLineage({ label, value, alert, storeId }: { label: string; value: string; alert?: boolean; storeId: string }) {
  const lineage = kpiLineageMap[label]

  if (!lineage) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`mt-1 text-lg font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center relative">
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`mt-1 text-lg font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</div>
              <GitBranch className="absolute top-2 right-2 h-3 w-3 text-gray-300" />
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-0">
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">KPI名: {lineage.name}</span>
              <Badge variant="outline" className="text-[10px]">v{lineage.version}</Badge>
            </div>
            <div>
              <div className="text-xs text-gray-500">計算式</div>
              <div className="font-mono text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 mt-0.5">{lineage.formula}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">期間:</span> <span>{lineage.period}</span>
              </div>
              <div>
                <span className="text-gray-500">データソース:</span> <span>{lineage.source}</span>
              </div>
            </div>
            <Link
              href={`/admin/lineage?store=${storeId}&kpi=${lineage.kpi_code}`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 pt-1 border-t"
            >
              <ExternalLink className="h-3 w-3" />
              詳細を見る
            </Link>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface TaskForm {
  title: string
  description: string
  issue_type: string
  priority: string
  assignee: string
  due_date: string
  expected_impact_amount: string
}

const emptyTaskForm: TaskForm = { title: "", description: "", issue_type: "", priority: "", assignee: "", due_date: "", expected_impact_amount: "" }

export default function StoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>([])

  // Dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm)
  const [taskCreated, setTaskCreated] = useState(false)

  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [meetingAdded, setMeetingAdded] = useState(false)

  const [svDialogOpen, setSvDialogOpen] = useState(false)
  const [svAdded, setSvAdded] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAPI<StoreDetail>(`/api/v1/stores/${params.id}`).then((s) => {
        setStore(s)
        setLocalTasks(s.tasks || [])
      })
    }
  }, [params.id])

  if (!store) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  const storeId = params.id as string

  function openTaskDialog(prefill?: Partial<TaskForm>) {
    setTaskForm({ ...emptyTaskForm, ...prefill })
    setTaskCreated(false)
    setTaskDialogOpen(true)
  }

  function handleCreateTask() {
    const newTask: Task = {
      id: `task-new-${Date.now()}`,
      store_id: store!.id,
      store_name: store!.name,
      title: taskForm.title,
      description: taskForm.description,
      status: "未着手",
      priority: taskForm.priority || "中",
      issue_type: taskForm.issue_type || "人件費超過",
      assignee: taskForm.assignee || store!.sv_name,
      due_date: taskForm.due_date || "2026-05-15",
      expected_impact_amount: Number(taskForm.expected_impact_amount) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLocalTasks((prev) => [newTask, ...prev])
    setTaskCreated(true)
    setTimeout(() => { setTaskDialogOpen(false); setTaskCreated(false); setTaskForm(emptyTaskForm) }, 1500)
  }

  function handleMeetingConfirm() {
    setMeetingAdded(true)
    setTimeout(() => { setMeetingDialogOpen(false); setMeetingAdded(false) }, 1500)
  }

  function handleSvConfirm() {
    setSvAdded(true)
    setTimeout(() => { setSvDialogOpen(false); setSvAdded(false) }, 1500)
  }

  const profitData = store.profit_graph.map((d) => ({
    ...d,
    month: d.month.replace("2025-", "").replace("2026-", ""),
    neg_cogs: -d.cogs,
    neg_labor: -d.labor_cost,
    neg_rent: -d.rent,
    neg_other: -d.other_cost,
  }))

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 text-gray-500">
        <ArrowLeft className="h-4 w-4 mr-1" />戻る
      </Button>

      <ContextHeader
        title={store.name}
        description={`${store.brand_name} / ${store.area_name} / ${store.prefecture}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { setSvAdded(false); setSvDialogOpen(true) }}><Target className="h-4 w-4 mr-1 shrink-0" /><span className="hidden sm:inline">SV ミッション追加</span><span className="sm:hidden">SV</span></Button>
            <Button variant="outline" size="sm" onClick={() => { setMeetingAdded(false); setMeetingDialogOpen(true) }}><Presentation className="h-4 w-4 mr-1 shrink-0" /><span className="hidden sm:inline">経営会議に追加</span><span className="sm:hidden">会議</span></Button>
            <Button size="sm" onClick={() => openTaskDialog()}><Plus className="h-4 w-4 mr-1 shrink-0" />タスク作成</Button>
          </div>
        }
      />

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) { setTaskForm(emptyTaskForm); setTaskCreated(false) } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>タスク作成 - {store.name}</DialogTitle></DialogHeader>
          {taskCreated ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">タスクを作成しました</p>
              <p className="text-sm text-gray-500 mt-1">{taskForm.title}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">タイトル</label>
                  <Input placeholder="タスクのタイトル" className="mt-1" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">詳細</label>
                  <Textarea placeholder="タスクの詳細" className="mt-1" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">課題種別</label>
                    <Select value={taskForm.issue_type} onValueChange={(v) => setTaskForm({ ...taskForm, issue_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="種別" /></SelectTrigger>
                      <SelectContent>{issueTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">優先度</label>
                    <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="優先度" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="高">高</SelectItem>
                        <SelectItem value="中">中</SelectItem>
                        <SelectItem value="低">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">担当者</label>
                    <Input placeholder="担当者名" className="mt-1" value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">期限</label>
                    <Input type="date" className="mt-1" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">期待改善額</label>
                  <Input type="number" placeholder="0" className="mt-1" value={taskForm.expected_impact_amount} onChange={(e) => setTaskForm({ ...taskForm, expected_impact_amount: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleCreateTask} disabled={!taskForm.title}>作成</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Pack Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>経営会議に追加</DialogTitle></DialogHeader>
          {meetingAdded ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">追加しました</p>
              <p className="text-sm text-gray-500 mt-1">次回の経営会議パックに{store.name}の課題を追加しました</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 py-4">この店舗の課題を経営会議パックに追加しますか？</p>
              <div className="rounded border p-3 bg-gray-50 text-sm">
                <div className="font-medium">{store.name}</div>
                <div className="text-gray-500 mt-1">健全度: {store.kpi.health_score} / FL比率: {formatPercent(store.kpi.fl_ratio)}</div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleMeetingConfirm}>追加する</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* SV Mission Dialog */}
      <Dialog open={svDialogOpen} onOpenChange={setSvDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>SV ミッション追加</DialogTitle></DialogHeader>
          {svAdded ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">追加しました</p>
              <p className="text-sm text-gray-500 mt-1">{store.sv_name}のミッションボードに追加しました</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 py-4">この店舗をSVミッションボードに追加しますか？</p>
              <div className="rounded border p-3 bg-gray-50 text-sm">
                <div className="font-medium">{store.name}</div>
                <div className="text-gray-500 mt-1">担当SV: {store.sv_name}</div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setSvDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleSvConfirm}>追加する</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Store Info */}
      <div className="mb-6 flex gap-4 text-sm text-gray-600 flex-wrap">
        <span>SV: {store.sv_name}</span>
        <span>店長: {store.manager_name}</span>
        <Badge variant={store.status === "営業中" ? "success" : "secondary"}>{store.status}</Badge>
      </div>

      {/* KPI Cards with Lineage Tooltips */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-2">
        {[
          { label: "日商", value: formatCurrency(Math.round(store.kpi.net_sales / 30)) },
          { label: "客数", value: `${store.kpi.customer_count}人` },
          { label: "客単価", value: formatCurrency(store.kpi.avg_ticket) },
          { label: "原価率", value: formatPercent(store.kpi.cogs_rate), alert: store.kpi.cogs_rate > 33 },
          { label: "人件費率", value: formatPercent(store.kpi.labor_cost_rate), alert: store.kpi.labor_cost_rate > 32 },
          { label: "FL比率", value: formatPercent(store.kpi.fl_ratio), alert: store.kpi.fl_ratio > 65 },
          { label: "健全度", value: String(store.kpi.health_score), alert: store.kpi.health_score < 60 },
        ].map((kpi) => (
          <KPIWithLineage key={kpi.label} label={kpi.label} value={kpi.value} alert={kpi.alert} storeId={storeId} />
        ))}
      </div>
      <div className="mb-8 text-xs text-gray-400 flex items-center gap-1">
        <GitBranch className="h-3 w-3" />
        KPI をホバーするとデータ系譜を確認できます
      </div>

      {/* Profit Decomposition */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">利益構造（月次推移）</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip formatter={(v: number, name: string) => {
                if (name === "営業利益率") return [`${v}%`, name]
                return [formatCurrency(Math.abs(v)), name]
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="sales" name="売上" fill="#3b82f6" stackId="a" />
              <Bar yAxisId="left" dataKey="neg_cogs" name="原価" fill="#ef4444" stackId="b" />
              <Bar yAxisId="left" dataKey="neg_labor" name="人件費" fill="#f97316" stackId="b" />
              <Bar yAxisId="left" dataKey="neg_rent" name="家賃" fill="#8b5cf6" stackId="b" />
              <Bar yAxisId="left" dataKey="neg_other" name="その他" fill="#6b7280" stackId="b" />
              <Line yAxisId="right" dataKey="operating_profit_rate" name="営業利益率" stroke="#10b981" strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Issues and Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Issue Diagnosis */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">悪化要因分析</h2>
          <div className="space-y-4">
            {store.issues.length === 0 && <p className="text-gray-500 text-sm">検出された課題はありません。</p>}
            {store.issues.map((issue, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.severity === "critical" ? "destructive" : "warning"}>{issue.issue_type}</Badge>
                        <Badge variant="outline" className="text-xs">{issue.severity === "critical" ? "重大" : "警告"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{issue.description}</p>
                      {issue.peer_avg > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          全店平均: {formatPercent(issue.peer_avg)} → 当店: <span className="text-red-600 font-medium">{formatPercent(issue.current_value)}</span>
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        改善余地: <span className="text-blue-600 font-medium">{formatCurrency(issue.improvement_opportunity)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openTaskDialog({
                      title: `${issue.issue_type}の改善`,
                      description: issue.description,
                      issue_type: issue.issue_type,
                      priority: issue.severity === "critical" ? "高" : "中",
                      expected_impact_amount: String(issue.improvement_opportunity),
                    })}>タスク作成</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity & Tasks */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">最近の動き</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {store.recent_activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium">{activity.title}</div>
                      <div className="text-xs text-gray-500">{activity.description}</div>
                      <div className="mt-1 text-xs text-gray-400">{formatDate(activity.date)} - {activity.user_name}</div>
                    </div>
                  </div>
                ))}
              </div>

              {localTasks.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">タスク一覧</h3>
                  <div className="space-y-2">
                    {localTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-gray-500">{task.assignee} / 期限: {task.due_date}</div>
                        </div>
                        <Badge variant={task.status === "完了" ? "success" : task.status === "進行中" ? "default" : "secondary"}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
