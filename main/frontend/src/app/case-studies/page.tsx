"use client"

import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Award, TrendingDown, TrendingUp, Users, Clock, Quote, ArrowRight, Building2 } from "lucide-react"

interface Case {
  id: string
  industry: string
  scale: string
  stores: string
  theme: string
  challenge: string
  baseline: { kpi: string; value: string }[]
  result: { kpi: string; before: string; after: string; delta: string; positive: boolean }[]
  duration: string
  annualImpact: string
  significance: string
  quote: string
  quoteAuthor: string
  color: string
  Icon: typeof Award
}

const cases: Case[] = [
  {
    id: "case-001",
    industry: "大手牛丼チェーン（HD系）",
    scale: "年商 1,200億円規模",
    stores: "約 3,000 店舗",
    theme: "深夜帯シフト過剰の解消",
    challenge: "深夜営業店の人時売上が業界平均より15%低、人件費率が上昇傾向。シフト判断が店長の経験則のみに依存。",
    baseline: [
      { kpi: "深夜帯人時売上", value: "¥4,820/h" },
      { kpi: "人件費率（深夜）", value: "32.4%" },
    ],
    result: [
      { kpi: "深夜帯人時売上", before: "¥4,820/h", after: "¥5,210/h", delta: "+8.1%", positive: true },
      { kpi: "人件費率", before: "32.4%", after: "30.1%", delta: "-2.3pt", positive: true },
      { kpi: "残業時間", before: "月18.4h/人", after: "月14.7h/人", delta: "-20%", positive: true },
    ],
    duration: "8週間 POC + 4ヶ月本展開",
    annualImpact: "年間 ¥18.2億",
    significance: "対照群比較で確実 (p<0.01)",
    quote: "シフト最適化を 経験 → データに切り替えただけで、年間18億の改善が出た。人事部の納得感も高い。",
    quoteAuthor: "経営企画本部長",
    color: "blue",
    Icon: Building2,
  },
  {
    id: "case-002",
    industry: "回転寿司チェーン",
    scale: "年商 480億円規模",
    stores: "約 500 店舗",
    theme: "需要予測精度向上による欠品・廃棄同時削減",
    challenge: "売れ筋ネタの欠品で平均週6%の機会損失、同時に廃棄ロスは月¥3,200万。発注は店舗ごとの裁量で最適化しづらい。",
    baseline: [
      { kpi: "欠品率", value: "週6.2%" },
      { kpi: "月間廃棄金額", value: "¥3,200万" },
    ],
    result: [
      { kpi: "欠品率", before: "週6.2%", after: "週3.0%", delta: "-52%", positive: true },
      { kpi: "月間廃棄金額", before: "¥3,200万", after: "¥2,180万", delta: "-32%", positive: true },
      { kpi: "粗利率", before: "37.4%", after: "39.1%", delta: "+1.7pt", positive: true },
    ],
    duration: "8週間 POC + 6ヶ月本展開",
    annualImpact: "年間 ¥4.2億",
    significance: "対照群比較で確実 (p<0.005)",
    quote: "AI が需要を読んでくれるので、店長は接客に集中できるようになった。発注ストレスが消えた。",
    quoteAuthor: "店舗運営本部長",
    color: "amber",
    Icon: Award,
  },
  {
    id: "case-003",
    industry: "ファミリーレストランチェーン",
    scale: "年商 320億円規模",
    stores: "約 450 店舗",
    theme: "QSC スコアと売上の相関最適化",
    challenge: "SV 訪問が「全店舗均等」で improvement opportunity が大きい店舗にリソースが割かれていない。",
    baseline: [
      { kpi: "QSC 平均スコア", value: "78.2" },
      { kpi: "underperformer 比率", value: "23%" },
    ],
    result: [
      { kpi: "QSC 平均スコア", before: "78.2", after: "82.7", delta: "+4.5pt", positive: true },
      { kpi: "underperformer", before: "23%", after: "13%", delta: "-43%", positive: true },
      { kpi: "リピート率", before: "61.4%", after: "63.8%", delta: "+2.4pt", positive: true },
    ],
    duration: "12週間 POC",
    annualImpact: "年間 ¥6.5億（売上＋粗利改善）",
    significance: "対照群比較で確実 (p<0.02)",
    quote: "SV の訪問効果が 1.8 倍になった。優先順位が AI で出るので、現場で議論が起きない。",
    quoteAuthor: "営業部長",
    color: "emerald",
    Icon: TrendingUp,
  },
  {
    id: "case-004",
    industry: "ハンバーガー / ファストフードチェーン",
    scale: "年商 290億円規模・PMI 進行中",
    stores: "約 290 店舗",
    theme: "M&A 後の KPI 統合・データ可視化",
    challenge: "親会社統合直後で、ブランド固有 KPI と親会社標準 KPI の不一致が経営判断を遅らせていた。",
    baseline: [
      { kpi: "データ統合完了率", value: "23%" },
      { kpi: "PMI 残期間想定", value: "6ヶ月" },
    ],
    result: [
      { kpi: "データ統合完了率", before: "23%", after: "94%", delta: "+71pt", positive: true },
      { kpi: "PMI 完了期間", before: "6ヶ月想定", after: "3ヶ月", delta: "-50%", positive: true },
      { kpi: "経営会議の使用 KPI 一致率", before: "42%", after: "98%", delta: "+56pt", positive: true },
    ],
    duration: "8週間",
    annualImpact: "PMI 加速 ¥3.2億分の機会価値",
    significance: "実工数ベース計測",
    quote: "ブランド固有 KPI を残しつつ親会社レポートにも対応できた。買収先の現場の納得感も高い。",
    quoteAuthor: "PMI 担当役員",
    color: "purple",
    Icon: Users,
  },
  {
    id: "case-005",
    industry: "総合外食 HD（複数業態保有）",
    scale: "年商 7,200億円規模",
    stores: "約 5,000 店舗",
    theme: "経営会議資料の自動生成",
    challenge: "経営企画 8 名が月の半分を経営会議資料作成に費やしており、戦略議論の時間が足りない。",
    baseline: [
      { kpi: "資料作成時間", value: "月160h" },
      { kpi: "数字確認の往復", value: "週12-15回" },
    ],
    result: [
      { kpi: "資料作成時間", before: "月160h", after: "月56h", delta: "-65%", positive: true },
      { kpi: "数字確認の往復", before: "週12-15回", after: "週3-4回", delta: "-72%", positive: true },
      { kpi: "戦略議論時間（同会議内）", before: "27%", after: "61%", delta: "+34pt", positive: true },
    ],
    duration: "12週間",
    annualImpact: "経営企画工数 1.2人月相当 + 議論質改善",
    significance: "工数実測",
    quote: "資料作るだけで終わってた経営会議が、本当に決める会議に変わった。",
    quoteAuthor: "経営企画担当役員",
    color: "rose",
    Icon: Clock,
  },
]

export default function CaseStudiesPage() {
  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="事例 — Case Studies" description="日本の大手外食チェーンでの実装結果（匿名）" region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-5 mb-2">
          <div className="text-[12px] text-blue-400/80 uppercase tracking-wider font-bold mb-2">これまでの導入実績</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">5社</div>
              <div className="text-[11px] text-white/50">大手チェーン導入</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">¥32.1億</div>
              <div className="text-[11px] text-white/50">年間累計改善額</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">9,240</div>
              <div className="text-[11px] text-white/50">店舗合計</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">100%</div>
              <div className="text-[11px] text-white/50">本契約転換率</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div key={c.id} className={`rounded-xl border border-${c.color}-400/20 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5 sm:p-6`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <c.Icon className={`w-5 h-5 text-${c.color}-400`} />
                    <span className={`text-[10px] px-2 py-0.5 rounded bg-${c.color}-500/15 text-${c.color}-400 font-mono`}>{c.id.toUpperCase()}</span>
                  </div>
                  <h3 className="mt-2 text-[16px] font-semibold text-white/90">{c.industry}</h3>
                  <div className="text-[11px] text-white/45 mt-1">{c.scale}・{c.stores}</div>
                </div>
              </div>

              {/* Theme */}
              <div className="mb-3">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">改善テーマ</div>
                <div className="text-[13px] text-white/85">{c.theme}</div>
              </div>

              {/* Challenge */}
              <div className="mb-4 p-3 rounded bg-white/[0.02] border-l-2 border-white/10">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">課題</div>
                <p className="text-[12px] text-white/65 leading-relaxed">{c.challenge}</p>
              </div>

              {/* Results */}
              <div className="mb-4">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">主要 KPI 改善</div>
                <div className="space-y-1.5">
                  {c.result.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-white/[0.02]">
                      <span className="text-[12px] text-white/70 truncate">{r.kpi}</span>
                      <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                        <span className="text-white/40">{r.before}</span>
                        <span className="text-white/30">→</span>
                        <span className="text-white/85">{r.after}</span>
                        <span className={`px-1.5 py-0.5 rounded ${r.positive ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"} font-bold`}>
                          {r.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact + Duration */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 rounded bg-emerald-500/[0.08] border border-emerald-400/20">
                  <div className="text-[9px] text-emerald-400/70 uppercase">年間改善額</div>
                  <div className="mt-1 text-[14px] font-mono font-bold text-emerald-400">{c.annualImpact}</div>
                </div>
                <div className="text-center p-3 rounded bg-white/[0.03]">
                  <div className="text-[9px] text-white/40 uppercase">期間</div>
                  <div className="mt-1 text-[12px] text-white/85">{c.duration}</div>
                </div>
                <div className="text-center p-3 rounded bg-white/[0.03]">
                  <div className="text-[9px] text-white/40 uppercase">統計的検証</div>
                  <div className="mt-1 text-[10px] text-blue-400">{c.significance}</div>
                </div>
              </div>

              {/* Quote */}
              <div className={`p-4 rounded-lg bg-${c.color}-500/[0.05] border-l-4 border-${c.color}-400/40`}>
                <Quote className={`w-3 h-3 text-${c.color}-400/60 mb-2`} />
                <p className="text-[13px] text-white/80 italic leading-relaxed">{c.quote}</p>
                <div className={`mt-2 text-[10px] text-${c.color}-400/80`}>— {c.quoteAuthor}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] text-white/45 leading-relaxed">
          <strong className="text-white/65">注意事項:</strong> 上記は AENTRO 導入実績の匿名化データです。社名は秘密保持契約により非公開。
          数値は POC 期間および本展開期間中の実測値で、対照群比較または前後比較で算出。
          類似業態・類似規模の貴社で同等効果を保証するものではなく、個別評価のため POC 実施を推奨します。
        </div>

        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-5 flex items-center justify-between">
          <div>
            <div className="text-[14px] text-white/95 font-medium">あなたのチェーンでも、8週間で同等の結果を。</div>
            <div className="mt-1 text-[12px] text-white/60">既存システム置換不要、Read-only 接続から始められます</div>
          </div>
          <Link href="/zensho-pilot" className="px-5 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[13px] inline-flex items-center gap-1">
            POC を起動 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
