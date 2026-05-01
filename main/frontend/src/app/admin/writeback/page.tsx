"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { WritebackPolicy, WritebackRequest } from "@/lib/types"
import { Check, X, Play } from "lucide-react"

const actionTypeLabels: Record<string, string> = {
  store_target_update: "店舗目標変更",
  kpi_threshold_update: "KPI閾値変更",
  menu_price_update: "メニュー価格変更",
  shift_adjustment: "シフト調整",
  supplier_change: "仕入先変更",
}

const requestStatusConfig: Record<string, { label: string; variant: "warning" | "default" | "success" | "destructive" }> = {
  pending: { label: "承認待ち", variant: "warning" },
  approved: { label: "承認済み", variant: "default" },
  executed: { label: "実行済み", variant: "success" },
  rejected: { label: "却下", variant: "destructive" },
}

export default function WritebackPage() {
  const [policies, setPolicies] = useState<WritebackPolicy[]>([])
  const [requests, setRequests] = useState<WritebackRequest[]>([])
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchAPI<WritebackPolicy[]>("/api/v1/writeback/policies").then(setPolicies)
    fetchAPI<WritebackRequest[]>("/api/v1/writeback/requests").then(setRequests)
  }, [])

  const filteredRequests = requests.filter((r) => statusFilter === "all" || r.status === statusFilter)

  async function handleApprove(id: string) {
    await fetchAPI(`/api/v1/writeback/requests/${id}/approve`, { method: "POST" })
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved", approved_by: "管理者" } : r))
  }

  async function handleExecute(id: string) {
    await fetchAPI(`/api/v1/writeback/requests/${id}/execute`, { method: "POST" })
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "executed" } : r))
  }

  async function handleReject(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r))
  }

  return (
    <div>
      <ContextHeader title="書き戻し管理" description="外部システムへのデータ書き戻しポリシーとリクエストを管理" />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="policies">ポリシー</TabsTrigger>
          <TabsTrigger value="requests">リクエスト</TabsTrigger>
        </TabsList>

        {/* Policies */}
        <TabsContent value="policies" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>アクション</TableHead>
                  <TableHead>ポリシー名</TableHead>
                  <TableHead>承認要否</TableHead>
                  <TableHead>許可ロール</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{actionTypeLabels[p.action_type] || p.action_type}</TableCell>
                    <TableCell className="text-sm">{p.policy_name}</TableCell>
                    <TableCell>
                      {p.requires_approval ? (
                        <Badge variant="warning" className="text-xs">要承認</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">自動</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.allowed_roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "success" : "secondary"}>
                        {p.status === "active" ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="mt-4">
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="ステータス" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">承認待ち</SelectItem>
                <SelectItem value="approved">承認済み</SelectItem>
                <SelectItem value="executed">実行済み</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>アクション</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>申請者</TableHead>
                  <TableHead>承認者</TableHead>
                  <TableHead>申請日</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((r) => {
                  const cfg = requestStatusConfig[r.status] || requestStatusConfig.pending
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{actionTypeLabels[r.action_type] || r.action_type}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.target_object_type}</div>
                        {r.target_object_id && <div className="text-xs text-gray-500 font-mono">{r.target_object_id}</div>}
                      </TableCell>
                      <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                      <TableCell className="text-sm">{r.requested_by || "-"}</TableCell>
                      <TableCell className="text-sm">{r.approved_by || "-"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === "pending" && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleApprove(r.id)}>
                                <Check className="h-3 w-3 mr-1" />承認
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleReject(r.id)}>
                                <X className="h-3 w-3 mr-1" />却下
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button variant="outline" size="sm" onClick={() => handleExecute(r.id)}>
                              <Play className="h-3 w-3 mr-1" />実行
                            </Button>
                          )}
                        </div>
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
