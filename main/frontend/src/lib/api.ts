import type { APIResponse } from "./types"
import {
  mockExecutiveSummary, mockStores, mockSVMissions, mockTasks,
  mockMeetingPacks, mockDataQualitySummary, mockDataQualityIssues,
  mockValueCases, mockValueRealizationSummary, mockAIResponses,
  mockSuggestedQuestions, getMockStoreDetail,
} from "./mock-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) return fetchMock<T>(path, options)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    })

    if (!res.ok) throw new Error(`API error: ${res.status}`)

    const json: APIResponse<T> = await res.json()
    if (json.errors && json.errors.length > 0) throw new Error(json.errors.join(", "))
    return json.data
  } catch {
    return fetchMock<T>(path, options)
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fetchMock<T>(path: string, options?: RequestInit): T {
  if (path.startsWith("/api/v1/executive/summary")) return mockExecutiveSummary as any
  if (path.startsWith("/api/v1/stores/") && path.endsWith("/profit-graph")) {
    const id = path.split("/")[4]
    return getMockStoreDetail(id).profit_graph as any
  }
  if (path.match(/\/api\/v1\/stores\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return getMockStoreDetail(id) as any
  }
  if (path.startsWith("/api/v1/stores")) return { stores: mockStores, total: mockStores.length } as any
  if (path.startsWith("/api/v1/sv/missions")) return mockSVMissions as any
  if (path.startsWith("/api/v1/tasks")) return mockTasks as any
  if (path.match(/\/api\/v1\/meeting-packs\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return mockMeetingPacks.find((m) => m.id === id) as any || mockMeetingPacks[0] as any
  }
  if (path.startsWith("/api/v1/meeting-packs")) return mockMeetingPacks as any
  if (path.startsWith("/api/v1/data-quality/summary")) return mockDataQualitySummary as any
  if (path.startsWith("/api/v1/data-quality/issues")) return mockDataQualityIssues as any
  if (path.startsWith("/api/v1/value-cases")) {
    if (path === "/api/v1/value-cases") return mockValueCases as any
    return mockValueRealizationSummary as any
  }
  if (path.startsWith("/api/v1/ai/suggested-questions")) return mockSuggestedQuestions as any
  if (path.startsWith("/api/v1/ai/query")) {
    const body = options?.body ? JSON.parse(options.body as string) : {}
    const question = body.question || ""
    return (mockAIResponses[question] || mockAIResponses["default"]) as any
  }
  return {} as T
}

export { fetchAPI }
