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

const VENDORS = ["AENTRO", "NTTデータ", "SAP", "Tableau", "Smaregi BI"] as const

type Row = { feature: string; cells: Cell[]; group: "feature" | "meta" }

const ROWS: Row[] = [
  {
    group: "feature",
    feature: "外食特化機能",
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
    feature: "複数 POS 統合",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "partial" },
      { mark: "no" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "AI Native",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "partial", note: "addon" },
      { mark: "partial", note: "limited" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "8週POC可能",
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
    feature: "既存システム非置換",
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
    feature: "日本労働基準法対応",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "manual" },
      { mark: "partial", note: "addon" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "HACCP 標準対応",
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
    feature: "FC ロイヤリティ計算",
    cells: [
      { mark: "yes" },
      { mark: "no" },
      { mark: "partial", note: "config" },
      { mark: "no" },
      { mark: "no" },
    ],
  },
  {
    group: "feature",
    feature: "商圏 Huff モデル",
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
    feature: "書き戻し対応",
    cells: [
      { mark: "yes" },
      { mark: "partial", note: "custom dev" },
      { mark: "no" },
      { mark: "no" },
      { mark: "yes" },
    ],
  },
  {
    group: "feature",
    feature: "専用 VPC",
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
    feature: "月次 ROI 証明",
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
    feature: "学習コスト",
    cells: [
      { mark: "text", text: "1 day" },
      { mark: "text", text: "weeks" },
      { mark: "text", text: "months" },
      { mark: "text", text: "weeks" },
      { mark: "text", text: "1 day" },
    ],
  },
  {
    group: "meta",
    feature: "価値創出期間",
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
    feature: "想定年間コスト",
    cells: [
      { mark: "text", text: "¥240M" },
      { mark: "text", text: "¥800M〜" },
      { mark: "text", text: "¥500M〜" },
      { mark: "text", text: "¥10-50M" },
      { mark: "text", text: "¥3-10M" },
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
              何が違うのか、<span className="gradient-text">12 機能で比較。</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-white/65 leading-relaxed max-w-3xl">
              外食業界で AENTRO がどのポジションにあるか、客観的に並べます。
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
          <LegendItem icon={<Minus className="w-3.5 h-3.5 text-amber-400" />} label="部分 / addon / 設定次第" />
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
          ※ 想定年間コストは公開価格 / 業界一般情報からの推定。実際の見積は各社にご確認ください。
        </p>
      </Section>

      {/* ====================== SECTION 2: なぜ AENTRO か ====================== */}
      <Section>
        <SectionHeader eyebrow="DIFFERENTIATION" title="AENTRO の差別化ポイント" />

        <div className="grid md:grid-cols-2 gap-5">
          <DiffCard
            icon={<Layers className="w-5 h-5" />}
            tone="blue"
            title="外食特化 100+ KPI"
            body="HACCP / レシピ BOM / FC 会計 / 商圏 Huff / シフト法令対応など、外食ドメインに必要な指標を標準搭載。"
          />
          <DiffCard
            icon={<Sparkles className="w-5 h-5" />}
            tone="purple"
            title="Claude 統合 AI"
            body="11 tools が実 DB を読み取り、日本語で経営判断を補助。要約だけでなく根拠付きの提案を返します。"
          />
          <DiffCard
            icon={<CalendarCheck className="w-5 h-5" />}
            tone="amber"
            title="8 週間で証明"
            body="統計検定 (DiD + p<0.05) と円換算で「効いた」を客観化。経営層が見える効果を最短で。"
          />
          <DiffCard
            icon={<Network className="w-5 h-5" />}
            tone="emerald"
            title="既存非置換"
            body="POS / 勤怠 / 物流 / 会計はそのまま。read-only から開始し、書き戻しも承認制。リスクなし。"
          />
        </div>
      </Section>

      {/* ====================== SECTION 3: 他社にできないこと ====================== */}
      <Section>
        <SectionHeader
          eyebrow="GAPS"
          title="他社にできないこと"
          description="競合各社の強みは尊重しつつ、外食大手の経営課題に届かない構造的理由を整理します。"
        />

        <div className="grid md:grid-cols-2 gap-5">
          <GapCard
            icon={<Building2 className="w-5 h-5" />}
            tone="amber"
            label="A"
            heading="NTT データ / 大手 SI"
            points={[
              "外食ドメイン知識が限定的、ヒアリング工数が大きくなりがち",
              "AI は OpenAI 等に外注するケースが多く、データ取扱いが不透明",
              "受託開発主体のため、長期的にベンダーロックインに繋がりやすい",
            ]}
            dilemma="顧客のジレンマ：要件を整理する工程に半年、効果が見える前に予算が尽きる。"
          />
          <GapCard
            icon={<Server className="w-5 h-5" />}
            tone="purple"
            label="B"
            heading="SAP / Oracle"
            points={[
              "外食特化機能 (HACCP / レシピ BOM 等) が標準で存在せず addon が必要",
              "ERP 思想で「全社移行」前提のため、置換コストが膨大",
              "経営層が見える効果まで 1〜2 年かかるケースが多い",
            ]}
            dilemma="顧客のジレンマ：基幹を入れ替える覚悟が要る。POC の範囲で証明しづらい。"
          />
          <GapCard
            icon={<BarChart3 className="w-5 h-5" />}
            tone="blue"
            label="C"
            heading="Tableau / Power BI"
            points={[
              "可視化のみ。データ統合 / オントロジーは別途構築が必要",
              "AI は Pulse / Copilot 程度で tool use なし、書き戻しもなし",
              "「ダッシュボード」止まりで、現場アクションには直結しない",
            ]}
            dilemma="顧客のジレンマ：見える化はできた、でも誰がいつ動くかは別問題。"
          />
          <GapCard
            icon={<Database className="w-5 h-5" />}
            tone="emerald"
            label="D"
            heading="Air レジ / スマレジ BI"
            points={[
              "単一 POS のみ対応、複数 POS / 勤怠 / 物流の横断統合は不可",
              "売上 KPI が中心で、勤怠・物流・FC 会計までは対象外",
              "中小チェーン向けに最適化されており、年商 1,000 億超では機能不足",
            ]}
            dilemma="顧客のジレンマ：単一ブランドでは便利だが、HD 全体の経営判断には届かない。"
          />
        </div>
      </Section>

      {/* ====================== SECTION 4: ポジションステートメント ====================== */}
      <Section>
        <SectionHeader eyebrow="POSITION" title="AENTRO のポジション" center />

        <div className="max-w-3xl mx-auto rounded-xl border border-white/[0.08] bg-gradient-to-b from-blue-500/[0.04] to-white/[0.01] p-8 lg:p-10">
          <p className="text-[15px] lg:text-[16px] text-white/85 leading-[1.85]">
            AENTRO は<span className="text-white/95 font-bold">既存システムを置き換えるソリューションではありません。</span>
            <br />
            <br />
            POS（スマレジ / Airレジ / 自社）、勤怠（KING OF TIME 等）、物流、会計をすべて
            <span className="text-emerald-300 font-medium"> read-only </span>
            で接続し、外食業界の経営判断に必要な
            <span className="text-blue-300 font-medium"> KPI・効果計測・AI 提案 </span>
            を上位レイヤーとして提供します。
            <br />
            <br />
            既存 IT 部門の役割を奪わず、むしろ既存システムから引き出せる経営価値を
            <span className="text-white/95 font-bold">最大化する加速装置</span>
            として機能します。
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
              <Download className="w-4 h-4" />
              比較資料 (PDF) ダウンロード
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
          DILEMMA
        </div>
        <p className="text-[12px] text-white/55 leading-relaxed italic">{dilemma}</p>
      </div>
    </div>
  )
}
