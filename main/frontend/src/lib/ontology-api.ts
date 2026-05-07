import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

// ============================================
// Types
// ============================================
export type DataType = "string" | "int" | "float" | "bool" | "datetime" | "json"
export type PIILevel = "none" | "low" | "medium" | "high"
export type Cardinality = "1:1" | "1:N" | "N:1" | "N:N"
export type BranchStatus = "active" | "merged" | "abandoned"

export interface OntoProperty {
  id: string
  api_name: string
  display_name: string
  data_type: DataType
  required: boolean
  pii_level: PIILevel
  enum_values?: string[]
  validation?: string
  description?: string
}

export interface OntoObjectType {
  id: string
  api_name: string
  display_name: string
  icon: string
  version: number
  status: "active" | "draft" | "deprecated"
  description?: string
  properties: OntoProperty[]
}

export interface OntoLink {
  id: string
  api_name: string
  display_name: string
  from_object_type_id: string
  to_object_type_id: string
  cardinality: Cardinality
  description?: string
}

export interface OntoAction {
  id: string
  api_name: string
  display_name: string
  object_type_id: string
  params_schema: Record<string, unknown>
  requires_approval: boolean
  description?: string
}

// Object Instance (= Ontology の実データ行)
export interface OntoObjectInstance {
  id: string
  object_type_id: string
  object_type_api_name?: string
  display_name: string
  properties: Record<string, unknown>
  // 関連オブジェクト（outgoing links）
  links?: { link_api_name: string; to_instance_id: string; to_display_name: string; to_object_type_id: string }[]
}

export interface OntoBranch {
  id: string
  name: string
  base: string
  status: BranchStatus
  created_at: string
  created_by?: string
  merged_at?: string
  description?: string
}

export interface OntoBranchDiff {
  added: Record<string, unknown>
  removed: Record<string, unknown>
  changed: Record<string, { before: unknown; after: unknown }>
}

// ============================================
// Mock fallback data (used when backend 404s)
// ============================================
const mockObjectTypes: OntoObjectType[] = [
  {
    id: "ot-store", api_name: "store", display_name: "店舗", icon: "🏢",
    version: 2, status: "active",
    description: "全店舗の基本情報を持つマスターオブジェクト",
    properties: [
      { id: "p-1", api_name: "store_code", display_name: "店舗コード", data_type: "string", required: true, pii_level: "none" },
      { id: "p-2", api_name: "name", display_name: "店舗名", data_type: "string", required: true, pii_level: "none" },
      { id: "p-3", api_name: "prefecture", display_name: "都道府県", data_type: "string", required: false, pii_level: "none" },
      { id: "p-4", api_name: "seat_count", display_name: "座席数", data_type: "int", required: false, pii_level: "none" },
      { id: "p-5", api_name: "opened_at", display_name: "開店日", data_type: "datetime", required: true, pii_level: "none" },
    ],
  },
  {
    id: "ot-brand", api_name: "brand", display_name: "ブランド", icon: "🏷️",
    version: 3, status: "active",
    properties: [
      { id: "p-10", api_name: "brand_code", display_name: "ブランドコード", data_type: "string", required: true, pii_level: "none" },
      { id: "p-11", api_name: "brand_name", display_name: "ブランド名", data_type: "string", required: true, pii_level: "none" },
      { id: "p-12", api_name: "cuisine_type", display_name: "業態", data_type: "string", required: true, pii_level: "none", enum_values: ["和食", "洋食", "中華", "カフェ"] },
    ],
  },
  {
    id: "ot-product", api_name: "product", display_name: "商品", icon: "🍽️",
    version: 1, status: "active",
    properties: [
      { id: "p-20", api_name: "product_code", display_name: "商品コード", data_type: "string", required: true, pii_level: "none" },
      { id: "p-21", api_name: "product_name", display_name: "商品名", data_type: "string", required: true, pii_level: "none" },
      { id: "p-22", api_name: "price", display_name: "価格", data_type: "float", required: true, pii_level: "none" },
    ],
  },
  {
    id: "ot-employee", api_name: "employee", display_name: "従業員", icon: "👤",
    version: 1, status: "active",
    properties: [
      { id: "p-30", api_name: "employee_code", display_name: "社員番号", data_type: "string", required: true, pii_level: "low" },
      { id: "p-31", api_name: "name", display_name: "氏名", data_type: "string", required: true, pii_level: "high" },
      { id: "p-32", api_name: "hourly_rate", display_name: "時給", data_type: "float", required: false, pii_level: "high" },
    ],
  },
  {
    id: "ot-task", api_name: "task", display_name: "タスク", icon: "📋",
    version: 1, status: "draft",
    properties: [
      { id: "p-40", api_name: "task_code", display_name: "タスクコード", data_type: "string", required: true, pii_level: "none" },
      { id: "p-41", api_name: "title", display_name: "タイトル", data_type: "string", required: true, pii_level: "none" },
      { id: "p-42", api_name: "due_date", display_name: "期限", data_type: "datetime", required: false, pii_level: "none" },
    ],
  },
]

const mockLinks: OntoLink[] = [
  { id: "lk-1", api_name: "store_brand", display_name: "店舗→ブランド", from_object_type_id: "ot-store", to_object_type_id: "ot-brand", cardinality: "N:1" },
  { id: "lk-2", api_name: "store_product", display_name: "店舗→商品", from_object_type_id: "ot-store", to_object_type_id: "ot-product", cardinality: "N:N" },
  { id: "lk-3", api_name: "store_employee", display_name: "店舗→従業員", from_object_type_id: "ot-store", to_object_type_id: "ot-employee", cardinality: "1:N" },
  { id: "lk-4", api_name: "task_employee", display_name: "タスク→担当者", from_object_type_id: "ot-task", to_object_type_id: "ot-employee", cardinality: "N:1" },
  { id: "lk-5", api_name: "brand_product", display_name: "ブランド→商品", from_object_type_id: "ot-brand", to_object_type_id: "ot-product", cardinality: "1:N" },
]

const mockActions: Record<string, OntoAction[]> = {
  "ot-store": [
    {
      id: "ac-1", api_name: "close_store", display_name: "店舗を閉店", object_type_id: "ot-store",
      requires_approval: true,
      params_schema: { type: "object", properties: { reason: { type: "string" }, effective_date: { type: "string", format: "date" } }, required: ["reason", "effective_date"] },
    },
    {
      id: "ac-2", api_name: "reassign_manager", display_name: "店長を変更", object_type_id: "ot-store",
      requires_approval: false,
      params_schema: { type: "object", properties: { manager_id: { type: "string" } }, required: ["manager_id"] },
    },
  ],
  "ot-task": [
    {
      id: "ac-3", api_name: "complete_task", display_name: "タスク完了", object_type_id: "ot-task",
      requires_approval: false,
      params_schema: { type: "object", properties: { note: { type: "string" } } },
    },
  ],
}

// ============================================
// Mock Object Instances
// ============================================
const mockInstances: OntoObjectInstance[] = [
  {
    id: "inst-store-001", object_type_id: "ot-store", object_type_api_name: "store",
    display_name: "品川店",
    properties: {
      store_code: "S-001", name: "品川店", prefecture: "東京都", seat_count: 86,
      opened_at: "2018-04-01", net_sales: 3250000, labor_cost_rate: 28.5,
      operating_profit_rate: 8.3, fl_ratio: 59.7, health_score: 72.3,
    },
    links: [
      { link_api_name: "store_brand", to_instance_id: "inst-brand-001", to_display_name: "かっぱ寿司", to_object_type_id: "ot-brand" },
      { link_api_name: "store_employee", to_instance_id: "inst-emp-001", to_display_name: "山田 太郎", to_object_type_id: "ot-employee" },
      { link_api_name: "store_employee", to_instance_id: "inst-emp-002", to_display_name: "佐藤 花子", to_object_type_id: "ot-employee" },
    ],
  },
  {
    id: "inst-store-002", object_type_id: "ot-store", object_type_api_name: "store",
    display_name: "渋谷店",
    properties: {
      store_code: "S-002", name: "渋谷店", prefecture: "東京都", seat_count: 64,
      opened_at: "2019-08-15", net_sales: 2950000, labor_cost_rate: 31.2,
      operating_profit_rate: 6.1, fl_ratio: 62.4, health_score: 65.8,
    },
    links: [
      { link_api_name: "store_brand", to_instance_id: "inst-brand-002", to_display_name: "都市型", to_object_type_id: "ot-brand" },
    ],
  },
  {
    id: "inst-brand-001", object_type_id: "ot-brand", object_type_api_name: "brand",
    display_name: "かっぱ寿司",
    properties: { brand_code: "SK", brand_name: "かっぱ寿司", cuisine_type: "和食" },
  },
  {
    id: "inst-brand-002", object_type_id: "ot-brand", object_type_api_name: "brand",
    display_name: "都市型",
    properties: { brand_code: "HM", brand_name: "都市型", cuisine_type: "和食" },
  },
  {
    id: "inst-emp-001", object_type_id: "ot-employee", object_type_api_name: "employee",
    display_name: "山田 太郎",
    properties: { employee_code: "E-001", name: "山田 太郎", hourly_rate: 1500 },
  },
  {
    id: "inst-emp-002", object_type_id: "ot-employee", object_type_api_name: "employee",
    display_name: "佐藤 花子",
    properties: { employee_code: "E-002", name: "佐藤 花子", hourly_rate: 1300 },
  },
]

const mockBranches: OntoBranch[] = [
  { id: "br-main", name: "main", base: "", status: "active", created_at: "2026-01-01T00:00:00Z", created_by: "system", description: "本番ブランチ" },
  { id: "br-feat-1", name: "feature/add-loyalty-tier", base: "main", status: "active", created_at: "2026-04-15T09:00:00Z", created_by: "doohyw", description: "顧客にロイヤルティティアを追加" },
  { id: "br-feat-2", name: "feature/store-hierarchy", base: "main", status: "merged", created_at: "2026-03-01T09:00:00Z", merged_at: "2026-03-20T15:00:00Z", created_by: "alice" },
]

const mockBranchDiff: OntoBranchDiff = {
  added: {
    "object_types.loyalty_tier": {
      api_name: "loyalty_tier",
      display_name: "会員ティア",
      properties: [
        { api_name: "tier_code", data_type: "string", required: true },
        { api_name: "min_spend", data_type: "float", required: true },
      ],
    },
  },
  removed: {},
  changed: {
    "object_types.store.properties.seat_count": {
      before: { required: false, data_type: "int" },
      after: { required: true, data_type: "int" },
    },
  },
}

// ============================================
// Core fetch
// ============================================
async function call<T>(path: string, options?: RequestInit, fallback?: () => T): Promise<T> {
  if (!API_URL) {
    if (fallback) return fallback()
    throw new Error(`No API URL configured for ${path}`)
  }
  try {
    const token = getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers || {}) },
    })
    if (res.status === 404 && fallback) return fallback()
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    const json = await res.json()
    return (json.data ?? json) as T
  } catch (e) {
    if (fallback) return fallback()
    throw e
  }
}

// ============================================
// Object Types
// ============================================
export const ontologyAPI = {
  listObjectTypes: () =>
    call<OntoObjectType[]>("/api/v1/ontology/object-types", undefined, () => mockObjectTypes),

  getObjectType: (id: string) =>
    call<OntoObjectType>(`/api/v1/ontology/object-types/${id}`, undefined,
      () => mockObjectTypes.find((t) => t.id === id) || mockObjectTypes[0]),

  createObjectType: (body: Partial<OntoObjectType>) =>
    call<OntoObjectType>("/api/v1/ontology/object-types", {
      method: "POST", body: JSON.stringify(body),
    }, () => ({
      id: `ot-new-${Date.now()}`,
      api_name: body.api_name || "new_type",
      display_name: body.display_name || "新規タイプ",
      icon: body.icon || "📦",
      version: 1, status: "draft",
      properties: [],
      ...body,
    } as OntoObjectType)),

  updateObjectType: (id: string, body: Partial<OntoObjectType>) =>
    call<OntoObjectType>(`/api/v1/ontology/object-types/${id}`, {
      method: "PUT", body: JSON.stringify(body),
    }, () => ({ ...mockObjectTypes.find((t) => t.id === id)!, ...body })),

  deleteObjectType: (id: string) =>
    call<{ ok: boolean }>(`/api/v1/ontology/object-types/${id}`, {
      method: "DELETE",
    }, () => ({ ok: true })),

  // Properties
  listProperties: (objectTypeId: string) =>
    call<OntoProperty[]>(`/api/v1/ontology/object-types/${objectTypeId}/properties`, undefined,
      () => mockObjectTypes.find((t) => t.id === objectTypeId)?.properties || []),

  upsertProperties: (objectTypeId: string, properties: OntoProperty[]) =>
    call<OntoProperty[]>(`/api/v1/ontology/object-types/${objectTypeId}/properties`, {
      method: "POST", body: JSON.stringify({ properties }),
    }, () => properties),

  // Links
  listLinks: () =>
    call<OntoLink[]>("/api/v1/ontology/links", undefined, () => mockLinks),

  createLink: (body: Partial<OntoLink>) =>
    call<OntoLink>("/api/v1/ontology/links", {
      method: "POST", body: JSON.stringify(body),
    }, () => ({
      id: `lk-new-${Date.now()}`,
      api_name: body.api_name || "new_link",
      display_name: body.display_name || "新規リンク",
      from_object_type_id: body.from_object_type_id || "",
      to_object_type_id: body.to_object_type_id || "",
      cardinality: body.cardinality || "1:N",
    } as OntoLink)),

  // Instances
  listInstances: (objectTypeId?: string) =>
    call<OntoObjectInstance[]>(
      objectTypeId
        ? `/api/v1/ontology/instances?object_type_id=${encodeURIComponent(objectTypeId)}`
        : "/api/v1/ontology/instances",
      undefined,
      () => objectTypeId
        ? mockInstances.filter((i) => i.object_type_id === objectTypeId || i.object_type_api_name === objectTypeId)
        : mockInstances,
    ),

  getInstance: (id: string) =>
    call<OntoObjectInstance>(`/api/v1/ontology/instances/${id}`, undefined,
      () => mockInstances.find((i) => i.id === id) || mockInstances[0]),

  // Actions
  listActions: (objectTypeId: string) =>
    call<OntoAction[]>(`/api/v1/ontology/object-types/${objectTypeId}/actions`, undefined,
      () => mockActions[objectTypeId] || []),

  createAction: (objectTypeId: string, body: Partial<OntoAction>) =>
    call<OntoAction>(`/api/v1/ontology/object-types/${objectTypeId}/actions`, {
      method: "POST", body: JSON.stringify(body),
    }, () => ({
      id: `ac-new-${Date.now()}`,
      api_name: body.api_name || "new_action",
      display_name: body.display_name || "新規アクション",
      object_type_id: objectTypeId,
      params_schema: body.params_schema || { type: "object", properties: {} },
      requires_approval: body.requires_approval ?? false,
    } as OntoAction)),

  // Branches
  listBranches: () =>
    call<OntoBranch[]>("/api/v1/ontology/branches", undefined, () => mockBranches),

  createBranch: (body: Partial<OntoBranch>) =>
    call<OntoBranch>("/api/v1/ontology/branches", {
      method: "POST", body: JSON.stringify(body),
    }, () => ({
      id: `br-new-${Date.now()}`,
      name: body.name || "feature/new",
      base: body.base || "main",
      status: "active",
      created_at: new Date().toISOString(),
      created_by: "you",
      description: body.description,
    } as OntoBranch)),

  updateBranch: (id: string, body: Partial<OntoBranch>) =>
    call<OntoBranch>(`/api/v1/ontology/branches/${id}`, {
      method: "PUT", body: JSON.stringify(body),
    }, () => ({ ...mockBranches.find((b) => b.id === id)!, ...body })),

  mergeBranch: (id: string) =>
    call<{ ok: boolean }>(`/api/v1/ontology/branches/${id}/merge`, {
      method: "POST",
    }, () => ({ ok: true })),

  commitBranch: (id: string, message: string) =>
    call<{ ok: boolean }>(`/api/v1/ontology/branches/${id}/commit`, {
      method: "POST", body: JSON.stringify({ message }),
    }, () => ({ ok: true })),

  branchDiff: (a: string, b: string) =>
    call<OntoBranchDiff>(`/api/v1/ontology/diff/${a}/${b}`, undefined, () => mockBranchDiff),
}
