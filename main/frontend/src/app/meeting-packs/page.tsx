"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { MeetingPack } from "@/lib/types"
import { Plus, FileText, Calendar } from "lucide-react"

export default function MeetingPacksPage() {
  const [packs, setPacks] = useState<MeetingPack[]>([])

  useEffect(() => {
    fetchAPI<MeetingPack[]>("/api/v1/meeting-packs").then(setPacks)
  }, [])

  return (
    <div>
      <ContextHeader
        title="経営会議パック"
        description="経営会議資料の作成と管理"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" />新規作成</Button>}
      />

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
