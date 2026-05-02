export interface Store {
  id: string
  code: string
  name: string
  brand_name: string
  area_name: string
  prefecture: string
  sv_name: string
  manager_name: string
  status: string
  opened_at: string
}

export interface StoreKPI {
  net_sales: number
  customer_count: number
  avg_ticket: number
  cogs_rate: number
  labor_cost_rate: number
  fl_ratio: number
  sales_per_labor_hour: number
  health_score: number
  improvement_opportunity_amount: number
  issue_types: string[]
  net_sales_trend: number
  customer_count_trend: number
  avg_ticket_trend: number
  cogs_rate_trend: number
  labor_cost_rate_trend: number
  operating_profit_rate: number
}

export interface StoreWithKPI extends Store {
  kpi: StoreKPI
  rank?: number
}

export interface ExecutiveIssue {
  issue_type: string
  count: number
  total_impact: number
}

export interface KPISummary {
  avg_sales: number
  avg_customer_count: number
  avg_ticket: number
  avg_cogs_rate: number
  avg_labor_cost_rate: number
  avg_fl_ratio: number
}

export interface ExecutiveSummary {
  total_stores: number
  total_sales: number
  sales_trend: number
  avg_health_score: number
  critical_stores: number
  top_issues: ExecutiveIssue[]
  kpi_summary: KPISummary
  priority_stores: StoreWithKPI[]
}

export interface StoreRanking {
  stores: StoreWithKPI[]
  total: number
}

export interface ProfitGraphData {
  month: string
  sales: number
  cogs: number
  labor_cost: number
  rent: number
  other_cost: number
  operating_profit: number
  operating_profit_rate: number
}

export interface StoreDetail extends StoreWithKPI {
  profit_graph: ProfitGraphData[]
  issues: IssueDetail[]
  tasks: Task[]
  recent_activities: Activity[]
}

export interface IssueDetail {
  issue_type: string
  severity: string
  description: string
  peer_avg: number
  current_value: number
  improvement_opportunity: number
}

export interface Activity {
  id: string
  type: string
  title: string
  description: string
  date: string
  user_name: string
}

export interface SVMission {
  id: string
  store: Store
  priority_score: number
  reasons: string[]
  suggested_actions: string[]
  checklist_items: string[]
  days_since_visit: number
  open_tasks: number
  kpi: StoreKPI
}

export interface Task {
  id: string
  store_id: string
  store_name: string
  title: string
  description: string
  status: string
  priority: string
  issue_type: string
  assignee: string
  due_date: string
  expected_impact_amount: number
  created_at: string
  updated_at: string
}

export interface MeetingPack {
  id: string
  title: string
  meeting_date: string
  status: string
  items: MeetingPackItem[]
  created_at: string
}

export interface MeetingPackItem {
  id: string
  type: string
  title: string
  content: string
  store_id?: string
  store_name?: string
  order: number
}

export interface DataQualityIssue {
  id: string
  entity_type: string
  entity_id: string
  field_name: string
  severity: string
  description: string
  status: string
  detected_at: string
}

export interface DataQualitySummary {
  overall_score: number
  total_issues: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  by_entity_type: { entity_type: string; count: number }[]
}

export interface ValueCase {
  id: string
  name: string
  issue_type: string
  description: string
  target_stores: number
  status: string
  expected_amount: number
  realized_amount: number
  start_date: string
  end_date?: string
  tasks: Task[]
  metrics_before: Record<string, number>
  metrics_after: Record<string, number>
}

export interface ValueRealizationSummary {
  active_cases: number
  total_expected: number
  total_realized: number
  achievement_rate: number
}

export interface AIFact {
  statement: string
  source_metric: string
}

export interface AIHypothesis {
  statement: string
  confidence: string
}

export interface AIRecommendation {
  action: string
  expected_impact_amount: number
}

export interface AIReferencedEntity {
  type: string
  id: string
  name: string
}

export interface AIResponse {
  conclusion: string
  facts: AIFact[]
  hypotheses: AIHypothesis[]
  recommendations: AIRecommendation[]
  confidence: string
  referenced_entities: AIReferencedEntity[]
}

export interface APIResponse<T> {
  data: T
  meta: Record<string, unknown>
  errors: string[]
}

// Ontology
export interface OntologyObjectType {
  id: string; object_type: string; display_name: string; description?: string;
  base_schema: Record<string, string>; custom_schema: Record<string, string>; icon?: string;
}
export interface OntologyObject {
  id: string; object_type: string; canonical_id: string; display_name: string;
  attributes: Record<string, any>; status: string; relations?: OntologyRelation[];
}
export interface OntologyRelationType {
  id: string; relation_type: string; from_object_type: string; to_object_type: string;
  display_name: string; cardinality: string;
}
export interface OntologyRelation {
  id: string; relation_type: string; direction: string;
  related_object: { id: string; object_type: string; display_name: string };
  attributes: Record<string, any>;
}

// KPI
export interface KPIDefinition {
  id: string; kpi_code: string; display_name: string; description?: string;
  formula_expression: string; input_objects: string[]; output_unit?: string;
  version: number; status: string; approved_by?: string; approved_at?: string;
  effective_from?: string;
}
export interface KPISimulationResult {
  affected_stores: number;
  sample_before_after: { store_name: string; old_value: number; new_value: number }[];
  ranking_changes: number;
}

// Lineage
export interface LineageEvent {
  id: string; event_type: string; source_type: string; source_id?: string;
  target_type: string; target_id?: string; transformation_name?: string;
  metadata: Record<string, any>; created_at: string;
}
export interface KPILineage {
  kpi_definition: { kpi_code: string; display_name: string; formula: string; version: number };
  period: string;
  inputs: { source_type: string; source_name: string; value: number }[];
  ingestion_run?: { id: string; source_file: string; imported_at: string };
}

// Writeback
export interface WritebackPolicy {
  id: string; action_type: string; policy_name: string; requires_approval: boolean;
  allowed_roles: string[]; status: string;
}
export interface WritebackRequest {
  id: string; action_type: string; target_object_type: string; target_object_id?: string;
  payload: Record<string, any>; status: string; requested_by?: string;
  approved_by?: string; created_at: string;
}

// Admin
export interface DataSource {
  id: string; name: string; source_type: string; system_category: string;
  connection_mode: string; status: string; last_success_at?: string; last_failure_at?: string;
  display_name?: string; type?: string; entity_types?: string[]; frequency?: string; last_sync?: string;
}
export interface DataContractAdmin {
  id: string; contract_name: string; contract_version: number; entity_type: string;
  status: string; required_fields: any; effective_from?: string;
}
export interface IngestionRunAdmin {
  id: string; data_source_name: string; run_status: string; source_file_name?: string;
  source_row_count?: number; accepted_row_count?: number; rejected_row_count?: number;
  started_at?: string; completed_at?: string;
}
export interface SchemaMapping {
  id: string; source_field: string; canonical_field: string; transform_rule: string;
  required: boolean; data_source_name: string;
}
export interface IDMapping {
  id: string; source_system: string; source_id: string; canonical_id: string;
  confidence: number; status: string; entity_type: string;
}

export interface POSConnectorProvider {
  provider: string;
  display_name: string;
  country: string;
  auth_type: string;
  entity_types: string[];
  required_credentials: string[];
  required_scopes: string[];
}

export interface POSConnectorConfig {
  id: string;
  provider: string;
  display_name: string;
  status: string;
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  store_mappings: Record<string, string>;
  mapped_store_count: number;
  last_tested_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_error?: string;
}

export interface POSConnectorActionResult {
  connected?: boolean;
  provider?: string;
  sample_store_count?: number;
  batch_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  transactions_fetched?: number;
  daily_rows_loaded?: number;
  daily_rows_skipped?: number;
  error?: string;
  errors?: { error: string; external_store_id?: string; business_date?: string }[];
}

// AI Governance
export interface AIGovernanceConfig {
  allowed_object_types: { object_type: string; display_name: string; enabled: boolean }[];
  restricted_fields: { field_name: string; object_type: string; reason: string }[];
  lineage_required: boolean;
  writeback_allowed: boolean;
  recent_queries: { question: string; timestamp: string; confidence: string; referenced_objects_count: number }[];
}

// Enhanced AI response
export interface AIResponseEnhanced {
  answer_type: string; conclusion: string;
  facts: { statement: string; source_metric: string; source_entity?: string; period?: string }[];
  calculations: { name: string; formula: string; value: number; kpi_definition_id?: string }[];
  hypotheses: { statement: string; confidence: string; supporting_facts?: string[] }[];
  recommendations: { action: string; owner_role?: string; expected_impact_amount?: number; requires_human_approval: boolean }[];
  lineage?: {
    referenced_kpis: { kpi_code: string; version: number }[];
    referenced_objects: { object_type: string; object_id: string; display_name: string }[];
    data_period?: string; data_freshness?: string;
  };
  limitations?: string[];
  confidence: string;
}
