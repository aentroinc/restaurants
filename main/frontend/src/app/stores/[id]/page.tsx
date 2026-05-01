"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatCurrencyCompact, formatPercent, formatDate } from "@/lib/utils"
import type { StoreDetail } from "@/lib/types"
import { ArrowLeft, Plus, Target, Presentation } from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

export default function StoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [store, setStore] = useState<StoreDetail | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchAPI<StoreDetail>(`/api/v1/stores/${params.id}`).then(setStore)
    }
  }, [params.id])

  if (!store) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Target className="h-4 w-4 mr-1" />SV ミッション追加</Button>
            <Button variant="outline" size="sm"><Presentation className="h-4 w-4 mr-1" />経営会議に追加</Button>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />タスク作成</Button>
          </div>
        }
      />

      {/* Store Info */}
      <div className="mb-6 flex gap-4 text-sm text-gray-600">
        <span>SV: {store.sv_name}</span>
        <span>店長: {store.manager_name}</span>
        <Badge variant={store.status === "営業中" ? "success" : "secondary"}>{store.status}</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-8">
        {[
          { label: "日商", value: formatCurrency(Math.round(store.kpi.net_sales / 30)) },
          { label: "客数", value: `${store.kpi.customer_count}人` },
          { label: "客単価", value: formatCurrency(store.kpi.avg_ticket) },
          { label: "原価率", value: formatPercent(store.kpi.cogs_rate), alert: store.kpi.cogs_rate > 33 },
          { label: "人件費率", value: formatPercent(store.kpi.labor_cost_rate), alert: store.kpi.labor_cost_rate > 32 },
          { label: "FL比率", value: formatPercent(store.kpi.fl_ratio), alert: store.kpi.fl_ratio > 65 },
          { label: "健全度", value: String(store.kpi.health_score), alert: store.kpi.health_score < 60 },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <div className="text-xs text-gray-500">{kpi.label}</div>
              <div className={`mt-1 text-lg font-bold ${kpi.alert ? "text-red-600" : "text-gray-900"}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
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
              <Tooltip formatter={(v: number, name: string) => {
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
                    <Button variant="outline" size="sm">タスク作成</Button>
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

              {store.tasks.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">タスク一覧</h3>
                  <div className="space-y-2">
                    {store.tasks.map((task) => (
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
