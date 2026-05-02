"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import {
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts"

// ---- deterministic RNG ----
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
const rng = seededRandom(42)
const rand = (min: number, max: number) => Math.round((rng() * (max - min) + min) * 100) / 100

// ---- mock data ----
type CampaignStatus = "active" | "ended" | "scheduled"
interface Campaign {
  campaign_id: string
  name: string
  target_menu: string[]
  start_date: string
  end_date: string
  target_segment: string
  sales_lift_pct: number
  customer_lift_pct: number
  new_customer_pct: number
  repeat_pct: number
  ci_low: number
  ci_high: number
  status: CampaignStatus
}

const campaigns: Campaign[] = [
  {
    campaign_id: "CMP-01",
    name: "春のランチ強化",
    target_menu: ["牛めし並盛", "豚汁セット"],
    start_date: "2026-04-15",
    end_date: "2026-05-15",
    target_segment: "ランチ帯ビジネス層",
    sales_lift_pct: 8.2,
    customer_lift_pct: 5.4,
    new_customer_pct: 18.6,
    repeat_pct: 41.2,
    ci_low: 6.8,
    ci_high: 9.6,
    status: "active",
  },
  {
    campaign_id: "CMP-02",
    name: "新作とんかつフェア",
    target_menu: ["熟成ロースかつ膳"],
    start_date: "2026-04-20",
    end_date: "2026-05-10",
    target_segment: "全セグメント",
    sales_lift_pct: 12.5,
    customer_lift_pct: 7.8,
    new_customer_pct: 22.1,
    repeat_pct: 38.4,
    ci_low: 10.4,
    ci_high: 14.6,
    status: "active",
  },
  {
    campaign_id: "CMP-03",
    name: "GW特別メニュー",
    target_menu: ["カルビ焼肉定食", "牛ステーキ丼"],
    start_date: "2026-04-29",
    end_date: "2026-05-06",
    target_segment: "ファミリー",
    sales_lift_pct: 15.1,
    customer_lift_pct: 11.2,
    new_customer_pct: 28.3,
    repeat_pct: 34.7,
    ci_low: 12.9,
    ci_high: 17.3,
    status: "active",
  },
  {
    campaign_id: "CMP-04",
    name: "牛めしバーガー発売記念",
    target_menu: ["牛めしバーガー"],
    start_date: "2026-04-25",
    end_date: "2026-05-25",
    target_segment: "若年層",
    sales_lift_pct: 18.3,
    customer_lift_pct: 14.6,
    new_customer_pct: 32.8,
    repeat_pct: 29.5,
    ci_low: 15.2,
    ci_high: 21.4,
    status: "active",
  },
  {
    campaign_id: "CMP-05",
    name: "冬の鍋膳キャンペーン",
    target_menu: ["豚キムチ鍋膳"],
    start_date: "2026-01-15",
    end_date: "2026-02-28",
    target_segment: "夜ディナー層",
    sales_lift_pct: 6.4,
    customer_lift_pct: 3.1,
    new_customer_pct: 12.4,
    repeat_pct: 44.9,
    ci_low: 4.9,
    ci_high: 7.9,
    status: "ended",
  },
  {
    campaign_id: "CMP-06",
    name: "カレーフェスティバル",
    target_menu: ["スパイスカレー", "チキンカツカレー"],
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    target_segment: "カレーファン",
    sales_lift_pct: 6.7,
    customer_lift_pct: 4.1,
    new_customer_pct: 16.2,
    repeat_pct: 47.8,
    ci_low: 5.0,
    ci_high: 8.4,
    status: "active",
  },
]

const REGIONS = ["首都圏", "関西", "東海", "九州", "北海道", "東北", "中国", "四国"] as const
const LOC_TYPES = ["駅前", "ロードサイド", "SC", "住宅地"] as const
const TIME_SLOTS = ["朝 (6-10)", "昼 (11-14)", "夕 (14-17)", "夜 (17-21)", "深夜 (21-2)"] as const

const regionMul: Record<string, { sales: number; cust: number }> = {
  首都圏: { sales: 1.18, cust: 1.10 },
  関西: { sales: 0.84, cust: 0.78 },
  東海: { sales: 0.72, cust: 0.65 },
  九州: { sales: 0.58, cust: 0.52 },
  北海道: { sales: 0.45, cust: 0.40 },
  東北: { sales: 0.38, cust: 0.36 },
  中国: { sales: 0.42, cust: 0.39 },
  四国: { sales: 0.30, cust: 0.28 },
}

const locMul: Record<string, number> = {
  駅前: 1.18,
  ロードサイド: 0.92,
  SC: 1.05,
  住宅地: 0.55,
}

const timeMul: number[] = [0.45, 1.32, 0.62, 0.95, 0.28]

// ---- new menu items ----
interface MenuPerf {
  menu_id: string
  name: string
  category: string
  cost_ratio: number
  share_pct: number
  station_lunch: number
  station_night: number
  rs_lunch: number
  rs_night: number
  days_since_launch: number
  verdict: "good" | "watch" | "underperform"
}

const newMenuItems: MenuPerf[] = Array.from({ length: 10 }, (_, i) => {
  const names = [
    "牛めしバーガー",
    "熟成ロースかつ膳",
    "牛ステーキ丼",
    "スパイスカレー",
    "豚キムチ鍋膳",
    "カルビ焼肉定食",
    "海鮮ばらちらし",
    "黒胡椒チキン定食",
    "ガーリック牛皿",
    "夏野菜冷麺",
  ]
  const cats = ["丼", "定食", "丼", "カレー", "鍋", "定食", "丼", "定食", "単品", "麺"]
  const cost = rand(0.32, 0.48)
  const share = rand(1.4, 6.2)
  const sl = rand(8.0, 16.5)
  const sn = rand(1.6, 4.5)
  const rl = rand(10.5, 18.2)
  const rn = rand(2.4, 5.6)
  const days = Math.round(rand(7, 45))
  const score = (sl + sn + rl + rn) / 4
  const verdict: MenuPerf["verdict"] = score > 8.5 ? "good" : score > 6.0 ? "watch" : "underperform"
  return {
    menu_id: `MENU-${String(i + 1).padStart(3, "0")}`,
    name: names[i],
    category: cats[i],
    cost_ratio: cost,
    share_pct: share,
    station_lunch: sl,
    station_night: sn,
    rs_lunch: rl,
    rs_night: rn,
    days_since_launch: days,
    verdict,
  }
})

// ---- helpers ----
function statusBadge(status: CampaignStatus) {
  if (status === "active")
    return { label: "開催中", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" }
  if (status === "ended")
    return { label: "終了", color: "text-white/40 bg-white/[0.04] border-white/[0.08]" }
  return { label: "予定", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" }
}

// ---- menu engineering mock ----
const mockMenuEngineering = [
  { product_name: "牛丼並盛", sales_count: 45000, gross_margin_pct: 64.9, quadrant: "star" },
  { product_name: "まぐろ", sales_count: 22000, gross_margin_pct: 52.0, quadrant: "star" },
  { product_name: "包み焼きハンバーグ", sales_count: 8500, gross_margin_pct: 69.9, quadrant: "puzzle" },
  { product_name: "うな丼", sales_count: 3200, gross_margin_pct: 60.0, quadrant: "puzzle" },
  { product_name: "カレー並盛", sales_count: 28000, gross_margin_pct: 70.0, quadrant: "star" },
  { product_name: "サーモン", sales_count: 35000, gross_margin_pct: 57.3, quadrant: "plowhorse" },
  { product_name: "中とろ", sales_count: 8000, gross_margin_pct: 50.0, quadrant: "puzzle" },
  { product_name: "フレンチフライS", sales_count: 18000, gross_margin_pct: 80.0, quadrant: "star" },
  { product_name: "ビール", sales_count: 5000, gross_margin_pct: 74.9, quadrant: "puzzle" },
  { product_name: "味噌汁", sales_count: 30000, gross_margin_pct: 80.0, quadrant: "star" },
  { product_name: "ねぎ玉牛丼", sales_count: 15000, gross_margin_pct: 64.9, quadrant: "plowhorse" },
  { product_name: "茶碗蒸し", sales_count: 4000, gross_margin_pct: 70.0, quadrant: "puzzle" },
  { product_name: "日本酒", sales_count: 2000, gross_margin_pct: 74.9, quadrant: "puzzle" },
  { product_name: "豚丼並盛", sales_count: 12000, gross_margin_pct: 70.0, quadrant: "plowhorse" },
  { product_name: "ドリンクバー", sales_count: 25000, gross_margin_pct: 89.9, quadrant: "star" },
]

const quadrantColors: Record<string, string> = {
  star: "#22c55e",
  puzzle: "#3b82f6",
  plowhorse: "#eab308",
  dog: "#ef4444",
}

export default function CampaignsPage() {
  const [mainTab, setMainTab] = useState<"campaigns" | "menu-eng">("campaigns")
  const [selectedId, setSelectedId] = useState(campaigns[0].campaign_id)
  const selected = campaigns.find((c) => c.campaign_id === selectedId)!

  const byRegion = useMemo(
    () =>
      REGIONS.map((r) => ({
        region: r,
        sales_lift: Math.round(selected.sales_lift_pct * regionMul[r].sales * 100) / 100,
        customer_lift: Math.round(selected.customer_lift_pct * regionMul[r].cust * 100) / 100,
      })),
    [selected],
  )

  const byLoc = useMemo(
    () =>
      LOC_TYPES.map((lt) => ({
        type: lt,
        lift: Math.round(selected.sales_lift_pct * locMul[lt] * 100) / 100,
      })),
    [selected],
  )

  const byTime = useMemo(
    () =>
      TIME_SLOTS.map((slot, i) => ({
        slot,
        lift: Math.round(selected.sales_lift_pct * timeMul[i] * 100) / 100,
      })),
    [selected],
  )

  const maxRegion = Math.max(...byRegion.map((r) => r.sales_lift), 1)
  const maxLoc = Math.max(...byLoc.map((l) => l.lift), 1)
  const maxTime = Math.max(...byTime.map((t) => t.lift), 1)

  return (
    <div className="min-h-full bg-[#0a0e14] p-6 text-white/80">
      <div className="mb-5">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <ContextHeader
            title="キャンペーン分析"
            description="販促・新メニューの効果を多軸で分解"
          />
        </div>
      </div>

      {/* Main tab switch */}
      <div className="mb-4 flex gap-1 bg-white/[0.03] rounded-lg p-1 w-fit border border-white/[0.06]">
        <button onClick={() => setMainTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded text-[12px] transition-colors ${
            mainTab === "campaigns" ? "bg-blue-500/20 text-blue-400" : "text-white/50 hover:text-white/80"
          }`}>
          <Target className="w-3.5 h-3.5" />キャンペーン
        </button>
        <button onClick={() => setMainTab("menu-eng")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded text-[12px] transition-colors ${
            mainTab === "menu-eng" ? "bg-blue-500/20 text-blue-400" : "text-white/50 hover:text-white/80"
          }`}>
          <BarChart3 className="w-3.5 h-3.5" />メニュー工学
        </button>
      </div>

      {mainTab === "menu-eng" ? (
        <MenuEngineeringView />
      ) : (
      <>
      {/* Campaign selector */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {campaigns.map((c) => {
          const sb = statusBadge(c.status)
          const isActive = c.campaign_id === selectedId
          return (
            <button
              key={c.campaign_id}
              onClick={() => setSelectedId(c.campaign_id)}
              className={`shrink-0 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                isActive
                  ? "border-blue-400/40 bg-blue-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-white/80">{c.name}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] ${sb.color}`}>
                  {sb.label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-white/40">
                <span>
                  {c.start_date} → {c.end_date}
                </span>
                <span className="text-emerald-400 font-mono tabular-nums">
                  売上 +{c.sales_lift_pct}%
                </span>
                <span className="text-blue-400 font-mono tabular-nums">
                  客数 +{c.customer_lift_pct}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          label="売上リフト"
          value={`+${selected.sales_lift_pct}%`}
          sub={`95% CI [+${selected.ci_low}, +${selected.ci_high}]`}
          color="text-emerald-400"
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-blue-400" />}
          label="客数リフト"
          value={`+${selected.customer_lift_pct}%`}
          sub={selected.target_segment}
          color="text-blue-400"
        />
        <SummaryCard
          icon={<Sparkles className="h-4 w-4 text-purple-400" />}
          label="新規顧客率"
          value={`${selected.new_customer_pct}%`}
          sub="期間中 / 全来客"
          color="text-purple-400"
        />
        <SummaryCard
          icon={<ArrowUpRight className="h-4 w-4 text-cyan-400" />}
          label="リピート率"
          value={`${selected.repeat_pct}%`}
          sub="2回目以上来店"
          color="text-cyan-400"
        />
        <SummaryCard
          icon={<Target className="h-4 w-4 text-amber-400" />}
          label="対象メニュー"
          value={String(selected.target_menu.length)}
          sub={selected.target_menu.join(" / ")}
          color="text-amber-400"
        />
      </div>

      {/* Breakdowns */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Panel title="地域別 Breakdown">
          <div className="space-y-2.5">
            {byRegion.map((r) => (
              <div key={r.region}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-white/60">{r.region}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      r.sales_lift >= selected.sales_lift_pct * 0.8
                        ? "text-emerald-400"
                        : r.sales_lift < selected.sales_lift_pct * 0.4
                          ? "text-red-400"
                          : "text-amber-400"
                    }`}
                  >
                    +{r.sales_lift.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${
                      r.sales_lift >= selected.sales_lift_pct * 0.8
                        ? "bg-emerald-400/55"
                        : r.sales_lift < selected.sales_lift_pct * 0.4
                          ? "bg-red-400/45"
                          : "bg-amber-400/45"
                    }`}
                    style={{ width: `${Math.max(2, (r.sales_lift / maxRegion) * 100)}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[9px] text-white/30">
                  客数 +{r.customer_lift.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="立地別 Breakdown">
          <div className="space-y-2.5">
            {byLoc.map((l) => (
              <div key={l.type}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-white/60">{l.type}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      l.lift >= selected.sales_lift_pct * 0.8
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    +{l.lift.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${
                      l.lift >= selected.sales_lift_pct * 0.8 ? "bg-emerald-400/55" : "bg-amber-400/45"
                    }`}
                    style={{ width: `${Math.max(2, (l.lift / maxLoc) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="時間帯別 Performance">
          <TimeSlotChart data={byTime} max={maxTime} avg={selected.sales_lift_pct} />
        </Panel>
      </div>

      {/* New menu performance table */}
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            New Menu Items Performance
          </span>
          <span className="text-[10px] text-white/30">{newMenuItems.length}品目</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/30">
                <th className="px-4 py-2 text-left font-medium">メニュー</th>
                <th className="px-3 py-2 text-left font-medium">カテゴリ</th>
                <th className="px-3 py-2 text-right font-medium">原価率</th>
                <th className="px-3 py-2 text-right font-medium">構成比</th>
                <th className="px-3 py-2 text-right font-medium">駅前 昼</th>
                <th className="px-3 py-2 text-right font-medium">駅前 夜</th>
                <th className="px-3 py-2 text-right font-medium">RS 昼</th>
                <th className="px-3 py-2 text-right font-medium">RS 夜</th>
                <th className="px-3 py-2 text-right font-medium">経過日数</th>
                <th className="px-3 py-2 text-center font-medium">判定</th>
              </tr>
            </thead>
            <tbody>
              {newMenuItems.map((m) => (
                <tr
                  key={m.menu_id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2 font-medium text-white/80">{m.name}</td>
                  <td className="px-3 py-2 text-white/50">{m.category}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/60">
                    {(m.cost_ratio * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/60">
                    {m.share_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400">
                    <span className="inline-flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      {m.station_lunch.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">
                    {m.station_night.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400">
                    {m.rs_lunch.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/50">
                    {m.rs_night.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-white/50">
                    {m.days_since_launch}d
                  </td>
                  <td className="px-3 py-2 text-center">
                    <VerdictBadge v={m.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommended Actions */}
      <Panel title="AI 推奨アクション">
        <div className="space-y-3">
          <RecCard
            tone="emerald"
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
            title="このキャンペーンを延長すべき"
            body={`${selected.name} は 95% CI 下限 +${selected.ci_low}% を維持。首都圏駅前で +${(selected.sales_lift_pct * 1.18).toFixed(1)}% と圧倒的。GW後さらに 2週間延長で売上機会 +18%。`}
            confidence="High"
          />
          <RecCard
            tone="amber"
            icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
            title="ターゲット変更案"
            body={`${selected.target_segment} 中心の訴求だが、住宅地 +${(selected.sales_lift_pct * 0.55).toFixed(1)}% と低調。ファミリー層向けセット訴求を住宅地店舗の夕方帯に追加することで全体リフト +1.8pt 見込み。`}
            confidence="Medium"
          />
          <RecCard
            tone="red"
            icon={<ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
            title="メニュー改廃案"
            body={`${newMenuItems.filter((m) => m.verdict === "underperform").map((m) => m.name).slice(0, 2).join(" / ") || "対象なし"} は構成比 1.5% 未満で原価率も高い。ローンチ30日経過品は次月から廃止 or 価格改定を検討。`}
            confidence="Medium"
          />
        </div>
      </Panel>
      </>
      )}
    </div>
  )
}

// ---- Menu Engineering View ----
function MenuEngineeringView() {
  const [meBrand, setMeBrand] = useState("すき家")
  const [mePeriod, setMePeriod] = useState("3")
  const data = mockMenuEngineering

  const medianSales = [...data].sort((a, b) => a.sales_count - b.sales_count)[Math.floor(data.length / 2)].sales_count
  const medianMargin = [...data].sort((a, b) => a.gross_margin_pct - b.gross_margin_pct)[Math.floor(data.length / 2)].gross_margin_pct

  const stars = data.filter((d) => d.quadrant === "star")
  const puzzles = data.filter((d) => d.quadrant === "puzzle")
  const plowhorses = data.filter((d) => d.quadrant === "plowhorse")
  const dogs = data.filter((d) => d.quadrant === "dog")

  const maxSales = Math.max(...data.map((d) => d.sales_count))
  const maxMargin = Math.max(...data.map((d) => d.gross_margin_pct))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 items-center">
        <div>
          <label className="text-[11px] text-white/50 block mb-1">ブランド</label>
          <select value={meBrand} onChange={(e) => setMeBrand(e.target.value)}
            className="text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-400/40">
            {["すき家","はま寿司","ココス","なか卯","ジョリーパスタ"].map((b) => (
              <option key={b} value={b} className="bg-[#0a0e14]">{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/50 block mb-1">期間</label>
          <select value={mePeriod} onChange={(e) => setMePeriod(e.target.value)}
            className="text-[12px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-400/40">
            {[["1","1ヶ月"],["3","3ヶ月"],["6","6ヶ月"],["12","12ヶ月"]].map(([v,l]) => (
              <option key={v} value={v} className="bg-[#0a0e14]">{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scatter chart */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3 font-semibold">
          メニュー工学 4象限マトリクス
        </div>
        <div className="relative">
          {/* Quadrant background labels */}
          <div className="absolute top-2 right-4 text-[10px] text-emerald-400/60 z-10">Star ⭐</div>
          <div className="absolute top-2 left-16 text-[10px] text-blue-400/60 z-10">Puzzle 🧩</div>
          <div className="absolute bottom-10 right-4 text-[10px] text-yellow-400/60 z-10">Plowhorse 🐴</div>
          <div className="absolute bottom-10 left-16 text-[10px] text-red-400/60 z-10">Dog 🐕</div>

          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" dataKey="sales_count" name="売上量"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                label={{ value: "売上量", position: "bottom", fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                domain={[0, maxSales * 1.1]}
              />
              <YAxis type="number" dataKey="gross_margin_pct" name="粗利率"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: "粗利率", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                domain={[40, maxMargin * 1.05]}
              />
              <ReferenceLine x={medianSales} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
              <ReferenceLine y={medianMargin} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
              <RechartsTooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "rgba(255,255,255,0.8)" }}
                formatter={(value: number, name: string) => {
                  if (name === "売上量") return [`${value.toLocaleString()}個`, name]
                  if (name === "粗利率") return [`${value}%`, name]
                  return [value, name]
                }}
                labelFormatter={() => ""}
                itemStyle={{ color: "rgba(255,255,255,0.7)" }}
              />
              <Scatter name="商品" data={data}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={quadrantColors[entry.quadrant] || "#666"} fillOpacity={0.8} r={6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4-column summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuadrantPanel
          title="Star ⭐ 主力商品"
          subtitle="維持・強化"
          items={stars}
          borderColor="border-emerald-400/20"
          bgColor="bg-emerald-400/[0.03]"
          textColor="text-emerald-400"
        />
        <QuadrantPanel
          title="Puzzle 🧩 推奨強化候補"
          subtitle="露出増"
          items={puzzles}
          borderColor="border-blue-400/20"
          bgColor="bg-blue-400/[0.03]"
          textColor="text-blue-400"
        />
        <QuadrantPanel
          title="Plowhorse 🐴 原価改善候補"
          subtitle="値上げ/レシピ見直し"
          items={plowhorses}
          borderColor="border-yellow-400/20"
          bgColor="bg-yellow-400/[0.03]"
          textColor="text-yellow-400"
        />
        <QuadrantPanel
          title="Dog 🐕 廃止検討"
          subtitle="段階的終売"
          items={dogs}
          borderColor="border-red-400/20"
          bgColor="bg-red-400/[0.03]"
          textColor="text-red-400"
        />
      </div>
    </div>
  )
}

function QuadrantPanel({ title, subtitle, items, borderColor, bgColor, textColor }: {
  title: string; subtitle: string
  items: typeof mockMenuEngineering
  borderColor: string; bgColor: string; textColor: string
}) {
  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor}`}>
      <div className={`px-4 py-2 border-b ${borderColor}`}>
        <div className={`text-[11px] font-medium ${textColor}`}>{title}</div>
        <div className="text-[9px] text-white/40">{subtitle}</div>
      </div>
      <div className="p-3 space-y-1.5">
        {items.length === 0 ? (
          <div className="text-[11px] text-white/30">該当なし</div>
        ) : (
          items.map((item) => (
            <div key={item.product_name} className="flex items-center justify-between text-[11px]">
              <span className="text-white/70">{item.product_name}</span>
              <div className="flex gap-3 text-white/50 font-mono tabular-nums text-[10px]">
                <span>{(item.sales_count / 1000).toFixed(0)}k</span>
                <span>{item.gross_margin_pct}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---- subcomponents ----
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className={`font-mono tabular-nums text-xl ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] text-white/40">{sub}</div>
    </div>
  )
}

function VerdictBadge({ v }: { v: MenuPerf["verdict"] }) {
  if (v === "good")
    return (
      <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-400">
        Good
      </span>
    )
  if (v === "watch")
    return (
      <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-400">
        Watch
      </span>
    )
  return (
    <span className="rounded border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[9px] text-red-400">
      Under
    </span>
  )
}

function RecCard({
  tone,
  icon,
  title,
  body,
  confidence,
}: {
  tone: "emerald" | "amber" | "red"
  icon: React.ReactNode
  title: string
  body: string
  confidence: "High" | "Medium" | "Low"
}) {
  const border = tone === "emerald" ? "border-emerald-400/20" : tone === "amber" ? "border-amber-400/20" : "border-red-400/20"
  const bg = tone === "emerald" ? "bg-emerald-400/5" : tone === "amber" ? "bg-amber-400/5" : "bg-red-400/5"
  const conf = confidence === "High" ? "text-emerald-400" : confidence === "Medium" ? "text-amber-400" : "text-red-400"
  return (
    <div className={`rounded-md border ${border} ${bg} p-3`}>
      <div className="flex items-start gap-2">
        {icon}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/80">{title}</span>
            <span className={`text-[10px] ${conf}`}>{confidence}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">{body}</p>
        </div>
      </div>
    </div>
  )
}

function TimeSlotChart({
  data,
  max,
  avg,
}: {
  data: { slot: string; lift: number }[]
  max: number
  avg: number
}) {
  const w = 280
  const h = 140
  const pad = 24
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * innerW
    const y = pad + innerH - (d.lift / max) * innerH
    return { x, y, ...d }
  })
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {/* avg line */}
        <line
          x1={pad}
          x2={w - pad}
          y1={pad + innerH - (avg / max) * innerH}
          y2={pad + innerH - (avg / max) * innerH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
          strokeDasharray="3,3"
        />
        <path d={path} fill="none" stroke="rgba(96,165,250,0.7)" strokeWidth={1.5} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="rgba(96,165,250,0.9)" />
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(255,255,255,0.6)"
              fontFamily="ui-monospace, monospace"
            >
              +{p.lift.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-white/35">
        {data.map((d) => (
          <span key={d.slot}>{d.slot.split(" ")[0]}</span>
        ))}
      </div>
    </div>
  )
}
