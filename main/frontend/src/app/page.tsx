"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  Trash2, UserMinus, Truck, Wrench, MapPin, ArrowRight,
  Circle, ChevronRight, Activity, Building2, Smartphone,
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
  { brand_id: "kappa-roadside", name: "郊外ロードサイド型", category: "回転寿司", color: "#22c55e" },
  { brand_id: "kappa-urban", name: "都市型", category: "回転寿司", color: "#3b82f6" },
  { brand_id: "kappa-tabehoudai", name: "食べ放題特化型", category: "回転寿司", color: "#f59e0b" },
  { brand_id: "bannou-suisan", name: "バンノウ水産", category: "海鮮", color: "#06b6d4" },
  { brand_id: "delica", name: "デリカ事業", category: "製造", color: "#a855f7" },
] as const

type BrandId = (typeof brands)[number]["brand_id"]

const regions = ["東北","北関東","首都圏","中部","東海","関西","九州"] as const
type Region = (typeof regions)[number]

const baseLatLon: Record<Region, [number, number]> = {
  "東北":     [37.75, 140.47],
  "北関東":   [36.39, 139.06],
  "首都圏":   [35.68, 139.69],
  "中部":     [36.23, 138.18],
  "東海":     [35.18, 138.38],
  "関西":     [34.69, 135.50],
  "九州":     [33.59, 130.40],
}

const areasByRegion: Record<Region, string[]> = {
  "東北":     ["福島","郡山","仙台","山形","秋田"],
  "北関東":   ["高崎","前橋","宇都宮","水戸","つくば"],
  "首都圏":   ["池袋","吉祥寺","亀戸","横浜","川崎","大宮","千葉","船橋","柏","八王子","町田","練馬","板橋","所沢","越谷"],
  "中部":     ["長野","松本","上田","新潟","甲府"],
  "東海":     ["静岡","浜松","名古屋","沼津"],
  "関西":     ["大阪","神戸","京都","堺","姫路"],
  "九州":     ["福岡","北九州","熊本"],
}

const brandStoreNames: Record<BrandId, string[]> = {
  "kappa-roadside": ["長野稲里店","松本村井店","上田国分店","福島南店","郡山安積店","仙台泉店","高崎飯塚店","宇都宮鶴田店","水戸笠原店","さいたま大宮店","横浜六角橋店","千葉都賀店","船橋薬円台店","柏旭町店","新潟紫竹山店","甲府上阿原店","静岡国吉田店","浜松志都呂店","名古屋守山店","大阪鶴見店","神戸多聞店","京都伏見店","福岡志免店","熊本光の森店","八王子堀之内店","町田鶴川店","川崎宮前店","越谷レイクタウン店","練馬光が丘店","板橋前野店"],
  "kappa-urban": ["南池袋店","吉祥寺店","亀戸店","横浜駅前店","川崎ラゾーナ店","大宮駅東口店","千葉駅前店","新潟駅前店","静岡パルコ店","名古屋栄店","大阪梅田店","神戸三宮店","京都河原町店"],
  "kappa-tabehoudai": ["長野稲里食べ放題店","郡山安積食べ放題店","さいたま大宮食べ放題店","横浜六角橋食べ放題店","名古屋守山食べ放題店","大阪鶴見食べ放題店","福岡志免食べ放題店"],
  "bannou-suisan": ["静岡清水店","浜松志都呂店"],
  "delica": ["横浜工場","長野工場","仙台工場"],
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
  ...Array(75).fill("kappa-roadside"),
  ...Array(13).fill("kappa-urban"),
  ...Array(7).fill("kappa-tabehoudai"),
  ...Array(2).fill("bannou-suisan"),
  ...Array(3).fill("delica"),
]

const TOTAL_STORES = 100

// Brand-specific KPI ranges
const brandKPIs: Record<BrandId, { avgTicketMin: number; avgTicketMax: number; dailySalesMin: number; dailySalesMax: number; seatsMin: number; seatsMax: number }> = {
  "kappa-roadside":   { avgTicketMin: 1000, avgTicketMax: 1300, dailySalesMin: 400000,  dailySalesMax: 1000000, seatsMin: 200, seatsMax: 260 },
  "kappa-urban":      { avgTicketMin: 1200, avgTicketMax: 1600, dailySalesMin: 350000,  dailySalesMax: 800000,  seatsMin: 30,  seatsMax: 80 },
  "kappa-tabehoudai": { avgTicketMin: 2500, avgTicketMax: 3500, dailySalesMin: 500000,  dailySalesMax: 1200000, seatsMin: 150, seatsMax: 250 },
  "bannou-suisan":    { avgTicketMin: 1500, avgTicketMax: 2200, dailySalesMin: 300000,  dailySalesMax: 600000,  seatsMin: 40,  seatsMax: 80 },
  "delica":           { avgTicketMin: 200,  avgTicketMax: 500,  dailySalesMin: 200000,  dailySalesMax: 500000,  seatsMin: 0,   seatsMax: 0 },
}

// Track store name counters per brand
const brandStoreCounter: Record<BrandId, number> = { "kappa-roadside": 0, "kappa-urban": 0, "kappa-tabehoudai": 0, "bannou-suisan": 0, "delica": 0 }

const stores: Store[] = Array.from({ length: TOTAL_STORES }, (_, i) => {
  const brandId = brandDistribution[i % brandDistribution.length]
  const brandObj = brands.find(b => b.brand_id === brandId)!
  const kpiRange = brandKPIs[brandId]
  // Skew distribution toward 中部(長野最多)/東北/首都圏
  const r = rng()
  let region: Region
  if (r < 0.25) region = "中部"
  else if (r < 0.45) region = "東北"
  else if (r < 0.60) region = "首都圏"
  else if (r < 0.72) region = "北関東"
  else region = pick(regions)

  const regionAreas = areasByRegion[region]
  const area = regionAreas[Math.floor(rng() * regionAreas.length)]
  const locType = locationTypes[Math.floor(rng() * locationTypes.length)]
  const base = baseLatLon[region]
  const lat = base[0] + (rng() - 0.5) * 1.4
  const lon = base[1] + (rng() - 0.5) * 1.4
  const seats = randInt(kpiRange.seatsMin, kpiRange.seatsMax)
  const avg_ticket = randInt(kpiRange.avgTicketMin, kpiRange.avgTicketMax)
  const daily_sales = randInt(kpiRange.dailySalesMin, kpiRange.dailySalesMax)
  const daily_customers = Math.round(daily_sales / avg_ticket)
  const health_score = randInt(28, 96)
  const stockout_risk = rng() < 0.16
  const staff_coverage = rand(0.72, 1.06)
  const is_critical = health_score < 50 || stockout_risk

  // Use realistic store names from the brand list, cycling through
  const nameList = brandStoreNames[brandId]
  const nameIdx = brandStoreCounter[brandId] % nameList.length
  brandStoreCounter[brandId]++
  const storeName = `${brandObj.name} ${nameList[nameIdx]}`

  return {
    store_id: `S-${String(1001 + i).padStart(4, "0")}`,
    name: storeName,
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
    incident_id: "I-2401", type: "stockout-risk", severity: "critical",
    title: "全店 客数12ヶ月連続前年割れ、郊外ロードサイド型で顕著",
    description: "全店既存店客数が12ヶ月連続で前年を下回る。特に郊外ロードサイド型で前年比-8.3%。スシロー・はま寿司との競争激化が主因。",
    region: "全国", brand: "kappa-roadside", impacted_stores: 75, ago: "23分前", status: "active",
  },
  {
    incident_id: "I-2402", type: "stockout-risk", severity: "critical",
    title: "原材料費高騰で原価率48%→50.2%に悪化",
    description: "まぐろ仕入価格が前年比+18%、米が+15%、海苔が+12%上昇。業界最悪水準の原価率がさらに悪化。代替調達先を緊急選定中。",
    region: "全国", brand: "kappa-roadside", impacted_stores: 95, ago: "1時間前", status: "active",
  },
  {
    incident_id: "I-2403", type: "quality-alert", severity: "high",
    title: "食べ放題特化型で廃棄率8.5%、目標5%を大幅超過",
    description: "食べ放題7店舗で廃棄率が平均8.5%に上昇。特にウニ・中とろなど高単価ネタの廃棄が深刻。需要予測精度の向上が急務。",
    region: "全国", brand: "kappa-tabehoudai", impacted_stores: 7, ago: "2時間前", status: "active",
  },
  {
    incident_id: "I-2404", type: "demand-surge", severity: "medium",
    title: "都市型出店（南池袋、吉祥寺、亀戸）の初期立ち上がり",
    description: "東京都内8年ぶり出店の3店舗が順調。客数は計画比+15%で推移。吉祥寺店は行列対応が課題。",
    region: "首都圏", brand: "kappa-urban", impacted_stores: 3, ago: "3時間前", status: "active",
  },
  {
    incident_id: "I-2405", type: "staff-shortage", severity: "high",
    title: "人件費上昇、最低賃金改定の影響で全店人件費率+1.2pt",
    description: "最低賃金改定の影響で全店の人件費率が前年比+1.2pt上昇。DX化の遅れもあり、スシローに比べ人時売上が低い状態。",
    region: "全国", impacted_stores: 95, ago: "3時間前", status: "active",
  },
  {
    incident_id: "I-2406", type: "quality-alert", severity: "medium",
    title: "不祥事後のブランド回復途上、口コミ3.2→3.0に低下",
    description: "2022年の営業秘密不正取得事件からの信頼回復が停滞。口コミスコアが直近3ヶ月で0.2pt低下。SNS対策強化中。",
    region: "全国", impacted_stores: 95, ago: "5時間前", status: "active",
  },
  {
    incident_id: "I-2407", type: "stockout-risk", severity: "medium",
    title: "デリカ事業 コンビニ向け製造部門が赤字継続",
    description: "デリカ事業3拠点の営業利益率が-2.3%。原材料費高騰と受注単価の据置きが主因。コンビニチェーンとの価格交渉が急務。",
    region: "全国", brand: "delica", impacted_stores: 3, ago: "本日", status: "active",
  },
  {
    incident_id: "I-2408", type: "expansion-constraint", severity: "low",
    title: "スシロー・はま寿司との客単価差が拡大",
    description: "上位3社（スシロー、くら寿司、はま寿司）との店舗数・売上差が拡大傾向。差別化戦略の再構築を検討。",
    region: "全国", impacted_stores: 95, ago: "本日", status: "active",
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
  { action_id: "A-3101", title: "まぐろ・米の代替調達先3社と緊急価格交渉", owner_role: "SCM", owner_name: "山田", due_date: "本日 11:00", status: "approved", expected_impact: "原価率2pt改善", confidence: "High" },
  { action_id: "A-3102", title: "食べ放題7店舗で廃棄予測AI導入・仕込み量最適化", owner_role: "営業企画", owner_name: "佐藤", due_date: "本日 13:30", status: "pending", expected_impact: "廃棄率8.5→5%", confidence: "Medium" },
  { action_id: "A-3103", title: "都市型新規3店舗（南池袋・吉祥寺・亀戸）の行列対策", owner_role: "営業部", owner_name: "中村", due_date: "本日 16:00", status: "in-progress", expected_impact: "客数+20%見込", confidence: "High" },
  { action_id: "A-3104", title: "全店DX化推進：配膳ロボット・セルフレジ拡大", owner_role: "DX推進", owner_name: "鈴木", due_date: "本日 17:00", status: "in-progress", expected_impact: "人件費率-1.5pt", confidence: "Medium" },
  { action_id: "A-3105", title: "ブランド信頼回復：コンプライアンス強化発信", owner_role: "広報", owner_name: "高橋", due_date: "本日 18:00", status: "approved", expected_impact: "口コミ+0.3pt", confidence: "High" },
  { action_id: "A-3106", title: "デリカ事業 コンビニ向け高付加価値商品開発", owner_role: "商品開発", owner_name: "田中", due_date: "今週中", status: "pending", expected_impact: "赤字解消見込", confidence: "High" },
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
        {/* Manager PWA entry point */}
        <Link
          href="/manager"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90 truncate">AENTRO 店長 PWA</div>
              <div className="text-[11px] text-white/50 truncate">スマホ・タブレットから日報/廃棄/クレーム/修理/シフトを4タップで完結</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
        </Link>

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
                <Link
                  key={inc.incident_id}
                  href="/incidents"
                  className="block px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
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
                </Link>
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
                  <Link key={act.action_id} href="/tasks" className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
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
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
