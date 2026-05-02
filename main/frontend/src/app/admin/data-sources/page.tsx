"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type {
  DataSource, DataContractAdmin, IngestionRunAdmin, SchemaMapping, IDMapping,
  POSConnectorProvider, POSConnectorConfig, POSConnectorActionResult,
} from "@/lib/types"
import { CheckCircle2, XCircle, AlertTriangle, Clock, PlugZap, RefreshCw } from "lucide-react"

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
  promoted: { label: "取込済", variant: "success", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
  validated: { label: "検証済", variant: "secondary", icon: <Clock className="h-4 w-4 text-blue-600" /> },
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [contracts, setContracts] = useState<DataContractAdmin[]>([])
  const [runs, setRuns] = useState<IngestionRunAdmin[]>([])
  const [schemaMappings, setSchemaMappings] = useState<SchemaMapping[]>([])
  const [idMappings, setIDMappings] = useState<IDMapping[]>([])
  const [providers, setProviders] = useState<POSConnectorProvider[]>([])
  const [posConnectors, setPOSConnectors] = useState<POSConnectorConfig[]>([])
  const [connectorResult, setConnectorResult] = useState<POSConnectorActionResult | null>(null)
  const [busyConnectorId, setBusyConnectorId] = useState<string | null>(null)
  const [form, setForm] = useState({
    provider: "smaregi",
    display_name: "スマレジ検証環境",
    contract_id: "",
    client_id_env: "SMAREGI_CLIENT_ID",
    client_secret_env: "SMAREGI_CLIENT_SECRET",
    environment: "sandbox",
    store_mappings: "{\n  \"1\": \"S001\"\n}",
  })

  async function refreshPOSConnectors() {
    fetchAPI<POSConnectorProvider[]>("/api/v1/connectors/pos/providers").then(setProviders)
    fetchAPI<POSConnectorConfig[]>("/api/v1/connectors/pos/configs").then(setPOSConnectors)
  }

  useEffect(() => {
    fetchAPI<DataSource[]>("/api/v1/admin/data-sources").then(setSources)
    fetchAPI<DataContractAdmin[]>("/api/v1/admin/data-contracts").then(setContracts)
    fetchAPI<IngestionRunAdmin[]>("/api/v1/admin/ingestion-runs").then(setRuns)
    fetchAPI<SchemaMapping[]>("/api/v1/admin/schema-mappings").then(setSchemaMappings)
    fetchAPI<IDMapping[]>("/api/v1/admin/id-mappings").then(setIDMappings)
    refreshPOSConnectors()
  }, [])

  async function createConnector(e: React.FormEvent) {
    e.preventDefault()
    setConnectorResult(null)
    let mappings: Record<string, string>
    try {
      mappings = JSON.parse(form.store_mappings || "{}")
    } catch {
      setConnectorResult({ status: "failed", error: "店舗マッピングJSONが不正です" })
      return
    }

    const provider = form.provider
    const body = provider === "smaregi" ? {
      provider,
      display_name: form.display_name,
      status: "disconnected",
      credentials: {
        contract_id: form.contract_id,
        client_id_env: form.client_id_env,
        client_secret_env: form.client_secret_env,
      },
      settings: {
        environment: form.environment,
        scope: "pos.transactions:read pos.stores:read",
      },
      store_mappings: mappings,
    } : {
      provider,
      display_name: form.display_name || "本部DWH 日次売上データマート",
      status: "connected",
      credentials: { connection_owner: "情報システム部" },
      settings: { contract: "daily_sales/hourly_sales/product_sales canonical bundle" },
      store_mappings: mappings,
    }

    const created = await fetchAPI<POSConnectorConfig>("/api/v1/connectors/pos/configs", {
      method: "POST",
      body: JSON.stringify(body),
    })
    setConnectorResult({ status: "created", provider: created.provider })
    await refreshPOSConnectors()
  }

  async function testConnector(id: string) {
    setBusyConnectorId(id)
    try {
      const result = await fetchAPI<POSConnectorActionResult>(`/api/v1/connectors/pos/configs/${id}/test`, { method: "POST" })
      setConnectorResult(result)
      await refreshPOSConnectors()
    } finally {
      setBusyConnectorId(null)
    }
  }

  async function syncConnector(id: string) {
    setBusyConnectorId(id)
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const result = await fetchAPI<POSConnectorActionResult>(`/api/v1/connectors/pos/configs/${id}/sync`, {
        method: "POST",
        body: JSON.stringify({ date_from: yesterday, date_to: yesterday }),
      })
      setConnectorResult(result)
      await refreshPOSConnectors()
      fetchAPI<IngestionRunAdmin[]>("/api/v1/admin/ingestion-runs").then(setRuns)
    } finally {
      setBusyConnectorId(null)
    }
  }

  return (
    <div>
      <ContextHeader title="データ連携管理" description="外部データソースの接続・取り込み・マッピングを管理" />

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">データソース</TabsTrigger>
          <TabsTrigger value="pos">POSコネクタ</TabsTrigger>
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
                    <h3 className="font-semibold text-gray-900">{ds.display_name || ds.name}</h3>
                    <div className={`h-2.5 w-2.5 rounded-full ${ds.status === "active" ? "bg-green-500" : ds.status === "error" ? "bg-red-500" : "bg-gray-400"}`} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Badge className={`text-xs ${sourceTypeBadge[ds.source_type || ds.type || ""] || "bg-gray-100"}`}>{ds.source_type || ds.type}</Badge>
                    <Badge className={`text-xs ${categoryBadge[ds.system_category || "POS"] || "bg-gray-100"}`}>{ds.system_category || ds.entity_types?.[0] || "POS"}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <div>接続方式: {ds.connection_mode || ds.type || "-"}</div>
                    {(ds.last_success_at || ds.last_sync) && <div>最終成功: {formatDate(ds.last_success_at || ds.last_sync || "")}</div>}
                    {ds.last_failure_at && <div className="text-red-500">最終失敗: {formatDate(ds.last_failure_at)}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* POS Connectors */}
        <TabsContent value="pos" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">接続済みPOS</h3>
                </div>
                <div className="space-y-3">
                  {posConnectors.map((connector) => (
                    <div key={connector.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{connector.display_name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">{connector.provider === "smaregi" ? "スマレジ" : "本部DWH"}</Badge>
                            <Badge variant={connector.status === "connected" ? "success" : connector.status === "error" ? "destructive" : "secondary"}>
                              {connector.status === "connected" ? "接続済み" : connector.status === "error" ? "エラー" : "未接続"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">店舗マップ {connector.mapped_store_count}</Badge>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {connector.last_success_at ? `最終成功: ${formatDate(connector.last_success_at)}` : "最終成功: -"}
                            {connector.last_error ? <span className="ml-2 text-red-600">{connector.last_error}</span> : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={busyConnectorId === connector.id} onClick={() => testConnector(connector.id)}>
                            {busyConnectorId === connector.id ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                            テスト
                          </Button>
                          <Button size="sm" disabled={busyConnectorId === connector.id || connector.provider !== "smaregi"} onClick={() => syncConnector(connector.id)}>
                            同期
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {posConnectors.length === 0 && (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">POSコネクタは未登録です</div>
                  )}
                </div>
                {connectorResult && (
                  <div className={`mt-4 rounded-md border p-3 text-sm ${connectorResult.error ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                    {connectorResult.error ? connectorResult.error : (
                      <span>
                        {connectorResult.connected !== undefined ? `接続: ${connectorResult.connected ? "成功" : "失敗"}` : `ステータス: ${connectorResult.status}`}
                        {connectorResult.transactions_fetched !== undefined ? ` / 取引 ${connectorResult.transactions_fetched}件 / 日次 ${connectorResult.daily_rows_loaded}件` : ""}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="mb-4 font-semibold text-gray-900">接続を追加</h3>
                <form className="space-y-3" onSubmit={createConnector}>
                  <div>
                    <label className="text-xs font-medium text-gray-600">種別</label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.provider}
                      onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    >
                      {providers.map((provider) => (
                        <option key={provider.provider} value={provider.provider}>{provider.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">表示名</label>
                    <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                  </div>
                  {form.provider === "smaregi" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-600">契約ID</label>
                        <Input value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Client ID env</label>
                          <Input value={form.client_id_env} onChange={(e) => setForm({ ...form, client_id_env: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Client Secret env</label>
                          <Input value={form.client_secret_env} onChange={(e) => setForm({ ...form, client_secret_env: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">環境</label>
                        <select
                          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={form.environment}
                          onChange={(e) => setForm({ ...form, environment: e.target.value })}
                        >
                          <option value="sandbox">sandbox</option>
                          <option value="production">production</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-600">店舗マッピング</label>
                    <textarea
                      className="mt-1 min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                      value={form.store_mappings}
                      onChange={(e) => setForm({ ...form, store_mappings: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">追加</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Contracts */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
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
                    <TableCell className="font-medium">{c.contract_name || (c as any).name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">v{c.contract_version || (c as any).version}</Badge></TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">{c.entity_type}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "success" : c.status === "draft" ? "secondary" : "warning"}>
                        {c.status === "active" ? "有効" : c.status === "draft" ? "下書き" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{Array.isArray((c as any).required_columns) ? (c as any).required_columns.length : typeof c.required_fields === "object" ? Object.keys(c.required_fields).length : 0}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.effective_from || (c as any).approved_at || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Ingestion Runs */}
        <TabsContent value="runs" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
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
                  const cfg = runStatusConfig[r.run_status || (r as any).status] || runStatusConfig.running
                  const total = r.source_row_count || (r as any).row_count || 0
                  const accepted = r.accepted_row_count || (r as any).valid_row_count || 0
                  const rejected = r.rejected_row_count || (r as any).invalid_row_count || 0
                  const acceptRate = total > 0 ? (accepted / total) * 100 : 0
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.data_source_name || (r as any).source_system}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {cfg.icon}
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">{r.source_file_name || (r as any).file_name || "-"}</TableCell>
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
            </div>
          </Card>
        </TabsContent>

        {/* Schema Mappings */}
        <TabsContent value="schema" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
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
            </div>
          </Card>
        </TabsContent>

        {/* ID Mappings */}
        <TabsContent value="id" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
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
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
