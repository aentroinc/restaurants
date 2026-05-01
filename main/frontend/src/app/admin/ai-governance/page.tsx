"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { AIGovernanceConfig } from "@/lib/types"
import { Boxes, ShieldAlert, GitBranch, PenLine, CheckCircle2, XCircle } from "lucide-react"

const confidenceConfig: Record<string, { label: string; color: string }> = {
  high: { label: "高確度", color: "bg-green-100 text-green-800" },
  medium: { label: "中確度", color: "bg-amber-100 text-amber-800" },
  low: { label: "低確度", color: "bg-red-100 text-red-800" },
}

export default function AIGovernancePage() {
  const [config, setConfig] = useState<AIGovernanceConfig | null>(null)

  useEffect(() => {
    fetchAPI<AIGovernanceConfig>("/api/v1/admin/ai-governance").then(setConfig)
  }, [])

  if (!config) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  const enabledCount = config.allowed_object_types.filter((t) => t.enabled).length

  return (
    <div>
      <ContextHeader title="AI ガバナンス" description="AIアナリストのデータアクセス権限・ポリシーを管理" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Boxes className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{enabledCount}</div>
              <div className="text-xs text-gray-500">許可オブジェクト型数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{config.restricted_fields.length}</div>
              <div className="text-xs text-gray-500">制限フィールド数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <GitBranch className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                {config.lineage_required ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-semibold">{config.lineage_required ? "ON" : "OFF"}</span>
              </div>
              <div className="text-xs text-gray-500">系譜必須</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <PenLine className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                {config.writeback_allowed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-semibold">{config.writeback_allowed ? "ON" : "OFF"}</span>
              </div>
              <div className="text-xs text-gray-500">書き戻し許可</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Allowed Object Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">許可オブジェクト型</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>オブジェクト型</TableHead>
                  <TableHead>表示名</TableHead>
                  <TableHead className="text-center">AI アクセス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.allowed_object_types.map((t) => (
                  <TableRow key={t.object_type}>
                    <TableCell className="font-mono text-sm">{t.object_type}</TableCell>
                    <TableCell>{t.display_name}</TableCell>
                    <TableCell className="text-center">
                      {t.enabled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300 inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Restricted Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">制限フィールド</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>フィールド名</TableHead>
                  <TableHead>オブジェクト型</TableHead>
                  <TableHead>制限理由</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.restricted_fields.map((f) => (
                  <TableRow key={`${f.object_type}-${f.field_name}`}>
                    <TableCell className="font-mono text-sm text-red-700">{f.field_name}</TableCell>
                    <TableCell className="text-sm">{f.object_type}</TableCell>
                    <TableCell className="text-sm text-gray-600">{f.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent AI Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近のAIクエリ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">質問</TableHead>
                <TableHead>日時</TableHead>
                <TableHead>確度</TableHead>
                <TableHead>参照オブジェクト数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.recent_queries.map((q, i) => {
                const cfg = confidenceConfig[q.confidence] || confidenceConfig.medium
                return (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{q.question}</TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(q.timestamp)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{q.referenced_objects_count}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
