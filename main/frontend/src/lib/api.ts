import type { APIResponse } from "./types"
import {
  mockExecutiveSummary, mockStores, mockSVMissions, mockTasks,
  mockMeetingPacks, mockDataQualitySummary, mockDataQualityIssues,
  mockValueCases, mockValueRealizationSummary, mockAIResponses,
  mockSuggestedQuestions, getMockStoreDetail,
  mockOntologyObjectTypes, mockOntologyObjects, mockOntologyRelationTypes,
  mockKPIDefinitions, mockKPISimulationResult, mockKPILineage, mockLineageEvents,
  mockWritebackPolicies, mockWritebackRequests,
  mockDataSources, mockDataContracts, mockIngestionRuns, mockSchemaMappings, mockIDMappings,
  mockAIGovernanceConfig, mockAIResponseEnhanced,
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
  // Ontology
  if (path.startsWith("/api/v1/ontology/object-types")) return mockOntologyObjectTypes as any
  if (path.match(/\/api\/v1\/ontology\/objects\/[^/]+\/relations/)) {
    const id = path.split("/")[5]
    const obj = mockOntologyObjects.find((o) => o.id === id)
    return (obj?.relations || []) as any
  }
  if (path.match(/\/api\/v1\/ontology\/objects\/[^/]+\/lineage/)) return mockLineageEvents as any
  if (path.match(/\/api\/v1\/ontology\/objects\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return (mockOntologyObjects.find((o) => o.id === id) || mockOntologyObjects[0]) as any
  }
  if (path.startsWith("/api/v1/ontology/objects")) return mockOntologyObjects as any
  if (path.startsWith("/api/v1/ontology/relation-types")) return mockOntologyRelationTypes as any
  // KPI Definitions
  if (path.match(/\/api\/v1\/kpi-definitions\/[^/]+\/simulate/)) return mockKPISimulationResult as any
  if (path.match(/\/api\/v1\/kpi-definitions\/[^/]+\/approve/)) return { status: "approved" } as any
  if (path.match(/\/api\/v1\/kpi-definitions\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return (mockKPIDefinitions.find((k) => k.id === id) || mockKPIDefinitions[0]) as any
  }
  if (path.startsWith("/api/v1/kpi-definitions")) return mockKPIDefinitions as any
  // Lineage
  if (path.startsWith("/api/v1/lineage/kpi/")) return mockKPILineage as any
  if (path.startsWith("/api/v1/lineage/object/")) return mockLineageEvents as any
  // Writeback
  if (path.startsWith("/api/v1/writeback/policies")) return mockWritebackPolicies as any
  if (path.match(/\/api\/v1\/writeback\/requests\/[^/]+\/(approve|execute)/)) return { status: "ok" } as any
  if (path.startsWith("/api/v1/writeback/requests")) return mockWritebackRequests as any
  // Admin
  if (path.startsWith("/api/v1/admin/data-sources")) return mockDataSources as any
  if (path.startsWith("/api/v1/admin/data-contracts")) return mockDataContracts as any
  if (path.startsWith("/api/v1/admin/ingestion-runs")) return mockIngestionRuns as any
  if (path.startsWith("/api/v1/admin/schema-mappings")) return mockSchemaMappings as any
  if (path.startsWith("/api/v1/admin/id-mappings")) return mockIDMappings as any
  if (path.startsWith("/api/v1/admin/ai-governance")) return mockAIGovernanceConfig as any
  return {} as T
}

export { fetchAPI }
