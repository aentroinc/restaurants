import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { ROICalculator } from "./roi-calculator"
import { FoldableMethod } from "./foldable-method"
import { CASES, CaseStudyCard } from "./cases"

export const metadata: Metadata = {
  title: "ROI と実績",
  description:
    "5 社累計 ¥32.1 億の改善実績。あなたのチェーンの想定改善額を試算します。対照群比較・統計検定・円換算で証明する 8 週間 POC。",
  openGraph: {
    title: "AENTRO Restaurant OS — ROI と実績",
    description:
      "5 社累計 ¥32.1 億の改善実績。あなたのチェーンの想定改善額を試算します。",
  },
}

export default function ValuePage() {
  return (
    <>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-16 lg:pt-24 pb-16 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
              ROI
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-white/95 leading-[1.1]">
              数字でしか語らない。
            </h1>
            <p className="mt-6 text-lg text-white/65 leading-relaxed">
              5 社累計 ¥32.1 億の改善実績。あなたのチェーンの想定改善額を試算します。
            </p>
          </div>
        </div>
      </section>

      {/* ============== SECTION 1: ROI Calculator ============== */}
      <Section>
        <SectionHeader
          eyebrow="ROI CALCULATOR"
          title="あなたのチェーンの想定改善額"
          description="店舗数・ブランド数・年商・主要業態を入れるだけ。5 社の実績から推定した想定年間改善額を即時に算出します。"
        />

        <ROICalculator />
      </Section>

      {/* ============== SECTION 2: Cases ============== */}
      <Section id="cases">
        <SectionHeader
          eyebrow="CASE STUDIES"
          title="実際の改善実績"
          description="全て対照群比較または前後比較で算出。p<0.05 を有意の閾値とする。"
        />

        <div className="grid lg:grid-cols-2 gap-5">
          {CASES.slice(0, 4).map((c) => (
            <CaseStudyCard key={c.code} c={c} />
          ))}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full lg:max-w-[calc(50%-10px)]">
              <CaseStudyCard c={CASES[4]} />
            </div>
          </div>
        </div>
      </Section>

      {/* ============== SECTION 3: Transparency ============== */}
      <Section>
        <SectionHeader
          eyebrow="METHOD"
          title="数字の透明性"
          description="効果数値はすべて統計的検定を経て算出。前提と計算式を全公開します。"
        />

        <div className="grid md:grid-cols-3 gap-5">
          <TransparencyCard
            num="01"
            title="計算前提"
            body="すべての効果数値は対照群比較（Difference-in-Differences）または前後比較で算出。介入店舗と非介入店舗を統計的にマッチングし、純粋な施策効果を分離します。"
          />
          <TransparencyCard
            num="02"
            title="有意水準"
            body="信頼区間 95% / p < 0.05 を統計的有意の閾値として採用。サンプルサイズが不足する場合は、その旨を経営報告書に明記します。"
          />
          <TransparencyCard
            num="03"
            title="季節性吸収"
            body="個別店舗の lottery 効果（偶発的売上変動）は除外、季節性は対照群で吸収。年間ベースで安定的に再現可能な数字のみを採用します。"
          />
        </div>

        <FoldableMethod />
      </Section>

      {/* ============== SECTION 4: Final CTA ============== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight">
            あなたのチェーンの数字を出します
          </h2>
          <p className="mt-5 text-lg text-white/65 max-w-2xl mx-auto">
            8週間 POC で、対照群比較 + 統計検定 + 円換算で証明します。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/poc"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              8週POC 提案書 DL
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              デモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function TransparencyCard({
  num,
  title,
  body,
}: {
  num: string
  title: string
  body: string
}) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.14em] text-white/30">
          {num}
        </span>
      </div>
      <h3 className="text-[17px] font-bold text-white/95 leading-snug mb-3">
        {title}
      </h3>
      <p className="text-[13px] text-white/65 leading-relaxed">{body}</p>
    </div>
  )
}
