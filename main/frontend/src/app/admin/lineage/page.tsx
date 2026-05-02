"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { mockStores } from "@/lib/mock-data"
import type { LineageEvent, KPILineage } from "@/lib/types"
import { Search, FileText, FileCheck2, ArrowDownUp, Database, Calculator, BarChart3 } from "lucide-react"

const flowSteps = [
  {
    icon: <FileText className="h-5 w-5" />,
    label: "元データファイル",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50",
    getData: (lineage: KPILineage) => ({
      title: lineage.ingestion_run?.source_file || "pos_sales_202604.csv",
      details: [
        `アップロード: ${lineage.ingestion_run?.imported_at ? formatDate(lineage.ingestion_run.imported_at) : "2026-05-01"}`,
      ],
    }),
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    label: "データ契約",
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-50",
    getData: () => ({
      title: "POS日次売上 v2",
      details: ["ステータス: 承認済み"],
    }),
  },
  {
    icon: <ArrowDownUp className="h-5 w-5" />,
    label: "スキーママッピング",
    borderColor: "border-l-teal-500",
    bgColor: "bg-teal-50",
    getData: () => ({
      title: "フィールド変換",
      details: ["売上日 → business_date", "店舗CD → store_code", "税込売上 → gross_sales"],
    }),
  },
  {
    icon: <Database className="h-5 w-5" />,
    label: "Canonical テーブル",
    borderColor: "border-l-indigo-500",
    bgColor: "bg-indigo-50",
    getData: () => ({
      title: "daily_store_sales",
      details: ["76,000 レコード"],
    }),
  },
  {
    icon: <Calculator className="h-5 w-5" />,
    label: "KPI 計算",
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-50",
    getData: (lineage: KPILineage) => ({
      title: `${lineage.kpi_definition.display_name} v${lineage.kpi_definition.version}`,
      details: [
        `= ${lineage.kpi_definition.formula}`,
        `期間: ${lineage.period}`,
      ],
    }),
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "レポート / AI回答",
    borderColor: "border-l-orange-500",
    bgColor: "bg-orange-50",
    getData: () => ({
      title: "Executive Overview",
      details: ["更新: 2026-05-01"],
    }),
  },
]

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  ingestion: { label: "取り込み", color: "bg-blue-100 text-blue-800" },
  schema_validation: { label: "スキーマ検証", color: "bg-emerald-100 text-emerald-800" },
  id_resolution: { label: "ID解決", color: "bg-teal-100 text-teal-800" },
  kpi_calculation: { label: "KPI計算", color: "bg-purple-100 text-purple-800" },
  report_generation: { label: "レポート生成", color: "bg-orange-100 text-orange-800" },
}

export default function LineagePage() {
  const [lineage, setLineage] = useState<KPILineage | null>(null)
  const [events, setEvents] = useState<LineageEvent[]>([])
  const [search, setSearch] = useState("")
  const [selectedStore, setSelectedStore] = useState("store-001")
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchAPI<KPILineage>(`/api/v1/lineage/kpi/${selectedStore}/cogs_rate`).then(setLineage)
    fetchAPI<LineageEvent[]>(`/api/v1/lineage/object/${selectedStore}`).then(setEvents)
  }, [selectedStore])

  const filteredStores = mockStores.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search) || s.code.includes(search.toUpperCase())
  )

  function selectStore(storeId: string) {
    setSelectedStore(storeId)
    const store = mockStores.find((s) => s.id === storeId)
    setSearch(store?.name || "")
    setShowDropdown(false)
  }

  if (!lineage) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  const currentStoreName = mockStores.find((s) => s.id === selectedStore)?.name || selectedStore

  return (
    <div>
      <ContextHeader title="データ系譜ビューア" description="データの取り込みからレポート生成までの完全なトレーサビリティ" />

      {/* Search */}
      <div className="mb-8 max-w-lg relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="店舗名またはコードで検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            className="pl-9"
          />
        </div>
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-y-auto">
            {filteredStores.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">該当する店舗が見つかりません</div>
            ) : (
              filteredStores.map((store) => (
                <button
                  key={store.id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${store.id === selectedStore ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                  onClick={() => selectStore(store.id)}
                >
                  <span>{store.name}</span>
                  <span className="text-xs text-gray-400">{store.code}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Store */}
      <div className="mb-4 text-sm text-gray-600">
        表示中: <span className="font-medium text-gray-900">{currentStoreName}</span>
      </div>

      {/* Lineage Flow Diagram */}
      <div className="mb-8">
        <div className="mx-auto max-w-xl space-y-0">
          {flowSteps.map((step, idx) => {
            const data = step.getData(lineage)
            return (
              <div key={idx}>
                {/* Card */}
                <Card className={`border-l-4 ${step.borderColor} shadow-sm`}>
                  <CardContent className={`p-4 ${step.bgColor}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-600">{step.icon}</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{step.label}</div>
                        <div className="mt-1 font-medium text-gray-900">{data.title}</div>
                        {data.details.map((d, i) => (
                          <div key={i} className="mt-0.5 text-sm text-gray-600 font-mono">{d}</div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Connector */}
                {idx < flowSteps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-px border-l-2 border-dashed border-gray-300" />
                      <div className="text-gray-400 text-xs">▼</div>
                      <div className="h-4 w-px border-l-2 border-dashed border-gray-300" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Data */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">入力データ</h3>
        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
          {lineage.inputs.map((input, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="text-xs text-gray-500">{input.source_type}</div>
                <div className="text-sm font-medium font-mono">{input.source_name}</div>
                <div className="mt-1 text-sm text-blue-600 font-medium">{input.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lineage Events Table */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">系譜イベント一覧</h3>
      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>イベント</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>ターゲット</TableHead>
              <TableHead>変換</TableHead>
              <TableHead>メタデータ</TableHead>
              <TableHead>日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((ev) => {
              const cfg = eventTypeLabels[ev.event_type] || { label: ev.event_type, color: "bg-gray-100 text-gray-800" }
              return (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="text-gray-500">{ev.source_type}</div>
                    {ev.source_id && <div className="font-mono text-gray-700">{ev.source_id}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="text-gray-500">{ev.target_type}</div>
                    {ev.target_id && <div className="font-mono text-gray-700">{ev.target_id}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">{ev.transformation_name || "-"}</TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                    {Object.entries(ev.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{formatDate(ev.created_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowDropdown(false)} />
      )}
    </div>
  )
}
