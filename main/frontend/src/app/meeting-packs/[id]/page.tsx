"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { MeetingPack } from "@/lib/types"
import { ArrowLeft, Send, Printer, BarChart3, AlertTriangle, TrendingUp, MessageSquare, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const typeIcons: Record<string, React.ReactNode> = {
  kpi: <BarChart3 className="h-4 w-4 text-blue-500" />,
  alert: <AlertTriangle className="h-4 w-4 text-red-500" />,
  improvement: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  discussion: <MessageSquare className="h-4 w-4 text-purple-500" />,
}

const typeLabels: Record<string, string> = {
  kpi: "KPI推移",
  alert: "要注意店舗",
  improvement: "改善進捗",
  discussion: "議論事項",
}

const typeBadgeVariant: Record<string, "default" | "destructive" | "success" | "secondary"> = {
  kpi: "default",
  alert: "destructive",
  improvement: "success",
  discussion: "secondary",
}

export default function MeetingPackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pack, setPack] = useState<MeetingPack | null>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [published, setPublished] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAPI<MeetingPack>(`/api/v1/meeting-packs/${params.id}`).then(setPack)
    }
  }, [params.id])

  if (!pack) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

  function handlePublish() {
    setPack((prev) => prev ? { ...prev, status: "公開済み" } : prev)
    setPublished(true)
    setTimeout(() => { setPublishDialogOpen(false); setPublished(false) }, 1500)
  }

  return (
    <div className="print:p-0">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 text-gray-500 print:hidden">
        <ArrowLeft className="h-4 w-4 mr-1" />戻る
      </Button>

      <ContextHeader
        title={pack.title}
        description={`会議日: ${formatDate(pack.meeting_date)}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />印刷
            </Button>
            {pack.status === "下書き" && (
              <Button size="sm" onClick={() => { setPublished(false); setPublishDialogOpen(true) }}>
                <Send className="h-4 w-4 mr-1" />公開
              </Button>
            )}
          </div>
        }
      />

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={(open) => { setPublishDialogOpen(open); if (!open) setPublished(false) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>経営会議パックを公開</DialogTitle></DialogHeader>
          {published ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">公開しました</p>
              <p className="text-sm text-gray-500 mt-1">ステータスを公開済みに変更しました</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 py-4">この経営会議パックを公開しますか？公開すると全メンバーが閲覧可能になります。</p>
              <div className="rounded border p-3 bg-gray-50 text-sm">
                <div className="font-medium">{pack.title}</div>
                <div className="text-gray-500 mt-1">会議日: {formatDate(pack.meeting_date)}</div>
                <div className="text-gray-500">{pack.items.length}件のアイテム</div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handlePublish}>公開する</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <Badge variant={pack.status === "公開済み" ? "success" : "secondary"}>{pack.status}</Badge>
      </div>

      <div className="space-y-6">
        {pack.items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-gray-400">
              <p>アイテムがまだありません</p>
              <Button variant="outline" size="sm" className="mt-3">アイテムを追加</Button>
            </CardContent>
          </Card>
        )}

        {pack.items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {typeIcons[item.type]}
                <Badge variant={typeBadgeVariant[item.type] || "secondary"} className="text-xs">
                  {typeLabels[item.type] || item.type}
                </Badge>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
              {item.store_name && (
                <div className="mt-3">
                  <Link href={`/stores/${item.store_id}`} className="text-sm text-blue-600 hover:underline">
                    {item.store_name} →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
