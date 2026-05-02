"use client"

import { mockPipelines, mockPipelineRuns, mockPipelineSchedules, mockPipelineBranches } from "./pipeline-templates"

export type PipelineNodeType =
  | "transform_sql"
  | "connector_fetch"
  | "validate"
  | "writeback"
  | "python_func"

export interface PipelineNode {
  id: string
  type: PipelineNodeType
  label: string
  position: { x: number; y: number }
  config: Record<string, any>
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface PipelineDef {
  id: string
  name: string
  description?: string
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  status: "active" | "paused" | "draft"
  branch: string
  last_run_at?: string
  last_run_status?: "success" | "failed" | "running" | "skipped"
  schedule?: string
  created_at: string
  updated_at: string
}

export interface PipelineRunNodeStatus {
  node_id: string
  status: "success" | "failed" | "running" | "skipped" | "pending"
  started_at?: string
  finished_at?: string
  duration_ms?: number
  rows_processed?: number
  log?: string
  error?: string
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  branch: string
  status: "success" | "failed" | "running" | "skipped"
  started_at: string
  finished_at?: string
  duration_ms?: number
  triggered_by: string
  node_runs: PipelineRunNodeStatus[]
}

export interface PipelineSchedule {
  id: string
  pipeline_id: string
  cron: string
  branch: string
  enabled: boolean
  next_run_at?: string
  description?: string
}

export interface PipelineBranch {
  name: string
  base: string
  created_at: string
  created_by: string
  diff_count?: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

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

export const pipelineApi = {
  async list(): Promise<PipelineDef[]> {
    return tryFetch<PipelineDef[]>("/api/v1/pipelines", undefined, mockPipelines)
  },

  async get(id: string): Promise<PipelineDef> {
    const fallback = mockPipelines.find((p) => p.id === id) ?? mockPipelines[0]
    return tryFetch<PipelineDef>(`/api/v1/pipelines/${id}`, undefined, fallback)
  },

  async create(p: Partial<PipelineDef>): Promise<PipelineDef> {
    const created: PipelineDef = {
      id: `pl_${Date.now()}`,
      name: p.name ?? "新規パイプライン",
      description: p.description,
      nodes: p.nodes ?? [],
      edges: p.edges ?? [],
      status: "draft",
      branch: "main",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return tryFetch<PipelineDef>("/api/v1/pipelines", {
      method: "POST",
      body: JSON.stringify(p),
    }, created)
  },

  async update(id: string, p: Partial<PipelineDef>): Promise<PipelineDef> {
    const existing = mockPipelines.find((m) => m.id === id) ?? mockPipelines[0]
    const merged: PipelineDef = { ...existing, ...p, id, updated_at: new Date().toISOString() }
    return tryFetch<PipelineDef>(`/api/v1/pipelines/${id}`, {
      method: "PUT",
      body: JSON.stringify(p),
    }, merged)
  },

  async run(id: string, branch = "main"): Promise<PipelineRun> {
    const def = mockPipelines.find((m) => m.id === id) ?? mockPipelines[0]
    const fallback: PipelineRun = {
      id: `run_${Date.now()}`,
      pipeline_id: id,
      branch,
      status: "running",
      started_at: new Date().toISOString(),
      triggered_by: "manual",
      node_runs: def.nodes.map((n, i) => ({
        node_id: n.id,
        status: i === 0 ? "running" : "pending",
      })),
    }
    return tryFetch<PipelineRun>(`/api/v1/pipelines/${id}/run?branch=${branch}`, {
      method: "POST",
    }, fallback)
  },

  async listRuns(id: string): Promise<PipelineRun[]> {
    const fallback = mockPipelineRuns.filter((r) => r.pipeline_id === id)
    return tryFetch<PipelineRun[]>(`/api/v1/pipelines/${id}/runs`, undefined, fallback)
  },

  async getRun(id: string, runId: string): Promise<PipelineRun> {
    const fallback = mockPipelineRuns.find((r) => r.id === runId) ?? mockPipelineRuns[0]
    return tryFetch<PipelineRun>(`/api/v1/pipelines/${id}/runs/${runId}`, undefined, fallback)
  },

  async listSchedules(id: string): Promise<PipelineSchedule[]> {
    const fallback = mockPipelineSchedules.filter((s) => s.pipeline_id === id)
    return tryFetch<PipelineSchedule[]>(`/api/v1/pipelines/${id}/schedules`, undefined, fallback)
  },

  async createSchedule(id: string, payload: Partial<PipelineSchedule>): Promise<PipelineSchedule> {
    const fallback: PipelineSchedule = {
      id: `sch_${Date.now()}`,
      pipeline_id: id,
      cron: payload.cron ?? "0 0 * * *",
      branch: payload.branch ?? "main",
      enabled: payload.enabled ?? true,
      description: payload.description,
    }
    return tryFetch<PipelineSchedule>(`/api/v1/pipelines/${id}/schedules`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, fallback)
  },

  async deleteSchedule(id: string, scheduleId: string): Promise<{ ok: true }> {
    return tryFetch<{ ok: true }>(`/api/v1/pipelines/${id}/schedules/${scheduleId}`, {
      method: "DELETE",
    }, { ok: true })
  },

  async listBranches(id: string): Promise<PipelineBranch[]> {
    return tryFetch<PipelineBranch[]>(`/api/v1/pipelines/${id}/branches`, undefined, mockPipelineBranches)
  },

  async createBranch(id: string, name: string, base = "main"): Promise<PipelineBranch> {
    const fallback: PipelineBranch = {
      name,
      base,
      created_at: new Date().toISOString(),
      created_by: "current_user",
      diff_count: 0,
    }
    return tryFetch<PipelineBranch>(`/api/v1/pipelines/${id}/branches`, {
      method: "POST",
      body: JSON.stringify({ name, base }),
    }, fallback)
  },

  async merge(id: string, source: string, target = "main"): Promise<{ ok: true; conflicts?: string[] }> {
    return tryFetch(`/api/v1/pipelines/${id}/merge`, {
      method: "POST",
      body: JSON.stringify({ source, target }),
    }, { ok: true as const })
  },
}

export const NODE_TYPE_META: Record<PipelineNodeType, { label: string; color: string; bg: string; border: string; description: string }> = {
  connector_fetch: {
    label: "コネクタ取込",
    color: "text-blue-300",
    bg: "bg-blue-500/15",
    border: "border-blue-400/40",
    description: "外部 API / SFTP / DB から生データを取得",
  },
  transform_sql: {
    label: "SQL 変換",
    color: "text-purple-300",
    bg: "bg-purple-500/15",
    border: "border-purple-400/40",
    description: "SQL で集計・結合・整形",
  },
  validate: {
    label: "バリデーション",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-400/40",
    description: "データ品質チェック (null率/範囲/uniq)",
  },
  writeback: {
    label: "書き戻し",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/40",
    description: "出力 dataset へ永続化 / 通知",
  },
  python_func: {
    label: "Python 関数",
    color: "text-pink-300",
    bg: "bg-pink-500/15",
    border: "border-pink-400/40",
    description: "カスタム Python ロジック (ML / 整形)",
  },
}

export const STATUS_COLOR: Record<string, { fg: string; bg: string; border: string; label: string }> = {
  success:   { fg: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-400/50", label: "成功" },
  failed:    { fg: "text-red-300",     bg: "bg-red-500/15",     border: "border-red-400/50",     label: "失敗" },
  running:   { fg: "text-blue-300",    bg: "bg-blue-500/15",    border: "border-blue-400/50",    label: "実行中" },
  skipped:   { fg: "text-white/50",    bg: "bg-white/[0.04]",   border: "border-white/15",       label: "スキップ" },
  pending:   { fg: "text-white/40",    bg: "bg-white/[0.02]",   border: "border-white/10",       label: "待機" },
}
