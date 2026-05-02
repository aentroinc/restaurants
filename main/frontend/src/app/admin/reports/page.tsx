"use client"

/**
 * 帳票一覧ページ — 4 種の PDF をストア・期間選択でダウンロード。
 *   - 店長日報 (daily-report.pdf)
 *   - 売上日計表 (sales-daily.pdf)
 *   - 労務月次集計 (labor-monthly.pdf)
 *   - HACCP記録 (haccp-monitoring.pdf)
 */
import { useState } from "react"
import { FileText, Download, Calendar, Building2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

type ReportKind = {
  id: "daily-report" | "sales-daily" | "labor-monthly" | "haccp-monitoring"
  label: string
  description: string
  param: "date" | "month"
}

const REPORTS: ReportKind[] = [
  { id: "daily-report", label: "店長日報", description: "売上・客数・人時・特記事項。店長/SV署名欄あり。", param: "date" },
  { id: "sales-daily", label: "売上日計表", description: "時間帯別 / カテゴリ別 / 税率別 (8% / 10%) 集計。", param: "date" },
  { id: "labor-monthly", label: "労務月次集計", description: "従業員別の労働・残業時間。36協定違反ハイライト。", param: "month" },
  { id: "haccp-monitoring", label: "HACCP記録", description: "CCP 別の温度等記録。1年間保管義務。", param: "month" },
]

export default function AdminReportsPage() {
  const [storeId, setStoreId] = useState("S-1001")
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(thisMonth)

  const buildUrl = (r: ReportKind) => {
    const param = r.param === "date" ? `date=${date}` : `month=${month}`
    return `${API_URL}/api/v1/reports/${r.id}.pdf?store_id=${encodeURIComponent(storeId)}&${param}`
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">帳票出力</h1>
        <p className="text-sm text-white/50 mt-1">
          日本特有の帳票 (店長日報 / 売上日計表 / 労務月次 / HACCP記録) を PDF で出力します。
          軽減税率 (8%/10%) に対応。
        </p>
      </header>

      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> 店舗ID
          </span>
          <input
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 w-full rounded-md bg-black/30 border border-white/[0.08] px-3 py-2 text-sm font-mono"
            placeholder="S-1001"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 日付 (日次帳票用)
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md bg-black/30 border border-white/[0.08] px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 対象月 (月次帳票用)
          </span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full rounded-md bg-black/30 border border-white/[0.08] px-3 py-2 text-sm font-mono"
          />
        </label>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3"
          >
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{r.label}</div>
              <div className="text-[12px] text-white/50 mt-1 leading-relaxed">{r.description}</div>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={buildUrl(r)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-3 py-1.5 text-[12px] font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  ダウンロード
                </a>
                <span className="text-[10px] text-white/30 font-mono">
                  {r.param === "date" ? date : month}
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <footer className="text-[11px] text-white/40">
        ※ PDF は reportlab で生成。日本語フォント (IPAex / Hiragino) 自動判定。
        改ざん検知ハッシュ付き。
      </footer>
    </div>
  )
}
