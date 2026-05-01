"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { DataSource, DataContractAdmin, IngestionRunAdmin, SchemaMapping, IDMapping } from "@/lib/types"
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react"

const sourceTypeBadge: Record<string, string> = {
  CSV: "bg-blue-100 text-blue-800",
  API: "bg-purple-100 text-purple-800",
  SFTP: "bg-green-100 text-green-800",
}
const categoryBadge: Record<string, string> = {
  POS: "bg-orange-100 text-orange-800",
  "勤怠": "bg-indigo-100 text-indigo-800",
  "会計": "bg-emerald-100 text-emerald-800",
  "在庫": "bg-amber-100 text-amber-800",
  "顧客": "bg-pink-100 text-pink-800",
  "予約": "bg-cyan-100 text-cyan-800",
}
const runStatusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "secondary"; icon: React.ReactNode }> = {
  success: { label: "成功", variant: "success", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
  failed: { label: "失敗", variant: "destructive", icon: <XCircle className="h-4 w-4 text-red-600" /> },
  partial: { label: "部分成功", variant: "warning", icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  running: { label: "実行中", variant: "secondary", icon: <Clock className="h-4 w-4 text-blue-600" /> },
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [contracts, setContracts] = useState<DataContractAdmin[]>([])
  const [runs, setRuns] = useState<IngestionRunAdmin[]>([])
  const [schemaMappings, setSchemaMappings] = useState<SchemaMapping[]>([])
  const [idMappings, setIDMappings] = useState<IDMapping[]>([])

  useEffect(() => {
    fetchAPI<DataSource[]>("/api/v1/admin/data-sources").then(setSources)
    fetchAPI<DataContractAdmin[]>("/api/v1/admin/data-contracts").then(setContracts)
    fetchAPI<IngestionRunAdmin[]>("/api/v1/admin/ingestion-runs").then(setRuns)
    fetchAPI<SchemaMapping[]>("/api/v1/admin/schema-mappings").then(setSchemaMappings)
    fetchAPI<IDMapping[]>("/api/v1/admin/id-mappings").then(setIDMappings)
  }, [])

  return (
    <div>
      <ContextHeader title="データ連携管理" description="外部データソースの接続・取り込み・マッピングを管理" />

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">データソース</TabsTrigger>
          <TabsTrigger value="contracts">データ契約</TabsTrigger>
          <TabsTrigger value="runs">取り込み履歴</TabsTrigger>
          <TabsTrigger value="schema">スキーママッピング</TabsTrigger>
          <TabsTrigger value="id">IDマッピング</TabsTrigger>
        </TabsList>

        {/* Data Sources */}
        <TabsContent value="sources" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((ds) => (
              <Card key={ds.id} className="relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{ds.name}</h3>
                    <div className={`h-2.5 w-2.5 rounded-full ${ds.status === "active" ? "bg-green-500" : ds.status === "error" ? "bg-red-500" : "bg-gray-400"}`} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Badge className={`text-xs ${sourceTypeBadge[ds.source_type] || "bg-gray-100"}`}>{ds.source_type}</Badge>
                    <Badge className={`text-xs ${categoryBadge[ds.system_category] || "bg-gray-100"}`}>{ds.system_category}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <div>接続方式: {ds.connection_mode}</div>
                    {ds.last_success_at && <div>最終成功: {formatDate(ds.last_success_at)}</div>}
                    {ds.last_failure_at && <div className="text-red-500">最終失敗: {formatDate(ds.last_failure_at)}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Contracts */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>契約名</TableHead>
                  <TableHead>バージョン</TableHead>
                  <TableHead>エンティティ型</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>必須フィールド数</TableHead>
                  <TableHead>有効開始日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.contract_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">v{c.contract_version}</Badge></TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">{c.entity_type}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "success" : c.status === "draft" ? "secondary" : "warning"}>
                        {c.status === "active" ? "有効" : c.status === "draft" ? "下書き" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{typeof c.required_fields === "object" ? Object.keys(c.required_fields).length : 0}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.effective_from || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Ingestion Runs */}
        <TabsContent value="runs" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>データソース</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>ファイル名</TableHead>
                  <TableHead>取込結果</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>完了</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const cfg = runStatusConfig[r.run_status] || runStatusConfig.running
                  const total = r.source_row_count || 0
                  const accepted = r.accepted_row_count || 0
                  const rejected = r.rejected_row_count || 0
                  const acceptRate = total > 0 ? (accepted / total) * 100 : 0
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.data_source_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {cfg.icon}
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">{r.source_file_name || "-"}</TableCell>
                      <TableCell>
                        {total > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-green-600">{accepted.toLocaleString()}</span>
                              <span className="text-gray-400">/</span>
                              <span>{total.toLocaleString()}</span>
                              {rejected > 0 && <span className="text-red-500">(-{rejected.toLocaleString()})</span>}
                            </div>
                            <Progress value={acceptRate} className="h-1.5" />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{r.started_at ? formatDate(r.started_at) : "-"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{r.completed_at ? formatDate(r.completed_at) : "-"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Schema Mappings */}
        <TabsContent value="schema" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>データソース</TableHead>
                  <TableHead>ソースフィールド</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Canonical フィールド</TableHead>
                  <TableHead>変換ルール</TableHead>
                  <TableHead>必須</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemaMappings.map((sm) => (
                  <TableRow key={sm.id}>
                    <TableCell className="text-sm">{sm.data_source_name}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">{sm.source_field}</TableCell>
                    <TableCell className="text-gray-400 text-center">→</TableCell>
                    <TableCell className="font-mono text-sm text-blue-700">{sm.canonical_field}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{sm.transform_rule}</TableCell>
                    <TableCell>
                      {sm.required ? (
                        <Badge variant="destructive" className="text-xs">必須</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">任意</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ID Mappings */}
        <TabsContent value="id" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ソースシステム</TableHead>
                  <TableHead>ソース ID</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Canonical ID</TableHead>
                  <TableHead>信頼度</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idMappings.map((im) => {
                  const isLow = im.confidence < 0.7
                  const isUnresolved = im.status === "unresolved"
                  return (
                    <TableRow key={im.id} className={isUnresolved ? "bg-red-50" : isLow ? "bg-amber-50" : ""}>
                      <TableCell className="text-sm">{im.source_system}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-700">{im.source_id}</TableCell>
                      <TableCell className="text-gray-400 text-center">→</TableCell>
                      <TableCell className="font-mono text-sm">
                        {im.canonical_id ? (
                          <span className="text-blue-700">{im.canonical_id}</span>
                        ) : (
                          <span className="text-red-500 italic">未解決</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={im.confidence * 100} className={`h-2 w-16 ${im.confidence < 0.7 ? "[&>div]:bg-red-500" : im.confidence < 0.9 ? "[&>div]:bg-amber-500" : ""}`} />
                          <span className={`text-xs font-medium ${im.confidence < 0.7 ? "text-red-600" : im.confidence < 0.9 ? "text-amber-600" : "text-green-600"}`}>
                            {(im.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={im.status === "confirmed" ? "success" : im.status === "unresolved" ? "destructive" : "warning"}>
                          {im.status === "confirmed" ? "確定" : im.status === "unresolved" ? "未解決" : "要確認"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
