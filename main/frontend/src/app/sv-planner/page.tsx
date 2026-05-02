"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { MapPin, CheckSquare, Sparkles, Banknote } from "lucide-react"

interface Mission {
  store_id: string
  store_name: string
  priority: number
  scheduled_date: string
  reason: string
  expected_impact_yen: number | null
  checklist: string[]
}

interface Plan {
  week_start: string
  missions: Mission[]
  total_expected_impact_yen: number
  optimization_goal: string
}

export default function SVPlannerPage() {
  const [plan, setPlan] = useState<Plan | null>(null)

  useEffect(() => {
    // Backend が無い時は mock を直接読む（lib/mock-data の mockSVMissionPlan を返す fallback を作るより、ai/chat tool 経由で取れる前提でも良い）
    import("@/lib/mock-data").then((m) => setPlan(m.mockSVMissionPlan))
  }, [])

  if (!plan) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="SV ミッションプランナー" description={`週開始: ${plan.week_start}・優先順位最適化`} region="担当エリア" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">今週の訪問数</div>
            <div className="mt-1 text-2xl font-mono text-white/85">{plan.missions.length}店舗</div>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">期待改善総額</div>
            <div className="mt-1 text-2xl font-mono font-bold text-emerald-400">¥{plan.total_expected_impact_yen.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-blue-400/20 bg-blue-500/[0.06] p-4">
            <div className="text-[10px] text-blue-400/70 uppercase tracking-wider">最適化軸</div>
            <div className="mt-1 text-[14px] text-blue-400">{plan.optimization_goal}</div>
          </div>
        </div>

        <div className="space-y-3">
          {plan.missions.map((m) => (
            <div key={m.store_id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold ${m.priority <= 2 ? "bg-red-500/15 text-red-400" : m.priority <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>
                  #{m.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-[14px] font-medium text-white/85">{m.store_name}</span>
                    <span className="text-[10px] text-white/30">{m.scheduled_date}</span>
                  </div>
                  <p className="text-[12px] text-white/55 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400/60" /> {m.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.checklist.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/55 flex items-center gap-1">
                        <CheckSquare className="w-2.5 h-2.5" /> {c}
                      </span>
                    ))}
                  </div>
                </div>
                {m.expected_impact_yen && (
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400/70 justify-end">
                      <Banknote className="w-3 h-3" /> 期待改善
                    </div>
                    <div className="text-[15px] font-mono font-semibold text-emerald-400 mt-0.5">¥{m.expected_impact_yen.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
