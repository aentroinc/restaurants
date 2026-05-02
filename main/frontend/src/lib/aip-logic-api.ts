"use client"

export type TriggerType = "cron" | "event" | "anomaly"
export type ActionType =
  | "call_ai_chat"
  | "create_task"
  | "send_notification"
  | "query_kpi"
  | "run_pipeline"

export interface PredicateNode {
  op: string
  // and/or
  children?: PredicateNode[]
  // not
  child?: PredicateNode
  // comparison
  left?: { kpi?: string; const?: number | string; var?: string; scope?: string }
  right?: { kpi?: string; const?: number | string; var?: string; scope?: string }
}

export interface ActionStep {
  type: ActionType
  params: Record<string, any>
  stop_on_error?: boolean
}

export interface LogicFunction {
  id: string
  tenant_id: string
  name: string
  description?: string | null
  trigger_json: { type: TriggerType; config: Record<string, any> }
  predicate_json: PredicateNode | Record<string, any>
  actions_json: ActionStep[]
  enabled: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface LogicRun {
  id: string
  function_id: string
  triggered_at: string
  trigger_payload_json: Record<string, any>
  predicate_result: boolean | null
  actions_executed_json: any[]
  status: "pending" | "success" | "failed" | "skipped"
  error?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

const FALLBACK_FNS: LogicFunction[] = [
  {
    id: "fn_demo_1",
    tenant_id: "demo",
    name: "売上前年比 -10% 超で原因分析タスク発行",
    description: "前年比で売上が 10% 以上落ちた店舗に対し、AI が仮説を生成しタスク化する。",
    trigger_json: { type: "anomaly", config: { kpi: "net_sales", threshold_pct: -10, compare: "yoy" } },
    predicate_json: { op: "<", left: { kpi: "net_sales" }, right: { const: 800000 } },
    actions_json: [
      { type: "call_ai_chat", params: { prompt: "売上が前年比10%以上下がりました。仮説3点。" } },
      { type: "create_task", params: { title: "[AI] 売上低下の原因分析", priority: "high" } },
    ],
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fn_demo_2",
    tenant_id: "demo",
    name: "労務違反検知で SV に通知",
    description: "労働基準法違反の検知時に SV へ即時通知する。",
    trigger_json: { type: "event", config: { event: "labor_violation_detected" } },
    predicate_json: { op: ">", left: { kpi: "labor_cost_rate" }, right: { const: 35 } },
    actions_json: [
      { type: "send_notification", params: { channel: "sv", message: "労務違反の可能性。確認お願いします。" } },
    ],
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fn_demo_3",
    tenant_id: "demo",
    name: "レビュー★3以下が3件続いたら店長日報生成",
    description: "低評価レビュー連続時に AI 日報を生成。",
    trigger_json: { type: "anomaly", config: { kpi: "review_score", threshold: 3.0, consecutive: 3 } },
    predicate_json: { op: "<=", left: { kpi: "review_score" }, right: { const: 3 } },
    actions_json: [
      { type: "call_ai_chat", params: { prompt: "★3以下が3件。店長向け改善日報を300字。" } },
      { type: "create_task", params: { title: "[AI] 低評価レビュー対応の店長日報", priority: "medium" } },
    ],
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const FALLBACK_RUNS: Record<string, LogicRun[]> = {
  fn_demo_1: [
    {
      id: "run_demo_1",
      function_id: "fn_demo_1",
      triggered_at: new Date(Date.now() - 3600000).toISOString(),
      trigger_payload_json: { type: "anomaly", kpi: { net_sales: 720000 } },
      predicate_result: true,
      actions_executed_json: [
        { type: "call_ai_chat", ok: true, text: "仮説1: 周辺の競合店リニューアル..." },
        { type: "create_task", ok: true, task_id: "task_42" },
      ],
      status: "success",
    },
  ],
}

async function tryFetch<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  if (!API_URL) {
    if (fallback !== undefined) return fallback
    throw new Error("no api & no fallback")
  }
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
    if (!res.ok) {
      if (fallback !== undefined) return fallback
      throw new Error(`HTTP ${res.status}`)
    }
    const json = await res.json()
    return (json.data ?? json) as T
  } catch {
    if (fallback !== undefined) return fallback
    throw new Error("fetch failed")
  }
}

export const aipLogicApi = {
  async list(): Promise<LogicFunction[]> {
    return tryFetch<LogicFunction[]>("/api/v1/aip-logic/functions", undefined, FALLBACK_FNS)
  },
  async get(id: string): Promise<LogicFunction> {
    const fb = FALLBACK_FNS.find((f) => f.id === id) ?? FALLBACK_FNS[0]
    return tryFetch<LogicFunction>(`/api/v1/aip-logic/functions/${id}`, undefined, fb)
  },
  async create(payload: Partial<LogicFunction>): Promise<LogicFunction> {
    const fb: LogicFunction = {
      id: `fn_${Date.now()}`,
      tenant_id: "demo",
      name: payload.name ?? "新規ロジック",
      description: payload.description ?? "",
      trigger_json: payload.trigger_json ?? { type: "anomaly", config: {} },
      predicate_json: payload.predicate_json ?? {},
      actions_json: payload.actions_json ?? [],
      enabled: payload.enabled ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return tryFetch<LogicFunction>("/api/v1/aip-logic/functions", {
      method: "POST",
      body: JSON.stringify(payload),
    }, fb)
  },
  async update(id: string, payload: Partial<LogicFunction>): Promise<LogicFunction> {
    const existing = FALLBACK_FNS.find((f) => f.id === id) ?? FALLBACK_FNS[0]
    const fb: LogicFunction = { ...existing, ...payload, id, updated_at: new Date().toISOString() }
    return tryFetch<LogicFunction>(`/api/v1/aip-logic/functions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, fb)
  },
  async delete(id: string): Promise<{ deleted: string }> {
    return tryFetch<{ deleted: string }>(`/api/v1/aip-logic/functions/${id}`, { method: "DELETE" }, { deleted: id })
  },
  async test(id: string, context: Record<string, any>): Promise<{ predicate_result: boolean; would_execute_actions: string[] }> {
    return tryFetch<{ predicate_result: boolean; would_execute_actions: string[] }>(
      `/api/v1/aip-logic/functions/${id}/test`,
      { method: "POST", body: JSON.stringify({ context }) },
      { predicate_result: true, would_execute_actions: ["call_ai_chat", "create_task"] },
    )
  },
  async runNow(id: string, trigger_payload?: Record<string, any>): Promise<{ status: string; predicate_result: boolean; actions_executed: any[] }> {
    return tryFetch(
      `/api/v1/aip-logic/functions/${id}/run`,
      { method: "POST", body: JSON.stringify({ trigger_payload: trigger_payload ?? { type: "manual" } }) },
      { status: "success", predicate_result: true, actions_executed: [{ type: "call_ai_chat", ok: true, text: "[fallback] 仮説 OK" }] },
    )
  },
  async listRuns(id: string): Promise<LogicRun[]> {
    return tryFetch<LogicRun[]>(`/api/v1/aip-logic/functions/${id}/runs`, undefined, FALLBACK_RUNS[id] ?? [])
  },
}

// KPI choices for the predicate builder
export const KPI_OPTIONS: { value: string; label: string }[] = [
  { value: "net_sales", label: "売上" },
  { value: "customer_count", label: "客数" },
  { value: "avg_ticket", label: "客単価" },
  { value: "cogs_rate", label: "原価率 (%)" },
  { value: "labor_cost_rate", label: "人件費率 (%)" },
  { value: "fl_ratio", label: "FL比率" },
  { value: "gross_profit_rate", label: "粗利率 (%)" },
  { value: "operating_profit_rate", label: "営業利益率 (%)" },
  { value: "review_score", label: "レビュー★" },
  { value: "health_score", label: "健康スコア" },
]

export const ACTION_LABELS: Record<ActionType, string> = {
  call_ai_chat: "AI に質問する",
  create_task: "タスク発行",
  send_notification: "通知を送る",
  query_kpi: "KPI を取得",
  run_pipeline: "パイプライン実行",
}
