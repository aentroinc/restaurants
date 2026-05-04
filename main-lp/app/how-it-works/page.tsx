"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sparkles,
  Smartphone,
  Building2,
  Database,
  Repeat,
  PlayCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Calculator,
  ChartBar,
  FileText,
  Send,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function HowItWorksPage() {
  return (
    <>
      {/* ====================== HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-20 lg:pt-28 pb-16 lg:pb-20">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
                HOW IT WORKS
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]"
            >
              AENTRO は <span className="gradient-text">24 時間で 1 ループ</span>する
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-white/65 leading-relaxed max-w-3xl">
              経営判断は単発ではない。月単位ではなく、毎日回せるかどうか。
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ====================== SECTION 1 — Why Loop ====================== */}
      <Section>
        <SectionHeader eyebrow="THE LOOP" title="なぜ &quot;ループ&quot; が大事なのか" />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-4"
        >
          <motion.div variants={fadeUp}>
            <LoopReasonCard
              step="01"
              tone="purple"
              text="月曜に出した指示 → 火曜現場で実行 → 水曜に効果計測 → 木曜に方針修正"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <LoopReasonCard
              step="02"
              tone="blue"
              text="このサイクルを 1 ヶ月単位ではなく、24 時間で回せるかどうか"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <LoopReasonCard
              step="03"
              tone="emerald"
              text="AENTRO はこのループを AI で自動化、経営層の判断を最短で現場に運ぶ"
            />
          </motion.div>
        </motion.div>
      </Section>

      {/* ====================== SECTION 2 — 4 Step Detail ====================== */}
      <Section>
        <SectionHeader
          eyebrow="4 STEPS"
          title="1 ループの中で何が起きているか"
          description="検出 → 配布 → 実行 → 反映。経営層の役割は &quot;Yes か No&quot; を押すこと。"
        />

        <div className="space-y-6">
          {/* Step 1 */}
          <StepCard
            order="01"
            time="03:14 JST"
            tone="purple"
            icon={<Sparkles className="w-5 h-5" />}
            title="AI が異常を見つける"
            subtitle="経営層が出社する前に、Slack で通知"
            details={[
              {
                label: "何を見ているか",
                items: ["KPI の異常", "DQ issue (データ品質)", "顧客レビュー", "在庫水準"],
              },
              {
                label: "検出ロジック",
                items: ["統計的閾値 (z-score / IQR)", "業界知識ベースの仮説生成", "Claude による原因推論"],
              },
              {
                label: "実装場所",
                items: ["毎日 03:00 JST バッチ", "イベント駆動 (POS / 勤怠)", "Slack Webhook 連携"],
              },
            ]}
            mock={<MockStep1 />}
          />

          {/* Step 2 */}
          <StepCard
            order="02"
            time="07:30 JST"
            tone="blue"
            icon={<Smartphone className="w-5 h-5" />}
            title="現場に届ける"
            subtitle="経営層が承認 → 5 SV のスマホに即配信"
            details={[
              {
                label: "配布チャネル",
                items: ["Slack (DM + チャンネル)", "メール (HTML)", "iOS アプリ (push)"],
              },
              {
                label: "優先順位最適化",
                items: ["improvement opportunity 順", "SV の担当エリアでフィルタ", "走行ルート最適化"],
              },
              {
                label: "含まれる情報",
                items: ["訪問理由", "期待改善額 (円)", "現場用チェックリスト"],
              },
            ]}
            mock={<MockStep2 />}
          />

          {/* Step 3 */}
          <StepCard
            order="03"
            time="終日"
            tone="amber"
            icon={<Building2 className="w-5 h-5" />}
            title="店舗で実行する"
            subtitle="143 店舗で task 完了報告、現場コメント記録"
            details={[
              {
                label: "担当",
                items: ["SV (エリア責任者)", "店長 (店舗責任者)", "店舗スタッフ (実行者)"],
              },
              {
                label: "報告",
                items: ["完了 / 効果あり / 効果なし", "現場コメント (フリーテキスト)", "写真添付 (任意)"],
              },
              {
                label: "学習",
                items: ["AI が現場フィードバックで仮説を更新", "次回提案の精度に反映", "店舗別の傾向を蓄積"],
              },
            ]}
            mock={<MockStep3 />}
          />

          {/* Step 4 */}
          <StepCard
            order="04"
            time="翌 03:00 JST"
            tone="emerald"
            icon={<Database className="w-5 h-5" />}
            title="POS / 勤怠に反映する"
            subtitle="承認済みのシフト変更を POS に書き戻し、効果を再計測"
            details={[
              {
                label: "書き戻しポリシー",
                items: ["write-back policy で承認制", "段階的 rollout (5% → 100%)", "ロールバック可能"],
              },
              {
                label: "監査",
                items: ["audit log に全記録", "誰が / いつ / 何を", "WORM ストレージに保管"],
              },
              {
                label: "再計測",
                items: ["ROI 計測 (円換算)", "翌日の経営司令塔に反映", "ループのスタートに戻る"],
              },
            ]}
            mock={<MockStep4 />}
            isLast
          />
        </div>
      </Section>

      {/* ====================== SECTION 3 — 効果計測 ====================== */}
      <Section>
        <SectionHeader
          eyebrow="MEASUREMENT"
          title="4 週間後、効果を統計検定で証明"
          description="「効いた気がする」では、経営報告に出せない。"
        />

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <MeasureCard
            icon={<ChartBar className="w-5 h-5" />}
            tone="blue"
            title="対照群比較 (DiD)"
            body="Difference-in-Differences で介入効果を抽出。介入前後 × 対照/処置の 2x2 で純粋効果を取り出す。"
          />
          <MeasureCard
            icon={<Calculator className="w-5 h-5" />}
            tone="purple"
            title="統計的有意 (p<0.05)"
            body="Welch's t-test と bootstrap CI (1000 回) で、効果が偶然ではないことを保証する。"
          />
          <MeasureCard
            icon={<TrendingUp className="w-5 h-5" />}
            tone="emerald"
            title="円換算インパクト"
            body="廃棄削減 / 欠品削減 / 人件費 / 機会損失をすべて円で集計。年間換算して経営報告。"
          />
        </div>

        {/* formula card */}
        <div className="max-w-4xl mx-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] tracking-[0.18em] uppercase text-white/45 font-bold">FORMULA</span>
            <span className="text-[10px] text-white/30 font-mono">// Difference-in-Differences</span>
          </div>
          <pre className="font-mono text-[12px] lg:text-[13px] text-white/75 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`delta = (intervention_target - baseline_target)
      - (intervention_control - baseline_control)

annualized_impact = delta * 365 * store_count * marginal_margin`}
          </pre>
        </div>
      </Section>

      {/* ====================== SECTION 4 — 1 ループの中身 (timeline) ====================== */}
      <Section>
        <SectionHeader
          eyebrow="28-DAY LOOP"
          title="1 ループに何が起こっているか"
          description="Day 1 から Day 28 まで、毎週やることが決まっている。"
        />

        <div className="relative">
          {/* horizontal track for desktop */}
          <div className="hidden md:block absolute left-0 right-0 top-[34px] h-px bg-gradient-to-r from-purple-400/40 via-blue-400/40 to-emerald-400/40" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <TimelineWeek week="W1-2" tone="purple" title="ベースライン期間" body="KPI 集計、対照群選定、計測点を固定" />
            <TimelineWeek week="W3-4" tone="blue" title="介入実施" body="施策配布 + 日次モニタリング、現場コメント収集" />
            <TimelineWeek week="W5-6" tone="amber" title="効果計測中間" body="DiD 中間結果、ノイズ要因の分離、必要なら追加投入" />
            <TimelineWeek week="W7" tone="emerald" title="仮説検証" body="統計的有意の確認、bootstrap CI、円換算ロジックの確定" />
            <TimelineWeek week="W8" tone="emerald" title="経営報告" body="サマリ + 詳細分析 + 本展開ロードマップ提案" />
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 5 — Demo Video Placeholder ====================== */}
      <Section>
        <SectionHeader eyebrow="LIVE DEMO" title="実際の画面を見る" />

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl border border-white/[0.06] bg-black overflow-hidden aspect-video flex items-center justify-center group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_60%)]" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors">
                <PlayCircle className="w-9 h-9 text-white/80" />
              </div>
              <div className="text-center">
                <div className="text-[15px] text-white/85 font-medium">28 秒のフルデモ</div>
                <div className="text-[12px] text-white/45 mt-1 font-mono">detection → distribution → execution → write-back</div>
              </div>
            </div>
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-[10px] tracking-[0.16em] uppercase text-amber-400 font-bold">
              <Clock className="w-3 h-3" />
              準備中
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="text-[14px] text-white/65">今すぐ実機を触りたい方</div>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              デモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 6 — Final CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight max-w-4xl mx-auto">
            あなたのチェーンでも、<br className="hidden sm:block" />
            <span className="gradient-text">24 時間で 1 ループ</span>が回り始めます
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              デモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/poc"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              8週POC 提案書
            </Link>
          </div>

          <p className="mt-12 text-[12px] text-white/35">
            POC 期間中いつでも中止可能、データは顧客環境に残る。
          </p>
        </div>
      </section>
    </>
  )
}

/* ====================== sub components ====================== */

const TONE_RING: Record<"purple" | "blue" | "amber" | "emerald", string> = {
  purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
  blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
  amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
}

const TONE_TEXT: Record<"purple" | "blue" | "amber" | "emerald", string> = {
  purple: "text-purple-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
}

const TONE_BG: Record<"purple" | "blue" | "amber" | "emerald", string> = {
  purple: "bg-purple-400",
  blue: "bg-blue-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
}

function LoopReasonCard({
  step,
  tone,
  text,
}: {
  step: string
  tone: "purple" | "blue" | "emerald"
  text: string
}) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <span className={cn("font-mono text-[11px] tracking-[0.18em] font-bold", TONE_TEXT[tone])}>
          STEP {step}
        </span>
        <span className={cn("w-2 h-2 rounded-full", TONE_BG[tone])} />
      </div>
      <p className="text-[14px] lg:text-[15px] text-white/80 leading-relaxed flex-1">{text}</p>
    </div>
  )
}

function StepCard({
  order,
  time,
  tone,
  icon,
  title,
  subtitle,
  details,
  mock,
  isLast,
}: {
  order: string
  time: string
  tone: "purple" | "blue" | "amber" | "emerald"
  icon: React.ReactNode
  title: string
  subtitle: string
  details: { label: string; items: string[] }[]
  mock: React.ReactNode
  isLast?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-8">
        {/* header */}
        <div className="grid lg:grid-cols-[auto_1fr_auto] gap-4 lg:gap-6 items-start mb-6">
          <div className={cn("font-mono text-5xl lg:text-6xl font-bold leading-none", TONE_TEXT[tone])}>
            {order}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono",
                  TONE_RING[tone]
                )}
              >
                {icon}
                <span>[{time}]</span>
              </span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-bold text-white/95 leading-tight">{title}</h3>
            <p className="mt-2 text-[14px] lg:text-[15px] text-white/60 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* body: details + mock */}
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* details (3 cols) */}
          <div className="lg:col-span-3 grid sm:grid-cols-3 gap-3">
            {details.map((d) => (
              <div
                key={d.label}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className={cn("text-[10px] tracking-[0.16em] uppercase font-bold mb-2.5", TONE_TEXT[tone])}>
                  {d.label}
                </div>
                <ul className="space-y-1.5">
                  {d.items.map((it) => (
                    <li key={it} className="text-[12px] text-white/65 flex items-start gap-1.5 leading-relaxed">
                      <span className={cn("shrink-0 mt-1.5 w-1 h-1 rounded-full", TONE_BG[tone])} />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* mock (2 cols) */}
          <div className="lg:col-span-2">{mock}</div>
        </div>
      </div>

      {/* connector */}
      {!isLast && (
        <div className="flex justify-center py-3">
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-white/0" />
        </div>
      )}
    </motion.div>
  )
}

/* ===== Mock UIs ===== */

function MockStep1() {
  return (
    <div className="rounded-lg border border-purple-400/15 bg-[#0d0d12] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-medium text-white/85">#aentro-alerts</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">03:14</span>
      </div>
      <div className="space-y-2">
        <div className="text-[12px] text-white/85 leading-relaxed">
          すき家 <span className="font-mono text-purple-300">142店</span>（首都圏）で深夜帯人時売上が予測比 <span className="font-mono text-amber-400">-8.2%</span>
        </div>
        <div className="rounded-md bg-white/[0.025] border border-white/[0.04] px-3 py-2 space-y-1.5">
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-purple-300 font-medium">原因仮説:</span> シフト過剰配置（雨予報日に通常シフト継続）
          </div>
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-amber-300 font-medium">影響:</span> 月間 <span className="font-mono text-white/85">¥4.2M</span> の機会損失
          </div>
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-emerald-300 font-medium">推奨:</span> SV ミッション緊急配布
          </div>
        </div>
      </div>
    </div>
  )
}

function MockStep2() {
  const sv = [
    { name: "山田 SV", store: "渋谷駅前店", impact: "¥1.2M", priority: "P0", assigned: true },
    { name: "鈴木 SV", store: "新宿東口店", impact: "¥0.9M", priority: "P0", assigned: true },
    { name: "田中 SV", store: "池袋西口店", impact: "¥0.7M", priority: "P1", assigned: true },
    { name: "佐藤 SV", store: "横浜西口店", impact: "¥0.8M", priority: "P1", assigned: true },
    { name: "高橋 SV", store: "上野中央店", impact: "¥0.6M", priority: "P2", assigned: true },
  ]
  return (
    <div className="rounded-lg border border-blue-400/15 bg-[#0d0d12] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-medium text-white/85">SV ミッション配布</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">07:30</span>
      </div>
      <div className="space-y-1.5">
        {sv.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/[0.025] border border-white/[0.04]"
          >
            <span className="font-mono text-[9px] text-blue-400 w-6">{s.priority}</span>
            <span className="text-[11px] text-white/80 truncate flex-1 min-w-0">
              {s.name} <span className="text-white/40">/ {s.store}</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400">{s.impact}</span>
            {s.assigned && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function MockStep3() {
  return (
    <div className="rounded-lg border border-amber-400/15 bg-[#0d0d12] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-medium text-white/85">店舗実行ログ</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">14:42</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <ChecklistRow status="done" label="渋谷駅前店 シフト最適化完了" by="山田 SV" />
        <ChecklistRow status="done" label="新宿東口店 完了" by="鈴木 SV" />
        <ChecklistRow status="progress" label="池袋西口店 進行中" by="田中 SV" />
      </div>
      <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
        <div className="text-[9px] tracking-[0.14em] uppercase text-white/40 font-bold mb-1">現場コメント</div>
        <p className="text-[11px] text-white/70 leading-relaxed italic">
          「深夜帯のホールスタッフを 1 名減、レジは券売機誘導に切替。客数影響なし。」
        </p>
      </div>
    </div>
  )
}

function MockStep4() {
  return (
    <div className="rounded-lg border border-emerald-400/15 bg-[#0d0d12] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-white/85">書き戻しキュー</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">03:00 (翌)</span>
      </div>
      <div className="space-y-1.5">
        <WriteBackRow
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          text="シフト変更 142 件承認済"
          system="KING OF TIME"
        />
        <WriteBackRow
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          text="在庫補充 23 件"
          system="スマレジ POS"
        />
        <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-emerald-500/[0.06] border border-emerald-400/15 mt-2">
          <Repeat className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.14em] uppercase text-emerald-400 font-bold">翌日の経営司令塔</div>
            <div className="text-[11px] text-white/85 mt-0.5">
              改善効果 <span className="font-mono text-emerald-300">¥4.2M</span> 検出
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistRow({
  status,
  label,
  by,
}: {
  status: "done" | "progress"
  label: string
  by: string
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-white/[0.025] border border-white/[0.04]">
      {status === "done" ? (
        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
      )}
      <span className="text-[11px] text-white/80 truncate flex-1">{label}</span>
      <span className="text-[10px] text-white/40 font-mono shrink-0">{by}</span>
    </div>
  )
}

function WriteBackRow({
  icon,
  text,
  system,
}: {
  icon: React.ReactNode
  text: string
  system: string
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/[0.025] border border-white/[0.04]">
      {icon}
      <span className="text-[11px] text-white/80 truncate flex-1">{text}</span>
      <span className="text-[10px] text-white/45 font-mono shrink-0">→ {system}</span>
    </div>
  )
}

function MeasureCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode
  tone: "purple" | "blue" | "emerald"
  title: string
  body: string
}) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7 h-full flex flex-col">
      <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center mb-5", TONE_RING[tone])}>
        {icon}
      </div>
      <h3 className="text-[17px] font-bold text-white/95 mb-2">{title}</h3>
      <p className="text-[13px] text-white/65 leading-relaxed">{body}</p>
      <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center gap-1.5 text-[11px] text-white/40">
        <ShieldCheck className="w-3 h-3" />
        統計的に保証
      </div>
    </div>
  )
}

const TONE_BORDER: Record<"purple" | "blue" | "amber" | "emerald", string> = {
  purple: "border-purple-400/40",
  blue: "border-blue-400/40",
  amber: "border-amber-400/40",
  emerald: "border-emerald-400/40",
}

function TimelineWeek({
  week,
  tone,
  title,
  body,
}: {
  week: string
  tone: "purple" | "blue" | "amber" | "emerald"
  title: string
  body: string
}) {
  return (
    <div className="relative">
      {/* dot */}
      <div className="hidden md:flex justify-center mb-4 relative z-10">
        <div
          className={cn(
            "w-4 h-4 rounded-full border-2 bg-bg-primary flex items-center justify-center",
            TONE_BORDER[tone]
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", TONE_BG[tone])} />
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 lg:p-5 h-full">
        <div className={cn("font-mono text-[11px] tracking-[0.16em] font-bold mb-2", TONE_TEXT[tone])}>
          {week}
        </div>
        <h4 className="text-[14px] font-bold text-white/95 mb-2 leading-snug">{title}</h4>
        <p className="text-[12px] text-white/60 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}
