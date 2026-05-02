"use client"

import { useEffect, useState, useMemo } from "react"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatPercent } from "@/lib/utils"
import type { StoreRanking, StoreWithKPI } from "@/lib/types"
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"

type SortKey = "health_score" | "net_sales" | "labor_cost_rate" | "cogs_rate" | "fl_ratio" | "improvement_opportunity_amount"

export default function StoresPage() {
  const [ranking, setRanking] = useState<StoreRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState("all")
  const [areaFilter, setAreaFilter] = useState("all")
  const [issueFilter, setIssueFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("health_score")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)
  const perPage = 20

  useEffect(() => {
    fetchAPI<StoreRanking>("/api/v1/stores")
      .then(setRanking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const brands = useMemo(() => {
    if (!ranking) return []
    return [...new Set(ranking.stores.map((s) => s.brand_name))]
  }, [ranking])

  const areas = useMemo(() => {
    if (!ranking) return []
    return [...new Set(ranking.stores.map((s) => s.area_name))]
  }, [ranking])

  const filtered = useMemo(() => {
    if (!ranking) return []
    let stores = ranking.stores
    if (search) stores = stores.filter((s) => s.name.includes(search))
    if (brandFilter !== "all") stores = stores.filter((s) => s.brand_name === brandFilter)
    if (areaFilter !== "all") stores = stores.filter((s) => s.area_name === areaFilter)
    if (issueFilter !== "all") stores = stores.filter((s) => s.kpi.issue_types.includes(issueFilter))

    stores = [...stores].sort((a, b) => {
      const va = a.kpi[sortKey] as number
      const vb = b.kpi[sortKey] as number
      return sortAsc ? va - vb : vb - va
    })
    return stores
  }, [ranking, search, brandFilter, areaFilter, issueFilter, sortKey, sortAsc])

  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(field)}>
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    )
  }

  if (loading) return <div><ContextHeader title="店舗ランキング" description="全店舗のKPI一覧と比較分析" /><LoadingState /></div>
  if (error) return <div><ContextHeader title="店舗ランキング" description="全店舗のKPI一覧と比較分析" /><ErrorState message={error} /></div>
  if (!ranking) return <div><ContextHeader title="店舗ランキング" description="全店舗のKPI一覧と比較分析" /><EmptyState /></div>

  return (
    <div>
      <ContextHeader title="店舗ランキング" description="全店舗のKPI一覧と比較分析" />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="店舗名で検索" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} className="pl-9" />
            </div>
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(0) }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ブランド" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランド</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={(v) => { setAreaFilter(v); setPage(0) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="エリア" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全エリア</SelectItem>
                {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={issueFilter} onValueChange={(v) => { setIssueFilter(v); setPage(0) }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="課題" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全課題</SelectItem>
                {["人件費超過", "原価超過", "売上減少", "レビュー低下", "値引き過多"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">順位</TableHead>
              <TableHead>店舗名</TableHead>
              <TableHead>ブランド</TableHead>
              <TableHead>エリア</TableHead>
              <TableHead className="w-32"><SortHeader label="健全度" field="health_score" /></TableHead>
              <TableHead><SortHeader label="売上" field="net_sales" /></TableHead>
              <TableHead><SortHeader label="人件費率" field="labor_cost_rate" /></TableHead>
              <TableHead><SortHeader label="原価率" field="cogs_rate" /></TableHead>
              <TableHead><SortHeader label="FL比率" field="fl_ratio" /></TableHead>
              <TableHead><SortHeader label="改善余地" field="improvement_opportunity_amount" /></TableHead>
              <TableHead>主な課題</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((store, idx) => (
              <TableRow key={store.id} className="cursor-pointer" onClick={() => window.location.href = `/stores/${store.id}`}>
                <TableCell className="font-medium text-gray-500">{page * perPage + idx + 1}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/stores/${store.id}`} className="font-medium text-blue-600 hover:underline">
                    {store.name}
                  </Link>
                </TableCell>
                <TableCell><Badge variant="secondary">{store.brand_name}</Badge></TableCell>
                <TableCell className="text-gray-600">{store.area_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={store.kpi.health_score}
                      className="h-2 w-16"
                      indicatorClassName={store.kpi.health_score < 50 ? "bg-red-500" : store.kpi.health_score < 70 ? "bg-amber-500" : "bg-emerald-500"}
                    />
                    <span className="text-sm font-medium">{store.kpi.health_score}</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(store.kpi.net_sales)}</TableCell>
                <TableCell className={store.kpi.labor_cost_rate > 32 ? "text-red-600 font-medium" : ""}>{formatPercent(store.kpi.labor_cost_rate)}</TableCell>
                <TableCell className={store.kpi.cogs_rate > 33 ? "text-red-600 font-medium" : ""}>{formatPercent(store.kpi.cogs_rate)}</TableCell>
                <TableCell className={store.kpi.fl_ratio > 65 ? "text-red-600 font-medium" : ""}>{formatPercent(store.kpi.fl_ratio)}</TableCell>
                <TableCell className="tabular-nums text-blue-600 font-medium">{formatCurrency(store.kpi.improvement_opportunity_amount)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {store.kpi.issue_types.map((t) => <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-gray-500">{filtered.length}件中 {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)}件</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
