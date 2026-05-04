"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Calculator, Sparkles, Download } from "lucide-react"
import { cn } from "@/lib/utils"

function calculateROI(
  stores: number,
  brands: number,
  revenueOku: number,
  _segment: string
) {
  const revenueY = revenueOku * 100_000_000
  const wasteReduction = revenueY * 0.025 * 0.3 * 0.45
  const stockoutReduction = stores * 1_500_000 * 12 * 0.5
  const laborOpt = stores * 8 * 365 * 50
  const meetingTime = brands * 3 * 1_000_000 * 12
  return {
    waste: wasteReduction,
    stockout: stockoutReduction,
    labor: laborOpt,
    meeting: meetingTime,
    total: wasteReduction + stockoutReduction + laborOpt + meetingTime,
  }
}

const SEGMENT_OPTIONS = [
  "牛丼",
  "ファミレス",
  "回転寿司",
  "ハンバーガー",
  "うどん・そば",
  "焼肉",
  "中華",
  "その他",
] as const

function recommendedThemes(segment: string): string[] {
  switch (segment) {
    case "牛丼":
      return ["深夜帯シフト最適化", "人時売上 KPI 統合"]
    case "ファミレス":
      return ["QSC スコア × 売上相関", "SV 訪問優先順位"]
    case "回転寿司":
      return ["需要予測精度向上", "欠品 / 廃棄同時削減"]
    case "ハンバーガー":
      return ["PMI 後 KPI 統合", "ブランド横断レポート"]
    case "うどん・そば":
      return ["時間帯別需要予測", "麺ロス最適化"]
    case "焼肉":
      return ["原価率 × 客単価分析", "予約回転最適化"]
    case "中華":
      return ["ピーク時間人時売上", "テイクアウト需要予測"]
    default:
      return ["KPI 可視化と異常検知", "経営会議資料自動化"]
  }
}

function formatOku(n: number): string {
  return `¥${(n / 100_000_000).toFixed(1)}億`
}

export function ROICalculator() {
  const [stores, setStores] = useState(500)
  const [brands, setBrands] = useState(3)
  const [revenueOku, setRevenueOku] = useState(500)
  const [segment, setSegment] = useState<string>("牛丼")

  const result = useMemo(
    () => calculateROI(stores, brands, revenueOku, segment),
    [stores, brands, revenueOku, segment]
  )

  const pocCost = 4_000_000
  const monthsToPayback = (pocCost / (result.total / 12)).toFixed(1)

  const themes = recommendedThemes(segment)

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {/* LEFT: inputs */}
      <div className="lg:col-span-2 border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-md bg-blue-500/15 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-[13px] uppercase tracking-[0.14em] font-bold text-white/95">
            あなたの会社の前提
          </h3>
        </div>

        <InputRow
          label="店舗数"
          valueDisplay={`${stores.toLocaleString("ja-JP")} 店`}
        >
          <input
            type="range"
            min={10}
            max={10000}
            step={10}
            value={stores}
            onChange={(e) => setStores(Number(e.target.value))}
            className="w-full accent-blue-500 h-1 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/35 font-mono mt-1">
            <span>10</span>
            <span>10,000</span>
          </div>
        </InputRow>

        <InputRow label="ブランド数" valueDisplay={`${brands} ブランド`}>
          <select
            value={brands}
            onChange={(e) => setBrands(Number(e.target.value))}
            className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-[14px] text-white/90 font-mono focus:outline-none focus:border-blue-400/50"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} className="bg-bg-primary">
                {n}
              </option>
            ))}
          </select>
        </InputRow>

        <InputRow
          label="年商"
          valueDisplay={`${revenueOku.toLocaleString("ja-JP")} 億円`}
        >
          <input
            type="range"
            min={100}
            max={10000}
            step={50}
            value={revenueOku}
            onChange={(e) => setRevenueOku(Number(e.target.value))}
            className="w-full accent-blue-500 h-1 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/35 font-mono mt-1">
            <span>100億</span>
            <span>10,000億</span>
          </div>
        </InputRow>

        <InputRow label="主な業態" valueDisplay={segment} last>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-[14px] text-white/90 focus:outline-none focus:border-blue-400/50"
          >
            {SEGMENT_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-bg-primary">
                {s}
              </option>
            ))}
          </select>
        </InputRow>
      </div>

      {/* RIGHT: outputs */}
      <div className="lg:col-span-3 border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-emerald-400">
            想定年間改善額
          </span>
        </div>

        <div className="font-mono text-5xl lg:text-6xl font-bold text-emerald-400 leading-none tracking-tight">
          {formatOku(result.total)}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <BreakdownRow label="廃棄削減" value={result.waste} />
          <BreakdownRow label="欠品削減" value={result.stockout} />
          <BreakdownRow label="人件費最適化" value={result.labor} />
          <BreakdownRow label="経営工数削減" value={result.meeting} />
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">
              想定 POC 投資回収期間
            </div>
            <div className="font-mono text-2xl font-bold text-blue-400">
              {monthsToPayback} ヶ月
            </div>
            <div className="text-[10px] text-white/35 mt-1 font-mono">
              POC 費用 ¥4,000,000 / 月割改善額
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">
              推奨 POC テーマ
            </div>
            <ul className="space-y-1 mt-1.5">
              {themes.map((t) => (
                <li
                  key={t}
                  className="text-[12px] text-white/75 flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-white/35 leading-relaxed">
          上記は 5 社の実績平均から推定。詳細な試算は 8 週間 POC で対照群比較により確定します。
        </p>

        <div className="mt-6">
          <Link
            href="/poc"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            POC 提案書をダウンロード
          </Link>
        </div>
      </div>
    </div>
  )
}

function InputRow({
  label,
  valueDisplay,
  children,
  last,
}: {
  label: string
  valueDisplay: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={cn("py-4", !last && "border-b border-white/[0.05]")}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] uppercase tracking-[0.14em] text-white/55 font-medium">
          {label}
        </span>
        <span className="text-[13px] text-white/95 font-mono font-bold">
          {valueDisplay}
        </span>
      </div>
      {children}
    </div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">
        {label}
      </div>
      <div className="font-mono text-xl font-bold text-white/95">
        {formatOku(value)}
      </div>
    </div>
  )
}
