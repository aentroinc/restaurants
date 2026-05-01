"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { DataQualitySummary, DataQualityIssue } from "@/lib/types"
import { ShieldCheck, AlertOctagon, AlertTriangle, Info } from "lucide-react"

const severityConfig: Record<string, { variant: "destructive" | "warning" | "default" | "secondary"; icon: React.ReactNode; color: string }> = {
  critical: { variant: "destructive", icon: <AlertOctagon className="h-4 w-4" />, color: "text-red-600" },
  high: { variant: "warning", icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600" },
  medium: { variant: "default", icon: <Info className="h-4 w-4" />, color: "text-amber-600" },
  low: { variant: "secondary", icon: <Info className="h-4 w-4" />, color: "text-blue-600" },
}

const severityLabels: Record<string, string> = { critical: "重大", high: "高", medium: "中", low: "低" }

export default function DataQualityPage() {
  const [summary, setSummary] = useState<DataQualitySummary | null>(null)
  const [issues, setIssues] = useState<DataQualityIssue[]>([])
  const [severityFilter, setSeverityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchAPI<DataQualitySummary>("/api/v1/data-quality/summary").then(setSummary)
    fetchAPI<DataQualityIssue[]>("/api/v1/data-quality/issues").then(setIssues)
  }, [])

  const filtered = issues.filter((i) => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false
    if (statusFilter !== "all" && i.status !== statusFilter) return false
    return true
  })

  if (!summary) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  return (
    <div>
      <ContextHeader title="データ品質センター" description="データの正確性と完全性を監視" />

      {/* Overall Score */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.overall_score}%</div>
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold">データ品質スコア</div>
            <div className="text-sm text-gray-500">全{summary.total_issues}件の問題を検出</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
        </CardContent>
      </Card>

      {/* Severity Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: "重大", count: summary.critical_count, color: "bg-red-50 text-red-700 border-red-200" },
          { label: "高", count: summary.high_count, color: "bg-orange-50 text-orange-700 border-orange-200" },
          { label: "中", count: summary.medium_count, color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "低", count: summary.low_count, color: "bg-blue-50 text-blue-700 border-blue-200" },
        ].map((s) => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{s.count}</div>
              <div className="text-sm mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="重要度" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全重要度</SelectItem>
            <SelectItem value="critical">重大</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="low">低</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="ステータス" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            <SelectItem value="未対応">未対応</SelectItem>
            <SelectItem value="確認中">確認中</SelectItem>
            <SelectItem value="対応済み">対応済み</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>重要度</TableHead>
              <TableHead>データ種別</TableHead>
              <TableHead>フィールド</TableHead>
              <TableHead className="w-[40%]">内容</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>検出日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((issue) => {
              const cfg = severityConfig[issue.severity] || severityConfig.low
              return (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Badge variant={cfg.variant}>{severityLabels[issue.severity]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{issue.entity_type}</TableCell>
                  <TableCell className="text-sm font-mono text-gray-600">{issue.field_name}</TableCell>
                  <TableCell className="text-sm text-gray-700">{issue.description}</TableCell>
                  <TableCell>
                    <Badge variant={issue.status === "対応済み" ? "success" : issue.status === "確認中" ? "warning" : "outline"}>
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(issue.detected_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
