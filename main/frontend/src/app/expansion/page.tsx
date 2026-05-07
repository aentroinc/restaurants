"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import {
  MapPin, Wrench, ArrowUpDown, Sparkles, TrendingUp, Users,
  Truck, Building2, ChevronRight, Calendar, DollarSign, Crosshair,
} from "lucide-react"
import { fetchAPI } from "@/lib/api"

// ---------- seeded RNG ----------
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
const rng = seededRandom(42)
const rand = (min: number, max: number) => rng() * (max - min) + min
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

// ---------- Location candidates ----------
type Difficulty = "low" | "medium" | "high"
interface LocationCandidate {
  candidate_id: string
  name: string
  region: string
  area_type: string
  lat: number
  lng: number
  population_radius_1km: number
  competitor_count: number
  cannibalization_risk: number
  delivery_distance_km: number
  staff_difficulty: Difficulty
  expected_daily_sales: number
  payback_months: number
  total_score: number
  strengths: string[]
  weaknesses: string[]
}

const regions = ["首都圏","北関東","東海","関西","九州","東北","北海道","中国"]
const areaTypes = ["駅前","ロードサイド","SC内","オフィス街","住宅地","観光地"]
const areaSamples: Record<string, string[]> = {
  "首都圏": ["新宿西口","渋谷スクランブル","池袋東口","品川港南","錦糸町","町田","横浜西口","川崎駅前","大宮東口","柏","千葉中央"],
  "北関東": ["宇都宮","高崎","水戸","つくば"],
  "東海": ["名古屋栄","岐阜","浜松","静岡"],
  "関西": ["梅田","難波","三宮","京都駅前","奈良"],
  "九州": ["博多駅前","熊本","鹿児島中央"],
  "東北": ["仙台","盛岡","青森"],
  "北海道": ["札幌すすきの","旭川"],
  "中国": ["広島","岡山"],
}
const baseLats: Record<string, [number, number]> = {
  "北海道": [43.06, 141.35], "東北": [38.26, 140.87], "北関東": [36.39, 139.06],
  "首都圏": [35.68, 139.69], "東海": [35.18, 136.91], "関西": [34.69, 135.50],
  "中国": [34.39, 132.46], "九州": [33.59, 130.40],
}

const strengthLib = [
  "周辺人口密度が同地域平均比+18%",
  "駅徒歩2分の高視認性立地",
  "競合大手チェーン未進出エリア",
  "オフィスワーカー15万人/日通行",
  "近隣に既存DC、配送効率高",
  "学生層集積で平日昼間需要確保",
  "ファミリー層多くディナー伸び余地",
  "再開発計画で2027年に商圏拡大",
]
const weaknessLib = [
  "近隣2km圏に既存店M-1042 (カニバリ懸念)",
  "賃料相場が地域平均比+24%",
  "アルバイト時給高騰傾向",
  "駐車場確保が困難",
  "深夜営業規制エリア",
  "競合9店舗集中レッドオーシャン",
  "DC遠隔で配送コスト+12%",
]

const candidates: LocationCandidate[] = Array.from({ length: 20 }, (_, i) => {
  const region = regions[i % regions.length]
  const samples = areaSamples[region] ?? areaSamples["首都圏"]
  const area = samples[i % samples.length]
  const areaType = areaTypes[i % areaTypes.length]
  const base = baseLats[region] ?? [35.68, 139.69]
  const cannib = Math.round(rand(0.02, 0.28) * 1000) / 1000
  const dist = Math.round(rand(5, 45) * 10) / 10
  const diff: Difficulty = rng() < 0.3 ? "high" : rng() < 0.55 ? "medium" : "low"
  const sales = Math.round(rand(380000, 920000))
  const payback = Math.round(rand(18, 42))
  const popK = Math.round(rand(8000, 65000))
  const compete = Math.round(rand(2, 11))

  // total score: weighted heuristic
  const score =
    Math.min(popK / 700, 100) * 0.25 +
    Math.max(0, 100 - compete * 7) * 0.15 +
    Math.max(0, 100 - cannib * 350) * 0.20 +
    Math.max(0, 100 - dist * 1.8) * 0.10 +
    (diff === "low" ? 100 : diff === "medium" ? 65 : 30) * 0.10 +
    Math.min(sales / 9500, 100) * 0.20

  return {
    candidate_id: `LC-${String(i + 1).padStart(3, "0")}`,
    name: `${area}${areaType}候補`,
    region,
    area_type: areaType,
    lat: base[0] + rand(-0.4, 0.4),
    lng: base[1] + rand(-0.4, 0.4),
    population_radius_1km: popK,
    competitor_count: compete,
    cannibalization_risk: cannib,
    delivery_distance_km: dist,
    staff_difficulty: diff,
    expected_daily_sales: sales,
    payback_months: payback,
    total_score: Math.round(score * 10) / 10,
    strengths: [strengthLib[i % strengthLib.length], strengthLib[(i + 3) % strengthLib.length]],
    weaknesses: [weaknessLib[i % weaknessLib.length]],
  }
})

// ---------- Renovation projects ----------
type RenovStatus = "completed" | "in-progress" | "planned"
type PackageType = "self_register" | "layout_change" | "ticket_kiosk" | "exterior" | "kitchen_upgrade"

interface RenovationProject {
  project_id: string
  store_id: string
  store_name: string
  capex_myen: number
  start_date: string
  end_date: string
  status: RenovStatus
  ticket_lift_pct: number
  customer_lift_pct: number
  payback_months: number
  package_type: PackageType
}

const packageDefs: Record<PackageType, { label: string; ticket: number; customer: number; capex_min: number; capex_max: number }> = {
  self_register: { label: "セルフレジ導入", ticket: 7.4, customer: 4.2, capex_min: 6, capex_max: 14 },
  layout_change: { label: "レイアウト変更", ticket: 4.1, customer: 11.0, capex_min: 12, capex_max: 25 },
  ticket_kiosk: { label: "券売機刷新", ticket: 3.8, customer: 6.5, capex_min: 4, capex_max: 9 },
  exterior: { label: "外装リニューアル", ticket: 2.1, customer: 8.4, capex_min: 8, capex_max: 18 },
  kitchen_upgrade: { label: "厨房機器更新", ticket: 5.6, customer: 3.1, capex_min: 14, capex_max: 32 },
}

const storeNamePool = [
  "マツヤ新宿西口","マツヤ渋谷店","マツヤ池袋東","マツヤ品川港南","マツヤ錦糸町",
  "マツヤ町田","マツヤ横浜西口","マツヤ川崎駅前","マツヤ大宮東口","マツヤ柏中央",
  "マツヤ千葉中央","マツヤ宇都宮","マツヤ高崎","マツヤつくば","マツヤ名古屋栄",
  "マツヤ岐阜駅前","マツヤ浜松","マツヤ梅田","マツヤ難波","マツヤ三宮",
  "マツヤ京都駅前","マツヤ博多駅前","マツヤ熊本","マツヤ仙台駅前","マツヤ盛岡",
  "マツヤ札幌すすきの","マツヤ旭川","マツヤ広島本通","マツヤ岡山","マツヤ静岡",
]

const renovations: RenovationProject[] = Array.from({ length: 30 }, (_, i) => {
  const status: RenovStatus = i < 12 ? "completed" : i < 22 ? "in-progress" : "planned"
  const pkgKey = (Object.keys(packageDefs) as PackageType[])[i % 5]
  const pkg = packageDefs[pkgKey]
  const startMonth = (i % 12) + 1
  const dur = Math.round(rand(2, 5))
  const endMonth = ((startMonth - 1 + dur) % 12) + 1
  const startYear = status === "completed" ? 2025 : status === "in-progress" ? 2025 : 2026
  const endYear = status === "completed" ? 2025 : status === "in-progress" ? 2026 : 2026
  return {
    project_id: `RNV-${String(i + 1).padStart(3, "0")}`,
    store_id: `M-${String(1001 + i * 3).padStart(4, "0")}`,
    store_name: storeNamePool[i % storeNamePool.length],
    capex_myen: Math.round(rand(pkg.capex_min, pkg.capex_max) * 10) / 10,
    start_date: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    end_date: `${endYear}-${String(endMonth).padStart(2, "0")}-28`,
    status,
    ticket_lift_pct: Math.round((pkg.ticket + rand(-1, 1.5)) * 10) / 10,
    customer_lift_pct: Math.round((pkg.customer + rand(-1.5, 1.5)) * 10) / 10,
    payback_months: Math.round(rand(14, 36)),
    package_type: pkgKey,
  }
})

// ---------- UI ----------
const difficultyStyle: Record<Difficulty, string> = {
  low: "bg-emerald-400/10 text-emerald-400",
  medium: "bg-amber-400/10 text-amber-400",
  high: "bg-red-400/10 text-red-400",
}
const statusStyle: Record<RenovStatus, string> = {
  completed: "bg-emerald-400/10 text-emerald-400",
  "in-progress": "bg-cyan-400/10 text-cyan-400",
  planned: "bg-white/[0.06] text-white/50",
}
const statusLabel: Record<RenovStatus, string> = {
  completed: "完了", "in-progress": "進行中", planned: "計画",
}

export default function ExpansionPage() {
  const [tab, setTab] = useState<"expansion" | "renovation" | "huff">("expansion")
  const [sortKey, setSortKey] = useState<"score" | "sales" | "payback">("score")

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) =>
      sortKey === "score" ? b.total_score - a.total_score
      : sortKey === "sales" ? b.expected_daily_sales - a.expected_daily_sales
      : a.payback_months - b.payback_months
    ),
    [sortKey],
  )

  const top3 = sortedCandidates.slice(0, 3)
  const sortedRenovations = useMemo(
    () => [...renovations].sort((a, b) => a.payback_months - b.payback_months),
    [],
  )

  const completedCount = renovations.filter(r => r.status === "completed").length
  const inProgressCount = renovations.filter(r => r.status === "in-progress").length
  const plannedCount = renovations.filter(r => r.status === "planned").length
  const avgTicketLift = renovations.filter(r => r.status === "completed")
    .reduce((s, r) => s + r.ticket_lift_pct, 0) / completedCount

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0e14] text-white/80">
      <div className="px-6 pt-6">
        <ContextHeader
          title="出店・改装プランナー"
          description="出店候補スコアリングと改装投資判断"
        />
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Tab switch */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 w-fit border border-white/[0.06]">
          <TabButton active={tab === "expansion"} onClick={() => setTab("expansion")}
            icon={<MapPin className="w-3.5 h-3.5" />} label={`出店候補 (${candidates.length})`} />
          <TabButton active={tab === "renovation"} onClick={() => setTab("renovation")}
            icon={<Wrench className="w-3.5 h-3.5" />} label={`改装プロジェクト (${renovations.length})`} />
          <TabButton active={tab === "huff"} onClick={() => setTab("huff")}
            icon={<Crosshair className="w-3.5 h-3.5" />} label="Huff 商圏予測" />
        </div>

        {tab === "huff" ? (
          <HuffPredictionView />
        ) : tab === "expansion" ? (
          <>
            {/* KPI summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="候補地数" value={`${candidates.length}`} sub="評価対象" tone="white" />
              <KpiCard label="平均総合スコア" value={(candidates.reduce((s, c) => s + c.total_score, 0) / candidates.length).toFixed(1)} sub="100点満点" tone="blue" />
              <KpiCard label="平均想定日商" value={`¥${Math.round(candidates.reduce((s, c) => s + c.expected_daily_sales, 0) / candidates.length / 10000)}万`} sub="20候補加重平均" tone="emerald" />
              <KpiCard label="平均回収期間" value={`${Math.round(candidates.reduce((s, c) => s + c.payback_months, 0) / candidates.length)}ヶ月`} sub="想定CAPEX前提" tone="white" />
            </div>

            {/* AI rationale panel */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                  AI推奨理由
                </span>
                <span className="text-[10px] text-white/40 ml-2">
                  上位3候補の根拠 — 商圏特性 / 競合分布 / 自社カニバリ
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {top3.map((c, i) => (
                  <div key={c.candidate_id} className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/50 font-mono">#{i + 1} {c.candidate_id}</span>
                      <span className="text-[9px] uppercase tracking-wider text-blue-400">推奨度 {i === 0 ? "S" : "A"}</span>
                    </div>
                    <div className="text-[12px] text-white/80 font-medium leading-relaxed">
                      商圏人口{(c.population_radius_1km / 1000).toFixed(0)}k / 競合{c.competitor_count}店 /
                      カニバリ{(c.cannibalization_risk * 100).toFixed(0)}%。
                      {c.staff_difficulty === "low" ? "人員確保容易で立ち上げリスク低。" : c.staff_difficulty === "medium" ? "人員確保は要採用強化。" : "人員確保難で開業遅延リスク有。"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 hero cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((c, i) => (
                <div key={c.candidate_id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
                  <div className={`px-4 py-2 border-b border-white/[0.06] flex items-center justify-between ${
                    i === 0 ? "bg-emerald-500/[0.06]" : "bg-blue-500/[0.04]"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        i === 0 ? "bg-emerald-400/20 text-emerald-400" : "bg-blue-400/20 text-blue-400"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-white/85">{c.name}</span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      i === 0 ? "bg-emerald-400/15 text-emerald-400" : "bg-blue-400/15 text-blue-400"
                    }`}>
                      {i === 0 ? "推奨度 S" : "推奨度 A"}
                    </span>
                  </div>

                  {/* Map preview */}
                  <div className="relative h-24 bg-gradient-to-br from-blue-500/[0.06] via-white/[0.02] to-cyan-500/[0.06] overflow-hidden border-b border-white/[0.06]">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
                      <defs>
                        <pattern id={`grid-${c.candidate_id}`} width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
                        </pattern>
                      </defs>
                      <rect width="200" height="80" fill={`url(#grid-${c.candidate_id})`} />
                      {/* competitor dots */}
                      {Array.from({ length: c.competitor_count }, (_, k) => (
                        <circle key={k} cx={20 + (k * 23) % 170} cy={15 + (k * 17) % 50} r="2" fill="rgba(248,113,113,0.5)" />
                      ))}
                      {/* candidate marker */}
                      <circle cx="100" cy="40" r="6" fill="rgba(96,165,250,0.3)" />
                      <circle cx="100" cy="40" r="3" fill="#60a5fa" />
                      <circle cx="100" cy="40" r="22" fill="none" stroke="rgba(96,165,250,0.3)" strokeWidth="0.8" />
                    </svg>
                    <span className="absolute bottom-1.5 left-2 text-[9px] text-white/40 font-mono">
                      {c.region} · {c.lat.toFixed(2)}, {c.lng.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="想定日商" value={`¥${(c.expected_daily_sales / 10000).toFixed(0)}万`} tone="emerald" />
                      <Stat label="回収" value={`${c.payback_months}ヶ月`} tone="white" />
                      <Stat label="スコア" value={c.total_score.toFixed(1)} tone="blue" />
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">強み</div>
                      <ul className="space-y-1">
                        {c.strengths.map((s, k) => (
                          <li key={k} className="text-[11px] text-white/70 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">弱み</div>
                      <ul className="space-y-1">
                        {c.weaknesses.map((w, k) => (
                          <li key={k} className="text-[11px] text-white/60 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">−</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Candidate ranking table */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                  候補地ランキング — {candidates.length}件
                </span>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3 h-3 text-white/30" />
                  {([
                    { key: "score", label: "スコア順" },
                    { key: "sales", label: "売上順" },
                    { key: "payback", label: "回収順" },
                  ] as const).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortKey(s.key)}
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        sortKey === s.key ? "bg-blue-500/15 text-blue-400" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-white/30 border-b border-white/[0.06]">
                      <th className="text-center px-2 py-2 font-medium w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium">候補地</th>
                      <th className="text-left px-3 py-2 font-medium">地域</th>
                      <th className="text-right px-3 py-2 font-medium">商圏人口/1km</th>
                      <th className="text-right px-3 py-2 font-medium">競合</th>
                      <th className="text-right px-3 py-2 font-medium">カニバリ</th>
                      <th className="text-right px-3 py-2 font-medium">配送距離</th>
                      <th className="text-center px-3 py-2 font-medium">人員</th>
                      <th className="text-right px-3 py-2 font-medium">想定日商</th>
                      <th className="text-right px-3 py-2 font-medium">回収期間</th>
                      <th className="text-right px-3 py-2 font-medium">総合スコア</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCandidates.map((c, i) => (
                      <tr key={c.candidate_id} className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${
                        i < 3 ? "bg-blue-500/[0.04]" : ""
                      }`}>
                        <td className="text-center px-2 py-2 font-mono tabular-nums text-white/30">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="text-white/80 font-medium">{c.name}</div>
                          <div className="text-[9px] text-white/30 font-mono">{c.candidate_id} · {c.area_type}</div>
                        </td>
                        <td className="px-3 py-2 text-white/55">{c.region}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-white/55">{c.population_radius_1km.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-white/55">{c.competitor_count}</td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums ${
                          c.cannibalization_risk > 0.18 ? "text-red-400" :
                          c.cannibalization_risk > 0.10 ? "text-amber-400" : "text-white/55"
                        }`}>
                          {(c.cannibalization_risk * 100).toFixed(0)}%
                        </td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums ${
                          c.delivery_distance_km > 30 ? "text-amber-400" : "text-white/55"
                        }`}>
                          {c.delivery_distance_km.toFixed(0)}km
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${difficultyStyle[c.staff_difficulty]}`}>
                            {c.staff_difficulty}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400">
                          ¥{(c.expected_daily_sales / 10000).toFixed(0)}万
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-white/55">{c.payback_months}ヶ月</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-mono tabular-nums text-sm font-semibold ${
                            c.total_score > 75 ? "text-emerald-400" :
                            c.total_score > 60 ? "text-blue-400" : "text-white/50"
                          }`}>
                            {c.total_score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <RenovationView
            renovations={renovations}
            sortedRenovations={sortedRenovations}
            completedCount={completedCount}
            inProgressCount={inProgressCount}
            plannedCount={plannedCount}
            avgTicketLift={avgTicketLift}
          />
        )}
      </div>
    </div>
  )
}

// ---------- Renovation View ----------
function RenovationView({
  renovations, sortedRenovations, completedCount, inProgressCount, plannedCount, avgTicketLift,
}: {
  renovations: RenovationProject[]
  sortedRenovations: RenovationProject[]
  completedCount: number
  inProgressCount: number
  plannedCount: number
  avgTicketLift: number
}) {
  const inProgress = renovations.filter(r => r.status === "in-progress")

  // package effect aggregation
  const packageEffect = (Object.keys(packageDefs) as PackageType[]).map(key => {
    const def = packageDefs[key]
    const projects = renovations.filter(r => r.package_type === key && r.status === "completed")
    const avgTicket = projects.length ? projects.reduce((s, p) => s + p.ticket_lift_pct, 0) / projects.length : def.ticket
    const avgCustomer = projects.length ? projects.reduce((s, p) => s + p.customer_lift_pct, 0) / projects.length : def.customer
    const avgPayback = projects.length ? projects.reduce((s, p) => s + p.payback_months, 0) / projects.length : 24
    return {
      key, label: def.label,
      avgTicket: Math.round(avgTicket * 10) / 10,
      avgCustomer: Math.round(avgCustomer * 10) / 10,
      avgPayback: Math.round(avgPayback),
      capexRange: `${def.capex_min}〜${def.capex_max}百万`,
      adopted: renovations.filter(r => r.package_type === key).length,
    }
  })

  // Gantt timeline range: span from min start to max end (in-progress only)
  const ipStartMs = inProgress.map(r => new Date(r.start_date).getTime())
  const ipEndMs = inProgress.map(r => new Date(r.end_date).getTime())
  const minMs = ipStartMs.length ? Math.min(...ipStartMs) : Date.now()
  const maxMs = ipEndMs.length ? Math.max(...ipEndMs) : Date.now() + 30 * 86400000
  const totalSpan = maxMs - minMs
  const todayMs = new Date("2026-05-02").getTime()
  const todayPct = ((todayMs - minMs) / totalSpan) * 100

  return (
    <>
      {/* Renovation KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="完了" value={`${completedCount}件`} sub="2025年実績" tone="emerald" />
        <KpiCard label="進行中" value={`${inProgressCount}件`} sub="現在対応中" tone="cyan" />
        <KpiCard label="計画中" value={`${plannedCount}件`} sub="2026下期予定" tone="white" />
        <KpiCard label="完了店舗 平均客単価リフト" value={`+${avgTicketLift.toFixed(1)}%`} sub="完了12件加重" tone="emerald" />
      </div>

      {/* Package effects */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            改装パッケージ別 効果実績
          </span>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-white/30 border-b border-white/[0.06]">
              <th className="text-left px-4 py-2 font-medium">パッケージ</th>
              <th className="text-right px-3 py-2 font-medium">客単価リフト</th>
              <th className="text-right px-3 py-2 font-medium">客数リフト</th>
              <th className="text-right px-3 py-2 font-medium">投資レンジ</th>
              <th className="text-right px-3 py-2 font-medium">平均回収</th>
              <th className="text-right px-3 py-2 font-medium">採用件数</th>
            </tr>
          </thead>
          <tbody>
            {packageEffect.map((p) => (
              <tr key={p.key} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-white/80 font-medium">{p.label}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-400">+{p.avgTicket}%</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-blue-400">+{p.avgCustomer}%</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/55">{p.capexRange}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/55">{p.avgPayback}ヶ月</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/55">{p.adopted}件</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gantt timeline for in-progress */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            進行中プロジェクト タイムライン
          </span>
          <span className="text-[10px] text-white/30">
            <Calendar className="w-3 h-3 inline mr-1" />
            {new Date(minMs).toISOString().slice(0, 7)} 〜 {new Date(maxMs).toISOString().slice(0, 7)}
          </span>
        </div>
        <div className="p-4 space-y-1.5 relative">
          {/* today line */}
          <div
            className="absolute top-3 bottom-3 w-px bg-amber-400/60 z-10 pointer-events-none"
            style={{ left: `calc(35% + ${(todayPct / 100) * 65}%)` }}
          >
            <span className="absolute -top-1 -translate-x-1/2 text-[9px] text-amber-400 bg-[#0a0e14] px-1 whitespace-nowrap">TODAY</span>
          </div>
          {inProgress.map((r) => {
            const sMs = new Date(r.start_date).getTime()
            const eMs = new Date(r.end_date).getTime()
            const startPct = ((sMs - minMs) / totalSpan) * 100
            const widthPct = ((eMs - sMs) / totalSpan) * 100
            const progress = Math.min(100, Math.max(0, ((todayMs - sMs) / (eMs - sMs)) * 100))
            return (
              <div key={r.project_id} className="flex items-center gap-2 text-[11px]">
                <div className="w-[35%] flex items-center gap-2 min-w-0">
                  <span className="text-white/70 truncate">{r.store_name}</span>
                  <span className="text-[9px] text-white/30 font-mono shrink-0">{r.project_id}</span>
                </div>
                <div className="flex-1 relative h-5 bg-white/[0.03] rounded">
                  <div
                    className="absolute top-0 bottom-0 rounded bg-cyan-500/30 border border-cyan-400/40"
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 rounded-l bg-cyan-400/60"
                      style={{ width: `${progress}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/80 font-mono tabular-nums">
                      {packageDefs[r.package_type].label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Renovation table */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            改装プロジェクト一覧 — ROI/回収期間 順
          </span>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#0a0e14] z-10">
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left px-4 py-2 font-medium">店舗</th>
                <th className="text-center px-3 py-2 font-medium">ステータス</th>
                <th className="text-left px-3 py-2 font-medium">パッケージ</th>
                <th className="text-right px-3 py-2 font-medium">投資額</th>
                <th className="text-right px-3 py-2 font-medium">客単価リフト</th>
                <th className="text-right px-3 py-2 font-medium">客数リフト</th>
                <th className="text-right px-3 py-2 font-medium">回収期間</th>
                <th className="text-left px-3 py-2 font-medium">期間</th>
              </tr>
            </thead>
            <tbody>
              {sortedRenovations.map((r) => (
                <tr key={r.project_id} className="border-b border-white/[0.04] hover:bg-white/[0.04]">
                  <td className="px-4 py-2">
                    <div className="text-white/80 font-medium">{r.store_name}</div>
                    <div className="text-[9px] text-white/30 font-mono">{r.project_id} · {r.store_id}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded ${statusStyle[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/60">{packageDefs[r.package_type].label}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/55">¥{r.capex_myen.toFixed(1)}M</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400">+{r.ticket_lift_pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-400">+{r.customer_lift_pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/55">{r.payback_months}ヶ月</td>
                  <td className="px-3 py-2 text-white/40 text-[10px]">{r.start_date} 〜 {r.end_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ---------- Huff Prediction View ----------
interface HuffResult {
  total_monthly_visits: number
  monthly_revenue_estimate_jpy: number
  first_year_revenue_estimate_jpy: number
  breakeven_months_estimate: number
  cannibalization_pct: number
  competitive_density: number
}

function HuffPredictionView() {
  const [lat, setLat] = useState(35.6285)
  const [lng, setLng] = useState(139.7387)
  const [brand, setBrand] = useState("かっぱ寿司")
  const [attractiveness, setAttractiveness] = useState(1.0)
  const [beta, setBeta] = useState(2.0)
  const [result, setResult] = useState<HuffResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runPredict = async () => {
    setLoading(true)
    try {
      const res = await fetchAPI<HuffResult>("/api/v1/vertical/trade-areas/predict-huff", {
        method: "POST",
        body: JSON.stringify({ lat, lng, brand, attractiveness, beta }),
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  const breakevenColor = (m: number) =>
    m < 12 ? "text-emerald-400" : m <= 24 ? "text-amber-400" : "text-red-400"
  const cannibalColor = (p: number) =>
    p < 10 ? "text-emerald-400" : p <= 25 ? "text-amber-400" : "text-red-400"
  const breakevenBg = (m: number) =>
    m < 12 ? "border-emerald-400/20 bg-emerald-400/[0.04]" : m <= 24 ? "border-amber-400/20 bg-amber-400/[0.04]" : "border-red-400/20 bg-red-400/[0.04]"
  const cannibalBg = (p: number) =>
    p < 10 ? "border-emerald-400/20 bg-emerald-400/[0.04]" : p <= 25 ? "border-amber-400/20 bg-amber-400/[0.04]" : "border-red-400/20 bg-red-400/[0.04]"

  return (
    <div className="space-y-4">
      {/* Input form */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-4 font-semibold">予測パラメータ</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-[11px] text-white/50 block mb-1">緯度</label>
            <input type="number" value={lat} step={0.0001} onChange={(e) => setLat(Number(e.target.value))}
              className="w-full text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/40" />
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">経度</label>
            <input type="number" value={lng} step={0.0001} onChange={(e) => setLng(Number(e.target.value))}
              className="w-full text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/40" />
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">ブランド</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}
              className="w-full text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-400/40">
              {["かっぱ寿司","かっぱ寿司","郊外ロードサイド型","食べ放題特化型","都市型"].map((b) => (
                <option key={b} value={b} className="bg-[#0a0e14]">{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">魅力度</label>
            <input type="number" value={attractiveness} step={0.1} min={0.1} max={3.0} onChange={(e) => setAttractiveness(Number(e.target.value))}
              className="w-full text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/40" />
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">距離減衰β</label>
            <input type="number" value={beta} step={0.1} onChange={(e) => setBeta(Number(e.target.value))}
              className="w-full text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/40" />
          </div>
          <div className="flex items-end">
            <button onClick={runPredict} disabled={loading}
              className="w-full px-4 py-1.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-400 text-[12px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50">
              {loading ? "実行中..." : "予測実行"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <ResultCard label="月間来店予測" value={`${result.total_monthly_visits.toLocaleString()}人`} tone="blue" />
          <ResultCard label="月間売上推定" value={`¥${(result.monthly_revenue_estimate_jpy / 10000).toLocaleString()}万`} tone="emerald" />
          <ResultCard label="初年度売上推定" value={`¥${(result.first_year_revenue_estimate_jpy / 100000000).toFixed(2)}億`} tone="emerald" />
          <div className={`rounded-lg border p-4 hover:bg-white/[0.04] transition-colors ${breakevenBg(result.breakeven_months_estimate)}`}>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">損益分岐月</div>
            <div className={`font-mono tabular-nums text-xl font-semibold ${breakevenColor(result.breakeven_months_estimate)}`}>
              {result.breakeven_months_estimate}ヶ月
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {result.breakeven_months_estimate < 12 ? "短期回収" : result.breakeven_months_estimate <= 24 ? "標準的" : "長期回収"}
            </div>
          </div>
          <div className={`rounded-lg border p-4 hover:bg-white/[0.04] transition-colors ${cannibalBg(result.cannibalization_pct)}`}>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">自店食い合い率</div>
            <div className={`font-mono tabular-nums text-xl font-semibold ${cannibalColor(result.cannibalization_pct)}`}>
              {result.cannibalization_pct}%
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {result.cannibalization_pct < 10 ? "低リスク" : result.cannibalization_pct <= 25 ? "要注意" : "高リスク"}
            </div>
          </div>
          <ResultCard label="周辺競合店数" value={`${result.competitive_density}店`} tone="white" />
        </div>
      )}
    </div>
  )
}

function ResultCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "blue" | "white" }) {
  const toneText = { emerald: "text-emerald-400", blue: "text-blue-400", white: "text-white/85" }[tone]
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className={`font-mono tabular-nums text-xl font-semibold ${toneText}`}>{value}</div>
    </div>
  )
}

// ---------- Subcomponents ----------
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded text-[12px] transition-colors ${
        active ? "bg-blue-500/20 text-blue-400" : "text-white/50 hover:text-white/80"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "emerald" | "blue" | "cyan" | "white" }) {
  const toneText = {
    emerald: "text-emerald-400", blue: "text-blue-400", cyan: "text-cyan-400", white: "text-white/85",
  }[tone]
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className={`font-mono tabular-nums text-xl font-semibold ${toneText}`}>{value}</div>
      <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "blue" | "white" }) {
  const toneText = {
    emerald: "text-emerald-400", blue: "text-blue-400", white: "text-white/80",
  }[tone]
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`font-mono tabular-nums text-[13px] font-semibold ${toneText}`}>{value}</div>
    </div>
  )
}
