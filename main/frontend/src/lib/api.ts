import type { APIResponse } from "./types"
import { getToken } from "./auth"
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
  mockAnalyses, mockCustomKPIDefs, mockCohortDefs,
  mockRecipes, mockIngredients, mockShifts, mockLaborCompliance,
  mockQSCAudits, mockHACCPCompliance, mockHACCPMonitoring, mockAllergenMatrix,
  mockFranchiseAgreements, mockRoyaltyCalcs, mockBenchmarks,
  mockRoles, mockRolePermissions,
  mockObjectTypesV2, mockImpactReport,
  mockHuffResult, mockMenuEngineering, mockPriceElasticities, mockPriceDecisions, mockProductDetail,
  mockPilotThemes, mockPilots, mockPilotResults, mockPilotSummary,
  mockConnectorHealth, mockColumnPolicies, mockPIIRedactionLogs, mockPIISummary,
  mockSVMissionPlan, mockStoreManagerBrief,
  mockAuditLogs, mockUserList,
} from "./mock-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) return fetchMock<T>(path, options)

  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)

  const json: APIResponse<T> = await res.json()
  if (json.errors && json.errors.length > 0) throw new Error(json.errors.join(", "))
  return json.data
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
  // Ontology v2
  if (path.match(/\/api\/v1\/ontology\/object-types\/[^/]+\/impact/)) {
    const id = path.split("/")[5]
    return (mockImpactReport[id] || { kpi_count: 0, instance_count: 0, link_count: 0, lineage_count: 0, breaking_changes: [] }) as any
  }
  if (path.match(/\/api\/v1\/ontology\/object-types\/[^/]+\/properties/)) {
    const id = path.split("/")[5]
    const ot = mockObjectTypesV2.find((t) => t.id === id)
    return (ot?.properties || []) as any
  }
  if (path.match(/\/api\/v1\/ontology\/object-types\/[^/]+\/publish/)) return { status: "published" } as any
  if (path === "/api/v1/ontology/object-types-v2") return mockObjectTypesV2 as any
  // Ontology v1
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
  // Workspace
  if (path.match(/\/api\/v1\/workspace\/custom-kpis\/[^/]+\/promote/)) return { status: "promoted" } as any
  if (path.startsWith("/api/v1/workspace/analyses")) return mockAnalyses as any
  if (path.startsWith("/api/v1/workspace/custom-kpis")) return mockCustomKPIDefs as any
  if (path.startsWith("/api/v1/workspace/cohorts")) return mockCohortDefs as any
  // Recipes
  if (path.startsWith("/api/v1/vertical/recipes")) return mockRecipes as any
  if (path.startsWith("/api/v1/vertical/ingredients")) return mockIngredients as any
  // Labor
  if (path.startsWith("/api/v1/vertical/labor/shifts")) return mockShifts as any
  if (path.startsWith("/api/v1/vertical/labor/compliance-report") || path.startsWith("/api/v1/vertical/labor/compliance")) return mockLaborCompliance as any
  // QSC
  if (path.startsWith("/api/v1/vertical/qsc/audits")) return mockQSCAudits as any
  // HACCP
  if (path.startsWith("/api/v1/vertical/haccp/compliance")) return mockHACCPCompliance as any
  if (path.startsWith("/api/v1/vertical/haccp/monitoring")) return mockHACCPMonitoring as any
  if (path.startsWith("/api/v1/vertical/haccp/allergens")) return mockAllergenMatrix as any
  // Franchise
  if (path.startsWith("/api/v1/vertical/franchise/agreements")) return mockFranchiseAgreements as any
  if (path.startsWith("/api/v1/vertical/franchise/royalties")) return mockRoyaltyCalcs as any
  // Benchmarks
  if (path.startsWith("/api/v1/benchmarks")) return mockBenchmarks as any
  // Roles
  if (path.match(/\/api\/v1\/rbac\/roles\/[^/]+\/permissions/)) {
    const id = path.split("/")[5]
    return (mockRolePermissions[id] || []) as any
  }
  if (path.startsWith("/api/v1/rbac/roles")) return mockRoles as any
  // Audit logs
  if (path.startsWith("/api/v1/audit/logs")) return mockAuditLogs as any
  // Users
  if (path.startsWith("/api/v1/rbac/users")) return mockUserList as any
  // Huff prediction
  if (path.startsWith("/api/v1/vertical/trade-areas/predict-huff")) return mockHuffResult as any
  // Menu engineering
  if (path.startsWith("/api/v1/vertical/pricing/menu-engineering")) return mockMenuEngineering as any
  // Elasticities
  if (path.startsWith("/api/v1/vertical/pricing/elasticities")) return mockPriceElasticities as any
  // Price decisions
  if (path.startsWith("/api/v1/vertical/pricing/decisions")) return mockPriceDecisions as any
  // Product detail
  if (path.match(/\/api\/v1\/vertical\/products\/[^/]+$/)) return mockProductDetail as any
  // Zensho Pilot
  if (path === "/api/v1/pilots/themes") return { data: mockPilotThemes } as any
  if (path.match(/\/api\/v1\/pilots\/themes\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return { data: mockPilotThemes.find((t: any) => t.theme_id === id) } as any
  }
  if (path.match(/\/api\/v1\/pilots\/[^/]+\/summary/)) return { data: mockPilotSummary } as any
  if (path.match(/\/api\/v1\/pilots\/[^/]+\/results/)) return { data: mockPilotResults } as any
  if (path.match(/\/api\/v1\/pilots\/[^/]+\/calculate-results/)) return { data: mockPilotResults } as any
  if (path.match(/\/api\/v1\/pilots\/[^/]+\/export-pack/)) return { data: { audience: "executive", title: mockPilotSummary.name, sections: [] } } as any
  if (path.match(/\/api\/v1\/pilots\/[^/]+$/)) {
    const id = path.split("/").pop()!
    return { data: { ...mockPilots[0], id } } as any
  }
  if (path === "/api/v1/pilots" || path === "/api/v1/pilots/") return { data: mockPilots } as any
  // Connector Health
  if (path === "/api/v1/connector-health" || path === "/api/v1/connector-health/") return { data: mockConnectorHealth } as any
  // Column Policies / PII / Security
  if (path.startsWith("/api/v1/admin/security/column-policies")) return { data: mockColumnPolicies } as any
  if (path.startsWith("/api/v1/admin/security/pii-redaction-logs")) return { data: mockPIIRedactionLogs } as any
  if (path.startsWith("/api/v1/admin/security/pii-redaction-summary")) return { data: mockPIISummary } as any
  if (path.startsWith("/api/v1/admin/security/security-review-pack/export")) {
    return { data: { title: "AENTRO Security Review Pack", sections: [], compliance_status: { tenant_isolation: "✓", encryption_at_rest: "✓" } } } as any
  }
  return {} as T
}

export { fetchAPI }
