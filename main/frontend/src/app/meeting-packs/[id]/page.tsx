"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { MeetingPack } from "@/lib/types"
import { ArrowLeft, Send, Printer, BarChart3, AlertTriangle, TrendingUp, MessageSquare } from "lucide-react"
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

  useEffect(() => {
    if (params.id) {
      fetchAPI<MeetingPack>(`/api/v1/meeting-packs/${params.id}`).then(setPack)
    }
  }, [params.id])

  if (!pack) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">読み込み中...</div></div>

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
              <Button size="sm"><Send className="h-4 w-4 mr-1" />公開</Button>
            )}
          </div>
        }
      />

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
