"use client"

import { useEffect, useState, useRef } from "react"

interface LiveCounterProps {
  initial: number
  driftRange?: number       // 5秒ごとに ±この値 で微増減
  intervalMs?: number
  format?: (n: number) => string
  className?: string
  showLiveDot?: boolean
}

export function LiveCounter({ initial, driftRange = 1000, intervalMs = 5000, format = (n) => n.toLocaleString(), className = "", showLiveDot = true }: LiveCounterProps) {
  const [value, setValue] = useState(initial)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setValue((prev) => {
        const drift = Math.floor((Math.random() - 0.4) * driftRange * 2)  // 微増バイアス
        const next = Math.max(0, prev + drift)
        setFlash(drift > 0 ? "up" : drift < 0 ? "down" : null)
        setTimeout(() => setFlash(null), 800)
        return next
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [driftRange, intervalMs])

  return (
    <span className={`relative inline-flex items-center gap-2 ${className}`}>
      <span className={`tabular-nums transition-colors duration-300 ${flash === "up" ? "text-emerald-300" : flash === "down" ? "text-amber-300" : ""}`}>
        {format(value)}
      </span>
      {showLiveDot && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
    </span>
  )
}

interface LiveTickerProps {
  events?: { id: string; ts: string; text: string; severity?: "info" | "warning" | "critical" }[]
  intervalMs?: number
  className?: string
}

const DEFAULT_EVENTS = [
  { id: "e1", ts: "10:14", text: "すき家 渋谷駅前店: 客数 +12% (予測比)", severity: "info" as const },
  { id: "e2", ts: "10:15", text: "はま寿司 横浜 港北店: 在庫 マグロ赤身 残3 (補充推奨)", severity: "warning" as const },
  { id: "e3", ts: "10:16", text: "ココス 新宿東口店: QSC スコア更新 81 → 84", severity: "info" as const },
  { id: "e4", ts: "10:17", text: "なか卯 池袋 西口店: 注文待ち時間 +18秒 (混雑検出)", severity: "warning" as const },
  { id: "e5", ts: "10:18", text: "ジョリーパスタ 大井町店: シフト充足率 88% → 92%", severity: "info" as const },
  { id: "e6", ts: "10:19", text: "ロッテリア 札幌駅前店: M&A 統合 dashboard データ反映完了", severity: "info" as const },
  { id: "e7", ts: "10:20", text: "AI: 関西エリア 6店で深夜帯人時売上 -10% 検出", severity: "critical" as const },
  { id: "e8", ts: "10:21", text: "すき家 大阪 梅田店: タスク「シフト見直し」を SV に配布", severity: "info" as const },
]

export function LiveTicker({ events = DEFAULT_EVENTS, intervalMs = 4000, className = "" }: LiveTickerProps) {
  const [visible, setVisible] = useState<typeof events>([])
  const idxRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      const ev = events[idxRef.current % events.length]
      const stamped = { ...ev, id: `${ev.id}-${Date.now()}`, ts: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) }
      setVisible((v) => [stamped, ...v].slice(0, 5))
      idxRef.current++
    }
    tick()  // 初回即時
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [events, intervalMs])

  const SEVERITY_COLORS = {
    info: "border-blue-400/30 bg-blue-500/[0.06]",
    warning: "border-amber-400/30 bg-amber-500/[0.06]",
    critical: "border-red-400/30 bg-red-500/[0.06]",
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {visible.map((ev) => (
        <div key={ev.id} className={`text-[11px] px-3 py-2 rounded border-l-2 ${SEVERITY_COLORS[ev.severity || "info"]} animate-fade-in flex items-start gap-2`}>
          <span className="text-white/40 font-mono shrink-0">{ev.ts}</span>
          <span className="text-white/80 leading-relaxed">{ev.text}</span>
        </div>
      ))}
      {visible.length === 0 && <div className="text-[11px] text-white/30">イベント待機中...</div>}
    </div>
  )
}
