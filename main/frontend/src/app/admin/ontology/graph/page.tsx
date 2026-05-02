"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import {
  Building2,
  Briefcase,
  Store as StoreIcon,
  Users,
  Box,
  UtensilsCrossed,
  Package,
  Factory,
  Warehouse,
  Truck,
  Calendar,
  Megaphone,
  Hammer,
  MapPin,
  AlertTriangle,
  Activity,
  Network,
  ArrowRight,
  Zap,
} from "lucide-react"

// ---- deterministic RNG ----
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
const rng = seededRandom(42)
const rand = (min: number, max: number) => Math.round(rng() * (max - min) + min)

// ---- ontology types ----
interface ObjectType {
  id: string
  name: string
  count: number
  color: string
  Icon: typeof StoreIcon
  fields: { name: string; type: string }[]
}

const objectTypes: ObjectType[] = [
  {
    id: "Tenant",
    name: "Tenant",
    count: 4,
    color: "#94a3b8",
    Icon: Building2,
    fields: [
      { name: "tenant_id", type: "uuid" },
      { name: "name", type: "string" },
      { name: "plan", type: "enum" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    id: "Brand",
    name: "Brand",
    count: 6,
    color: "#3b82f6",
    Icon: Briefcase,
    fields: [
      { name: "brand_id", type: "string" },
      { name: "name", type: "string" },
      { name: "category", type: "string" },
      { name: "tenant_id", type: "fk(Tenant)" },
    ],
  },
  {
    id: "Store",
    name: "Store",
    count: 120,
    color: "#22c55e",
    Icon: StoreIcon,
    fields: [
      { name: "store_id", type: "string" },
      { name: "name", type: "string" },
      { name: "brand", type: "fk(Brand)" },
      { name: "region", type: "string" },
      { name: "lat/lon", type: "geo" },
      { name: "daily_sales", type: "int" },
    ],
  },
  {
    id: "Employee",
    name: "Employee",
    count: 1840,
    color: "#a3a3a3",
    Icon: Users,
    fields: [
      { name: "employee_id", type: "string" },
      { name: "store_id", type: "fk(Store)" },
      { name: "role", type: "enum" },
      { name: "hire_date", type: "date" },
    ],
  },
  {
    id: "Product",
    name: "Product",
    count: 220,
    color: "#8b5cf6",
    Icon: Box,
    fields: [
      { name: "product_id", type: "string" },
      { name: "category", type: "string" },
      { name: "brand", type: "fk(Brand)" },
    ],
  },
  {
    id: "MenuItem",
    name: "MenuItem",
    count: 380,
    color: "#a855f7",
    Icon: UtensilsCrossed,
    fields: [
      { name: "menu_id", type: "string" },
      { name: "name", type: "string" },
      { name: "price", type: "int" },
      { name: "consumes_skus", type: "fk(SKU)[]" },
    ],
  },
  {
    id: "SKU",
    name: "SKU",
    count: 145,
    color: "#ef4444",
    Icon: Package,
    fields: [
      { name: "sku_id", type: "string" },
      { name: "name", type: "string" },
      { name: "produced_at", type: "fk(Factory)" },
      { name: "stored_at", type: "fk(DC)" },
    ],
  },
  {
    id: "Factory",
    name: "Factory",
    count: 4,
    color: "#f59e0b",
    Icon: Factory,
    fields: [
      { name: "factory_id", type: "string" },
      { name: "capacity_pct", type: "float" },
      { name: "location", type: "geo" },
    ],
  },
  {
    id: "DistributionCenter",
    name: "DC",
    count: 6,
    color: "#06b6d4",
    Icon: Warehouse,
    fields: [
      { name: "dc_id", type: "string" },
      { name: "covers_region", type: "string" },
    ],
  },
  {
    id: "DeliveryRoute",
    name: "Route",
    count: 40,
    color: "#0ea5e9",
    Icon: Truck,
    fields: [
      { name: "route_id", type: "string" },
      { name: "origin_dc", type: "fk(DC)" },
      { name: "destination_stores", type: "fk(Store)[]" },
    ],
  },
  {
    id: "Shift",
    name: "Shift",
    count: 720,
    color: "#ec4899",
    Icon: Calendar,
    fields: [
      { name: "shift_id", type: "string" },
      { name: "store_id", type: "fk(Store)" },
      { name: "start", type: "timestamp" },
      { name: "end", type: "timestamp" },
    ],
  },
  {
    id: "Campaign",
    name: "Campaign",
    count: 12,
    color: "#eab308",
    Icon: Megaphone,
    fields: [
      { name: "campaign_id", type: "string" },
      { name: "target_menu", type: "fk(MenuItem)[]" },
      { name: "sales_lift_pct", type: "float" },
    ],
  },
  {
    id: "RenovationProject",
    name: "Renovation",
    count: 30,
    color: "#fb923c",
    Icon: Hammer,
    fields: [
      { name: "project_id", type: "string" },
      { name: "store_id", type: "fk(Store)" },
      { name: "capex_myen", type: "int" },
    ],
  },
  {
    id: "LocationCandidate",
    name: "LocationCandidate",
    count: 20,
    color: "#14b8a6",
    Icon: MapPin,
    fields: [
      { name: "candidate_id", type: "string" },
      { name: "lat/lon", type: "geo" },
      { name: "expected_daily_sales", type: "int" },
    ],
  },
  {
    id: "Incident",
    name: "Incident",
    count: 10,
    color: "#f87171",
    Icon: AlertTriangle,
    fields: [
      { name: "incident_id", type: "string" },
      { name: "severity", type: "enum" },
      { name: "impacted_stores", type: "fk(Store)[]" },
    ],
  },
  {
    id: "Action",
    name: "Action",
    count: 22,
    color: "#60a5fa",
    Icon: Activity,
    fields: [
      { name: "action_id", type: "string" },
      { name: "incident_id", type: "fk(Incident)" },
      { name: "status", type: "enum" },
    ],
  },
]

// ---- relationships ----
interface Relationship {
  id: string
  source: string
  target: string
  rel: string
  cardinality: "1-1" | "1-N" | "N-N"
}

const relationships: Relationship[] = [
  { id: "R1", source: "Brand", target: "Tenant", rel: "belongs_to", cardinality: "1-1" },
  { id: "R2", source: "Store", target: "Brand", rel: "belongs_to", cardinality: "1-1" },
  { id: "R3", source: "Employee", target: "Store", rel: "works_at", cardinality: "1-1" },
  { id: "R4", source: "MenuItem", target: "Store", rel: "sold_at", cardinality: "N-N" },
  { id: "R5", source: "MenuItem", target: "SKU", rel: "consumes", cardinality: "N-N" },
  { id: "R6", source: "SKU", target: "Factory", rel: "produced_at", cardinality: "1-1" },
  { id: "R7", source: "SKU", target: "DistributionCenter", rel: "stored_at", cardinality: "N-N" },
  { id: "R8", source: "DeliveryRoute", target: "Store", rel: "delivers_to", cardinality: "1-N" },
  { id: "R9", source: "DeliveryRoute", target: "DistributionCenter", rel: "originates_at", cardinality: "1-1" },
  { id: "R10", source: "Shift", target: "Store", rel: "covers", cardinality: "1-1" },
  { id: "R11", source: "Shift", target: "Employee", rel: "assigned_to", cardinality: "1-1" },
  { id: "R12", source: "Campaign", target: "MenuItem", rel: "promotes", cardinality: "1-N" },
  { id: "R13", source: "Campaign", target: "Store", rel: "targets", cardinality: "N-N" },
  { id: "R14", source: "RenovationProject", target: "Store", rel: "improves", cardinality: "1-1" },
  { id: "R15", source: "LocationCandidate", target: "Store", rel: "may_cannibalize", cardinality: "N-N" },
  { id: "R16", source: "Incident", target: "Store", rel: "impacts", cardinality: "1-N" },
  { id: "R17", source: "Incident", target: "SKU", rel: "impacts", cardinality: "1-N" },
  { id: "R18", source: "Incident", target: "DeliveryRoute", rel: "impacts", cardinality: "1-N" },
  { id: "R19", source: "Incident", target: "Factory", rel: "impacts", cardinality: "1-N" },
  { id: "R20", source: "Action", target: "Incident", rel: "mitigates", cardinality: "1-1" },
  { id: "R21", source: "MenuItem", target: "Product", rel: "based_on", cardinality: "1-1" },
]

// ---- node positions (precomputed pseudo force-directed layout) ----
const W = 720
const H = 580
const nodePositions: Record<string, { x: number; y: number }> = {
  Tenant: { x: 360, y: 50 },
  Brand: { x: 360, y: 130 },
  Store: { x: 360, y: 280 },
  Employee: { x: 540, y: 200 },
  Shift: { x: 600, y: 290 },
  Product: { x: 200, y: 130 },
  MenuItem: { x: 200, y: 270 },
  SKU: { x: 100, y: 380 },
  Factory: { x: 60, y: 480 },
  DistributionCenter: { x: 200, y: 470 },
  DeliveryRoute: { x: 360, y: 430 },
  Campaign: { x: 540, y: 100 },
  RenovationProject: { x: 530, y: 410 },
  LocationCandidate: { x: 480, y: 510 },
  Incident: { x: 280, y: 540 },
  Action: { x: 130, y: 540 },
}

// ---- lineage events ----
const lineageEvents: Record<string, { ts: string; type: string; actor: string; details: string }[]> = {
  Store: [
    { ts: "2026-05-01T10:30", type: "update", actor: "POS Sync", details: "daily_sales updated for 120 records" },
    { ts: "2026-05-01T08:00", type: "ingest", actor: "Pipeline.daily_kpi", details: "ingested 120 store records" },
    { ts: "2026-04-30T22:15", type: "merge", actor: "DataOps", details: "merged 4 missing POS rows from backup" },
  ],
  SKU: [
    { ts: "2026-05-01T09:45", type: "alert", actor: "AI Engine", details: "stockout risk detected on SKU-001" },
    { ts: "2026-05-01T06:00", type: "update", actor: "Inventory Sync", details: "stock level updated for 145 SKUs" },
  ],
  Incident: [
    { ts: "2026-05-01T15:46", type: "decision", actor: "経営企画部", details: "INC-001 ACT-001 承認" },
    { ts: "2026-05-01T10:00", type: "create", actor: "AI Engine", details: "INC-001 generated" },
  ],
  MenuItem: [
    { ts: "2026-05-01T07:00", type: "alert", actor: "AI Engine", details: "menu performance gap detected" },
    { ts: "2026-04-25T10:00", type: "create", actor: "商品部", details: "牛めしバーガー registered" },
  ],
}
function getLineage(id: string) {
  return (
    lineageEvents[id] ?? [
      { ts: "2026-05-01T08:00", type: "ingest", actor: "Pipeline", details: `${id} ingested` },
      { ts: "2026-04-30T22:00", type: "schema", actor: "DataOps", details: `${id} schema validated` },
    ]
  )
}

export default function OntologyGraphPage() {
  const [selectedId, setSelectedId] = useState<string>("Store")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const adjacency = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    objectTypes.forEach((t) => (map[t.id] = new Set()))
    relationships.forEach((r) => {
      map[r.source]?.add(r.target)
      map[r.target]?.add(r.source)
    })
    return map
  }, [])

  // 2-hop reachable nodes from selectedId
  const reachable = useMemo(() => {
    if (!selectedId) return { hop1: new Set<string>(), hop2: new Set<string>() }
    const hop1 = new Set<string>(adjacency[selectedId] ?? [])
    const hop2 = new Set<string>()
    hop1.forEach((id) => {
      adjacency[id]?.forEach((n) => {
        if (n !== selectedId && !hop1.has(n)) hop2.add(n)
      })
    })
    return { hop1, hop2 }
  }, [selectedId, adjacency])

  const selectedType = objectTypes.find((t) => t.id === selectedId)
  const relatedRels = relationships.filter((r) => r.source === selectedId || r.target === selectedId)

  // Impact summary
  const impactStores =
    selectedId === "SKU" ? 55 : selectedId === "DeliveryRoute" ? 12 : selectedId === "Factory" ? 80 : 0
  const impactMenus = selectedId === "SKU" ? 12 : 0

  return (
    <div className="min-h-full -m-6 bg-[#0a0e14] p-6 text-white/80">
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <ContextHeader
          title="オントロジーグラフ"
          description="業務オブジェクトのリレーションを可視化"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: object type list */}
        <div className="col-span-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              Object Types
            </span>
            <span className="text-[10px] text-white/30">{objectTypes.length}</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[calc(100vh-220px)] overflow-y-auto">
            {objectTypes.map((t) => {
              const Icon = t.Icon
              const isActive = selectedId === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? "bg-blue-500/[0.10]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded border"
                    style={{
                      borderColor: `${t.color}55`,
                      backgroundColor: `${t.color}10`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: t.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-white/80">{t.name}</div>
                    <div className="text-[10px] text-white/35">{t.id}</div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-white/55">
                    {t.count.toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Center: graph */}
        <div className="col-span-6 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <div className="flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Object Graph
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-white/40">
              <Legend color="#3b82f6" label="selected" />
              <Legend color="#22c55e" label="1-hop" />
              <Legend color="#a855f7" label="2-hop" />
              <Legend color="#94a3b8" label="distant" />
            </div>
          </div>

          <div className="relative bg-[#060a10]" style={{ height: H }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
              {/* edges */}
              {relationships.map((r) => {
                const a = nodePositions[r.source]
                const b = nodePositions[r.target]
                if (!a || !b) return null
                const isSelected = r.source === selectedId || r.target === selectedId
                const isHover = r.source === hoveredId || r.target === hoveredId
                const highlight = isSelected || isHover
                return (
                  <g key={r.id}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={highlight ? "rgba(96,165,250,0.55)" : "rgba(255,255,255,0.07)"}
                      strokeWidth={highlight ? 1.2 : 0.5}
                    />
                    {highlight && (
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 3}
                        fill="rgba(96,165,250,0.6)"
                        fontSize={8}
                        textAnchor="middle"
                        fontStyle="italic"
                      >
                        {r.rel}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* nodes */}
            {objectTypes.map((t) => {
              const pos = nodePositions[t.id]
              if (!pos) return null
              const Icon = t.Icon
              const isSelected = selectedId === t.id
              const isHop1 = reachable.hop1.has(t.id)
              const isHop2 = reachable.hop2.has(t.id)
              const opacity = !selectedId
                ? 1
                : isSelected
                  ? 1
                  : isHop1
                    ? 0.95
                    : isHop2
                      ? 0.65
                      : 0.25
              const ringColor = isSelected
                ? "#3b82f6"
                : isHop1
                  ? "#22c55e"
                  : isHop2
                    ? "#a855f7"
                    : "transparent"

              const xPct = (pos.x / W) * 100
              const yPct = (pos.y / H) * 100

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  onMouseEnter={() => setHoveredId(t.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    opacity,
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 backdrop-blur"
                    style={{
                      borderColor: isSelected
                        ? `${ringColor}aa`
                        : isHop1
                          ? `${ringColor}55`
                          : "rgba(255,255,255,0.08)",
                      backgroundColor: isSelected
                        ? `${ringColor}22`
                        : "rgba(255,255,255,0.03)",
                      boxShadow: isSelected ? `0 0 0 2px ${ringColor}33` : "none",
                    }}
                  >
                    <Icon className="h-3 w-3" style={{ color: t.color }} />
                    <div className="text-left">
                      <div className="whitespace-nowrap text-[10px] font-medium text-white/85">
                        {t.name}
                      </div>
                      <div className="font-mono tabular-nums text-[8px] text-white/35">
                        n={t.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: detail */}
        <div className="col-span-3 space-y-4">
          {selectedType && (
            <>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    Selected Object
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded border"
                      style={{
                        borderColor: `${selectedType.color}66`,
                        backgroundColor: `${selectedType.color}15`,
                      }}
                    >
                      <selectedType.Icon className="h-4 w-4" style={{ color: selectedType.color }} />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-white/90">
                        {selectedType.name}
                      </div>
                      <div className="font-mono tabular-nums text-[10px] text-white/40">
                        {selectedType.count.toLocaleString()} objects
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <SectionLabel>Fields</SectionLabel>
                    <div className="mt-1.5 space-y-1">
                      {selectedType.fields.map((f) => (
                        <div
                          key={f.name}
                          className="flex items-center justify-between border-b border-white/[0.04] py-1 text-[11px] last:border-0"
                        >
                          <span className="text-white/65">{f.name}</span>
                          <span className="font-mono tabular-nums text-[10px] text-white/35">
                            {f.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    Relationships ({relatedRels.length})
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto p-3">
                  <div className="space-y-1.5">
                    {relatedRels.map((r) => {
                      const isOutgoing = r.source === selectedId
                      const counterpart = isOutgoing ? r.target : r.source
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-1.5 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px]"
                        >
                          <span className="font-medium text-white/70">
                            {isOutgoing ? selectedId : counterpart}
                          </span>
                          <ArrowRight className="h-3 w-3 text-blue-400/50" />
                          <span className="italic text-blue-400/70">{r.rel}</span>
                          <ArrowRight className="h-3 w-3 text-blue-400/50" />
                          <span className="font-medium text-white/70">
                            {isOutgoing ? counterpart : selectedId}
                          </span>
                          <span className="ml-auto rounded bg-white/[0.04] px-1 text-[8px] text-white/40">
                            {r.cardinality}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    Recent Lineage
                  </span>
                </div>
                <div className="p-3">
                  <div className="space-y-2">
                    {getLineage(selectedId).map((e, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400/70" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-white/65">
                            <span className="font-medium text-white/80">{e.actor}</span>
                            {" — "}
                            <span className="text-white/55">{e.details}</span>
                          </div>
                          <div className="font-mono tabular-nums text-[9px] text-white/30">
                            {e.ts} · {e.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Impact propagation */}
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Impact Propagation (2-hop reachability)
          </span>
        </div>
        <div className="grid grid-cols-12 gap-4 p-4">
          <div className="col-span-3">
            <SectionLabel>1-hop</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(reachable.hop1).map((id) => {
                const t = objectTypes.find((o) => o.id === id)
                if (!t) return null
                return (
                  <span
                    key={id}
                    className="rounded border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: `${t.color}55`,
                      backgroundColor: `${t.color}15`,
                      color: t.color,
                    }}
                  >
                    {t.name}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="col-span-3">
            <SectionLabel>2-hop</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(reachable.hop2).map((id) => {
                const t = objectTypes.find((o) => o.id === id)
                if (!t) return null
                return (
                  <span
                    key={id}
                    className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/60"
                  >
                    {t.name}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="col-span-6">
            <SectionLabel>Estimated Blast Radius</SectionLabel>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <ImpactCell
                label="影響メニュー"
                value={impactMenus || (reachable.hop1.has("MenuItem") ? rand(8, 25) : 0)}
                color="text-purple-400"
              />
              <ImpactCell
                label="影響店舗"
                value={impactStores || (reachable.hop1.has("Store") || reachable.hop2.has("Store") ? rand(5, 80) : 0)}
                color="text-emerald-400"
              />
              <ImpactCell
                label="影響ルート"
                value={
                  reachable.hop1.has("DeliveryRoute") || reachable.hop2.has("DeliveryRoute") ? rand(2, 18) : 0
                }
                color="text-cyan-400"
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/45">
              <span className="text-white/70">{selectedType?.name}</span> の変化は 1-hop で {reachable.hop1.size}{" "}
              種類、2-hop で {reachable.hop2.size} 種類のオブジェクトに到達。最大ブラスト半径は{" "}
              <span className="font-mono tabular-nums text-amber-400">
                {reachable.hop1.size + reachable.hop2.size}
              </span>{" "}
              タイプに及ぶ。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
      {children}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function ImpactCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-center">
      <div className={`font-mono tabular-nums text-lg ${color}`}>{value}</div>
      <div className="text-[9px] text-white/40">{label}</div>
    </div>
  )
}
