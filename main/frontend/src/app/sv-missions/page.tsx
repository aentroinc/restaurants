"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import type { SVMission } from "@/lib/types"
import { ChevronDown, ChevronUp, Plus, Clock, ListTodo } from "lucide-react"
import { cn, formatPercent } from "@/lib/utils"

export default function SVMissionsPage() {
  const [missions, setMissions] = useState<SVMission[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [svFilter, setSvFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")

  useEffect(() => {
    fetchAPI<SVMission[]>("/api/v1/sv/missions").then(setMissions)
  }, [])

  const svs = [...new Set(missions.map((m) => m.store.sv_name))]
  const brands = [...new Set(missions.map((m) => m.store.brand_name))]

  const filtered = missions.filter((m) => {
    if (svFilter !== "all" && m.store.sv_name !== svFilter) return false
    if (brandFilter !== "all" && m.store.brand_name !== brandFilter) return false
    return true
  })

  function toggle(id: string) {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  function priorityColor(score: number) {
    if (score >= 85) return "bg-red-500"
    if (score >= 70) return "bg-amber-500"
    return "bg-blue-500"
  }

  return (
    <div>
      <ContextHeader title="SV ミッションボード" description="SVが優先的に訪問すべき店舗とアクション一覧" />

      <div className="mb-6 flex gap-3">
        <Select value={svFilter} onValueChange={setSvFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="SV" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全SV</SelectItem>
            {svs.map((sv) => <SelectItem key={sv} value={sv}>{sv}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="ブランド" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ブランド</SelectItem>
            {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.map((mission) => {
          const isOpen = expanded.has(mission.id)
          return (
            <Card key={mission.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="flex cursor-pointer items-center gap-4 p-4 hover:bg-gray-50"
                  onClick={() => toggle(mission.id)}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm", priorityColor(mission.priority_score))}>
                    {mission.priority_score}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{mission.store.name}</span>
                      <Badge variant="secondary" className="text-xs">{mission.store.brand_name}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />最終訪問 {mission.days_since_visit}日前</span>
                      <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" />未完了タスク {mission.open_tasks}件</span>
                      <span>健全度 {mission.kpi.health_score}</span>
                      <span>FL比率 {formatPercent(mission.kpi.fl_ratio)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{mission.store.sv_name}</Badge>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t bg-gray-50 px-4 py-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">訪問理由</h4>
                        <ul className="space-y-1">
                          {mission.reasons.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">確認事項</h4>
                        <ul className="space-y-1">
                          {mission.suggested_actions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <input type="checkbox" className="mt-1 rounded border-gray-300" readOnly />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">推奨アクション</h4>
                        <ul className="space-y-1">
                          {mission.suggested_actions.map((a, i) => (
                            <li key={i} className="text-sm text-gray-600">
                              {i + 1}. {a}
                            </li>
                          ))}
                        </ul>
                        <Button size="sm" className="mt-3"><Plus className="h-4 w-4 mr-1" />タスク作成</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
