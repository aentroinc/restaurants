"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatCurrencyCompact, formatPercent, formatDate } from "@/lib/utils"
import type { ValueCase, ValueRealizationSummary } from "@/lib/types"
import { TrendingUp, Target, CheckCircle2, Clock } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

const statusConfig: Record<string, { variant: "default" | "success" | "secondary" | "warning"; icon: React.ReactNode }> = {
  "進行中": { variant: "default", icon: <Clock className="h-3 w-3" /> },
  "計画中": { variant: "secondary", icon: <Target className="h-3 w-3" /> },
  "完了": { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
}

export default function ValueRealizationPage() {
  const [summary, setSummary] = useState<ValueRealizationSummary | null>(null)
  const [cases, setCases] = useState<ValueCase[]>([])
  const [selectedCase, setSelectedCase] = useState<ValueCase | null>(null)

  useEffect(() => {
    fetchAPI<ValueCase[]>("/api/v1/value-cases").then((c) => {
      setCases(c)
      // compute summary client-side from mock
      const active = c.filter((v) => v.status !== "完了").length
      const totalExp = c.reduce((s, v) => s + v.expected_amount, 0)
      const totalReal = c.reduce((s, v) => s + v.realized_amount, 0)
      setSummary({
        active_cases: active,
        total_expected: totalExp,
        total_realized: totalReal,
        achievement_rate: totalExp > 0 ? +((totalReal / totalExp) * 100).toFixed(1) : 0,
      })
    })
  }, [])

  if (!summary) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  const chartData = cases.map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
    expected: c.expected_amount,
    realized: c.realized_amount,
  }))

  return (
    <div>
      <ContextHeader title="改善効果ダッシュボード" description="改善施策の投資対効果を定量的に可視化" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">進行中施策数</div>
            <div className="mt-2 text-3xl font-bold">{summary.active_cases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">期待改善額</div>
            <div className="mt-2 text-3xl font-bold">{formatCurrencyCompact(summary.total_expected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">実現改善額</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">{formatCurrencyCompact(summary.total_realized)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">達成率</div>
            <div className="mt-2 text-3xl font-bold">{formatPercent(summary.achievement_rate)}</div>
            <Progress value={summary.achievement_rate} className="mt-2 h-2" indicatorClassName="bg-emerald-500" />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">施策別 期待 vs 実現</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="expected" name="期待改善額" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realized" name="実現改善額" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Case List */}
      <div className="space-y-4">
        {cases.map((vc) => {
          const achievement = vc.expected_amount > 0 ? (vc.realized_amount / vc.expected_amount) * 100 : 0
          const cfg = statusConfig[vc.status] || statusConfig["計画中"]
          const isSelected = selectedCase?.id === vc.id

          return (
            <Card
              key={vc.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${isSelected ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedCase(isSelected ? null : vc)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{vc.name}</span>
                      <Badge variant={cfg.variant} className="text-xs flex items-center gap-1">
                        {cfg.icon}{vc.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{vc.issue_type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{vc.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>対象 {vc.target_stores}店舗</span>
                      <span>開始 {formatDate(vc.start_date)}</span>
                      {vc.end_date && <span>完了 {formatDate(vc.end_date)}</span>}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-500">達成率</div>
                    <div className="text-lg font-bold">{formatPercent(achievement)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>期待: {formatCurrency(vc.expected_amount)}</span>
                    <span>実現: {formatCurrency(vc.realized_amount)}</span>
                  </div>
                  <Progress value={achievement} className="h-2" indicatorClassName={achievement >= 80 ? "bg-emerald-500" : achievement >= 50 ? "bg-blue-500" : "bg-amber-500"} />
                </div>

                {isSelected && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold mb-2">改善指標（Before / After）</h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {Object.entries(vc.metrics_before).map(([key, val]) => (
                        <div key={key} className="text-sm">
                          <div className="text-gray-500">{key}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{typeof val === "number" ? formatPercent(val) : val}</span>
                            <span>→</span>
                            <span className="font-medium text-emerald-600">
                              {typeof vc.metrics_after[key] === "number" ? formatPercent(vc.metrics_after[key]) : vc.metrics_after[key]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {vc.tasks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">関連タスク</h4>
                        <div className="space-y-1">
                          {vc.tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between text-sm">
                              <span>{t.title}</span>
                              <Badge variant={t.status === "完了" ? "success" : "secondary"} className="text-xs">{t.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
