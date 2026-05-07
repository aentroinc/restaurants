"use client"

import { useEffect, useState, useRef } from "react"
import { Play, Pause, RotateCcw, Sparkles, AlertTriangle, Target, BarChart3, FileCheck, ChevronRight } from "lucide-react"

interface Scene {
  id: string
  title: string
  subtitle: string
  duration: number  // ms
  icon: React.ComponentType<{ className?: string }>
  color: string
  body: () => React.ReactNode
}

export default function DemoTourPage() {
  const [playing, setPlaying] = useState(false)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const startRef = useRef<number>(0)

  const scenes: Scene[] = [
    {
      id: "scene1",
      title: "ステップ 1: 異常を AI が自動検出",
      subtitle: "AI が深夜帯シフトの異常を発見",
      duration: 7000,
      icon: AlertTriangle,
      color: "amber",
      body: () => (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/[0.08] p-5">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 animate-pulse" />
              <div>
                <div className="text-[15px] text-white/95 font-medium">
                  かっぱ寿司 142店（首都圏）で深夜帯の人時売上が予測比 -8.2%
                </div>
                <div className="mt-2 text-[12px] text-white/60 leading-relaxed">
                  原因仮説: シフト過剰配置（雨予報日に通常シフトを継続）<br />
                  影響: 月間 ¥4.2M の機会損失<br />
                  検出時刻: 03:14 JST（人時集計バッチ完了後 30秒）
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-white/40 italic">▸ 経営層が出社する前に AI が異常を発見、Slack に通知済</div>
        </div>
      ),
    },
    {
      id: "scene2",
      title: "ステップ 2: SV 全員に最適化された訪問計画を自動配布",
      subtitle: "5 名の SV、25 店舗の優先順位を秒単位で再計算",
      duration: 7000,
      icon: Target,
      color: "blue",
      body: () => (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-400/30 bg-blue-500/[0.06] p-5 space-y-3">
            {[
              { sv: "山田 SV", priority: "#1", store: "かっぱ寿司 渋谷駅前店", reason: "深夜人時 -15%、即時介入" },
              { sv: "鈴木 SV", priority: "#1", store: "かっぱ寿司 新宿東口店", reason: "深夜人時 -12%" },
              { sv: "田中 SV", priority: "#2", store: "かっぱ寿司 池袋西口店", reason: "シフト過剰の共食い" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-mono">{m.priority}</span>
                <span className="text-white/90 font-medium">{m.sv}</span>
                <span className="text-white/40">→</span>
                <span className="text-white/80">{m.store}</span>
                <span className="text-white/40 text-[11px] ml-auto">{m.reason}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-white/40 italic">▸ Slack 通知 + iOS アプリで SV のスマホに即配信、現場で即実行</div>
        </div>
      ),
    },
    {
      id: "scene3",
      title: "ステップ 3: 4 週間後、効果を統計検定で計測",
      subtitle: "対照群比較 + 信頼区間つきで「本当に効いた」を証明",
      duration: 7000,
      icon: BarChart3,
      color: "emerald",
      body: () => (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/[0.06] p-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-[10px] text-white/50">介入前</div>
                <div className="mt-1 text-[24px] font-mono text-white/85">¥18,500</div>
                <div className="text-[10px] text-white/40">/店/日</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-white/50">→</div>
                <div className="mt-2 text-[20px] font-mono text-emerald-400">-23.2%</div>
                <div className="text-[10px] text-emerald-400/70">統計的に有意</div>
              </div>
              <div>
                <div className="text-[10px] text-white/50">介入後</div>
                <div className="mt-1 text-[24px] font-mono text-emerald-400">¥14,200</div>
                <div className="text-[10px] text-white/40">/店/日</div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/60">年間改善見込み</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">¥31,400,000</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-white/40 italic">▸ 対照群との Difference-in-Differences 検定、p&lt;0.012 で有意</div>
        </div>
      ),
    },
    {
      id: "scene4",
      title: "ステップ 4: 経営報告書を 1 クリックで自動生成",
      subtitle: "経営層・事業部・情シス 3 audience 別の PDF が即出力",
      duration: 7000,
      icon: FileCheck,
      color: "purple",
      body: () => (
        <div className="space-y-3">
          {[
            { audience: "経営層", time: "1ページ・3分で読める", color: "purple" },
            { audience: "事業部 (かっぱ寿司)", time: "店舗別ランキング+詳細", color: "blue" },
            { audience: "情シス・監査", time: "セキュリティ・データ系譜全載せ", color: "emerald" },
          ].map((a, i) => (
            <div key={i} className={`rounded-lg border border-${a.color}-400/20 bg-${a.color}-500/[0.05] p-4 flex items-center gap-3`}>
              <FileCheck className={`w-5 h-5 text-${a.color}-400`} />
              <div className="flex-1">
                <div className="text-[13px] text-white/90 font-medium">{a.audience} 向けレポート</div>
                <div className="text-[11px] text-white/50 mt-0.5">{a.time}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/50">PDF / PPT</span>
            </div>
          ))}
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/[0.08] p-4 mt-4">
            <div className="text-[12px] text-emerald-400/80 uppercase tracking-wider font-bold mb-1">最終結果</div>
            <div className="text-[14px] text-white/95">
              POC 8 週間で <span className="font-mono text-emerald-400 font-bold">年間¥72.8M 改善</span>を証明、
              本契約 ¥240M で承認。
            </div>
            <div className="text-[11px] text-white/50 mt-1">投資回収期間 2.4 ヶ月 / ROI 15.2x</div>
          </div>
          <div className="text-[11px] text-white/40 italic">▸ AI が文章 + チャート + コメントまで自動生成、人間は確認とサインのみ</div>
        </div>
      ),
    },
  ]

  useEffect(() => {
    if (!playing) return
    if (sceneIdx >= scenes.length) {
      setPlaying(false)
      return
    }
    const scene = scenes[sceneIdx]
    startRef.current = Date.now()
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(100, (elapsed / scene.duration) * 100)
      setProgress(pct)
      if (elapsed >= scene.duration) {
        setSceneIdx((i) => i + 1)
        setProgress(0)
      }
    }, 50)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [playing, sceneIdx])

  const reset = () => {
    setSceneIdx(0)
    setProgress(0)
    setPlaying(false)
  }

  const scene = scenes[Math.min(sceneIdx, scenes.length - 1)]
  const Icon = scene.icon
  const totalDur = scenes.reduce((s, x) => s + x.duration, 0)
  const elapsedTotal = scenes.slice(0, sceneIdx).reduce((s, x) => s + x.duration, 0) + (progress / 100) * scene.duration
  const totalPct = (elapsedTotal / totalDur) * 100

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14]">
      <div className="max-w-3xl mx-auto w-full p-6 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div>
            <div className="text-[11px] text-white/40 tracking-wider uppercase">AENTRO Story Demo</div>
            <div className="mt-1 text-[20px] font-semibold text-white/90">
              異常検知から経営報告まで — <span className="text-emerald-400">28 秒</span>で見る AENTRO 価値
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/60" title="最初から">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setPlaying((p) => !p)} className={`px-4 py-2 rounded-md flex items-center gap-2 ${playing ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"}`}>
              {playing ? <><Pause className="w-4 h-4" /> 一時停止</> : <><Play className="w-4 h-4" /> 再生</>}
            </button>
          </div>
        </div>

        {/* Total progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
            <span>{Math.floor(elapsedTotal / 1000)}s / {Math.floor(totalDur / 1000)}s</span>
            <span>シーン {Math.min(sceneIdx + 1, scenes.length)}/{scenes.length}</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {/* Scene timeline */}
        <div className="grid grid-cols-4 gap-2">
          {scenes.map((s, i) => {
            const SceneIcon = s.icon
            const active = i === sceneIdx && playing
            const done = i < sceneIdx
            return (
              <button key={s.id} onClick={() => { setSceneIdx(i); setProgress(0) }} className={`p-3 rounded-md border text-left transition-all ${active ? `border-${s.color}-400/40 bg-${s.color}-500/[0.10]` : done ? "border-emerald-400/20 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                <SceneIcon className={`w-4 h-4 ${active ? `text-${s.color}-400` : done ? "text-emerald-400/70" : "text-white/40"}`} />
                <div className={`mt-2 text-[10px] ${active || done ? "text-white/85" : "text-white/50"}`}>
                  Step {i + 1}
                </div>
              </button>
            )
          })}
        </div>

        {/* Active scene */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 min-h-[400px]">
          <div className="flex items-start gap-4 mb-6">
            <div className={`shrink-0 w-12 h-12 rounded-xl bg-${scene.color}-500/15 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 text-${scene.color}-400`} />
            </div>
            <div className="flex-1">
              <div className={`text-[10px] text-${scene.color}-400/80 uppercase tracking-wider font-bold`}>
                Scene {Math.min(sceneIdx + 1, scenes.length)} / {scenes.length}
              </div>
              <h2 className="mt-1 text-[18px] sm:text-[22px] font-semibold text-white/95 leading-tight">{scene.title}</h2>
              <p className="mt-1 text-[13px] text-white/55">{scene.subtitle}</p>
            </div>
          </div>

          <div>{scene.body()}</div>

          {/* scene progress */}
          <div className="mt-6 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className={`h-full bg-${scene.color}-400/60 transition-all`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* CTA */}
        {sceneIdx >= scenes.length - 1 && progress >= 100 && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-5">
            <div className="text-[14px] text-white/90 leading-relaxed">
              これが AENTRO の <strong>1 ループ</strong>。同じことを毎週、毎月、すべてのブランド・全店舗で自動的に。
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <a href="/zensho-pilot" className="text-[13px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                カッパ・クリエイト POC を起動 <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        <footer className="text-center text-[10px] text-white/30 pt-2 pb-6">
          このデモは AENTRO Restaurant OS の実機能を録画ではなく実演奏で再現しています
        </footer>
      </div>
    </div>
  )
}
