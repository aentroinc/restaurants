"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Sparkles, Smartphone, Building2, Database, ArrowRight, Play, RotateCcw, Pause, CheckCircle2, Bell } from "lucide-react"

type Stage = "idle" | "ai" | "sv" | "store" | "pos" | "done"

const STAGE_DURATION = 2500  // ms each

export default function ActionLoopPage() {
  const [playing, setPlaying] = useState(false)
  const [stage, setStage] = useState<Stage>("idle")
  const [yearImpact, setYearImpact] = useState(0)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const startedAtRef = useRef<number>(0)

  useEffect(() => {
    if (!playing) return

    const stages: Stage[] = ["ai", "sv", "store", "pos", "done"]
    let idx = 0
    setStage(stages[0])
    startedAtRef.current = Date.now()

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const newIdx = Math.min(stages.length - 1, Math.floor(elapsed / STAGE_DURATION))
      setStage(stages[newIdx])

      if (newIdx >= 3) {
        // animate impact counter
        const target = 31_400_000
        const progress = Math.min(1, (elapsed - 3 * STAGE_DURATION) / STAGE_DURATION)
        setYearImpact(Math.floor(target * Math.max(0, progress)))
      }

      if (newIdx >= stages.length - 1 && elapsed > stages.length * STAGE_DURATION) {
        if (tickRef.current) clearInterval(tickRef.current)
        setPlaying(false)
      }
    }, 50)

    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [playing])

  const reset = () => {
    if (tickRef.current) clearInterval(tickRef.current)
    setPlaying(false)
    setStage("idle")
    setYearImpact(0)
  }

  const stageIdx = stage === "idle" ? -1 : ["ai", "sv", "store", "pos", "done"].indexOf(stage)

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="pt-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-white/40 tracking-wider uppercase">Action Loop Live</div>
            <h1 className="mt-1 text-[20px] sm:text-[24px] font-semibold text-white/95">
              異常検知から POS 反映まで <span className="text-emerald-400">10秒</span>でループする
            </h1>
            <p className="mt-1 text-[13px] text-white/55">承認 1 クリックで現場に届き、効果が即時に経営に戻ってくる</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/60" title="最初から">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setPlaying((p) => !p)} className={`px-5 py-2 rounded-md flex items-center gap-2 ${playing ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"}`}>
              {playing ? <><Pause className="w-4 h-4" /> 停止</> : <><Play className="w-4 h-4" /> Loop 再生</>}
            </button>
          </div>
        </header>

        {/* Loop diagram */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-9 gap-4 items-center">
            {/* Stage 1: AI */}
            <StageCard
              active={stageIdx >= 0}
              done={stageIdx > 0}
              color="purple"
              Icon={Sparkles}
              label="AI が異常検出"
              detail="かっぱ寿司 142店"
              sub="深夜帯 -8.2%"
            />

            <Arrow active={stageIdx >= 1} />

            {/* Stage 2: SV */}
            <StageCard
              active={stageIdx >= 1}
              done={stageIdx > 1}
              color="blue"
              Icon={Smartphone}
              label="SV へ自動配布"
              detail="5 名 / 25店舗"
              sub="優先順位最適化"
              showNotification={stageIdx === 1}
            />

            <Arrow active={stageIdx >= 2} />

            {/* Stage 3: Store */}
            <StageCard
              active={stageIdx >= 2}
              done={stageIdx > 2}
              color="amber"
              Icon={Building2}
              label="店舗で完了"
              detail="143 task 完了"
              sub="平均 4.2 時間"
            />

            <Arrow active={stageIdx >= 3} />

            {/* Stage 4: POS */}
            <StageCard
              active={stageIdx >= 3}
              done={stageIdx > 3}
              color="emerald"
              Icon={Database}
              label="POS へ書き戻し"
              detail="シフト + 補充"
              sub="承認制で安全"
            />
          </div>

          {/* Loop arrow back to top */}
          <div className="mt-8 flex justify-center">
            <div className={`flex items-center gap-2 text-[12px] ${stageIdx >= 4 ? "text-emerald-400" : "text-white/30"}`}>
              <CheckCircle2 className="w-4 h-4" />
              効果計測 → 経営司令塔 → 翌日の AI に学習 → 次のループへ
            </div>
          </div>
        </div>

        {/* Live impact counter */}
        <div className={`rounded-xl border p-6 transition-all ${stageIdx >= 3 ? "border-emerald-400/40 bg-emerald-500/[0.10]" : "border-white/[0.06] bg-white/[0.02]"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-400/80 uppercase tracking-wider font-bold">この 1 ループの年間換算インパクト</div>
              <div className="mt-2 text-5xl sm:text-6xl font-mono font-bold text-emerald-400 tabular-nums">
                ¥{yearImpact.toLocaleString()}
              </div>
              <div className="mt-1 text-[12px] text-white/55">介入: 深夜帯シフト最適化・対象 142店・対照群比較で確実</div>
            </div>
            {stageIdx >= 4 && (
              <div className="hidden sm:flex flex-col items-end gap-1">
                <div className="px-3 py-1 rounded bg-emerald-500/15 text-emerald-400 text-[11px]">本契約推奨</div>
                <div className="text-[10px] text-white/40">投資回収 2.4 ヶ月 / ROI 15.2x</div>
              </div>
            )}
          </div>
        </div>

        {/* What happens at each stage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { stage: "ai", title: "1. AI 検出", time: "03:14 JST", body: "深夜帯シフト過剰を AI が検出、Slack 通知" },
            { stage: "sv", title: "2. SV 配布", time: "07:30 JST", body: "経営層が承認 → 5 SV のスマホに即配信" },
            { stage: "store", title: "3. 店舗実行", time: "終日", body: "143 店舗で task 完了報告、現場コメント記録" },
            { stage: "pos", title: "4. POS 反映", time: "翌 03:00", body: "承認済みのシフト変更を POS へ書き戻し" },
          ].map((s, i) => (
            <div key={s.stage} className={`rounded-lg border p-4 ${stageIdx >= i ? "border-blue-400/20 bg-blue-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="text-[11px] text-white/40 font-mono">{s.time}</div>
              <div className="mt-1 text-[13px] font-medium text-white/85">{s.title}</div>
              <div className="mt-1 text-[11px] text-white/55 leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-5 flex items-center justify-between">
          <div>
            <div className="text-[14px] text-white/95">同じループが、毎日、すべてのブランド・全店舗で自動的に。</div>
            <div className="mt-1 text-[12px] text-white/60">経営層は「承認」ボタンを押すだけで現場が動く</div>
          </div>
          <Link href="/zensho-pilot" className="px-4 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[13px] inline-flex items-center gap-1">
            POC を起動 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StageCard({ active, done, color, Icon, label, detail, sub, showNotification }: {
  active: boolean; done: boolean;
  color: string; Icon: any; label: string; detail: string; sub: string;
  showNotification?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    purple: active ? "border-purple-400/50 bg-purple-500/[0.10]" : "border-white/[0.06] bg-white/[0.02]",
    blue: active ? "border-blue-400/50 bg-blue-500/[0.10]" : "border-white/[0.06] bg-white/[0.02]",
    amber: active ? "border-amber-400/50 bg-amber-500/[0.10]" : "border-white/[0.06] bg-white/[0.02]",
    emerald: active ? "border-emerald-400/50 bg-emerald-500/[0.10]" : "border-white/[0.06] bg-white/[0.02]",
  }
  const iconColor: Record<string, string> = {
    purple: active ? "text-purple-400" : "text-white/30",
    blue: active ? "text-blue-400" : "text-white/30",
    amber: active ? "text-amber-400" : "text-white/30",
    emerald: active ? "text-emerald-400" : "text-white/30",
  }

  return (
    <div className={`md:col-span-2 rounded-lg border-2 p-4 transition-all ${colorClasses[color]} ${active ? "scale-105" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center ${active ? `bg-${color}-500/20` : "bg-white/[0.04]"}`}>
          <Icon className={`w-5 h-5 ${iconColor[color]}`} />
          {showNotification && (
            <div className="absolute -top-1 -right-1">
              <Bell className="w-3 h-3 text-red-400 animate-pulse" />
            </div>
          )}
        </div>
        {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
      </div>
      <div className="mt-3">
        <div className={`text-[13px] font-medium ${active ? "text-white/90" : "text-white/40"}`}>{label}</div>
        <div className={`mt-1 text-[15px] font-mono ${active ? `text-${color}-400` : "text-white/30"}`}>{detail}</div>
        <div className={`text-[10px] mt-0.5 ${active ? "text-white/55" : "text-white/25"}`}>{sub}</div>
      </div>
    </div>
  )
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div className="md:col-span-1 flex justify-center">
      <ArrowRight className={`w-5 h-5 transition-colors ${active ? "text-blue-400 animate-pulse" : "text-white/15"}`} />
    </div>
  )
}
