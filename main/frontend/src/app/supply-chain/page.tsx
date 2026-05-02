"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { ScenarioComparison, type Scenario } from "@/components/scenario-comparison"
import {
  Factory, Warehouse, Truck, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Activity,
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
const rand = (min: number, max: number) => Math.round((rng() * (max - min) + min) * 100) / 100
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const pickIdx = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]

const regions = ["北海道","東北","関東","首都圏","中部","東海","関西","中国","四国","九州"] as const
type Region = (typeof regions)[number]

interface FactoryNode {
  factory_id: string
  name: string
  region: Region
  capacity_tons_day: number
  utilization: number
  variance_pct: number
  status: "normal" | "high-load" | "over"
  lat: number
  lon: number
}

const factories: FactoryNode[] = [
  { factory_id: "F-1", name: "川島生産物流センター", region: "関東",   capacity_tons_day: 240, utilization: 0.87, variance_pct: 4.2,  status: "high-load", lat: 36.0, lon: 139.5 },
  { factory_id: "F-2", name: "嵐山工場",             region: "関西",   capacity_tons_day: 180, utilization: 0.71, variance_pct: -2.1, status: "normal",    lat: 35.0, lon: 135.6 },
  { factory_id: "F-3", name: "東海セントラル工場",   region: "東海",   capacity_tons_day: 160, utilization: 0.78, variance_pct: 1.4,  status: "normal",    lat: 35.1, lon: 136.9 },
  { factory_id: "F-4", name: "九州工場",             region: "九州",   capacity_tons_day: 120, utilization: 0.93, variance_pct: 6.8,  status: "over",      lat: 33.6, lon: 130.4 },
]

interface DCNode {
  dc_id: string
  name: string
  region: Region
  throughput_capacity: number
  current_throughput: number
  bottleneck: boolean
  lat: number
  lon: number
}

const distributionCenters: DCNode[] = [
  { dc_id: "DC-1", name: "首都圏DC",   region: "首都圏", throughput_capacity: 380, current_throughput: 342, bottleneck: false, lat: 35.7, lon: 139.7 },
  { dc_id: "DC-2", name: "六甲センター", region: "関西",   throughput_capacity: 280, current_throughput: 275, bottleneck: true,  lat: 34.7, lon: 135.4 },
  { dc_id: "DC-3", name: "東海DC",     region: "東海",   throughput_capacity: 220, current_throughput: 168, bottleneck: false, lat: 35.2, lon: 136.9 },
  { dc_id: "DC-4", name: "九州DC",     region: "九州",   throughput_capacity: 180, current_throughput: 165, bottleneck: true,  lat: 33.6, lon: 130.4 },
]

type RouteStatus = "on-time" | "at-risk" | "delayed"
interface Route {
  route_id: string
  origin_dc: string
  destination_area: string
  destination_region: Region
  status: RouteStatus
  delay_minutes: number
  affected_stores: number
  eta_hours: number
  load_pct: number
  departure_time: string
  affected_menus: string[]
  tons: number
}

const destinationAreasByRegion: Record<Region, string[]> = {
  "北海道":   ["札幌","旭川"],
  "東北":     ["仙台","盛岡"],
  "関東":     ["宇都宮","高崎","水戸"],
  "首都圏":   ["新宿","渋谷","池袋","横浜","千葉","大宮","町田","川崎","船橋","柏"],
  "中部":     ["長野","新潟","金沢"],
  "東海":     ["名古屋","静岡","浜松"],
  "関西":     ["大阪","梅田","難波","京都","神戸","天王寺"],
  "中国":     ["岡山","広島"],
  "四国":     ["松山","高松"],
  "九州":     ["福岡","熊本","鹿児島","北九州"],
}

const menuSamples = [
  "牛丼系全般", "とんかつ定食", "カレー全般", "寿司ランチ", "中華定食", "ファミレス朝食",
  "豚丼", "肉味噌うどん", "海鮮丼", "ハンバーグ", "唐揚げ定食", "ラーメン",
]

const routes: Route[] = Array.from({ length: 40 }, (_, i) => {
  const dc = distributionCenters[i % distributionCenters.length]
  const region = pickIdx(regions as unknown as Region[])
  const areas = destinationAreasByRegion[region]
  const area = areas[Math.floor(rng() * areas.length)]
  const r = rng()
  let status: RouteStatus
  let delay = 0
  if (r < 0.10) { status = "delayed";  delay = randInt(45, 120) }
  else if (r < 0.25) { status = "at-risk"; delay = randInt(15, 40) }
  else { status = "on-time"; delay = 0 }
  return {
    route_id: `R-${String(i + 1).padStart(3, "0")}`,
    origin_dc: dc.dc_id,
    destination_area: area,
    destination_region: region,
    status,
    delay_minutes: delay,
    affected_stores: randInt(2, 9),
    eta_hours: rand(1.5, 6.5),
    load_pct: rand(0.62, 0.98),
    departure_time: `${String(randInt(4, 20)).padStart(2, "0")}:${rng() < 0.5 ? "00" : "30"}`,
    affected_menus: [
      menuSamples[Math.floor(rng() * menuSamples.length)],
      menuSamples[Math.floor(rng() * menuSamples.length)],
    ],
    tons: rand(2.4, 9.8),
  }
})

const statusBadge: Record<RouteStatus, string> = {
  "on-time":  "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "at-risk":  "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "delayed":  "text-red-400 bg-red-400/10 border-red-400/30",
}

const statusStrokeColor: Record<RouteStatus, string> = {
  "on-time":  "#22c55e",
  "at-risk":  "#f59e0b",
  "delayed":  "#ef4444",
}

// =============================================================================
// Component
// =============================================================================

export default function SupplyChainTwinPage() {
  const [region, setRegion] = useState<string>("全国")
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

  const filteredRoutes = useMemo(() => {
    if (region === "全国") return routes
    return routes.filter(r => r.destination_region === region)
  }, [region])

  const onTime = filteredRoutes.filter(r => r.status === "on-time").length
  const atRisk = filteredRoutes.filter(r => r.status === "at-risk").length
  const delayed = filteredRoutes.filter(r => r.status === "delayed").length

  // Sort routes for the detail list (problems first)
  const sortedRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) => {
      const order = { delayed: 0, "at-risk": 1, "on-time": 2 } as const
      return order[a.status] - order[b.status]
    })
  }, [filteredRoutes])

  // Aggregate route flow factory→DC→region for network graph
  const dcFlows = useMemo(() => {
    return distributionCenters.map(dc => {
      const dcRoutes = filteredRoutes.filter(r => r.origin_dc === dc.dc_id)
      const tons = dcRoutes.reduce((s, r) => s + r.tons, 0)
      const worst: RouteStatus = dcRoutes.some(r => r.status === "delayed")
        ? "delayed"
        : dcRoutes.some(r => r.status === "at-risk") ? "at-risk" : "on-time"
      return { ...dc, route_count: dcRoutes.length, tons, worst_status: worst }
    })
  }, [filteredRoutes])

  // Region nodes for the right column (aggregated)
  const regionAggregates = useMemo(() => {
    return regions.map(reg => {
      const list = filteredRoutes.filter(r => r.destination_region === reg)
      const worst: RouteStatus = list.some(r => r.status === "delayed")
        ? "delayed"
        : list.some(r => r.status === "at-risk") ? "at-risk" : "on-time"
      return { region: reg, count: list.length, worst_status: worst }
    }).filter(r => r.count > 0)
  }, [filteredRoutes])

  const [selectedScenario, setSelectedScenario] = useState<string | undefined>("A")

  const scenarios: Scenario[] = [
    {
      id: "A",
      label: "案A: 大阪DC経由ルートに切替",
      description: "六甲センターの関西午後便を大阪DC経由に振り替え、遅延の影響を最小化する。",
      pros: [
        "遅延を90分→15分に短縮",
        "ディナー帯の欠品リスクを大幅軽減",
        "既存の代替ルートで実行可能",
      ],
      cons: [
        "大阪DC側の積載率が+8%上昇",
        "切替コスト+3.2万円/便",
      ],
      expected_impact: [
        { metric: "遅延時間", value: "90 → 15", unit: "分" },
        { metric: "影響店舗数", value: "34 → 5", unit: "店" },
        { metric: "追加コスト", value: "+3.2", unit: "万円" },
      ],
      confidence: "High",
      risk: "Low",
      recommended: true,
    },
    {
      id: "B",
      label: "案B: 出荷を2時間前倒し",
      description: "天候悪化前に出荷を完了させ、遅延の影響を限定的にする。",
      pros: [
        "遅延を90分→30分に短縮",
        "ルート変更不要、現場負荷小",
      ],
      cons: [
        "工場の出荷スケジュール変更が必要",
        "夜間シフトへの影響あり",
      ],
      expected_impact: [
        { metric: "遅延時間", value: "90 → 30", unit: "分" },
        { metric: "影響店舗数", value: "34 → 12", unit: "店" },
        { metric: "追加コスト", value: "+1.8", unit: "万円" },
      ],
      confidence: "Medium",
      risk: "Medium",
    },
    {
      id: "C",
      label: "案C: メニュー推奨を在庫豊富品に変更",
      description: "対象店舗の券売機推奨・看板表示を、在庫が潤沢なメニューに一時切替。",
      pros: [
        "オペレーション負荷ほぼゼロ",
        "欠品リスクを-65%軽減",
      ],
      cons: [
        "売上機会損失の可能性 (推定-180万円)",
        "顧客体験のばらつき",
      ],
      expected_impact: [
        { metric: "欠品リスク", value: "-65", unit: "%" },
        { metric: "売上影響", value: "-180", unit: "万円" },
        { metric: "実行時間", value: "30", unit: "分" },
      ],
      confidence: "Medium",
      risk: "Medium",
    },
  ]

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader
        title="サプライチェーン Twin"
        description="工場・配送・店舗ネットワークの一元監視"
        region={region}
        onRegionChange={setRegion}
      />

      <div className="px-5 py-5 space-y-4">
        {/* Live status strip */}
        <div className="flex items-center gap-3 text-[11px] text-white/50">
          <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {filteredRoutes.length}ルート稼働中</span>
          <span className="text-emerald-400 font-mono tabular-nums">{onTime} on-time</span>
          <span className="text-amber-400 font-mono tabular-nums">{atRisk} at-risk</span>
          <span className="text-red-400 font-mono tabular-nums">{delayed} delayed</span>
        </div>

        {/* Top row: Factories + DCs + Route Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Factory utilization */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Factory className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              <span className="text-[15px] font-semibold tracking-tight text-white/80">工場稼働率</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">{factories.length}拠点</span>
            </div>
            <div className="space-y-3">
              {factories.map((f) => (
                <div key={f.factory_id} className="rounded-md border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] p-2.5 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0">
                      <div className="text-[12px] text-white/80 truncate">{f.name}</div>
                      <div className="text-[10px] text-white/40">{f.region} · {f.capacity_tons_day}t/日</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      f.status === "over" ? "bg-red-400/10 text-red-400" :
                      f.status === "high-load" ? "bg-amber-400/10 text-amber-400" :
                      "bg-emerald-400/10 text-emerald-400"
                    }`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          f.utilization > 0.90 ? "bg-red-400/70" :
                          f.utilization > 0.85 ? "bg-amber-400/70" :
                          "bg-emerald-400/70"
                        }`}
                        style={{ width: `${f.utilization * 100}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-mono tabular-nums ${
                      f.utilization > 0.90 ? "text-red-400" :
                      f.utilization > 0.85 ? "text-amber-400" :
                      "text-white/60"
                    }`}>
                      {(f.utilization * 100).toFixed(0)}%
                    </span>
                    <span className={`text-[10px] font-mono tabular-nums w-12 text-right ${f.variance_pct >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                      {f.variance_pct >= 0 ? "+" : ""}{f.variance_pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DCs */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Warehouse className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
              <span className="text-[15px] font-semibold tracking-tight text-white/80">配送センター(DC)</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">{distributionCenters.length}拠点</span>
            </div>
            <div className="space-y-3">
              {distributionCenters.map((dc) => {
                const ratio = dc.current_throughput / dc.throughput_capacity
                return (
                  <div key={dc.dc_id} className="rounded-md border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] p-2.5 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <div className="text-[12px] text-white/80 truncate flex items-center gap-1.5">
                          {dc.name}
                          {dc.bottleneck && (
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                        <div className="text-[10px] text-white/40">{dc.region} · {dc.throughput_capacity}t/日</div>
                      </div>
                      {dc.bottleneck && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">
                          bottleneck
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${ratio > 0.95 ? "bg-red-400/70" : ratio > 0.85 ? "bg-amber-400/70" : "bg-cyan-400/70"}`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-mono tabular-nums ${ratio > 0.95 ? "text-red-400" : ratio > 0.85 ? "text-amber-400" : "text-white/60"}`}>
                        {(ratio * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Route status summary */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-white/50" strokeWidth={1.5} />
              <span className="text-[15px] font-semibold tracking-tight text-white/80">配送ルート状態</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">{filteredRoutes.length}ルート</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { k: "on-time", label: "On-time",  v: onTime,  c: "text-emerald-400" },
                { k: "at-risk", label: "At-risk",  v: atRisk,  c: "text-amber-400"   },
                { k: "delayed", label: "Delayed",  v: delayed, c: "text-red-400"     },
              ].map(s => (
                <div key={s.k} className="rounded-md border border-white/[0.04] bg-white/[0.02] py-3 text-center">
                  <div className={`text-2xl font-mono tabular-nums font-semibold ${s.c}`}>{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden flex">
              <div className="bg-emerald-400/60" style={{ width: `${(onTime / Math.max(1, filteredRoutes.length)) * 100}%` }} />
              <div className="bg-amber-400/60" style={{ width: `${(atRisk / Math.max(1, filteredRoutes.length)) * 100}%` }} />
              <div className="bg-red-400/60"   style={{ width: `${(delayed / Math.max(1, filteredRoutes.length)) * 100}%` }} />
            </div>
            <div className="mt-3 text-[11px] text-white/50">
              平均遅延 {filteredRoutes.length ? Math.round(filteredRoutes.reduce((s, r) => s + r.delay_minutes, 0) / filteredRoutes.length) : 0}分 ·
              影響店舗 {filteredRoutes.filter(r => r.status !== "on-time").reduce((s, r) => s + r.affected_stores, 0)}店
            </div>
          </div>
        </div>

        {/* Network graph */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[15px] font-semibold tracking-tight text-white/80">ネットワークグラフ — 工場 → DC → エリア</span>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-emerald-400/70" />on-time</span>
              <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-amber-400/70" />at-risk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-red-400/70" />delayed</span>
              <span className="text-white/25">·</span>
              <span>線の太さ = トン数</span>
            </div>
          </div>
          <div className="relative h-[420px] bg-[#080c12]">
            <svg viewBox="0 0 1000 420" className="absolute inset-0 w-full h-full">
              <defs>
                {(["on-time","at-risk","delayed"] as RouteStatus[]).map(st => (
                  <marker key={st} id={`arrow-${st}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill={statusStrokeColor[st]} opacity="0.7" />
                  </marker>
                ))}
              </defs>

              {/* Column headers */}
              <text x="120" y="28" fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="middle" letterSpacing="2">FACTORY</text>
              <text x="500" y="28" fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="middle" letterSpacing="2">DC</text>
              <text x="880" y="28" fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="middle" letterSpacing="2">REGION</text>

              {/* Edges: factory → DC */}
              {factories.map((f, i) => {
                const fY = 80 + i * 80
                return distributionCenters.map((dc, j) => {
                  const dcY = 80 + j * 80
                  // Visualize each factory feeding all DCs proportional to factory utilization
                  const tons = f.capacity_tons_day * f.utilization * 0.25
                  const stroke = f.utilization > 0.90 ? "#ef4444" : f.utilization > 0.85 ? "#f59e0b" : "rgba(255,255,255,0.18)"
                  const sw = Math.max(0.4, Math.min(3.5, tons / 22))
                  return (
                    <line
                      key={`${f.factory_id}-${dc.dc_id}`}
                      x1="200" y1={fY}
                      x2="430" y2={dcY}
                      stroke={stroke}
                      strokeWidth={sw}
                      opacity={0.6}
                    />
                  )
                })
              })}

              {/* Edges: DC → region (per-route, but we sample) */}
              {dcFlows.map((dc, j) => {
                const dcY = 80 + j * 80
                return regionAggregates.map((reg, k) => {
                  // Find the worst-status route from dc to reg
                  const list = filteredRoutes.filter(r => r.origin_dc === dc.dc_id && r.destination_region === reg.region)
                  if (list.length === 0) return null
                  const worst: RouteStatus = list.some(r => r.status === "delayed") ? "delayed"
                    : list.some(r => r.status === "at-risk") ? "at-risk" : "on-time"
                  const tons = list.reduce((s, r) => s + r.tons, 0)
                  const sw = Math.max(0.5, Math.min(4, tons / 8))
                  const regY = 60 + k * (300 / Math.max(1, regionAggregates.length))
                  return (
                    <line
                      key={`${dc.dc_id}-${reg.region}`}
                      x1="570" y1={dcY}
                      x2="820" y2={regY}
                      stroke={statusStrokeColor[worst]}
                      strokeWidth={sw}
                      opacity={0.55}
                      markerEnd={`url(#arrow-${worst})`}
                    />
                  )
                })
              })}

              {/* Factory nodes */}
              {factories.map((f, i) => {
                const fY = 80 + i * 80
                const color = f.status === "over" ? "#ef4444" : f.status === "high-load" ? "#f59e0b" : "#3b82f6"
                return (
                  <g key={f.factory_id}>
                    <rect x="50" y={fY - 24} width="160" height="48" rx="6"
                      fill="rgba(255,255,255,0.03)" stroke={color} strokeOpacity="0.5" />
                    <text x="130" y={fY - 6} fontSize="11" fill="rgba(255,255,255,0.85)" textAnchor="middle">{f.name}</text>
                    <text x="130" y={fY + 12} fontSize="10" fill={color} textAnchor="middle" fontFamily="monospace">
                      {(f.utilization * 100).toFixed(0)}% / {f.capacity_tons_day}t
                    </text>
                  </g>
                )
              })}

              {/* DC nodes */}
              {dcFlows.map((dc, j) => {
                const dcY = 80 + j * 80
                const color = dc.bottleneck ? "#f59e0b" : "#06b6d4"
                return (
                  <g key={dc.dc_id}>
                    <rect x="430" y={dcY - 22} width="140" height="44" rx="6"
                      fill="rgba(255,255,255,0.03)" stroke={color} strokeOpacity="0.5" />
                    <text x="500" y={dcY - 4} fontSize="11" fill="rgba(255,255,255,0.85)" textAnchor="middle">{dc.name}</text>
                    <text x="500" y={dcY + 12} fontSize="10" fill={color} textAnchor="middle" fontFamily="monospace">
                      {dc.route_count}rt / {dc.tons.toFixed(0)}t
                    </text>
                  </g>
                )
              })}

              {/* Region nodes */}
              {regionAggregates.map((reg, k) => {
                const regY = 60 + k * (300 / Math.max(1, regionAggregates.length))
                const color = statusStrokeColor[reg.worst_status]
                return (
                  <g key={reg.region}>
                    <rect x="820" y={regY - 14} width="120" height="28" rx="4"
                      fill="rgba(255,255,255,0.03)" stroke={color} strokeOpacity="0.45" />
                    <text x="880" y={regY + 5} fontSize="11" fill="rgba(255,255,255,0.78)" textAnchor="middle">
                      {reg.region} <tspan fill={color} fontFamily="monospace">{reg.count}</tspan>
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Scenario comparison */}
        <ScenarioComparison
          title="シナリオ比較 — 関西配送遅延への対応"
          scenarios={scenarios}
          selectedId={selectedScenario}
          onSelect={setSelectedScenario}
        />

        {/* Delivery routes detail */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[15px] font-semibold tracking-tight text-white/80">遅延ルート詳細</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-white/40">{filteredRoutes.length} routes</span>
              <span className="text-red-400 font-mono tabular-nums">{delayed + atRisk} issues</span>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
            {sortedRoutes.slice(0, 25).map((route) => {
              const expanded = expandedRoute === route.route_id
              return (
                <div key={route.route_id}>
                  <button
                    onClick={() => setExpandedRoute(expanded ? null : route.route_id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {expanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    }
                    <span className="text-[11px] font-mono tabular-nums text-white/50 w-12">{route.route_id}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-medium shrink-0 w-[70px] text-center ${statusBadge[route.status]}`}>
                      {route.status}
                    </span>
                    <span className="text-[12px] text-white/70 flex-1 truncate">
                      {route.origin_dc} → {route.destination_region} {route.destination_area}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono tabular-nums">{route.departure_time}</span>
                    <span className="text-[11px] text-white/40 font-mono tabular-nums w-12 text-right">{route.eta_hours.toFixed(1)}h</span>
                    {route.delay_minutes > 0 && (
                      <span className="text-[11px] font-mono tabular-nums text-red-400 flex items-center gap-1 w-16 justify-end">
                        <Clock className="w-3 h-3" />+{route.delay_minutes}分
                      </span>
                    )}
                    {route.delay_minutes === 0 && <span className="w-16" />}
                    <span className="text-[11px] font-mono tabular-nums text-white/40 w-12 text-right">{(route.load_pct * 100).toFixed(0)}%</span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3.5 pl-12 bg-white/[0.01]">
                      <div className="grid grid-cols-3 gap-4 text-[11px] pt-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">配送先店舗</div>
                          <div className="text-white/60">{route.affected_stores}店舗 ({route.destination_region}{route.destination_area}エリア)</div>
                          <div className="text-white/30 mt-1 font-mono tabular-nums">{route.tons.toFixed(1)}t / 積載率{(route.load_pct * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">影響メニュー</div>
                          {route.affected_menus.map((m, i) => (
                            <div key={i} className="text-white/60">{m}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">推奨対応</div>
                          {route.status === "delayed" ? (
                            <>
                              <div className="text-amber-400">代替DC経由ルートに切替</div>
                              <div className="text-white/40 mt-1">→ Action Queueへ送信</div>
                            </>
                          ) : route.status === "at-risk" ? (
                            <>
                              <div className="text-amber-400">出荷時刻の前倒しを検討</div>
                              <div className="text-white/40 mt-1">→ SCM承認待ち</div>
                            </>
                          ) : (
                            <div className="text-emerald-400">対応不要</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
