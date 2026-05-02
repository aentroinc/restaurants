"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  Trash2, UserMinus, Truck, Wrench, MapPin, ArrowRight,
  Circle, ChevronRight, Activity, Building2,
} from "lucide-react"

// =============================================================================
// Local mock data (deterministic — seededRandom(42))
// =============================================================================

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const rng = seededRandom(42)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]
const rand = (min: number, max: number) => Math.round((rng() * (max - min) + min) * 100) / 100
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min

const brands = [
  { brand_id: "gyudon-a", name: "牛丼A", category: "牛丼", color: "#f59e0b" },
  { brand_id: "tonkatsu-b", name: "とんかつB", category: "とんかつ", color: "#8b5cf6" },
  { brand_id: "curry-c", name: "カレーC", category: "カレー", color: "#ef4444" },
  { brand_id: "sushi-d", name: "寿司D", category: "寿司", color: "#06b6d4" },
  { brand_id: "chinese-e", name: "中華E", category: "中華", color: "#22c55e" },
  { brand_id: "famires-f", name: "ファミレスF", category: "ファミレス", color: "#ec4899" },
] as const

type BrandId = (typeof brands)[number]["brand_id"]

const regions = ["北海道","東北","関東","首都圏","中部","東海","関西","中国","四国","九州"] as const
type Region = (typeof regions)[number]

const baseLatLon: Record<Region, [number, number]> = {
  "北海道":   [43.06, 141.35],
  "東北":     [38.26, 140.87],
  "関東":     [36.39, 139.06],
  "首都圏":   [35.68, 139.69],
  "中部":     [36.23, 137.97],
  "東海":     [35.18, 136.91],
  "関西":     [34.69, 135.50],
  "中国":     [34.39, 132.46],
  "四国":     [33.84, 132.77],
  "九州":     [33.59, 130.40],
}

const areasByRegion: Record<Region, string[]> = {
  "北海道":   ["札幌","旭川","函館"],
  "東北":     ["仙台","盛岡","郡山","秋田"],
  "関東":     ["宇都宮","高崎","水戸","土浦"],
  "首都圏":   ["新宿","渋谷","池袋","品川","横浜","千葉","大宮","八王子","町田","立川","川崎","船橋","柏","上野","秋葉原","蒲田"],
  "中部":     ["長野","新潟","甲府","金沢"],
  "東海":     ["名古屋","静岡","浜松","岐阜"],
  "関西":     ["大阪","梅田","難波","京都","神戸","天王寺","堺"],
  "中国":     ["岡山","広島","倉敷"],
  "四国":     ["松山","高松","徳島","高知"],
  "九州":     ["福岡","熊本","鹿児島","北九州","長崎"],
}

const locationTypes = ["駅前","ロードサイド","商業施設","住宅地"] as const

interface Store {
  store_id: string
  name: string
  brand: BrandId
  brand_name: string
  region: Region
  area: string
  location_type: typeof locationTypes[number]
  lat: number
  lon: number
  seats: number
  daily_sales: number
  daily_customers: number
  avg_ticket: number
  health_score: number
  is_critical: boolean
  stockout_risk: boolean
  staff_coverage: number
}

const brandDistribution: BrandId[] = [
  ...Array(70).fill("gyudon-a"),
  ...Array(45).fill("tonkatsu-b"),
  ...Array(35).fill("curry-c"),
  ...Array(40).fill("sushi-d"),
  ...Array(50).fill("chinese-e"),
  ...Array(60).fill("famires-f"),
]

const TOTAL_STORES = 240

const stores: Store[] = Array.from({ length: TOTAL_STORES }, (_, i) => {
  const brandId = brandDistribution[i % brandDistribution.length]
  const brandObj = brands.find(b => b.brand_id === brandId)!
  // Skew distribution toward 首都圏/関西
  const r = rng()
  let region: Region
  if (r < 0.32) region = "首都圏"
  else if (r < 0.48) region = "関西"
  else if (r < 0.60) region = "東海"
  else if (r < 0.70) region = "九州"
  else region = pick(regions)

  const regionAreas = areasByRegion[region]
  const area = regionAreas[Math.floor(rng() * regionAreas.length)]
  const locType = locationTypes[Math.floor(rng() * locationTypes.length)]
  const base = baseLatLon[region]
  const lat = base[0] + (rng() - 0.5) * 1.4
  const lon = base[1] + (rng() - 0.5) * 1.4
  const seats = randInt(40, 120)
  const daily_customers = randInt(180, 720)
  const avg_ticket = randInt(620, 1480)
  const daily_sales = daily_customers * avg_ticket
  const health_score = randInt(28, 96)
  const stockout_risk = rng() < 0.16
  const staff_coverage = rand(0.72, 1.06)
  const is_critical = health_score < 50 || stockout_risk

  return {
    store_id: `S-${String(1001 + i).padStart(4, "0")}`,
    name: `${brandObj.name} ${area}店`,
    brand: brandId,
    brand_name: brandObj.name,
    region,
    area,
    location_type: locType,
    lat,
    lon,
    seats,
    daily_sales,
    daily_customers,
    avg_ticket,
    health_score,
    is_critical,
    stockout_risk,
    staff_coverage,
  }
})

// --- KPI summary ---
const totalDailySales = stores.reduce((s, st) => s + st.daily_sales, 0)
const totalCustomers = stores.reduce((s, st) => s + st.daily_customers, 0)
const avgTicket = Math.round(totalDailySales / totalCustomers)

const kpiSummary = {
  today_sales_forecast_pct: "+4.8%",
  customer_forecast_pct: "+3.2%",
  avg_ticket_yoy: "+¥38",
  gross_margin_yoy: "-0.6pt",
  stockout_risk_stores: stores.filter(s => s.stockout_risk).length,
  waste_risk_myen: 312,
  staffing_gap_slots: 47,
  delivery_delay_routes: 6,
  renovation_ticket_lift: "+7.4%",
  expansion_top_candidates: 18,
  total_daily_sales_oku: (totalDailySales / 100_000_000).toFixed(2),
  total_customers: totalCustomers,
  avg_ticket: avgTicket,
}

// --- Incidents ---
type Severity = "critical" | "high" | "medium" | "low"
type IncidentType =
  | "demand-surge" | "weather-delay" | "stockout-risk" | "staff-shortage"
  | "equipment-failure" | "quality-alert" | "renovation-lift" | "expansion-constraint"

interface Incident {
  incident_id: string
  type: IncidentType
  severity: Severity
  title: string
  description: string
  region: Region | "全国"
  brand?: BrandId
  impacted_stores: number
  ago: string
  status: "active" | "resolved"
}

const incidents: Incident[] = [
  {
    incident_id: "I-2401", type: "demand-surge", severity: "high",
    title: "首都圏ランチ帯で需要急増",
    description: "首都圏駅前22店舗でランチ客数が予測比+18%。牛バラ系SKUの欠品リスク上昇中。",
    region: "首都圏", brand: "gyudon-a", impacted_stores: 22, ago: "23分前", status: "active",
  },
  {
    incident_id: "I-2402", type: "weather-delay", severity: "critical",
    title: "関西配送便に遅延リスク",
    description: "関西14:00-20:00 強雨予報 (降水確率85%)。8ルート、計34店舗のディナー帯に影響。",
    region: "関西", impacted_stores: 34, ago: "1時間前", status: "active",
  },
  {
    incident_id: "I-2403", type: "stockout-risk", severity: "high",
    title: "とんかつBで肉類在庫切迫",
    description: "ロース肉の供給が想定比-12%。明日午後にとんかつB 14店舗で安全在庫割れ予測。",
    region: "全国", brand: "tonkatsu-b", impacted_stores: 14, ago: "2時間前", status: "active",
  },
  {
    incident_id: "I-2404", type: "staff-shortage", severity: "medium",
    title: "九州エリアで人員不足",
    description: "福岡・熊本の17店舗でディナー帯シフトが充足率82%。代替シフト調整中。",
    region: "九州", impacted_stores: 17, ago: "3時間前", status: "active",
  },
  {
    incident_id: "I-2405", type: "equipment-failure", severity: "high",
    title: "中華E 大宮店で厨房設備不調",
    description: "蒸し器2号機が停止。修理手配中、復旧見込み18:00。",
    region: "首都圏", brand: "chinese-e", impacted_stores: 1, ago: "3時間前", status: "active",
  },
  {
    incident_id: "I-2406", type: "quality-alert", severity: "medium",
    title: "ファミレスF 品質スコア低下",
    description: "ファミレスF 関西エリア6店舗の品質スコアが基準値を下回る。改善行動着手。",
    region: "関西", brand: "famires-f", impacted_stores: 6, ago: "5時間前", status: "active",
  },
  {
    incident_id: "I-2407", type: "renovation-lift", severity: "low",
    title: "改装12店舗で客単価+7.4%",
    description: "改装完了から30日経過の12店舗で客単価が想定超過。次期投資を前倒し検討。",
    region: "全国", impacted_stores: 12, ago: "本日", status: "active",
  },
  {
    incident_id: "I-2408", type: "expansion-constraint", severity: "medium",
    title: "出店候補18件、立地審査待ち",
    description: "首都圏8件、関西6件、九州4件で立地審査が滞留。出店ペースに影響可能性。",
    region: "全国", impacted_stores: 18, ago: "本日", status: "active",
  },
]

// --- Actions ---
type ActionStatus = "pending" | "approved" | "in-progress" | "completed"
interface ActionItem {
  action_id: string
  title: string
  owner_role: string
  owner_name: string
  due_date: string
  status: ActionStatus
  expected_impact: string
  confidence: "High" | "Medium" | "Low"
}

const actions: ActionItem[] = [
  { action_id: "A-3101", title: "首都圏向け牛バラ12ケースを朝便で前倒し補充", owner_role: "SCM", owner_name: "佐藤", due_date: "本日 11:00", status: "approved", expected_impact: "欠品22→4店舗", confidence: "High" },
  { action_id: "A-3102", title: "関西午後便を大阪DC経由ルートに切替", owner_role: "Logistics", owner_name: "山田", due_date: "本日 13:30", status: "pending", expected_impact: "遅延90→15分", confidence: "Medium" },
  { action_id: "A-3103", title: "とんかつB 14店舗のメニュー推奨をヒレに一時変更", owner_role: "Marketing", owner_name: "中村", due_date: "本日 16:00", status: "in-progress", expected_impact: "売上機会損失320万円回避", confidence: "High" },
  { action_id: "A-3104", title: "九州エリア人員不足17店舗にヘルプシフト派遣", owner_role: "HR", owner_name: "鈴木", due_date: "本日 17:00", status: "in-progress", expected_impact: "充足率82→96%", confidence: "Medium" },
  { action_id: "A-3105", title: "中華E 大宮店の厨房設備緊急修理", owner_role: "Facilities", owner_name: "高橋", due_date: "本日 18:00", status: "approved", expected_impact: "ディナー営業継続", confidence: "High" },
  { action_id: "A-3106", title: "次期改装候補5店舗の投資承認を前倒し", owner_role: "Strategy", owner_name: "田中", due_date: "今週中", status: "pending", expected_impact: "年間利益+1.2億円", confidence: "High" },
]

// --- KPI cards definition ---
const kpiCards = [
  { label: "本日売上",   sub: "予測比",        value: kpiSummary.today_sales_forecast_pct,             icon: DollarSign,    positive: true,  spark: [62, 64, 68, 71, 74, 76, 80, 84] },
  { label: "客数",       sub: "予測比",        value: kpiSummary.customer_forecast_pct,                icon: Users,         positive: true,  spark: [55, 58, 60, 62, 64, 65, 67, 70] },
  { label: "客単価",     sub: "前年差",        value: kpiSummary.avg_ticket_yoy,                       icon: TrendingUp,    positive: true,  spark: [40, 42, 44, 46, 49, 52, 55, 58] },
  { label: "粗利率",     sub: "前年差",        value: kpiSummary.gross_margin_yoy,                     icon: TrendingDown,  positive: false, spark: [70, 68, 66, 65, 63, 60, 58, 56] },
  { label: "欠品リスク", sub: "店舗数",        value: `${kpiSummary.stockout_risk_stores}店舗`,        icon: AlertTriangle, positive: false, spark: [20, 22, 26, 28, 30, 33, 35, 38] },
  { label: "廃棄リスク", sub: "金額",          value: `${kpiSummary.waste_risk_myen}万円`,             icon: Trash2,        positive: false, spark: [50, 52, 55, 58, 60, 62, 64, 66] },
  { label: "人員不足",   sub: "件数",          value: `${kpiSummary.staffing_gap_slots}件`,            icon: UserMinus,     positive: false, spark: [30, 32, 36, 39, 42, 44, 46, 47] },
  { label: "配送遅延",   sub: "ルート数",      value: `${kpiSummary.delivery_delay_routes}ルート`,     icon: Truck,         positive: false, spark: [4, 4, 5, 5, 5, 6, 6, 6] },
  { label: "改装効果",   sub: "客単価リフト",  value: kpiSummary.renovation_ticket_lift,               icon: Wrench,        positive: true,  spark: [40, 44, 48, 52, 56, 60, 64, 68] },
  { label: "出店候補",   sub: "上位件数",      value: `${kpiSummary.expansion_top_candidates}件`,      icon: MapPin,        positive: true,  spark: [10, 11, 12, 13, 14, 15, 17, 18] },
]

const severityBadge: Record<Severity, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
  high:     "border-amber-500/30 bg-amber-500/10 text-amber-400",
  medium:   "border-blue-400/30 bg-blue-400/10 text-blue-400",
  low:      "border-white/10 bg-white/5 text-white/50",
}

const severityDot: Record<Severity, string> = {
  critical: "bg-red-500",
  high:     "bg-amber-400",
  medium:   "bg-blue-400",
  low:      "bg-white/40",
}

const statusBadge: Record<ActionStatus, { label: string, cls: string }> = {
  pending:       { label: "Open",        cls: "text-amber-400 bg-amber-400/10" },
  approved:      { label: "Approved",    cls: "text-blue-400 bg-blue-400/10" },
  "in-progress": { label: "In progress", cls: "text-cyan-400 bg-cyan-400/10" },
  completed:     { label: "Done",        cls: "text-emerald-400 bg-emerald-400/10" },
}

// =============================================================================
// Component
// =============================================================================

export default function ExecutiveCommandPage() {
  const [region, setRegion] = useState<string>("全国")
  const [selectedBrand, setSelectedBrand] = useState<BrandId | null>(null)

  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (region !== "全国" && s.region !== region) return false
      if (selectedBrand && s.brand !== selectedBrand) return false
      return true
    })
  }, [region, selectedBrand])

  // Brand summary
  const brandSummary = useMemo(() => {
    const totalSales = stores.reduce((s, st) => s + st.daily_sales, 0)
    return brands.map(b => {
      const list = stores.filter(s => s.brand === b.brand_id)
      const sales = list.reduce((sum, s) => sum + s.daily_sales, 0)
      const healthy = list.filter(s => s.health_score >= 70).length
      return {
        ...b,
        store_count: list.length,
        sales_share: totalSales ? sales / totalSales : 0,
        sales_oku: (sales / 100_000_000).toFixed(2),
        yoy_pct: (rand(-1.8, 6.2)).toFixed(1),
        healthy_pct: list.length ? Math.round((healthy / list.length) * 100) : 0,
      }
    })
  }, [])

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader
        title="経営司令塔"
        description="全社オペレーションをリアルタイムで把握"
        region={region}
        onRegionChange={setRegion}
      />

      <div className="px-5 py-5 space-y-5">
        {/* Top status strip */}
        <div className="flex items-center gap-3 text-[11px] text-white/50 flex-wrap">
          <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0" /> {filteredStores.length}店舗 / {TOTAL_STORES}店舗</span>
          <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">本日売上 ¥{kpiSummary.total_daily_sales_oku}億 ({kpiSummary.today_sales_forecast_pct})</span></span>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="hidden sm:inline">客数 {(kpiSummary.total_customers / 10000).toFixed(1)}万人 / 客単価 ¥{kpiSummary.avg_ticket}</span>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            const max = Math.max(...kpi.spark)
            return (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] p-4 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${kpi.positive ? "text-emerald-400/70" : "text-amber-400/70"}`} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 truncate">{kpi.label}</span>
                </div>
                <div className={`font-mono tabular-nums text-2xl font-semibold tracking-tight ${kpi.positive ? "text-emerald-400" : "text-amber-400"}`}>
                  {kpi.value}
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-[10px] text-white/30">{kpi.sub}</span>
                  <div className="flex items-end gap-[2px] h-5">
                    {kpi.spark.map((v, i) => (
                      <div
                        key={i}
                        className={`w-[3px] rounded-sm ${kpi.positive ? "bg-emerald-400/40" : "bg-amber-400/40"}`}
                        style={{ height: `${(v / max) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Map + Signal Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight text-white/80">店舗ネットワーク</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">{filteredStores.length}店舗 / health分布</span>
            </div>
            <div className="relative h-[420px] bg-[#080c12]">
              {/* Japan-ish outline (stylized) */}
              <svg viewBox="0 0 800 600" className="absolute inset-0 w-full h-full opacity-[0.12]" preserveAspectRatio="xMidYMid meet">
                {/* Hokkaido */}
                <path d="M620,80 Q670,90 690,130 Q700,170 670,200 Q640,210 610,200 Q580,180 590,140 Q600,100 620,80Z" fill="none" stroke="white" strokeWidth="1" />
                {/* Honshu */}
                <path d="M180,470 Q220,460 260,450 Q310,440 360,420 Q420,395 480,370 Q540,340 580,310 Q620,280 630,250 Q620,225 590,235 Q540,255 490,270 Q430,290 370,310 Q310,330 260,360 Q210,395 180,430 Q160,455 180,470Z" fill="none" stroke="white" strokeWidth="1" />
                {/* Shikoku */}
                <path d="M380,470 Q420,470 450,485 Q470,500 450,510 Q420,515 390,505 Q370,490 380,470Z" fill="none" stroke="white" strokeWidth="1" />
                {/* Kyushu */}
                <path d="M230,490 Q260,485 285,500 Q300,525 290,555 Q270,575 245,570 Q220,560 215,535 Q210,510 230,490Z" fill="none" stroke="white" strokeWidth="1" />
              </svg>

              {/* Store dots */}
              {filteredStores.map((store) => {
                // Mapping: lon 128–146, lat 31–46 → 0–100% range
                const xPct = Math.max(3, Math.min(97, ((store.lon - 128) / 18) * 100))
                const yPct = Math.max(3, Math.min(97, ((46 - store.lat) / 15) * 100))
                const color =
                  store.is_critical ? "#ef4444" :
                  store.health_score < 65 ? "#f59e0b" :
                  store.health_score < 80 ? "#22d3ee" :
                  "#22c55e"
                return (
                  <Link
                    key={store.store_id}
                    href={`/stores/${store.store_id}`}
                    className="absolute rounded-full transition-all duration-150 hover:scale-[2.5] hover:z-20"
                    style={{
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      width: 6,
                      height: 6,
                      backgroundColor: color,
                      opacity: 0.75,
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 6px ${color}66`,
                    }}
                    title={`${store.name} / health ${store.health_score}`}
                  />
                )
              })}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] uppercase tracking-wider text-white/40 bg-black/50 backdrop-blur-sm rounded-md px-3 py-2 border border-white/[0.06]">
                <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />健全</span>
                <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-cyan-400 text-cyan-400" />要注視</span>
                <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-amber-400 text-amber-400" />要改善</span>
                <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-red-500 text-red-500" />危険</span>
              </div>

              {/* Region filter chips */}
              <div className="absolute top-3 right-3 text-[10px] text-white/30">
                クリックで店舗詳細
              </div>
            </div>
          </div>

          {/* Signal feed */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight text-white/80">重要シグナル</span>
              <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                {incidents.filter(i => i.status === "active").length} active
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              {incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot[inc.severity]} ${inc.status === "active" ? "animate-pulse" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white/80 font-medium leading-snug">{inc.title}</p>
                      <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityBadge[inc.severity]} font-medium`}>
                          {inc.severity}
                        </span>
                        <span className="text-[10px] text-white/30">{inc.region}</span>
                        <span className="text-[10px] text-white/25">·</span>
                        <span className="text-[10px] text-white/30">{inc.impacted_stores}店舗</span>
                        <span className="ml-auto text-[10px] text-white/25 font-mono">{inc.ago}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/15 shrink-0 mt-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Brand breakdown + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight text-white/80">ブランド別内訳</span>
              {selectedBrand && (
                <button
                  onClick={() => setSelectedBrand(null)}
                  className="text-[10px] text-blue-400 hover:text-blue-300"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="p-3 space-y-2">
              {brandSummary.map((b) => {
                const yoy = parseFloat(b.yoy_pct)
                const active = selectedBrand === b.brand_id
                return (
                  <button
                    key={b.brand_id}
                    onClick={() => setSelectedBrand(active ? null : b.brand_id)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 transition-all ${
                      active
                        ? "border-blue-400/40 bg-blue-500/[0.08]"
                        : "border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
                        <span className="text-[13px] text-white/80 font-medium">{b.name}</span>
                        <span className="text-[10px] text-white/30">{b.category}</span>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-white/50">{b.store_count}店</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${b.sales_share * 100}%`, backgroundColor: b.color, opacity: 0.65 }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px]">
                      <span className="text-white/40 font-mono tabular-nums">¥{b.sales_oku}億/日</span>
                      <span className={`font-mono tabular-nums ${yoy >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {yoy >= 0 ? "+" : ""}{b.yoy_pct}% YoY
                      </span>
                      <span className={`font-mono tabular-nums ${b.healthy_pct >= 70 ? "text-emerald-400/70" : b.healthy_pct >= 50 ? "text-amber-400/70" : "text-red-400/70"}`}>
                        健全{b.healthy_pct}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action queue */}
          <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight text-white/80">対応アクション</span>
              <Link href="/tasks" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                すべて表示 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {actions.map((act) => {
                const s = statusBadge[act.status]
                return (
                  <div key={act.action_id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium shrink-0 w-[88px] text-center ${s.cls}`}>
                      {s.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white/80 truncate">{act.title}</p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        {act.owner_role} · {act.owner_name}
                        <span className="text-white/20 mx-1.5">·</span>
                        期限 {act.due_date}
                        <span className="text-white/20 mx-1.5">·</span>
                        <span className="text-emerald-400/80">{act.expected_impact}</span>
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      act.confidence === "High" ? "text-emerald-400 bg-emerald-400/10" :
                      act.confidence === "Medium" ? "text-amber-400 bg-amber-400/10" :
                      "text-red-400 bg-red-400/10"
                    }`}>
                      {act.confidence}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
