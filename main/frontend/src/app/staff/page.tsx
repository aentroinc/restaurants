"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, Flame, AlertTriangle, ShieldAlert, ClipboardCheck, Trash2, MessageSquare, GraduationCap } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { staffApi, staffIdentity, type Shift } from "@/lib/staff-api"
import { Skeleton } from "@/components/common/Skeleton"
import { useTranslations, useLocale } from "@/i18n/I18nProvider"
import { formatGreetingDate } from "@/lib/format"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function plus7() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export default function StaffHomePage() {
  const router = useRouter()
  const t = useTranslations("home")
  const locale = useLocale()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    let alive = true
    staffApi
      .shifts(staffIdentity.employeeId, todayStr(), plus7())
      .then((s) => { if (alive) setShifts(s) })
      .catch(() => {})
      .finally(() => { if (alive) setShiftsLoading(false) })
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const todayShift = shifts.find((s) => s.date === todayStr())
  const upcoming = shifts.filter((s) => s.date > todayStr()).slice(0, 3)

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Greeting */}
      <div>
        <div className="text-xs text-white/50">
          {formatGreetingDate(now, locale)}
        </div>
        <h1 className="text-2xl font-bold mt-1">{t("greeting")}</h1>
      </div>

      {/* Today's shift */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
        <div className="text-xs text-white/50 mb-2">{t("todayShift")}</div>
        {shiftsLoading ? (
          <div className="space-y-2">
            <Skeleton height={28} width="60%" />
            <Skeleton height={14} width="45%" />
          </div>
        ) : todayShift ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {todayShift.start} - {todayShift.end}
              </div>
              <div className="text-sm text-white/70 mt-1">
                {todayShift.role}・{todayShift.store_name}
              </div>
            </div>
            <Clock className="h-10 w-10 text-emerald-400" />
          </div>
        ) : (
          <div className="text-white/60 text-sm">{t("noShift")}</div>
        )}
      </div>

      {/* Big clock-in CTA — face auth in 3 seconds */}
      <BigTapButton
        tone="success"
        fullHeight
        icon={<Clock className="h-7 w-7" />}
        label={t("clockInCta")}
        sublabel={t("clockInSub")}
        onClick={() => router.push("/staff/auth/face")}
      />

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/staff/checklist"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <ClipboardCheck className="h-6 w-6 text-emerald-400" />
          <div className="text-sm font-semibold">{t("lineCheck")}</div>
          <div className="text-xs text-white/50">{t("lineCheckSub")}</div>
        </Link>
        <Link
          href="/staff/loss"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <Trash2 className="h-6 w-6 text-amber-400" />
          <div className="text-sm font-semibold">{t("lossReport")}</div>
          <div className="text-xs text-white/50">{t("lossReportSub")}</div>
        </Link>
        <Link
          href="/staff/voice"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <MessageSquare className="h-6 w-6 text-sky-400" />
          <div className="text-sm font-semibold">{t("customerVoice")}</div>
          <div className="text-xs text-white/50">{t("customerVoiceSub")}</div>
        </Link>
        <Link
          href="/staff/allergy"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <ShieldAlert className="h-6 w-6 text-purple-400" />
          <div className="text-sm font-semibold">{t("allergy")}</div>
          <div className="text-xs text-white/50">{t("allergySub")}</div>
        </Link>
        <Link
          href="/staff/training"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <GraduationCap className="h-6 w-6 text-indigo-400" />
          <div className="text-sm font-semibold">{t("training")}</div>
          <div className="text-xs text-white/50">{t("trainingSub")}</div>
        </Link>
        <Link
          href="/staff/emergency"
          className="rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 p-4 flex flex-col gap-2 min-h-[100px]"
        >
          <AlertTriangle className="h-6 w-6 text-red-300" />
          <div className="text-sm font-semibold text-red-100">{t("emergency")}</div>
          <div className="text-xs text-red-200/70">{t("emergencySub")}</div>
        </Link>
      </div>

      {/* Today's tasks */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-xs text-white/50 mb-3">{t("myTasks")}</div>
        <ul className="space-y-2">
          <li className="flex items-center gap-3 py-1">
            <input type="checkbox" className="h-5 w-5 rounded accent-emerald-500" />
            <span className="text-sm">10:00 — 開店前ライン点検</span>
          </li>
          <li className="flex items-center gap-3 py-1">
            <input type="checkbox" className="h-5 w-5 rounded accent-emerald-500" />
            <span className="text-sm">12:00 — 中間ライン点検</span>
          </li>
          <li className="flex items-center gap-3 py-1">
            <input type="checkbox" className="h-5 w-5 rounded accent-emerald-500" />
            <span className="text-sm">14:30 — 客席清掃</span>
          </li>
        </ul>
      </div>

      {/* Upcoming shifts */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/50 mb-3">{t("upcomingShifts")}</div>
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  {s.date.slice(5).replace("-", "/")} {s.start}-{s.end}
                </span>
                <span className="text-white/50 text-xs">{s.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Daily fire-drill reminder */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
        <Flame className="h-5 w-5 text-amber-400 shrink-0" />
        <div className="text-xs text-amber-200/80">
          {t("fireDrillReminder")}
          <Link href="/staff/emergency" className="underline ml-1">
            {t("checkNow")}
          </Link>
        </div>
      </div>
    </div>
  )
}
