"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Sparkles, ArrowRight, MessageSquare, Mail, Smartphone, ChevronRight, Banknote, Coffee, Activity } from "lucide-react"
import { LiveCounter, LiveTicker } from "@/components/live-counter"

const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })

export default function DailyBriefPage() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setCompleted((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Mobile-first hero */}
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <header className="flex items-center justify-between pt-4">
          <div>
            <div className="text-[11px] text-white/40 tracking-wider uppercase">Daily Executive Brief</div>
            <div className="mt-1 text-[14px] text-white/70">{today}・おはようございます、小川CEO</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08]" title="Slack で配信">
              <MessageSquare className="w-4 h-4 text-blue-400/70" />
            </button>
            <button className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08]" title="メール購読">
              <Mail className="w-4 h-4 text-amber-400/70" />
            </button>
            <button className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08]" title="iPhone widget">
              <Smartphone className="w-4 h-4 text-emerald-400/70" />
            </button>
          </div>
        </header>

        {/* Pre-coffee summary */}
        <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[11px] text-amber-400/80 uppercase tracking-wider font-bold">
              <Coffee className="w-3.5 h-3.5" /> Coffee Brief（3分で読める）
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80">
              <Activity className="w-3 h-3" />
              <span>Live</span>
            </div>
          </div>
          <p className="text-[15px] text-white/90 leading-relaxed">
            本日のグループ売上は <span className="font-mono font-bold text-emerald-400 inline-flex items-center gap-1">
              <LiveCounter initial={3_842_000_000} driftRange={1_500_000} format={(n) => `¥${(n / 1_000_000_000).toFixed(2)}B`} source={{ endpoint: "/api/v1/executive/live-stats", field: "today_sales_jpy" }} />
            </span>（前年比 <span className="text-emerald-400">+2.3%</span>）。
            <span className="text-amber-400"> 異常 3 件 </span>と
            <span className="text-blue-400"> 意思決定待ち 2 件</span>、
            AI 提案 <span className="text-purple-400">1 件</span>あります。
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center pt-3 border-t border-white/[0.06]">
            <div>
              <div className="text-[9px] text-white/40 uppercase">本日 客数</div>
              <div className="mt-0.5 font-mono text-emerald-400 text-[14px]">
                <LiveCounter initial={1_240_000} driftRange={3_000} format={(n) => n.toLocaleString()} showLiveDot={false} source={{ endpoint: "/api/v1/executive/live-stats", field: "today_customers" }} />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 uppercase">店舗稼働中</div>
              <div className="mt-0.5 font-mono text-emerald-400 text-[14px]">
                <LiveCounter initial={3886} driftRange={3} format={(n) => n.toString()} showLiveDot={false} source={{ endpoint: "/api/v1/executive/live-stats", field: "active_stores" }} />
              </div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 uppercase">AI 検出 (本日)</div>
              <div className="mt-0.5 font-mono text-amber-400 text-[14px]">
                <LiveCounter initial={28} driftRange={2} format={(n) => `${n} 件`} showLiveDot={false} source={{ endpoint: "/api/v1/executive/live-stats", field: "ai_detections_today" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-white/60 tracking-wide uppercase">
            <Activity className="w-4 h-4 text-emerald-400" /> ライブイベント
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <LiveTicker />
          </div>
        </section>

        {/* 3 incidents */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-white/60 tracking-wide uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> 昨日の異常 3 件
          </div>
          <div className="space-y-2.5">
            {[
              {
                id: "i1",
                severity: "critical",
                title: "すき家 深夜帯で人時売上 -8.2%（首都圏 142店）",
                impact: "想定機会損失 ¥420万円/月",
                action: "シフト見直し提案",
                href: "/incidents",
              },
              {
                id: "i2",
                severity: "high",
                title: "はま寿司 牛バラ欠品リスク（明日 12時頃、関西エリア）",
                impact: "想定欠品 23店舗",
                action: "前倒し補充提案",
                href: "/demand",
              },
              {
                id: "i3",
                severity: "medium",
                title: "ココス QSC スコア 80→74（首都圏 3店）",
                impact: "リピート率低下リスク",
                action: "SV 緊急訪問",
                href: "/qsc",
              },
            ].map((inc) => (
              <Link key={inc.id} href={inc.href} className="block rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 active:bg-white/[0.05] sm:hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-1.5 h-12 rounded-full ${inc.severity === "critical" ? "bg-red-500" : inc.severity === "high" ? "bg-amber-500" : "bg-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] sm:text-[14px] text-white/90 font-medium leading-snug">{inc.title}</div>
                    <div className="mt-1 text-[11px] text-white/50">{inc.impact}</div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-400">
                      <Sparkles className="w-3 h-3" /> AI: {inc.action}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Decisions */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-white/60 tracking-wide uppercase">
            <Banknote className="w-4 h-4 text-blue-400" /> 今日の意思決定 2 件
          </div>
          <div className="space-y-2.5">
            {[
              {
                id: "d1",
                title: "はま寿司 廃棄削減 POC 本契約スコープ拡大",
                description: "20店舗 → 全583店舗展開、年間¥31億改善見込み、契約 ¥240M",
                deadline: "本日 17:00 まで",
                href: "/zensho-pilot/pilot-001",
              },
              {
                id: "d2",
                title: "すき家 深夜帯シフト最適化 介入承認",
                description: "首都圏142店、人時売上 +3% 想定、年間 ¥1.2億改善",
                deadline: "明日 12:00 まで",
                href: "/zensho-pilot",
              },
            ].map((d) => (
              <Link key={d.id} href={d.href} className="block rounded-lg border border-blue-400/20 bg-blue-500/[0.05] p-4 active:bg-blue-500/[0.10] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] sm:text-[14px] text-white/90 font-medium leading-snug">{d.title}</div>
                    <div className="mt-1 text-[12px] text-white/60 leading-relaxed">{d.description}</div>
                    <div className="mt-2 text-[11px] text-amber-400">⏰ {d.deadline}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* AI proactive */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-white/60 tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-purple-400" /> AI 提案 1 件
          </div>
          <Link href="/ai-analyst" className="block rounded-lg border border-purple-400/20 bg-purple-500/[0.05] p-4 active:bg-purple-500/[0.10]">
            <div className="text-[13px] text-white/90 font-medium leading-snug">
              ロッテリア 290店舗の KPI を新オントロジー定義で統一すれば、PMI 完了が <span className="text-emerald-400 font-mono">3ヶ月前倒し</span>できます
            </div>
            <div className="mt-2 text-[11px] text-white/50">
              根拠: M&A 統合進捗 47% → 進捗監視ダッシュボードを今すぐ起動可能
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-purple-400">
              詳細を見る <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </section>

        {/* Today's checklist */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-white/60 tracking-wide uppercase">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 今日のミーティング・タスク
          </div>
          <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
            {[
              { id: "t1", title: "10:00 経営会議（POC 中間報告）", note: "POC report 自動生成済 →", href: "/zensho-pilot/pilot-001" },
              { id: "t2", title: "13:00 ロッテリア統合 IT 部門打合せ", note: "Security Review Pack 添付済", href: "/admin/security" },
              { id: "t3", title: "16:00 SV 全国大会 オープニング", note: "「来週の重点店舗」ブリーフ準備済", href: "/sv-planner" },
              { id: "t4", title: "資料: 来週取締役会用 月次パック", note: "executive pack 起動 →", href: "/meeting-packs" },
            ].map((t) => (
              <Link key={t.id} href={t.href} className="flex items-center gap-3 p-3 rounded hover:bg-white/[0.03]">
                <input type="checkbox" checked={!!completed[t.id]} onChange={() => toggle(t.id)} onClick={(e) => e.stopPropagation()} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] ${completed[t.id] ? "line-through text-white/30" : "text-white/85"}`}>{t.title}</div>
                  <div className="text-[10px] text-blue-400/70 mt-0.5">{t.note}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-2 pt-2">
          <Link href="/zensho-executive" className="rounded-lg bg-white/[0.03] hover:bg-white/[0.06] p-3 text-center">
            <div className="text-[11px] text-white/50">経営司令塔</div>
            <div className="mt-0.5 text-[12px] text-white/85">エグゼクティブ画面</div>
          </Link>
          <Link href="/ai-analyst" className="rounded-lg bg-white/[0.03] hover:bg-white/[0.06] p-3 text-center">
            <div className="text-[11px] text-white/50">AI に質問</div>
            <div className="mt-0.5 text-[12px] text-white/85">アナリスト</div>
          </Link>
        </section>

        <footer className="text-center text-[10px] text-white/25 pt-6 pb-4">
          このブリーフは毎朝 7:00 に自動生成 / Slack #exec-brief / メール / iOS Widget で受信可能
        </footer>
      </div>
    </div>
  )
}
