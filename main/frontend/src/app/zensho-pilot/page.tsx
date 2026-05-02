"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { Plus, Building2, ArrowRight, Target, Calendar, CheckCircle2 } from "lucide-react"

interface Theme {
  theme_id: string
  name: string
  description: string
  primary_kpis: string[]
  default_brands: string[]
}

interface Pilot {
  id: string
  name: string
  theme: string
  status: string
  sponsor_name?: string
  baseline_start_date: string
  intervention_end_date: string
  target_store_ids: string[]
}

export default function ZenshoPilotsPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    fetchAPI<{ data: Theme[] } | Theme[]>("/api/v1/pilots/themes").then((d) => {
      const arr = Array.isArray(d) ? d : (d as any).data
      setThemes(arr || [])
    })
    fetchAPI<{ data: Pilot[] } | Pilot[]>("/api/v1/pilots").then((d) => {
      const arr = Array.isArray(d) ? d : (d as any).data
      setPilots(arr || [])
    })
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title="Zensho POC Manager" description="8週間 POC のテンプレ起動 + 効果計測"
        region="全社" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-white/85">進行中 POC: {pilots.length} 本</h2>
            <p className="text-[12px] text-white/50 mt-1">既存システムを置換せず、1 ブランド・1 テーマから 8 週間で収益改善を数字化</p>
          </div>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> 新規 POC を起動
          </button>
        </div>

        {/* Active pilots */}
        <div className="grid grid-cols-2 gap-4">
          {pilots.map((p) => (
            <Link key={p.id} href={`/zensho-pilot/${p.id}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 hover:border-blue-400/30 hover:bg-white/[0.04] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400/70" />
                  <span className="text-[14px] font-medium text-white/85">{p.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  {p.status === "running" ? "実施中" : p.status === "completed" ? "完了" : p.status === "planning" ? "計画中" : p.status}
                </span>
              </div>
              <div className="space-y-1.5 text-[12px] text-white/55">
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3" /> テーマ: {p.theme}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {p.baseline_start_date} 〜 {p.intervention_end_date}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> {p.target_store_ids.length} 店舗対象
                </div>
                {p.sponsor_name && (
                  <div className="text-[11px] text-white/35 mt-2 pt-2 border-t border-white/[0.04]">
                    スポンサー: {p.sponsor_name}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-blue-400/0 group-hover:text-blue-400/80 transition-colors">
                結果を見る <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Theme catalog */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">標準 POC テーマ ({themes.length})</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {themes.map((t) => (
              <div key={t.theme_id} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">{t.theme_id}</span>
                      <span className="text-[14px] font-medium text-white/85">{t.name}</span>
                    </div>
                    <p className="text-[12px] text-white/55 leading-relaxed">{t.description}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.primary_kpis.map((k) => (
                        <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/50 font-mono">{k}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setShowWizard(true)} className="px-3 py-1.5 rounded text-[11px] bg-white/[0.04] hover:bg-blue-500/15 hover:text-blue-400 text-white/55 transition-colors">
                    このテーマで開始
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard modal */}
        {showWizard && (
          <PilotWizard themes={themes} onClose={() => setShowWizard(false)} />
        )}
      </div>
    </div>
  )
}

function PilotWizard({ themes, onClose }: { themes: Theme[]; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [theme, setTheme] = useState<string>(themes[0]?.theme_id || "ZP-01")
  const [storeCount, setStoreCount] = useState(20)
  const [sponsorName, setSponsorName] = useState("")
  const [overlayMode, setOverlayMode] = useState("read_only")

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={onClose}>
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0e14] w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-semibold text-white/90">POC Wizard — Step {step}/4</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">×</button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] text-white/60">テーマを選択</p>
            {themes.map((t) => (
              <label key={t.theme_id} className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${theme === t.theme_id ? "border-blue-400/40 bg-blue-500/[0.08]" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
                <input type="radio" name="theme" checked={theme === t.theme_id} onChange={() => setTheme(t.theme_id)} className="mt-1" />
                <div>
                  <div className="text-[13px] text-white/85 font-medium">{t.theme_id} — {t.name}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{t.description}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-white/60">対象店舗数</label>
              <input type="number" value={storeCount} onChange={(e) => setStoreCount(Number(e.target.value))} min={5} max={500} className="mt-1 w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/90 text-[14px]" />
              <p className="text-[10px] text-white/40 mt-1">推奨: 20-50店舗（統計的有意性確保）</p>
            </div>
            <div>
              <label className="text-[12px] text-white/60">スポンサー名</label>
              <input type="text" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="例: ゼンショーHD 経営企画 山本 太郎" className="mt-1 w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/90 text-[14px]" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-[13px] text-white/60">既存システム連携モード</p>
            {[
              { v: "read_only", title: "Read-only", sub: "推奨。書き戻しなし、価値検証に集中" },
              { v: "writeback_approved", title: "書き戻し承認制", sub: "draft 生成 → 承認後に source system へ反映" },
            ].map((m) => (
              <label key={m.v} className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${overlayMode === m.v ? "border-blue-400/40 bg-blue-500/[0.08]" : "border-white/[0.06]"}`}>
                <input type="radio" checked={overlayMode === m.v} onChange={() => setOverlayMode(m.v)} className="mt-1" />
                <div>
                  <div className="text-[13px] text-white/85 font-medium">{m.title}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{m.sub}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-[13px]">
            <h4 className="text-[14px] font-medium text-white/85">確認</h4>
            <div className="rounded bg-white/[0.03] p-4 space-y-2 text-white/70">
              <div>テーマ: <span className="text-white/90">{theme}</span></div>
              <div>対象店舗: <span className="text-white/90">{storeCount} 店舗</span></div>
              <div>スポンサー: <span className="text-white/90">{sponsorName || "未指定"}</span></div>
              <div>連携モード: <span className="text-white/90">{overlayMode}</span></div>
              <div>期間: <span className="text-white/90">ベースライン 30日 + 介入 28日 = 8 週間</span></div>
            </div>
            <div className="rounded bg-emerald-500/[0.08] border border-emerald-400/20 p-3 flex gap-2 text-[12px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-emerald-300/90">起動後、自動で interventions と weekly_plan が作成され、対象店舗の baseline 集計が始まります。</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 rounded text-[13px] text-white/60 hover:bg-white/[0.04] disabled:opacity-30">
            戻る
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="px-5 py-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[13px] font-medium">
              次へ
            </button>
          ) : (
            <button onClick={onClose} className="px-5 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[13px] font-medium">
              POC を起動
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
