"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import {
  TrendingUp, AlertTriangle, Package, Clock, Trash2, Filter,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react"
import {
  LineChart, Line, Area, AreaChart, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"

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

// ---------- SKU master ----------
type StorageType = "冷凍" | "冷蔵" | "常温"
type Category = "畜肉" | "水産" | "野菜" | "米飯" | "調味料" | "油脂" | "包材" | "飲料" | "その他"

interface SKU {
  sku_id: string
  name: string
  category: Category
  storage_type: StorageType
  shelf_life_days: number
  unit_cost: number
  current_inventory_days: number
  demand_forecast_pct: number
  stockout_eta_hours: number | null
  waste_risk_pct: number
  recommended_replenish_cases: number
  confidence_band: [number, number]
}

const skuCategoryDefs: { cat: Category; storage: StorageType; items: string[] }[] = [
  { cat: "畜肉", storage: "冷凍", items: ["牛バラ","牛モモ","牛肩ロース","合挽ミンチ","牛タン","豚ロース","豚バラ","豚挽肉","鶏モモ","鶏ムネ","鶏挽肉"] },
  { cat: "水産", storage: "冷凍", items: ["サーモン","マグロ","エビ","イカ","タコ","ホタテ","白身魚フライ","アサリ"] },
  { cat: "野菜", storage: "冷蔵", items: ["玉ねぎ","キャベツ","レタス","ネギ","人参","じゃがいも","トマト","ほうれん草","もやし","大根","ピーマン"] },
  { cat: "米飯", storage: "常温", items: ["白米A","白米B","酢飯用米","もち米","炊飯済パック"] },
  { cat: "調味料", storage: "常温", items: ["醤油","味噌","タレA","タレB","カレールー","ドレッシング","マヨネーズ","中華スープ","だしの素","ソース"] },
  { cat: "油脂", storage: "常温", items: ["揚げ油","ごま油","ラード","バター"] },
  { cat: "包材", storage: "常温", items: ["持ち帰り容器S","持ち帰り容器L","レジ袋","紙ナプキン","割り箸","ストロー"] },
  { cat: "飲料", storage: "冷蔵", items: ["緑茶P","ウーロン茶P","コーラ","オレンジJ","ミネラルW","ビール樽","ビール瓶","ノンアル"] },
  { cat: "その他", storage: "常温", items: ["卵","豆腐","パン粉","天かす","紅しょうが","海苔","わかめ","ガリ","漬物"] },
]

const skus: SKU[] = []
let skuIdx = 0
for (const def of skuCategoryDefs) {
  for (const name of def.items) {
    skuIdx++
    if (skuIdx > 80) break
    const stockDays = Math.round(rand(0.6, 6.5) * 10) / 10
    const demandPct = Math.round(rand(-12, 22) * 10) / 10
    const wasteRisk = def.storage === "冷蔵" ? Math.round(rand(5, 48)) : Math.round(rand(0, 18))
    const stockoutHrs = stockDays < 2 ? Math.round(rand(8, 36)) : null
    skus.push({
      sku_id: `SKU-${String(skuIdx).padStart(3, "0")}`,
      name,
      category: def.cat,
      storage_type: def.storage,
      shelf_life_days: def.storage === "冷凍" ? Math.round(rand(60, 180)) : def.storage === "冷蔵" ? Math.round(rand(3, 14)) : Math.round(rand(30, 365)),
      unit_cost: Math.round(rand(80, 2800)),
      current_inventory_days: stockDays,
      demand_forecast_pct: demandPct,
      stockout_eta_hours: stockoutHrs,
      waste_risk_pct: wasteRisk,
      recommended_replenish_cases: stockDays < 2.2 ? Math.round(rand(6, 24)) : stockDays < 3 ? Math.round(rand(2, 8)) : 0,
      confidence_band: [
        Math.round((1 - rand(0.04, 0.18)) * 100),
        Math.round((1 + rand(0.04, 0.18)) * 100),
      ],
    })
  }
}

// ---------- 14 day history + 7 day forecast per SKU ----------
function buildSeries(seed: number, base: number, demandShift: number) {
  const r = seededRandom(seed)
  const points: { day: string; actual?: number; forecast?: number; lower?: number; upper?: number }[] = []
  for (let d = -14; d < 0; d++) {
    const v = base * (1 + (r() - 0.5) * 0.3 + Math.sin(d / 3) * 0.08)
    points.push({ day: `D${d}`, actual: Math.round(v) })
  }
  // bridge
  const lastActual = points[points.length - 1].actual!
  for (let d = 0; d < 7; d++) {
    const trend = lastActual * (1 + demandShift / 100) * (1 + (r() - 0.5) * 0.05 + d * 0.01)
    const fc = Math.round(trend)
    points.push({
      day: `D+${d + 1}`,
      forecast: fc,
      lower: Math.round(fc * 0.88),
      upper: Math.round(fc * 1.12),
    })
  }
  return points
}

// ---------- Waste analysis ----------
const wasteTopList = [
  { sku: "牛バラ", category: "畜肉", waste_yen: 184_000, reason_dist: { expiry: 42, prep_excess: 28, low_demand: 22, other: 8 } },
  { sku: "サーモン", category: "水産", waste_yen: 142_000, reason_dist: { expiry: 55, prep_excess: 18, low_demand: 20, other: 7 } },
  { sku: "キャベツ", category: "野菜", waste_yen: 98_000, reason_dist: { expiry: 38, prep_excess: 32, low_demand: 24, other: 6 } },
  { sku: "揚げ油", category: "油脂", waste_yen: 76_000, reason_dist: { expiry: 12, prep_excess: 8, low_demand: 68, other: 12 } },
  { sku: "白身魚フライ", category: "水産", waste_yen: 64_000, reason_dist: { expiry: 48, prep_excess: 22, low_demand: 24, other: 6 } },
]

const reasonLabels: Record<string, string> = {
  expiry: "賞味期限切れ",
  prep_excess: "仕込み過多",
  low_demand: "需要減",
  other: "その他",
}
const reasonColor: Record<string, string> = {
  expiry: "bg-red-400/70",
  prep_excess: "bg-amber-400/70",
  low_demand: "bg-blue-400/70",
  other: "bg-white/30",
}

// ---------- Scenario comparison ----------
const scenarios = [
  {
    id: "A", name: "朝便補充増", color: "emerald",
    description: "朝便で対象SKUを+12ケース前倒し補充。配送積載率を一時的に+8%。",
    impact: "欠品23→4店舗",
    risk: "配送積載率+8% / 残業0.5h",
    cost_yen: 180_000, lift_yen: 4_200_000,
    confidence: "High" as const, recommended: true,
  },
  {
    id: "B", name: "券売機推奨変更", color: "amber",
    description: "都心40店舗の券売機推奨枠を主力肉類SKUから類似SKUへ動的切替。",
    impact: "欠品23→11店舗",
    risk: "売上機会損失+客単価-1.2%",
    cost_yen: 0, lift_yen: 2_100_000,
    confidence: "Medium" as const, recommended: false,
  },
  {
    id: "C", name: "工場追加生産", color: "blue",
    description: "F-01工場で当日夜間に追加200kg生産、翌朝に緊急便で全店配送。",
    impact: "欠品23→0店舗",
    risk: "残業4h発生 / 原価+1.8%",
    cost_yen: 620_000, lift_yen: 4_800_000,
    confidence: "High" as const, recommended: false,
  },
] as const

// ---------- Component ----------
const categoryFilters: ("all" | Category)[] = ["all","畜肉","水産","野菜","米飯","調味料","油脂","包材","飲料","その他"]

export default function DemandPage() {
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all")
  const [sortBy, setSortBy] = useState<"risk" | "demand" | "waste">("risk")
  const [selectedSkuId, setSelectedSkuId] = useState<string>(skus[0].sku_id)

  const filtered = useMemo(
    () => categoryFilter === "all" ? skus : skus.filter(s => s.category === categoryFilter),
    [categoryFilter],
  )

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === "risk") return a.current_inventory_days - b.current_inventory_days
    if (sortBy === "demand") return b.demand_forecast_pct - a.demand_forecast_pct
    return b.waste_risk_pct - a.waste_risk_pct
  }), [filtered, sortBy])

  const selectedSku = skus.find(s => s.sku_id === selectedSkuId) ?? skus[0]
  const series = useMemo(
    () => buildSeries(parseInt(selectedSku.sku_id.replace(/\D/g, ""), 10), 100 + (selectedSku.unit_cost % 60), selectedSku.demand_forecast_pct),
    [selectedSku],
  )

  // KPI summary
  const mape = 6.4
  const stockoutCount = skus.filter(s => s.current_inventory_days < 2).length
  const wasteYen = wasteTopList.reduce((s, w) => s + w.waste_yen, 0)
  const replenishCases = skus.reduce((s, x) => s + x.recommended_replenish_cases, 0)
  const overstockStores = 14

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0e14] text-white/80">
      <div className="px-6 pt-6">
        <ContextHeader
          title="需要・在庫プランナー"
          description="SKU別予測・欠品/廃棄リスク・補充計画"
        />
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            label="予測精度 MAPE" value={`${mape.toFixed(1)}%`} sub="直近14日加重平均" tone="emerald" />
          <KpiCard icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            label="欠品リスクSKU" value={`${stockoutCount}品目`} sub="48時間以内予測" tone="red" />
          <KpiCard icon={<Trash2 className="w-4 h-4 text-amber-400" />}
            label="廃棄リスク金額" value={`¥${(wasteYen / 10000).toFixed(0)}万`} sub="本日想定" tone="amber" />
          <KpiCard icon={<Package className="w-4 h-4 text-blue-400" />}
            label="本日推奨補充ケース" value={`${replenishCases.toLocaleString()}cs`} sub="全SKU合算" tone="blue" />
          <KpiCard icon={<Clock className="w-4 h-4 text-cyan-400" />}
            label="過剰在庫店舗" value={`${overstockStores}店舗`} sub="平均5日超" tone="cyan" />
        </div>

        {/* Scenario comparison */}
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03]">
          <div className="px-4 py-3 border-b border-red-500/10 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">
              主力肉類SKU欠品対応シナリオ
            </span>
            <span className="text-[11px] text-white/40 ml-2">3案比較 — AI推奨: A案</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-white/[0.06]">
            {scenarios.map((sc) => (
              <div key={sc.id} className={`p-4 ${sc.recommended ? "bg-emerald-500/[0.04]" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold bg-${sc.color}-500/15 text-${sc.color}-400`}>
                      {sc.id}
                    </span>
                    <span className="text-[13px] font-semibold text-white/80">{sc.name}</span>
                  </div>
                  {sc.recommended && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-400 uppercase tracking-wider">推奨</span>
                  )}
                </div>
                <div className="text-[12px] text-white/60 leading-relaxed mb-3">{sc.description}</div>
                <div className="space-y-1.5 text-[11px]">
                  <Row label="期待効果" value={sc.impact} tone="emerald" mono />
                  <Row label="リスク" value={sc.risk} tone="white/40" />
                  <Row label="実施コスト" value={`¥${(sc.cost_yen / 10000).toFixed(0)}万`} mono />
                  <Row label="想定リフト" value={`¥${(sc.lift_yen / 10000).toFixed(0)}万`} tone="emerald" mono />
                  <Row label="信頼度" value={sc.confidence} tone={sc.confidence === "High" ? "emerald" : "amber"} />
                </div>
                <button className={`mt-3 w-full text-[11px] py-1.5 rounded transition-colors ${
                  sc.recommended
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                }`}>
                  この案を承認
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30 mr-1" />
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
                categoryFilter === cat ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              {cat === "all" ? "全カテゴリ" : cat}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Sort</span>
            {([
              { key: "risk", label: "欠品リスク順" },
              { key: "demand", label: "需要増順" },
              { key: "waste", label: "廃棄リスク順" },
            ] as const).map((s) => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`text-[10px] px-2 py-1 rounded ${
                  sortBy === s.key
                    ? s.key === "risk" ? "bg-red-500/15 text-red-400"
                    : s.key === "demand" ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast chart for selected SKU */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">需要予測グラフ</div>
              <div className="text-[15px] font-semibold text-white/90 mt-0.5">
                {selectedSku.name} <span className="text-white/40 text-[12px] ml-2">{selectedSku.sku_id}</span>
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">
                過去14日 + 予測7日 / 信頼区間±{selectedSku.confidence_band[1] - 100}%
              </div>
            </div>
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="text-[11px] bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-white/70 focus:outline-none"
            >
              {skus.map((s) => (
                <option key={s.sku_id} value={s.sku_id} className="bg-[#0a0e14]">
                  {s.name} ({s.sku_id})
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0a0e14", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                labelStyle={{ color: "rgba(255,255,255,0.6)" }}
              />
              <ReferenceLine x="D-1" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ value: "今日", fill: "rgba(255,255,255,0.4)", fontSize: 10, position: "top" }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(96,165,250,0.12)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0e14" />
              <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-white/50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400" />実績</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 border-dashed" style={{ borderTop: "1px dashed #60a5fa" }} />予測</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400/20" />信頼区間</span>
          </div>
        </div>

        {/* Forecast table */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              SKU 在庫予測 — {sorted.length}件
            </span>
            <span className="text-[10px] text-white/30">クリックで予測グラフ切替</span>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#0a0e14] z-10">
                <tr className="text-white/30 border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
                  <th className="text-left px-3 py-2 font-medium">保管</th>
                  <th className="text-right px-3 py-2 font-medium">在庫日数</th>
                  <th className="text-right px-3 py-2 font-medium">需要予測</th>
                  <th className="text-right px-3 py-2 font-medium">信頼区間</th>
                  <th className="text-left px-3 py-2 font-medium">欠品予測</th>
                  <th className="text-right px-3 py-2 font-medium">廃棄リスク</th>
                  <th className="text-right px-3 py-2 font-medium">推奨補充</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.sku_id}
                    onClick={() => setSelectedSkuId(row.sku_id)}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer ${
                      row.current_inventory_days < 2 ? "bg-red-500/[0.04]" : ""
                    } ${row.sku_id === selectedSkuId ? "bg-blue-500/[0.06]" : ""}`}
                  >
                    <td className="px-4 py-2">
                      <div className="text-white/80 font-medium">{row.name}</div>
                      <div className="text-[9px] text-white/30 font-mono">{row.sku_id}</div>
                    </td>
                    <td className="px-3 py-2 text-white/55">{row.category}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        row.storage_type === "冷凍" ? "bg-blue-400/10 text-blue-400" :
                        row.storage_type === "冷蔵" ? "bg-cyan-400/10 text-cyan-400" :
                        "bg-white/[0.06] text-white/50"
                      }`}>
                        {row.storage_type}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${
                      row.current_inventory_days < 2 ? "text-red-400" :
                      row.current_inventory_days < 3 ? "text-amber-400" : "text-white/60"
                    }`}>
                      {row.current_inventory_days.toFixed(1)}日
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      <span className={`flex items-center justify-end gap-1 ${
                        row.demand_forecast_pct > 0 ? "text-emerald-400" :
                        row.demand_forecast_pct < -5 ? "text-amber-400" : "text-white/50"
                      }`}>
                        {row.demand_forecast_pct > 0 ? <ArrowUpRight className="w-3 h-3" /> :
                          row.demand_forecast_pct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {row.demand_forecast_pct > 0 ? "+" : ""}{row.demand_forecast_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-white/40 text-[10px]">
                      ±{row.confidence_band[1] - 100}%
                    </td>
                    <td className="px-3 py-2">
                      {row.stockout_eta_hours !== null ? (
                        <span className="flex items-center gap-1 text-red-400 font-mono tabular-nums">
                          <AlertTriangle className="w-3 h-3" />
                          +{row.stockout_eta_hours}h
                        </span>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.waste_risk_pct > 30 ? "bg-red-400/70" :
                              row.waste_risk_pct > 15 ? "bg-amber-400/70" : "bg-white/25"
                            }`}
                            style={{ width: `${Math.min(row.waste_risk_pct, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono tabular-nums text-[10px] ${
                          row.waste_risk_pct > 30 ? "text-red-400" :
                          row.waste_risk_pct > 15 ? "text-amber-400" : "text-white/40"
                        }`}>
                          {row.waste_risk_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {row.recommended_replenish_cases > 0 ? (
                        <span className="text-blue-400">+{row.recommended_replenish_cases}cs</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Waste analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] lg:col-span-2">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">廃棄上位SKU</span>
              <span className="text-[10px] text-white/30">本日推定 / 廃棄理由分布</span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
                  <th className="text-right px-3 py-2 font-medium">廃棄金額</th>
                  <th className="text-left px-3 py-2 font-medium w-[55%]">理由分布</th>
                </tr>
              </thead>
              <tbody>
                {wasteTopList.map((w) => (
                  <tr key={w.sku} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-white/80 font-medium">{w.sku}</td>
                    <td className="px-3 py-2.5 text-white/50">{w.category}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-amber-400">
                      ¥{(w.waste_yen / 1000).toFixed(0)}k
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
                        {Object.entries(w.reason_dist).map(([k, v]) => (
                          <div key={k} className={reasonColor[k]} style={{ width: `${v}%` }} title={`${reasonLabels[k]}: ${v}%`} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-3 text-[10px]">
              {Object.entries(reasonLabels).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-white/50">
                  <span className={`w-2 h-2 rounded-sm ${reasonColor[k]}`} />
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-3">改善余地</div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-white/50 mb-1">仕込み量最適化</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-2xl text-emerald-400 font-semibold">¥48</span>
                  <span className="text-[12px] text-white/50">万 / 月</span>
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">仕込み過多由来の廃棄削減</div>
              </div>
              <div className="border-t border-white/[0.06] pt-3">
                <div className="text-[11px] text-white/50 mb-1">需要予測精度+1pt</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-2xl text-blue-400 font-semibold">¥72</span>
                  <span className="text-[12px] text-white/50">万 / 月</span>
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">欠品/廃棄合算インパクト</div>
              </div>
              <div className="border-t border-white/[0.06] pt-3">
                <div className="text-[11px] text-white/50 mb-1">夜帯メニュー再構成</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-2xl text-amber-400 font-semibold">¥31</span>
                  <span className="text-[12px] text-white/50">万 / 月</span>
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">夜帯需要減SKU 8件分</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- subcomponents ----------
function KpiCard({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "emerald" | "red" | "amber" | "blue" | "cyan" | "purple" }) {
  const toneBorder = {
    emerald: "border-white/[0.06]", red: "border-red-500/20", amber: "border-amber-500/20",
    blue: "border-white/[0.06]", cyan: "border-white/[0.06]", purple: "border-white/[0.06]",
  }[tone]
  const toneBg = {
    emerald: "bg-white/[0.02]", red: "bg-red-500/[0.03]", amber: "bg-amber-500/[0.03]",
    blue: "bg-white/[0.02]", cyan: "bg-white/[0.02]", purple: "bg-white/[0.02]",
  }[tone]
  const toneText = {
    emerald: "text-emerald-400", red: "text-red-400", amber: "text-amber-400",
    blue: "text-blue-400", cyan: "text-cyan-400", purple: "text-purple-400",
  }[tone]
  return (
    <div className={`rounded-lg border ${toneBorder} ${toneBg} p-4 hover:bg-white/[0.04] transition-colors`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className={`font-mono tabular-nums text-xl font-semibold ${toneText}`}>{value}</div>
      <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
    </div>
  )
}

function Row({ label, value, tone, mono }: { label: string; value: string; tone?: string; mono?: boolean }) {
  const toneClass = tone === "emerald" ? "text-emerald-400"
    : tone === "amber" ? "text-amber-400"
    : tone === "red" ? "text-red-400"
    : tone === "blue" ? "text-blue-400"
    : tone === "white/40" ? "text-white/40"
    : "text-white/70"
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/40">{label}</span>
      <span className={`${toneClass} ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  )
}
