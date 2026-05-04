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
              AI が <span className="gradient-text">毎日、現場まで</span>動かします
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-white/65 leading-relaxed max-w-3xl">
              AI が毎晩データをチェックし、朝には経営陣のスマホに「今日改善すべきこと」が届きます。承認すると現場で実行され、翌朝にはどれだけ効いたかが確認できます。このページでは、その 1 日の流れを 4 ステップで紹介します。
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ====================== SECTION 1 — Why Loop ====================== */}
      <Section>
        <SectionHeader eyebrow="THE LOOP" title="なぜ &quot;毎日回す&quot; ことが大事なのか" />

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
              text="経営会議で決めた施策が現場で実行されるまで、ふつうは何週間もかかる。その間に天気もお客様の動きも変わってしまう。"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <LoopReasonCard
              step="02"
              tone="blue"
              text="このサイクルを 1 ヶ月ではなく、毎日 24 時間で回せると、判断と現場の差が消えていく。"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <LoopReasonCard
              step="03"
              tone="emerald"
              text="AENTRO はこの流れを AI で自動化し、経営層の判断を最短で現場に届けます。"
            />
          </motion.div>
        </motion.div>
      </Section>

      {/* ====================== SECTION 2 — 4 Step Detail ====================== */}
      <Section>
        <SectionHeader
          eyebrow="4 STEPS"
          title="1 日の中で起きていること"
          description="見つける → 届ける → 実行する → 確かめる。経営層がやることは &quot;やる / やらない&quot; を押すだけ。"
        />

        <div className="space-y-6">
          {/* Step 1 */}
          <StepCard
            order="01"
            time="深夜 3 時ごろ"
            tone="purple"
            icon={<Sparkles className="w-5 h-5" />}
            title="AI が問題を見つける（夜中のうちに）"
            subtitle="経営層が出社する前に、Slack でお知らせが届く"
            details={[
              {
                label: "何を見ているか",
                items: ["数字のいつもとの違い", "データの取り込みエラー", "お客様のレビュー", "在庫の残り具合"],
              },
              {
                label: "見つけ方",
                items: ["過去のデータと比べていつもと違う動きを見つける", "外食でよくあるパターンから原因を推測", "AI がもっとも可能性の高い原因を絞り込む"],
              },
              {
                label: "動くタイミング",
                items: ["毎晩自動で実行", "重要なことが起きたら即時", "Slack に自動でお知らせ"],
              },
            ]}
            mock={<MockStep1 />}
          />

          {/* Step 2 */}
          <StepCard
            order="02"
            time="朝 7 時 30 分ごろ"
            tone="blue"
            icon={<Smartphone className="w-5 h-5" />}
            title="担当者のスマホに届く（朝）"
            subtitle="経営層が承認するだけで、5 人の SV のスマホにすぐ届く"
            details={[
              {
                label: "届け方",
                items: ["Slack（個別メッセージ + チャンネル）", "メール", "iOS アプリの通知"],
              },
              {
                label: "順番の付け方",
                items: ["効果が大きい順に並べる", "SV の担当エリアで絞り込む", "回りやすい順路に並び替え"],
              },
              {
                label: "届く中身",
                items: ["なぜ訪問するのか", "改善できる金額（円）", "現場で使えるチェックリスト"],
              },
            ]}
            mock={<MockStep2 />}
          />

          {/* Step 3 */}
          <StepCard
            order="03"
            time="日中"
            tone="amber"
            icon={<Building2 className="w-5 h-5" />}
            title="店舗で実行する（日中）"
            subtitle="143 店舗で完了報告と、現場の声を記録"
            details={[
              {
                label: "誰がやるか",
                items: ["SV（エリア責任者）", "店長（店舗責任者）", "店舗スタッフ（実行する人）"],
              },
              {
                label: "報告内容",
                items: ["完了 / 効いた / 効かなかった", "現場の声（自由記入）", "写真の添付（任意）"],
              },
              {
                label: "AI の学習",
                items: ["現場の声をもとに次の提案を改善", "次回の精度に反映", "店舗ごとの傾向を覚えていく"],
              },
            ]}
            mock={<MockStep3 />}
          />

          {/* Step 4 */}
          <StepCard
            order="04"
            time="翌朝 3 時ごろ"
            tone="emerald"
            icon={<Database className="w-5 h-5" />}
            title="効果を確かめる（翌朝）"
            subtitle="承認したシフト変更を勤怠 / POS に反映、どれだけ効いたかを再計測"
            details={[
              {
                label: "反映のしかた",
                items: ["必ず承認してから反映", "まず一部の店から（5% → 100%）", "やめたい時はすぐ戻せる"],
              },
              {
                label: "記録",
                items: ["全ての操作を記録", "誰が / いつ / 何をしたか", "後から書き換えできない形で保管"],
              },
              {
                label: "効果の再計測",
                items: ["効果を円で計算", "翌朝の経営レポートに自動で反映", "また次の 1 日が始まる"],
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
          title="4 週間後、効果を数字で証明"
          description="「効いた気がする」では、経営報告には出せません。"
        />

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <MeasureCard
            icon={<ChartBar className="w-5 h-5" />}
            tone="blue"
            title="他の店と比べて確認する"
            body="施策をやった店と、やっていない店を比べることで「本当にこの施策が効いたのか」を取り出します。"
          />
          <MeasureCard
            icon={<Calculator className="w-5 h-5" />}
            tone="purple"
            title="偶然ではないと言える基準"
            body="ちゃんと統計で確認するので、たまたま運が良かっただけ、では出さない。確かに効いた、と言える数字だけを報告します。"
          />
          <MeasureCard
            icon={<TrendingUp className="w-5 h-5" />}
            tone="emerald"
            title="年間でいくら効くか"
            body="廃棄削減 / 欠品削減 / 人件費 / 機会損失の合計を、年間でいくらになるかを円で計算。経営報告に使える形にまとめます。"
          />
        </div>

        {/* explanation card */}
        <div className="max-w-4xl mx-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] tracking-[0.18em] uppercase text-white/45 font-bold">計算の考え方</span>
          </div>
          <div className="text-[13px] lg:text-[14px] text-white/75 leading-relaxed space-y-3">
            <p>
              施策をやった店の「やる前 → やった後」の変化から、施策をやっていない店の「同じ期間の自然な変化」を引きます。これで、季節や天気など他の影響を取り除いた「施策だけの効果」が分かります。
            </p>
            <p>
              そこに 365 日分 × 店舗数 × 利益率を掛けて、「年間でいくら得をするか」を円で出します。
            </p>
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 4 — 1 ループの中身 (timeline) ====================== */}
      <Section>
        <SectionHeader
          eyebrow="8 WEEKS"
          title="お試し導入 8 週間でやること"
          description="1 週目から 8 週目まで、毎週やることが決まっています。"
        />

        <div className="relative">
          {/* horizontal track for desktop */}
          <div className="hidden md:block absolute left-0 right-0 top-[34px] h-px bg-gradient-to-r from-purple-400/40 via-blue-400/40 to-emerald-400/40" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <TimelineWeek week="1-2 週目" tone="purple" title="今の数字を確認する期間" body="今の売上や人件費を集計し、比べる対象の店舗を決め、計測する点を固定します。" />
            <TimelineWeek week="3-4 週目" tone="blue" title="改善策を試す" body="施策を現場に配り、毎日の数字を見ながら、現場の声も集めていきます。" />
            <TimelineWeek week="5-6 週目" tone="amber" title="効いているか確認（途中）" body="比べて出た途中の効果を見て、天気や曜日の影響を分け、必要なら追加で打ち手を入れます。" />
            <TimelineWeek week="7 週目" tone="emerald" title="もっと効くようにチューニング" body="偶然ではなく確かに効いたかを確認し、円でいくらの効果かを確定させます。" />
            <TimelineWeek week="8 週目" tone="emerald" title="結果をまとめて経営報告" body="まとめ + 詳しい分析 + これからの展開計画を提案します。" />
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
                <div className="text-[15px] text-white/85 font-medium">28 秒の動画デモ</div>
                <div className="text-[12px] text-white/45 mt-1">見つける → 届ける → 実行する → 確かめる</div>
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
            <span className="gradient-text">毎日のサイクル</span>が回り始めます
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
              8 週間お試し導入の提案書
            </Link>
          </div>

          <p className="mt-12 text-[12px] text-white/35">
            お試し期間中はいつでも中止できます。データはお客様の環境に残ります。
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
          <span className="text-[11px] font-medium text-white/85">#aentro-お知らせ</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">03:14</span>
      </div>
      <div className="space-y-2">
        <div className="text-[12px] text-white/85 leading-relaxed">
          すき家 <span className="font-mono text-purple-300">142 店</span>（首都圏）で深夜帯の人時売上が予測より <span className="font-mono text-amber-400">8.2% 低い</span>
        </div>
        <div className="rounded-md bg-white/[0.025] border border-white/[0.04] px-3 py-2 space-y-1.5">
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-purple-300 font-medium">考えられる原因:</span> シフトを入れすぎ（雨予報の日もいつも通りのシフト）
          </div>
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-amber-300 font-medium">このままだと:</span> 月 <span className="font-mono text-white/85">420 万円</span>の売上機会を失う
          </div>
          <div className="text-[11px] text-white/65 leading-relaxed">
            <span className="text-emerald-300 font-medium">すべきこと:</span> SV にすぐに連絡
          </div>
        </div>
      </div>
    </div>
  )
}

function MockStep2() {
  const sv = [
    { name: "山田 SV", store: "渋谷駅前店", impact: "120 万円", priority: "高", assigned: true },
    { name: "鈴木 SV", store: "新宿東口店", impact: "90 万円", priority: "高", assigned: true },
    { name: "田中 SV", store: "池袋西口店", impact: "70 万円", priority: "中", assigned: true },
    { name: "佐藤 SV", store: "横浜西口店", impact: "80 万円", priority: "中", assigned: true },
    { name: "高橋 SV", store: "上野中央店", impact: "60 万円", priority: "低", assigned: true },
  ]
  return (
    <div className="rounded-lg border border-blue-400/15 bg-[#0d0d12] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-medium text-white/85">SV へのお願いを配布</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">07:30</span>
      </div>
      <div className="space-y-1.5">
        {sv.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/[0.025] border border-white/[0.04]"
          >
            <span className="text-[9px] text-blue-400 w-6 shrink-0">{s.priority}</span>
            <span className="text-[11px] text-white/80 truncate flex-1 min-w-0">
              {s.name} <span className="text-white/40">/ {s.store}</span>
            </span>
            <span className="text-[10px] text-emerald-400 shrink-0">{s.impact}</span>
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
          <span className="text-[11px] font-medium text-white/85">店舗からの報告</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">14:42</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <ChecklistRow status="done" label="渋谷駅前店 シフト見直し完了" by="山田 SV" />
        <ChecklistRow status="done" label="新宿東口店 完了" by="鈴木 SV" />
        <ChecklistRow status="progress" label="池袋西口店 作業中" by="田中 SV" />
      </div>
      <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
        <div className="text-[9px] tracking-[0.14em] uppercase text-white/40 font-bold mb-1">現場の声</div>
        <p className="text-[11px] text-white/70 leading-relaxed italic">
          「深夜帯のホールスタッフを 1 名減らし、レジは券売機にお客様を誘導。お客様の数に影響なし。」
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
          <span className="text-[11px] font-medium text-white/85">勤怠 / POS への反映</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">翌 03:00</span>
      </div>
      <div className="space-y-1.5">
        <WriteBackRow
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          text="シフト変更 142 件 承認済み"
          system="勤怠管理システム"
        />
        <WriteBackRow
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          text="在庫の追加発注 23 件"
          system="POS（販売管理システム）"
        />
        <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-emerald-500/[0.06] border border-emerald-400/15 mt-2">
          <Repeat className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.14em] uppercase text-emerald-400 font-bold">翌朝の経営レポート</div>
            <div className="text-[11px] text-white/85 mt-0.5">
              改善効果 <span className="font-mono text-emerald-300">420 万円</span> を確認
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
        数字でしっかり確認
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
