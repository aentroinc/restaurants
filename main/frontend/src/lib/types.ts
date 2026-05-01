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
