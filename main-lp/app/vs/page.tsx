"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  X,
  Minus,
  Download,
  Building2,
  Database,
  BarChart3,
  Server,
  Sparkles,
  ShieldCheck,
  Layers,
  CalendarCheck,
  Network,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

type Cell =
  | { mark: "yes" }
  | { mark: "partial"; note?: string }
  | { mark: "no"; note?: string }
  | { mark: "text"; text: string }

const VENDORS = ["AENTRO", "大手 SI 受託", "業務統合システム", "BI ツール", "POS 直結 BI"] as const

type Row = { feature: string; cells: Cell[]; group: "feature" | "meta" }

const ROWS: Row[] = [
  {
    group: "feature",
    feature: "外食専用の機能",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
      { mark: "partial", note: "POS のみ" },
    ],
  },
  {
    group: "feature",
    feature: "複数 POS をまとめる",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "部分対応" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "AI が最初から使える",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "partial", note: "追加機能" },
      { mark: "partial", note: "限定的" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "8 週間でお試し",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "yes" },
      { mark: "yes" },
    ],
  },
  {
    group: "feature",
    feature: "今のシステムを置換えない",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "yes" },
      { mark: "yes" },
    ],
  },
  {
    group: "feature",
    feature: "日本の労働法対応",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "手作業" },
      { mark: "partial", note: "追加機能" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "HACCP（食品衛生）対応",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "FC（フランチャイズ）手数料計算",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "partial", note: "設定変更" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "出店候補地の集客予測",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "結果を POS に反映",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "個別開発" },
      { mark: "no" },
      { mark: "no" },
      { mark: "yes" },
    ],
  },
  {
    group: "feature",
    feature: "専用クラウド",
    cells: [
      { mark: "yes" },
      { mark: "yes" },
      { mark: "yes" },
      { mark: "yes" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "毎月の効果を証明",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "meta",
    feature: "習得にかかる時間",
    cells: [
      { mark: "text", text: "1 日" },
      { mark: "text", text: "数週間" },
      { mark: "text", text: "数ヶ月" },
      { mark: "text", text: "数週間" },
      { mark: "text", text: "1 日" },
    ],
  },
  {
    group: "meta",
    feature: "効果が出るまでの期間",
    cells: [
      { mark: "text", text: "8 週間" },
      { mark: "text", text: "12-18ヶ月" },
      { mark: "text", text: "12-24ヶ月" },
      { mark: "text", text: "3-6ヶ月" },
      { mark: "text", text: "1 ヶ月" },
    ],
  },
  {
    group: "meta",
    feature: "想定年間費用",
    cells: [
      { mark: "text", text: "2 億 4 千万円" },
      { mark: "text", text: "8 億円〜" },
      { mark: "text", text: "5 億円〜" },
      { mark: "text", text: "1,000 万〜5,000 万円" },
      { mark: "text", text: "300〜1,000 万円" },
    ],
  },
]

export default function VsPage() {
  return (
    <>
      {/* ====================== HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-20 lg:pt-28 pb-16 lg:pb-20">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
                COMPARISON
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]"
            >
              他のシステムとどう違うか、<span className="gradient-text">12 項目で並べました</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-white/65 leading-relaxed max-w-3xl">
              煽らず、事実だけ並べます。最終判断は貴社で。
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ====================== SECTION 1: 比較表 ====================== */}
      <Section>
        <SectionHeader
          eyebrow="MATRIX"
          title="12 機能 × 5 ベンダー比較"
          description="公開資料および業界一般理解に基づく。実際の最新機能は各社製品サイトで確認推奨。"
        />

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-[12px] text-white/60">
          <LegendItem icon={<Check className="w-3.5 h-3.5 text-emerald-400" />} label="標準対応" />
          <LegendItem icon={<Minus className="w-3.5 h-3.5 text-amber-400" />} label="部分対応 / 追加機能 / 設定次第" />
          <LegendItem icon={<X className="w-3.5 h-3.5 text-red-400/80" />} label="非対応" />
        </div>

        {/* Table - desktop & tablet horizontal scroll, first column sticky */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                  <th className="sticky left-0 z-10 bg-[#0d1118] text-left px-4 lg:px-5 py-4 text-[11px] uppercase tracking-[0.14em] text-white/45 font-bold border-r border-white/[0.06]">
                    機能
                  </th>
                  {VENDORS.map((v, i) => (
                    <th
                      key={v}
                      className={cn(
                        "px-4 lg:px-5 py-4 text-[12px] uppercase tracking-[0.12em] font-bold whitespace-nowrap text-center",
                        i === 0
                          ? "text-blue-300 bg-blue-500/[0.04] border-x border-blue-400/15"
                          : "text-white/55"
                      )}
                    >
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, rIdx) => {
                  const isMetaFirst = row.group === "meta" && rIdx > 0 && ROWS[rIdx - 1].group !== "meta"
                  return (
                    <tr
                      key={row.feature}
                      className={cn(
                        "transition-colors",
                        isMetaFirst && "border-t-2 border-white/[0.08]",
                        row.group === "meta" ? "bg-white/[0.012]" : "hover:bg-white/[0.015]",
                        rIdx !== ROWS.length - 1 && "border-b border-white/[0.04]"
                      )}
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-10 bg-[#0d1118] px-4 lg:px-5 py-3.5 text-white/85 font-medium border-r border-white/[0.06] whitespace-nowrap",
                          row.group === "meta" && "text-[12px] uppercase tracking-[0.12em] text-white/55 font-bold"
                        )}
                      >
                        {row.feature}
                      </td>
                      {row.cells.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={cn(
                            "px-4 lg:px-5 py-3.5 text-center",
                            cIdx === 0 && "bg-blue-500/[0.04] border-x border-blue-400/15"
                          )}
                        >
                          <CellRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-white/35">
          ※ 想定年間費用は公開価格 / 業界一般情報からの推定。実際の見積は各社にご確認ください。
        </p>
      </Section>

      {/* ====================== SECTION 2: なぜ AENTRO か ====================== */}
      <Section>
        <SectionHeader eyebrow="DIFFERENTIATION" title="AENTRO の差別化ポイント" />

        <div className="grid md:grid-cols-2 gap-5">
          <DiffCard
            icon={<Layers className="w-5 h-5" />}
            tone="blue"
            title="外食専用の 100 以上の数字"
            body="HACCP（食品衛生）・レシピ原価・FC（フランチャイズ）会計・出店候補地の集客予測・労働法対応など、外食現場で必要な数字と業務を最初から備えています。"
          />
          <DiffCard
            icon={<Sparkles className="w-5 h-5" />}
            tone="purple"
            title="AI（Claude）統合、11 種類の業務を実データで"
            body="AI が貴社の実データを読み取り、日本語で経営判断を補助。要約だけでなく、根拠を添えた提案を返します。"
          />
          <DiffCard
            icon={<CalendarCheck className="w-5 h-5" />}
            tone="amber"
            title="8 週間で効いたかを統計で証明"
            body="統計の手法と円換算で「効いた」を客観的に示します。経営層にも「効果が出ている」と分かる形で、最短で証明します。"
          />
          <DiffCard
            icon={<Network className="w-5 h-5" />}
            tone="emerald"
            title="今のシステムは触らない、データを読むだけ。リスクなし"
            body="POS / 勤怠 / 物流 / 会計はそのまま。データを読むだけで始め、結果を POS に反映する場合も承認制。リスクはありません。"
          />
        </div>
      </Section>

      {/* ====================== SECTION 3: 他社にできないこと ====================== */}
      <Section>
        <SectionHeader
          eyebrow="GAPS"
          title="他社では届かない理由"
          description="競合各社の強みは尊重しつつ、外食大手の経営課題に届かない構造的理由を整理します。"
        />

        <div className="grid md:grid-cols-2 gap-5">
          <GapCard
            icon={<Building2 className="w-5 h-5" />}
            tone="amber"
            label="A"
            heading="大手 SI 受託"
            points={[
              "外食業界の細かい事情に詳しくない（ヒアリングに時間がかかる）",
              "AI 機能は他社（OpenAI 等）に外注しているので、データの扱いが見えにくい",
              "個別開発が中心で、後で他社に切り替えにくくなる",
            ]}
            dilemma="こういう会社で限界が出やすい：要件を整理する工程に半年、効果が見える前に予算が尽きる。"
          />
          <GapCard
            icon={<Server className="w-5 h-5" />}
            tone="purple"
            label="B"
            heading="海外の業務統合システム"
            points={[
              "外食専用の機能（HACCP・レシピ原価など）は標準で入っておらず、別売り",
              "業務統合システム（ERP）の発想なので、全社で移行するのが前提。導入コストが大きい",
              "経営層が「効いた」と感じるまで 1-2 年かかる",
            ]}
            dilemma="こういう会社で限界が出やすい：基幹を入れ替える覚悟が要る。お試しの範囲で証明しづらい。"
          />
          <GapCard
            icon={<BarChart3 className="w-5 h-5" />}
            tone="blue"
            label="C"
            heading="従来の BI ツール"
            points={[
              "グラフを描くのが得意。データの統合や整理は別の仕組みが必要",
              "AI 機能は基本的な質問応答止まり、業務システムは操作できない",
              "画面で見るだけで終わり、現場の改善行動までは運んでくれない",
            ]}
            dilemma="こういう会社で限界が出やすい：見える化はできた、でも誰がいつ動くかは別問題。"
          />
          <GapCard
            icon={<Database className="w-5 h-5" />}
            tone="emerald"
            label="D"
            heading="POS 直結の BI 機能"
            points={[
              "自社 POS にしか対応していない、複数の POS を 1 つにまとめられない",
              "売上の数字だけ。勤怠・物流・FC（フランチャイズ）の数字とは合わせられない",
              "中小チェーン向けで、年商 1,000 億円超の会社には機能が足りない",
            ]}
            dilemma="こういう会社で限界が出やすい：単一ブランドでは便利だが、HD 全体の経営判断には届かない。"
          />
        </div>
      </Section>

      {/* ====================== SECTION 4: ポジションステートメント ====================== */}
      <Section>
        <SectionHeader eyebrow="POSITION" title="AENTRO のポジション" center />

        <div className="max-w-3xl mx-auto rounded-xl border border-white/[0.08] bg-gradient-to-b from-blue-500/[0.04] to-white/[0.01] p-8 lg:p-10">
          <p className="text-[15px] lg:text-[16px] text-white/85 leading-[1.85]">
            AENTRO は<span className="text-white/95 font-bold">既存システムを置き換えるサービスではありません。</span>
            <br />
            <br />
            POS（各社の販売管理システム）、勤怠（各社の勤怠管理システム）、物流、会計をすべて
            <span className="text-emerald-300 font-medium"> データを読むだけ </span>
            で接続し、外食業界の経営判断に必要な
            <span className="text-blue-300 font-medium"> 数字・効果計測・AI 提案 </span>
            を上のレイヤーとして提供します。
            <br />
            <br />
            IT 部門の仕事を奪うのではなく、今あるシステムから経営判断に使える価値を引き出すための
            <span className="text-white/95 font-bold">「加速装置」</span>
            です。
          </p>
        </div>
      </Section>

      {/* ====================== SECTION 5: Final CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight max-w-4xl mx-auto">
            並べた事実を、<br className="hidden sm:block" />
            <span className="gradient-text">一冊にまとめてあります</span>
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/security"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              デモを依頼
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              デモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="mt-12 text-[12px] text-white/35 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            提供情報はすべて公開資料ベース、競合各社の最新機能は各社製品サイトでご確認ください
          </p>
        </div>
      </section>
    </>
  )
}

/* ====================== sub components ====================== */

function CellRender({ cell }: { cell: Cell }) {
  if (cell.mark === "yes") {
    return (
      <span className="inline-flex w-7 h-7 rounded-full items-center justify-center bg-emerald-500/15 border border-emerald-400/25">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </span>
    )
  }
  if (cell.mark === "partial") {
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        <span className="inline-flex w-7 h-7 rounded-full items-center justify-center bg-amber-500/15 border border-amber-400/25">
          <Minus className="w-3.5 h-3.5 text-amber-400" />
        </span>
        {cell.note && (
          <span className="text-[10px] text-amber-300/80 font-mono">{cell.note}</span>
        )}
      </div>
    )
  }
  if (cell.mark === "no") {
    return (
      <div className="inline-flex flex-col items-center gap-0.5">
        <span className="inline-flex w-7 h-7 rounded-full items-center justify-center bg-white/[0.03] border border-white/10">
          <X className="w-3.5 h-3.5 text-red-400/70" />
        </span>
        {cell.note && (
          <span className="text-[10px] text-white/35 font-mono">{cell.note}</span>
        )}
      </div>
    )
  }
  return (
    <span className="font-mono text-[12px] text-white/85 whitespace-nowrap">
      {cell.text}
    </span>
  )
}

function LegendItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span>{label}</span>
    </span>
  )
}

function DiffCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode
  tone: "blue" | "purple" | "amber" | "emerald"
  title: string
  body: string
}) {
  const toneCls = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7 hover:border-white/[0.12] transition-colors">
      <div className={cn("w-11 h-11 rounded-lg border flex items-center justify-center mb-5", toneCls)}>
        {icon}
      </div>
      <h3 className="text-[18px] font-bold text-white/95 mb-2">{title}</h3>
      <p className="text-[14px] text-white/65 leading-relaxed">{body}</p>
    </div>
  )
}

function GapCard({
  icon,
  tone,
  label,
  heading,
  points,
  dilemma,
}: {
  icon: React.ReactNode
  tone: "amber" | "purple" | "blue" | "emerald"
  label: string
  heading: string
  points: string[]
  dilemma: string
}) {
  const toneCls = {
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7 flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div className={cn("w-11 h-11 rounded-lg border flex items-center justify-center", toneCls)}>
          {icon}
        </div>
        <span className="font-mono text-[10px] tracking-[0.18em] text-white/35 font-bold">
          GAP {label}
        </span>
      </div>
      <h3 className="text-[17px] font-bold text-white/95 mb-4 leading-snug">{heading}</h3>
      <ul className="space-y-2.5 mb-5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-relaxed">
            <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-white/30" />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4 border-t border-white/[0.05]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">
          こういう会社で限界が出やすい
        </div>
        <p className="text-[12px] text-white/55 leading-relaxed italic">{dilemma}</p>
      </div>
    </div>
  )
}
