"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ContextHeader } from "@/components/context-header"
import { Progress } from "@/components/ui/progress"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/utils"
import type { ExecutiveSummary } from "@/lib/types"
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Store } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center text-emerald-600 text-sm font-medium"><TrendingUp className="h-4 w-4 mr-1" />+{formatPercent(value)}</span>
  if (value < 0) return <span className="flex items-center text-red-600 text-sm font-medium"><TrendingDown className="h-4 w-4 mr-1" />{formatPercent(value)}</span>
  return <span className="text-gray-500 text-sm">0.0%</span>
}

export default function ExecutiveOverviewPage() {
  const [data, setData] = useState<ExecutiveSummary | null>(null)

  useEffect(() => {
    fetchAPI<ExecutiveSummary>("/api/v1/executive/summary").then(setData)
  }, [])

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  const issueChartData = data.top_issues.map((i) => ({ name: i.issue_type, count: i.count, impact: i.total_impact }))

  const opportunityData = data.priority_stores
    .sort((a, b) => b.kpi.improvement_opportunity_amount - a.kpi.improvement_opportunity_amount)
    .slice(0, 10)
    .map((s) => ({ name: s.name.replace(/^[^ ]+ /, ""), amount: s.kpi.improvement_opportunity_amount, id: s.id }))

  const issueColors = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#8b5cf6"]

  return (
    <div>
      <ContextHeader title="経営概要" description="全店舗の経営状況をリアルタイムで把握" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">総売上（月次）</div>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatCurrencyCompact(data.total_sales)}</div>
            <div className="mt-1"><TrendArrow value={data.sales_trend} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">全店平均客単価</div>
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatCurrency(data.kpi_summary.avg_ticket)}</div>
            <div className="mt-1 text-sm text-gray-500">平均客数 {data.kpi_summary.avg_customer_count.toLocaleString()}人/月</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">平均FL比率</div>
              <Store className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatPercent(data.kpi_summary.avg_fl_ratio)}</div>
            <div className="mt-1 text-sm text-gray-500">
              原価 {formatPercent(data.kpi_summary.avg_cogs_rate)} / 人件費 {formatPercent(data.kpi_summary.avg_labor_cost_rate)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">要注意店舗数</div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">{data.critical_stores}店舗</div>
            <div className="mt-1 text-sm text-gray-500">全{data.total_stores}店舗中</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Stores */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">今週見るべき店舗</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {data.priority_stores.slice(0, 5).map((store) => (
            <Link key={store.id} href={`/stores/${store.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{store.name}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">{store.brand_name}</Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>健全度</span>
                      <span className={store.kpi.health_score < 50 ? "text-red-600 font-semibold" : store.kpi.health_score < 70 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                        {store.kpi.health_score}
                      </span>
                    </div>
                    <Progress
                      value={store.kpi.health_score}
                      className="h-2"
                      indicatorClassName={store.kpi.health_score < 50 ? "bg-red-500" : store.kpi.health_score < 70 ? "bg-amber-500" : "bg-emerald-500"}
                    />
                  </div>
                  <div className="mt-3 space-y-1">
                    {store.kpi.issue_types.slice(0, 2).map((issue) => (
                      <Badge key={issue} variant="destructive" className="text-xs mr-1">{issue}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    改善余地: <span className="font-semibold text-blue-600">{formatCurrencyCompact(store.kpi.improvement_opportunity_amount)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Issue Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主な悪化要因</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={issueChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v}店舗`, "該当数"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {issueChartData.map((_, i) => (
                    <Cell key={i} fill={issueColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Opportunity Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">利益改善余地ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={opportunityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "改善余地"]} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
