"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { MeetingPack } from "@/lib/types"
import { Plus, FileText, Calendar, CheckCircle2 } from "lucide-react"

export default function MeetingPacksPage() {
  const [packs, setPacks] = useState<MeetingPack[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")
  const [created, setCreated] = useState(false)

  useEffect(() => {
    fetchAPI<MeetingPack[]>("/api/v1/meeting-packs").then(setPacks)
  }, [])

  function handleCreate() {
    const newPack: MeetingPack = {
      id: `mp-new-${Date.now()}`,
      title: newTitle,
      meeting_date: newDate || "2026-05-14",
      status: "下書き",
      created_at: new Date().toISOString(),
      items: [],
    }
    setPacks((prev) => [newPack, ...prev])
    setCreated(true)
    setTimeout(() => { setDialogOpen(false); setCreated(false); setNewTitle(""); setNewDate("") }, 1500)
  }

  return (
    <div>
      <ContextHeader
        title="経営会議パック"
        description="経営会議資料の作成と管理"
        actions={
          <Button size="sm" onClick={() => { setCreated(false); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新規作成
          </Button>
        }
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setCreated(false); setNewTitle(""); setNewDate("") } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>経営会議パック 新規作成</DialogTitle></DialogHeader>
          {created ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">作成しました</p>
              <p className="text-sm text-gray-500 mt-1">{newTitle}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">タイトル</label>
                  <Input placeholder="例: 2026年5月 第2週 経営会議" className="mt-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">会議日</label>
                  <Input type="date" className="mt-1" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleCreate} disabled={!newTitle}>作成</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {packs.map((pack) => (
          <Link key={pack.id} href={`/meeting-packs/${pack.id}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{pack.title}</div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(pack.meeting_date)}</span>
                    <span>{pack.items.length}件のアイテム</span>
                  </div>
                </div>
                <Badge variant={pack.status === "公開済み" ? "success" : pack.status === "下書き" ? "secondary" : "default"}>
                  {pack.status}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
