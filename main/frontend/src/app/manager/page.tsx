"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileText,
  Trash2,
  MessageSquareWarning,
  Wrench,
  CalendarClock,
  Users,
  TrendingUp,
  Clock,
  ShieldAlert,
  Download,
} from "lucide-react"
import { managerApi, type ManagerHomeKPI, type ManagerTask } from "@/lib/manager-api"
import { QuickActionCard } from "@/components/manager/QuickActionCard"
import { fetchAPI } from "@/lib/api"

export default function ManagerHomePage() {
  const [kpi, setKpi] = useState<ManagerHomeKPI | null>(null)
  const [tasks, setTasks] = useState<ManagerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [complianceCounts, setComplianceCounts] = useState<{ block: number; warn: number; open: number } | null>(null)

  useEffect(() => {
    const sid = (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
    Promise.all([managerApi.getHomeKPI(sid), managerApi.getTasks(sid)])
      .then(([k, t]) => {
        setKpi(k)
        setTasks(t)
      })
      .finally(() => setLoading(false))

    // 労務違反集計 (失敗しても無視)
    fetchAPI<{ data: { by_severity: Record<string, number>; open_count: number } }>(
      "/api/v1/labor/compliance/dashboard?period_days=30"
    )
      .then((r) =>
        setComplianceCounts({
          block: r.data?.by_severity?.block || 0,
          warn: r.data?.by_severity?.warn || 0,
          open: r.data?.open_count || 0,
        })
      )
      .catch(() => setComplianceCounts({ block: 0, warn: 0, open: 0 }))
  }, [])

  const urgent = tasks.filter((t) => t.severity === "high" && t.status !== "done").length
  const open = tasks.filter((t) => t.status !== "done").length

  return (
    <div className="space-y-5">
      {/* Hero KPI strip */}
      <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.06] to-blue-500/[0.04] p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/40">本日の売上ペース</div>
        {loading || !kpi ? (
          <div className="h-12 mt-1 animate-pulse bg-white/5 rounded" />
        ) : (
          <>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="font-mono tabular-nums text-3xl font-semibold text-white">
                ¥{kpi.today_sales_yen.toLocaleString()}
              </span>
              <span
                className={`text-sm font-mono tabular-nums ${
                  kpi.today_sales_pace_pct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {kpi.today_sales_pace_pct >= 0 ? "+" : ""}
                {kpi.today_sales_pace_pct.toFixed(1)}% vs 予測
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <KPI
                icon={Users}
                label="客数 vs 予測"
                value={`${kpi.customers_today} / ${kpi.customers_forecast}`}
                delta={`${(((kpi.customers_today - kpi.customers_forecast) / kpi.customers_forecast) * 100).toFixed(1)}%`}
                positive={kpi.customers_today >= kpi.customers_forecast}
              />
              <KPI
                icon={TrendingUp}
                label="人時売上"
                value={`¥${kpi.sales_per_labor_hour.toLocaleString()}`}
              />
              <KPI
                icon={Clock}
                label="シフト充足"
                value={`${kpi.shift_filled}/${kpi.shift_required}`}
                delta={kpi.shift_unfilled > 0 ? `${kpi.shift_unfilled}枠不足` : "充足"}
                positive={kpi.shift_unfilled === 0}
              />
            </div>
          </>
        )}
      </section>

      {/* Labor compliance banner */}
      {complianceCounts && (complianceCounts.block + complianceCounts.warn) > 0 && (
        <Link
          href="/labor/compliance"
          className={`block rounded-xl border p-4 transition ${
            complianceCounts.block > 0
              ? "border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.10]"
              : "border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.10]"
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert
              className={`w-5 h-5 ${complianceCounts.block > 0 ? "text-red-400" : "text-amber-400"}`}
              strokeWidth={1.5}
            />
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wider text-white/40">労務違反 (30日)</div>
              <div className="flex items-baseline gap-3 mt-0.5">
                <span
                  className={`font-mono tabular-nums text-2xl font-semibold ${
                    complianceCounts.block > 0 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {complianceCounts.block + complianceCounts.warn}件
                </span>
                <span className="text-[12px] text-white/60">
                  違反 {complianceCounts.block} / 警告 {complianceCounts.warn} / 未対応 {complianceCounts.open}
                </span>
              </div>
            </div>
            <span className="text-[12px] text-white/50">詳細を見る →</span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
          クイックアクション
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard href="/manager/daily-report" label="日報を提出" hint="本日の総括" icon={FileText} />
          <QuickActionCard href="/manager/waste" label="廃棄を記録" hint="商品+数量" icon={Trash2} />
          <QuickActionCard
            href="/manager/complaint"
            label="クレーム記録"
            hint="重大度3択"
            icon={MessageSquareWarning}
            tone={urgent > 0 ? "warning" : "default"}
          />
          <QuickActionCard
            href="/manager/equipment"
            label="設備故障"
            hint="写真+カテゴリ"
            icon={Wrench}
          />
          <QuickActionCard
            href="/manager/shift"
            label="シフト承認"
            hint="ドラフト→公開"
            icon={CalendarClock}
            badge={kpi?.shift_unfilled || 0}
            tone={(kpi?.shift_unfilled || 0) > 0 ? "warning" : "default"}
          />
          <QuickActionCard
            href="/manager/evaluation"
            label="スタッフ評価"
            hint="月次面談記録"
            icon={Users}
          />
        </div>
      </section>

      {/* PDF download */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">帳票</h2>
        <DailyReportDownload />
      </section>

      {/* Tasks */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] uppercase tracking-wider text-white/40">未対応タスク</h2>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-white/50">
              全{open}件
            </span>
            {urgent > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-mono tabular-nums">
                緊急 {urgent}
              </span>
            )}
          </div>
        </div>
        <ul className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
          {tasks.slice(0, 6).map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-start gap-3">
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  t.severity === "high"
                    ? "bg-red-500"
                    : t.severity === "medium"
                    ? "bg-amber-400"
                    : "bg-white/30"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white/85 leading-snug">{t.title}</div>
                <div className="text-[11px] text-white/40 mt-0.5 font-mono tabular-nums">
                  期限 {t.due_date}
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                  t.status === "done"
                    ? "text-emerald-400 bg-emerald-400/10"
                    : t.status === "in_progress"
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-amber-400 bg-amber-400/10"
                }`}
              >
                {t.status === "done" ? "完了" : t.status === "in_progress" ? "進行中" : "未対応"}
              </span>
            </li>
          ))}
          {tasks.length === 0 && !loading && (
            <li className="px-4 py-6 text-center text-white/40 text-sm">タスクなし</li>
          )}
        </ul>
      </section>
    </div>
  )
}

function DailyReportDownload() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const sid =
    (typeof window !== "undefined" && localStorage.getItem("manager.store_id")) || "S-1001"
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = `${apiUrl}/api/v1/reports/daily-report.pdf?store_id=${encodeURIComponent(sid)}&date=${date}`
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
      <FileText className="w-4 h-4 text-emerald-400" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/85">日報PDFダウンロード</div>
        <div className="text-[11px] text-white/40">店長日報 (軽減税率 8%/10% 内訳含む)</div>
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md bg-black/30 border border-white/[0.08] px-2 py-1 text-[12px] font-mono"
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-3 py-1.5 text-[12px] font-medium"
      >
        <Download className="w-3.5 h-3.5" />
        PDF
      </a>
    </div>
  )
}

function KPI({
  icon: Icon,
  label,
  value,
  delta,
  positive,
}: {
  icon: typeof Users
  label: string
  value: string
  delta?: string
  positive?: boolean
}) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-2 border border-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <Icon className="w-3 h-3" />
        <span className="truncate">{label}</span>
      </div>
      <div className="font-mono tabular-nums text-base font-semibold text-white mt-0.5 truncate">
        {value}
      </div>
      {delta && (
        <div
          className={`text-[10px] font-mono tabular-nums ${
            positive === undefined
              ? "text-white/40"
              : positive
              ? "text-emerald-400"
              : "text-amber-400"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  )
}
