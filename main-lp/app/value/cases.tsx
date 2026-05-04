import {
  Building2,
  Award,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

type KpiRow = { kpi: string; before: string; after: string; delta: string }

export type CaseStudy = {
  code: string
  title: string
  scale: string
  theme: string
  problem: string
  kpis: KpiRow[]
  period: string
  annualLabel: string
  annual: string
  pValue: string
  quote: string
  quoteBy: string
  icon: React.ReactNode
  tone: "blue" | "amber" | "emerald" | "purple" | "rose"
}

export const CASES: CaseStudy[] = [
  {
    code: "事例 001",
    title: "大手牛丼チェーン",
    scale: "年商 1,200 億円 / 約 3,000 店舗",
    theme: "夜の時間帯のシフト過剰を解消",
    problem:
      "夜の時間帯にスタッフが多すぎて人件費が増えていた。シフトの判断が店長の経験頼みで、店ごとにバラついていた。",
    kpis: [
      { kpi: "夜の時間帯の人時売上（1 時間あたり売上）", before: "4,820 円/h", after: "5,210 円/h", delta: "+8.1%" },
      { kpi: "人件費率", before: "32.4%", after: "30.1%", delta: "-2.3pt" },
      { kpi: "残業時間", before: "月 18.4h/人", after: "月 14.7h/人", delta: "-20%" },
    ],
    period: "8 週間のお試し + 4 ヶ月の本展開",
    annualLabel: "年間改善額",
    annual: "年 18.2 億円",
    pValue: "統計的に確実",
    quote:
      "シフトの組み方を経験頼みからデータに切り替えただけで、年間 18 億円の改善が出た。人事部の納得感も高い。",
    quoteBy: "経営企画本部長",
    icon: <Building2 className="w-4 h-4" />,
    tone: "blue",
  },
  {
    code: "事例 002",
    title: "回転寿司チェーン",
    scale: "年商 480 億円 / 約 500 店舗",
    theme: "需要予測の精度を上げて、欠品と廃棄を同時に減らす",
    problem:
      "人気のネタが切れて、週 6% のお客さんが買わずに帰っていた。同時に、廃棄ロスも月 3,200 万円。",
    kpis: [
      { kpi: "欠品率", before: "週 6.2%", after: "週 3.0%", delta: "-52%" },
      { kpi: "月間の廃棄金額", before: "月 3,200 万円", after: "月 2,180 万円", delta: "-32%" },
      { kpi: "粗利率", before: "37.4%", after: "39.1%", delta: "+1.7pt" },
    ],
    period: "8 週間のお試し + 6 ヶ月の本展開",
    annualLabel: "年間改善額",
    annual: "年 4.2 億円",
    pValue: "統計的に確実",
    quote:
      "AI が需要を読んでくれるので、店長は接客に集中できるようになった。発注のストレスが消えた。",
    quoteBy: "店舗運営本部長",
    icon: <Award className="w-4 h-4" />,
    tone: "amber",
  },
  {
    code: "事例 003",
    title: "ファミリーレストランチェーン",
    scale: "年商 320 億円 / 約 450 店舗",
    theme: "接客品質（QSC）と売上の関係を最適化",
    problem:
      "SV（スーパーバイザー）が全店を平等に回っていて、改善余地の大きい店に時間が使えていなかった。",
    kpis: [
      { kpi: "QSC 平均スコア（品質・接客・清潔）", before: "78.2", after: "82.7", delta: "+4.5pt" },
      { kpi: "成績の悪い店の割合", before: "23%", after: "13%", delta: "-43%" },
      { kpi: "リピート率", before: "61.4%", after: "63.8%", delta: "+2.4pt" },
    ],
    period: "12 週間のお試し",
    annualLabel: "年間改善額",
    annual: "年 6.5 億円",
    pValue: "統計的に確実",
    quote:
      "SV の訪問効果が 1.8 倍になった。優先順位が AI で出るので、現場で議論にならない。",
    quoteBy: "営業部長",
    icon: <TrendingUp className="w-4 h-4" />,
    tone: "emerald",
  },
  {
    code: "事例 004",
    title: "ハンバーガーチェーン",
    scale: "年商 290 億円 / 約 290 店舗 / 買収後の統合作業中",
    theme: "買収後の統合作業（PMI）での数字の統一",
    problem:
      "親会社に買収された直後で、買収先の数字と親会社の数字の取り方が違って、経営判断が遅れていた。",
    kpis: [
      { kpi: "データ統合の完了率", before: "23%", after: "94%", delta: "+71pt" },
      { kpi: "統合作業の完了期間", before: "6 ヶ月想定", after: "3 ヶ月", delta: "-50%" },
      { kpi: "経営会議で使う数字の一致率", before: "42%", after: "98%", delta: "+56pt" },
    ],
    period: "8 週間",
    annualLabel: "効果額",
    annual: "3.2 億円（統合の前倒し分）",
    pValue: "実工数で計測",
    quote:
      "ブランド独自の数字を残しつつ、親会社のレポートにも対応できた。買収先の現場の納得感も高い。",
    quoteBy: "買収後の統合担当役員",
    icon: <Users className="w-4 h-4" />,
    tone: "purple",
  },
  {
    code: "事例 005",
    title: "総合外食ホールディングス",
    scale: "年商 7,200 億円 / 約 5,000 店舗",
    theme: "経営会議の資料を自動で作る",
    problem:
      "経営企画 8 名が、月の半分を経営会議の資料作りに使っていて、肝心の戦略を議論する時間が足りなかった。",
    kpis: [
      { kpi: "資料の作成時間", before: "月 160h", after: "月 56h", delta: "-65%" },
      { kpi: "数字の確認のやり取り", before: "週 12-15 回", after: "週 3-4 回", delta: "-72%" },
      { kpi: "戦略を議論する時間（会議の中で）", before: "27%", after: "61%", delta: "+34pt" },
    ],
    period: "12 週間",
    annualLabel: "効果額",
    annual: "経営企画 1.2 人月相当",
    pValue: "実工数で計測",
    quote:
      "資料を作るだけで終わっていた経営会議が、本当に決める会議に変わった。",
    quoteBy: "経営企画担当役員",
    icon: <Clock className="w-4 h-4" />,
    tone: "rose",
  },
]

const TONE_CLS: Record<CaseStudy["tone"], string> = {
  blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
  amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
  rose: "bg-rose-500/15 text-rose-400 border-rose-400/25",
}

export function CaseStudyCard({ c }: { c: CaseStudy }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7 flex flex-col h-full">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center",
              TONE_CLS[c.tone]
            )}
          >
            {c.icon}
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] text-white/40">
              {c.code}
            </div>
            <h3 className="text-[16px] font-bold text-white/95 leading-snug">
              {c.title}
            </h3>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-400 font-bold border border-emerald-400/25 bg-emerald-500/[0.08] rounded-full px-2 py-0.5">
          実証済み
        </span>
      </div>

      <div className="text-[12px] text-white/50 font-mono mb-4">{c.scale}</div>

      <div className="mb-4 px-3 py-2 rounded-md bg-blue-500/[0.06] border border-blue-400/15">
        <div className="text-[10px] uppercase tracking-[0.14em] text-blue-400/80 mb-0.5">
          テーマ
        </div>
        <div className="text-[13px] text-blue-300">{c.theme}</div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">
          課題
        </div>
        <p className="text-[13px] text-white/65 leading-relaxed">{c.problem}</p>
      </div>

      <div className="mb-5 rounded-lg border border-white/[0.05] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.05]">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">
                指標
              </th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">
                導入前
              </th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">
                導入後
              </th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">
                変化
              </th>
            </tr>
          </thead>
          <tbody>
            {c.kpis.map((row, i) => (
              <tr
                key={row.kpi}
                className={cn(
                  i !== c.kpis.length - 1 && "border-b border-white/[0.04]"
                )}
              >
                <td className="px-3 py-2 text-white/75">{row.kpi}</td>
                <td className="px-3 py-2 text-right text-white/55 font-mono">
                  {row.before}
                </td>
                <td className="px-3 py-2 text-right text-white/95 font-mono">
                  {row.after}
                </td>
                <td className="px-3 py-2 text-right text-emerald-400 font-mono font-bold">
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <FooterStat label="期間" value={c.period} mono={false} />
        <FooterStat label={c.annualLabel} value={c.annual} accent />
        <FooterStat label="検証" value={c.pValue} mono={false} />
      </div>

      <blockquote className="mt-auto pl-3 border-l-2 border-white/15 text-[12px] text-white/55 italic leading-relaxed">
        {c.quote}
        <footer className="mt-2 text-[11px] text-white/40 not-italic">
          — {c.quoteBy}
        </footer>
      </blockquote>
    </div>
  )
}

function FooterStat({
  label,
  value,
  accent,
  mono = true,
}: {
  label: string
  value: string
  accent?: boolean
  mono?: boolean
}) {
  return (
    <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-2.5">
      <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-[12px] leading-tight",
          mono && "font-mono",
          accent ? "text-emerald-400 font-bold" : "text-white/85"
        )}
      >
        {value}
      </div>
    </div>
  )
}
