// Analysis API の薄いラッパ
// Analysis.spec は JSONB なので Canvas spec をそのまま保存する

import { fetchAPI } from "./api"
import type { Analysis } from "./types"
import type { CanvasSpec } from "./canvas-spec"
import { makeEmptySpec } from "./canvas-spec"

export interface CanvasAnalysis {
  id: string
  name: string
  description?: string
  visibility: string
  spec: CanvasSpec
  created_at: string
}

function toCanvasSpec(raw: unknown): CanvasSpec {
  const r = (raw ?? {}) as Partial<CanvasSpec>
  if (
    typeof r === "object" &&
    r !== null &&
    "version" in r &&
    r.version === 1 &&
    Array.isArray((r as CanvasSpec).layout) &&
    Array.isArray((r as CanvasSpec).tiles)
  ) {
    return {
      version: 1,
      layout: (r as CanvasSpec).layout,
      tiles: (r as CanvasSpec).tiles,
      filters: (r as CanvasSpec).filters ?? {},
    }
  }
  return makeEmptySpec()
}

export async function listAnalyses(): Promise<CanvasAnalysis[]> {
  const data = await fetchAPI<Analysis[]>("/api/v1/workspace/analyses")
  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    visibility: a.visibility,
    spec: toCanvasSpec(a.spec),
    created_at: a.created_at,
  }))
}

export async function loadAnalysis(id: string): Promise<CanvasAnalysis | null> {
  try {
    const data = await fetchAPI<Analysis>(`/api/v1/workspace/analyses/${id}`)
    if (!data) return null
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
      spec: toCanvasSpec(data.spec),
      created_at: data.created_at,
    }
  } catch {
    const all = await listAnalyses()
    return all.find((a) => a.id === id) ?? null
  }
}

export async function createAnalysis(input: {
  name: string
  description?: string
  visibility?: string
  spec: CanvasSpec
}): Promise<CanvasAnalysis> {
  const body = JSON.stringify({
    name: input.name,
    description: input.description ?? "",
    visibility: input.visibility ?? "private",
    spec: input.spec,
  })
  try {
    const data = await fetchAPI<Analysis>("/api/v1/workspace/analyses", { method: "POST", body })
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
      spec: toCanvasSpec(data.spec),
      created_at: data.created_at,
    }
  } catch {
    return {
      id: `local-${Date.now()}`,
      name: input.name,
      description: input.description,
      visibility: input.visibility ?? "private",
      spec: input.spec,
      created_at: new Date().toISOString(),
    }
  }
}

export async function saveAnalysis(id: string, input: {
  name?: string
  description?: string
  visibility?: string
  spec: CanvasSpec
}): Promise<void> {
  const body = JSON.stringify(input)
  try {
    await fetchAPI<Analysis>(`/api/v1/workspace/analyses/${id}`, { method: "PUT", body })
  } catch {
    // mock fallback
  }
}
