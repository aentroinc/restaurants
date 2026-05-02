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
import { useTranslations, useBcp47 } from "@/i18n/I18nProvider"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"

const SCHEDULE_ICON = {
  opening: Sun,
  closing: Moon,
  "4h": Clock,
  weekly: Clock,
} as const

const STORE_ID = "00000000-0000-0000-0000-000000000010"

export default function LineCheckIndex() {
  const router = useRouter()
  const t = useTranslations("lineCheck")
  const bcp47 = useBcp47()
  const SCHEDULE_LABEL: Record<ScheduleType, string> = {
    opening: t("schedule.opening"),
    closing: t("schedule.closing"),
    "4h": t("schedule.4h"),
    weekly: t("schedule.weekly"),
  }
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
      alert(t("startError", { msg: (e as Error).message }))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Shell><LoadingState /></Shell>
  if (error) return <Shell><ErrorState message={error} /></Shell>
  if (!tpls.length) return <Shell><EmptyState message={t("noTemplates")} /></Shell>

  return (
    <Shell>
      <div className="px-5 py-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold">
            {t("startListTitle")}
          </h2>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/line-check/admin"
              className="text-[11px] text-white/50 hover:text-white/80 flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              {t("templateEdit")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tpls.map((tpl) => {
            const Icon = SCHEDULE_ICON[tpl.schedule_type] || ClipboardCheck
            const photoCount = tpl.items.filter((i) => i.requires_photo).length
            const tempCount = tpl.items.filter((i) => i.requires_temperature).length
            return (
              <button
                key={tpl.id}
                onClick={() => handleStart(tpl)}
                disabled={busyId === tpl.id}
                className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:border-blue-400/40 hover:bg-blue-400/[0.04] transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                      {SCHEDULE_LABEL[tpl.schedule_type]}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">{t("items", { n: tpl.items.length })}</span>
                </div>
                <div className="text-[14px] font-semibold text-white/90 mb-2">{tpl.name}</div>
                <div className="flex items-center gap-3 text-[11px] text-white/50">
                  {photoCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {t("photoCount", { n: photoCount })}
                    </span>
                  )}
                  {tempCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {t("tempCount", { n: tempCount })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    geofence
                  </span>
                </div>
                <div className="mt-3 text-[11px] text-blue-400 group-hover:text-blue-300">
                  {busyId === tpl.id ? t("starting") : t("start")}
                </div>
              </button>
            )
          })}
        </div>

        <div>
          <h2 className="text-[13px] uppercase tracking-wider text-white/50 font-semibold mb-3">
            {t("history")}
          </h2>
          {runs.length === 0 ? (
            <div className="text-[12px] text-white/40">{t("noHistory")}</div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("th.template")}</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("th.started")}</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("th.completed")}</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("th.geofence")}</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{t("th.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const tpl = tpls.find((x) => x.id === r.template_id)
                    return (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-white/80">{tpl?.name || r.template_id}</td>
                        <td className="px-4 py-2.5 text-white/60 font-mono tabular-nums">
                          {r.started_at ? new Date(r.started_at).toLocaleString(bcp47) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-white/60 font-mono tabular-nums">
                          {r.completed_at ? new Date(r.completed_at).toLocaleString(bcp47) : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={r.geofence_ok ? "text-emerald-400" : "text-amber-400"}>
                            {r.geofence_ok ? t("geofenceOk") : t("geofenceOut")}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.status} t={t} />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatusBadge({ status, t }: { status: string; t: any }) {
  const map: Record<string, string> = {
    in_progress: "bg-blue-400/10 text-blue-400",
    completed: "bg-emerald-400/10 text-emerald-400",
    failed: "bg-red-400/10 text-red-400",
  }
  const label = t(`status.${status}`)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || "bg-white/10 text-white/60"}`}>
      {label || status}
    </span>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lineCheck")
  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title={t("headerTitle")} description={t("headerDesc")} />
      {children}
    </div>
  )
}
