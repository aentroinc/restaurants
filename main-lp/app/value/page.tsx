import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { ROICalculator } from "./roi-calculator"
import { FoldableMethod } from "./foldable-method"
import { CASES, CaseStudyCard } from "./cases"

export const metadata: Metadata = {
  title: "実績と試算",
  description:
    "5 社で導入した結果、合計 32 億 1 千万円分のロスを減らせました。あなたの会社の店舗数を入れて、どれだけ効くか試算できます。8 週間のお試し導入で、他の店と比べて確認します。",
  openGraph: {
    title: "AENTRO Restaurant OS — 実績と試算",
    description:
      "5 社で導入した結果、合計 32 億 1 千万円分のロスを減らせました。あなたの会社の数字で試算できます。",
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
              いくら効くか
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-white/95 leading-[1.1]">
              実際にどれだけ効いたかを数字で見る
            </h1>
            <p className="mt-6 text-lg text-white/65 leading-relaxed">
              5 社で導入した結果、合計 32 億 1 千万円分のロスを減らせました。あなたの会社の店舗数を入れて、どれだけ効くか試算できます。
            </p>
          </div>
        </div>
      </section>

      {/* ============== SECTION 1: ROI Calculator ============== */}
      <Section>
        <SectionHeader
          eyebrow="いくら効くか試算"
          title="あなたの会社で、年間いくら効くか"
          description="店舗数・ブランド数・年商・主な業態を入れるだけ。導入企業 5 社の実績から、年間どれだけロスを減らせるかを自動で計算します。"
        />

        <ROICalculator />
      </Section>

      {/* ============== SECTION 2: Cases ============== */}
      <Section id="cases">
        <SectionHeader
          eyebrow="導入事例"
          title="実際の改善実績"
          description="すべての数字は、導入店と未導入店を比べて算出。偶然ではないことを統計でも確認しています。"
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
          eyebrow="計算方法"
          title="数字の出どころを全部公開します"
          description="効果の数字はすべて統計で確認したもの。前提と計算式もすべて公開します。"
        />

        <div className="grid md:grid-cols-3 gap-5">
          <TransparencyCard
            num="01"
            title="計算の前提"
            body="効果の数字はすべて、導入店と未導入店を比べて算出します。条件が近い店舗どうしを統計でマッチングして、施策の純粋な効果だけを取り出します。"
          />
          <TransparencyCard
            num="02"
            title="ちゃんと統計で確認"
            body="「偶然ではない」と言える基準を満たした数字だけを採用。サンプル数が足りない場合は、その旨を経営報告書に正直に書きます。"
          />
          <TransparencyCard
            num="03"
            title="季節の影響は除外"
            body="個別店舗のたまたまの売上変動は除外。季節の影響は他の店と比べることで打ち消します。年間を通して安定して再現できる数字だけを採用します。"
          />
        </div>

        <FoldableMethod />
      </Section>

      {/* ============== SECTION 4: Final CTA ============== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight">
            あなたの会社の数字で試算します
          </h2>
          <p className="mt-5 text-lg text-white/65 max-w-2xl mx-auto">
            8 週間のお試し導入で、他の店と比べて、いくら効いたかを円で示します。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/poc"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              お試し導入の資料をダウンロード
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
