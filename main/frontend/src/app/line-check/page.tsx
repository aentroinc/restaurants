"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import {
  ChecklistTemplate, ChecklistRun, ScheduleType, lineCheckApi,
} from "@/lib/line-check-api"
import { ClipboardCheck, Sun, Moon, Clock, Settings, Camera, Thermometer, MapPin } from "lucide-react"

const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  opening: "開店",
  closing: "閉店",
  "4h": "4h品質",
  weekly: "週次",
}

const SCHEDULE_ICON = {
  opening: Sun,
  closing: Moon,
  "4h": Clock,
  weekly: Clock,
} as const

const STORE_ID = "00000000-0000-0000-0000-000000000010"

export default function LineCheckIndex() {
  const router = useRouter()
  const [tpls, setTpls] = useState<ChecklistTemplate[]>([])
  const [runs, setRuns] = useState<ChecklistRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([lineCheckApi.listTemplates(), lineCheckApi.listRuns({})])
      .then(([t, r]) => {
        setTpls(t)
        setRuns(r)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // PWA: register service worker (scoped to the Line Check experience).
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  async function handleStart(tpl: ChecklistTemplate) {
    setBusyId(tpl.id)
    try {
      let lat: number | undefined
      let lon: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          if (!navigator.geolocation) return rej(new Error("no geo"))
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        })
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      } catch {
        // Continue without geo (run will mark geofence_ok=false).
      }
      const run = await lineCheckApi.startRun({
        template_id: tpl.id,
        store_id: STORE_ID,
        lat,
        lon,
      })
      router.push(`/line-check/run/${run.id}?template=${tpl.id}`)
    } catch (e) {
      alert("開始に失敗しました: " + (e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Shell><LoadingState /></Shell>
  if (error) return <Shell><ErrorState message={error} /></Shell>
  if (!tpls.length) return <Shell><EmptyState message="テンプレートがありません" /></Shell>

  return (
    <Shell>
      <div className="px-5 py-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold">
            開始するチェックリスト
          </h2>
          <Link
            href="/line-check/admin"
            className="text-[11px] text-white/50 hover:text-white/80 flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            テンプレート編集
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tpls.map((t) => {
            const Icon = SCHEDULE_ICON[t.schedule_type] || ClipboardCheck
            const photoCount = t.items.filter((i) => i.requires_photo).length
            const tempCount = t.items.filter((i) => i.requires_temperature).length
            return (
              <button
                key={t.id}
                onClick={() => handleStart(t)}
                disabled={busyId === t.id}
                className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:border-blue-400/40 hover:bg-blue-400/[0.04] transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                      {SCHEDULE_LABEL[t.schedule_type]}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">{t.items.length}項目</span>
                </div>
                <div className="text-[14px] font-semibold text-white/90 mb-2">{t.name}</div>
                <div className="flex items-center gap-3 text-[11px] text-white/50">
                  {photoCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      写真{photoCount}
                    </span>
                  )}
                  {tempCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      温度{tempCount}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    geofence
                  </span>
                </div>
                <div className="mt-3 text-[11px] text-blue-400 group-hover:text-blue-300">
                  {busyId === t.id ? "開始中…" : "開始 →"}
                </div>
              </button>
            )
          })}
        </div>

        <div>
          <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold mb-3">
            最近の実行履歴
          </h2>
          {runs.length === 0 ? (
            <div className="text-[12px] text-white/40">履歴はまだありません</div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">テンプレート</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">開始</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">完了</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">geofence</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const tpl = tpls.find((t) => t.id === r.template_id)
                    return (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-white/80">{tpl?.name || r.template_id}</td>
                        <td className="px-4 py-2.5 text-white/60 font-mono tabular-nums">
                          {r.started_at ? new Date(r.started_at).toLocaleString("ja-JP") : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-white/60 font-mono tabular-nums">
                          {r.completed_at ? new Date(r.completed_at).toLocaleString("ja-JP") : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={r.geofence_ok ? "text-emerald-400" : "text-amber-400"}>
                            {r.geofence_ok ? "OK" : "外"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "bg-blue-400/10 text-blue-400",
    completed: "bg-emerald-400/10 text-emerald-400",
    failed: "bg-red-400/10 text-red-400",
  }
  const label: Record<string, string> = {
    in_progress: "進行中",
    completed: "完了",
    failed: "失敗",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || "bg-white/10 text-white/60"}`}>
      {label[status] || status}
    </span>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="現場チェック" description="開店・閉店・4h品質チェック（写真・温度・geofence）" />
      {children}
    </div>
  )
}
