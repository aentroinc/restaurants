import type {
  ExecutiveSummary, StoreWithKPI, SVMission, Task, MeetingPack,
  DataQualitySummary, DataQualityIssue, ValueCase, ValueRealizationSummary,
  AIResponse, StoreDetail, ProfitGraphData,
} from "./types"

const brands = ["焼肉キング", "丸源ラーメン", "寿司まどか", "鳥貴族", "サイゼリヤ"]
const areas = ["関東", "関西", "中部", "九州", "東北"]
const prefectures: Record<string, string[]> = {
  "関東": ["東京都", "神奈川県", "千葉県", "埼玉県"],
  "関西": ["大阪府", "京都府", "兵庫県"],
  "中部": ["愛知県", "静岡県"],
  "九州": ["福岡県", "熊本県"],
  "東北": ["宮城県", "岩手県"],
}
const svNames = ["田中SV", "鈴木SV", "佐藤SV", "高橋SV", "伊藤SV"]
const managerNames = ["山田店長", "渡辺店長", "中村店長", "小林店長", "加藤店長", "吉田店長", "山口店長", "松本店長", "井上店長", "木村店長"]
const issueTypes = ["人件費超過", "原価超過", "売上減少", "レビュー低下", "値引き過多"]

function makeStore(i: number): StoreWithKPI {
  const brand = brands[i % brands.length]
  const area = areas[i % areas.length]
  const pref = prefectures[area][i % prefectures[area].length]
  const isAnomaly = i < 3
  const healthScore = isAnomaly ? 40 + i * 8 : 65 + Math.floor(Math.random() * 30)
  const salesBase = 2_500_000 + Math.floor(Math.random() * 3_000_000)
  const cogsRate = isAnomaly ? 34 + Math.random() * 5 : 28 + Math.random() * 4
  const laborRate = isAnomaly ? 32 + Math.random() * 6 : 25 + Math.random() * 5
  const flRatio = cogsRate + laborRate
  const issues: string[] = []
  if (laborRate > 32) issues.push("人件費超過")
  if (cogsRate > 33) issues.push("原価超過")
  if (isAnomaly && i === 0) issues.push("売上減少")
  if (isAnomaly && i === 1) issues.push("レビュー低下")
  if (isAnomaly && i === 2) issues.push("値引き過多")

  return {
    id: `store-${String(i + 1).padStart(3, "0")}`,
    code: `S${String(i + 1).padStart(3, "0")}`,
    name: `${brand} ${pref.replace("都", "").replace("府", "").replace("県", "")}${["中央", "駅前", "南", "北", "東"][i % 5]}店`,
    brand_name: brand,
    area_name: area,
    prefecture: pref,
    sv_name: svNames[i % svNames.length],
    manager_name: managerNames[i % managerNames.length],
    status: "営業中",
    opened_at: `202${1 + (i % 4)}-0${1 + (i % 9)}-01`,
    rank: i + 1,
    kpi: {
      net_sales: salesBase,
      customer_count: 800 + Math.floor(Math.random() * 600),
      avg_ticket: 1200 + Math.floor(Math.random() * 800),
      cogs_rate: +cogsRate.toFixed(1),
      labor_cost_rate: +laborRate.toFixed(1),
      fl_ratio: +flRatio.toFixed(1),
      sales_per_labor_hour: 4000 + Math.floor(Math.random() * 2000),
      health_score: healthScore,
      improvement_opportunity_amount: isAnomaly ? 800_000 + Math.floor(Math.random() * 1_200_000) : Math.floor(Math.random() * 400_000),
      issue_types: issues,
      net_sales_trend: isAnomaly ? -(3 + Math.random() * 8) : -2 + Math.random() * 7,
      customer_count_trend: -3 + Math.random() * 8,
      avg_ticket_trend: -2 + Math.random() * 6,
      cogs_rate_trend: -1 + Math.random() * 3,
      labor_cost_rate_trend: -1 + Math.random() * 3,
      operating_profit_rate: isAnomaly ? 2 + Math.random() * 5 : 8 + Math.random() * 8,
    },
  }
}

export const mockStores: StoreWithKPI[] = Array.from({ length: 10 }, (_, i) => makeStore(i))

// sort by health score ascending (worst first)
mockStores.sort((a, b) => a.kpi.health_score - b.kpi.health_score)
mockStores.forEach((s, i) => (s.rank = i + 1))

export const mockExecutiveSummary: ExecutiveSummary = {
  total_stores: 48,
  total_sales: 156_800_000,
  sales_trend: -2.3,
  avg_health_score: 72.4,
  critical_stores: 5,
  top_issues: [
    { issue_type: "人件費超過", count: 12, total_impact: 4_800_000 },
    { issue_type: "原価超過", count: 8, total_impact: 3_200_000 },
    { issue_type: "売上減少", count: 6, total_impact: 5_400_000 },
    { issue_type: "レビュー低下", count: 4, total_impact: 1_600_000 },
    { issue_type: "値引き過多", count: 3, total_impact: 900_000 },
  ],
  kpi_summary: {
    avg_sales: 3_266_667,
    avg_customer_count: 1_050,
    avg_ticket: 1_580,
    avg_cogs_rate: 30.2,
    avg_labor_cost_rate: 28.8,
    avg_fl_ratio: 59.0,
  },
  priority_stores: mockStores.slice(0, 5),
}

export const mockSVMissions: SVMission[] = mockStores.slice(0, 6).map((store, i) => ({
  id: `mission-${i + 1}`,
  store,
  priority_score: 95 - i * 8,
  reasons: [
    i < 2 ? "健全度スコアが基準値(60)を下回っています" : "前月比で売上が5%以上減少しています",
    "未完了タスクが3件以上あります",
    i === 0 ? "SV訪問から14日以上経過しています" : "原価率が全店平均を5pt以上上回っています",
  ],
  suggested_actions: [
    "シフト表の確認と人員配置の最適化を提案",
    "廃棄ロスの実態確認（特に仕込み量の適正化）",
    "店長との1on1面談の実施",
  ],
  days_since_visit: 7 + i * 3,
  open_tasks: 3 - Math.min(i, 2),
  kpi: store.kpi,
}))

const taskStatuses = ["下書き", "未着手", "進行中", "完了"]
const taskPriorities = ["高", "中", "低"]

export const mockTasks: Task[] = Array.from({ length: 15 }, (_, i) => {
  const store = mockStores[i % mockStores.length]
  return {
    id: `task-${String(i + 1).padStart(3, "0")}`,
    store_id: store.id,
    store_name: store.name,
    title: [
      "シフト見直しによる人件費率改善",
      "仕入れ先の価格交渉",
      "廃棄ロス削減施策の導入",
      "ピークタイムのオペレーション改善",
      "メニューミックス見直し",
      "アルバイト採用強化",
      "顧客レビュー対応フロー整備",
      "値引き運用ルールの徹底",
      "食材の在庫管理改善",
      "清掃チェックリスト導入",
      "新人教育プログラム整備",
      "売上分析レポートの定期確認",
      "近隣競合の調査",
      "ポスティング施策の実施",
      "設備メンテナンスの手配",
    ][i],
    description: "具体的な改善アクションの詳細をここに記載します。",
    status: taskStatuses[i % 4],
    priority: taskPriorities[i % 3],
    issue_type: issueTypes[i % issueTypes.length],
    assignee: i % 2 === 0 ? svNames[i % svNames.length] : managerNames[i % managerNames.length],
    due_date: `2026-05-${String(5 + i).padStart(2, "0")}`,
    expected_impact_amount: 50_000 + Math.floor(Math.random() * 300_000),
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-28T15:00:00Z",
  }
})

export const mockMeetingPacks: MeetingPack[] = [
  {
    id: "mp-001",
    title: "2026年4月 第4週 経営会議",
    meeting_date: "2026-04-30",
    status: "公開済み",
    created_at: "2026-04-28T10:00:00Z",
    items: [
      { id: "mpi-1", type: "kpi", title: "全店KPIサマリー", content: "売上前年比98.2%、FL比率59.0%で前月比+0.8pt悪化。人件費率の上昇が主因。", order: 1 },
      { id: "mpi-2", type: "alert", title: "要注意店舗: 焼肉キング東京中央店", content: "健全度スコア40。人件費率38.2%、原価率35.1%。FL比率73.3%で全店ワースト。", store_id: "store-001", store_name: "焼肉キング東京中央店", order: 2 },
      { id: "mpi-3", type: "improvement", title: "シフト最適化施策の進捗", content: "対象5店舗中3店舗で実施完了。平均人件費率2.1pt改善。残り2店舗は5月第1週に実施予定。", order: 3 },
      { id: "mpi-4", type: "discussion", title: "夏季メニュー戦略について", content: "原価率上昇傾向を踏まえ、夏季限定メニューの原価設計を議論。目標原価率30%以下。", order: 4 },
    ],
  },
  {
    id: "mp-002",
    title: "2026年4月 第3週 経営会議",
    meeting_date: "2026-04-23",
    status: "公開済み",
    created_at: "2026-04-21T10:00:00Z",
    items: [
      { id: "mpi-5", type: "kpi", title: "全店KPIサマリー", content: "売上前年比99.1%。FL比率58.2%で基準値内。", order: 1 },
      { id: "mpi-6", type: "alert", title: "要注意店舗: 丸源ラーメン大阪駅前店", content: "客数減少が継続。近隣の競合出店の影響と推定。", store_id: "store-002", store_name: "丸源ラーメン大阪駅前店", order: 2 },
    ],
  },
  {
    id: "mp-003",
    title: "2026年5月 第1週 経営会議",
    meeting_date: "2026-05-07",
    status: "下書き",
    created_at: "2026-05-01T10:00:00Z",
    items: [],
  },
]

export const mockDataQualitySummary: DataQualitySummary = {
  overall_score: 94.2,
  total_issues: 23,
  critical_count: 2,
  high_count: 5,
  medium_count: 9,
  low_count: 7,
  by_entity_type: [
    { entity_type: "売上データ", count: 8 },
    { entity_type: "人件費データ", count: 6 },
    { entity_type: "原価データ", count: 5 },
    { entity_type: "顧客データ", count: 4 },
  ],
}

export const mockDataQualityIssues: DataQualityIssue[] = [
  { id: "dq-1", entity_type: "売上データ", entity_id: "store-001", field_name: "daily_sales", severity: "critical", description: "4月25日の売上データが未登録です。POSシステムとの連携を確認してください。", status: "未対応", detected_at: "2026-04-26T08:00:00Z" },
  { id: "dq-2", entity_type: "人件費データ", entity_id: "store-003", field_name: "labor_hours", severity: "critical", description: "4月の勤怠データに不整合があります（合計労働時間が営業時間を超過）。", status: "未対応", detected_at: "2026-04-28T08:00:00Z" },
  { id: "dq-3", entity_type: "原価データ", entity_id: "store-005", field_name: "cogs_amount", severity: "high", description: "4月第4週の原価データが前週比で40%以上乖離しています。", status: "確認中", detected_at: "2026-04-29T08:00:00Z" },
  { id: "dq-4", entity_type: "売上データ", entity_id: "store-002", field_name: "customer_count", severity: "high", description: "客数データが0件の日があります（4月27日）。", status: "未対応", detected_at: "2026-04-28T08:00:00Z" },
  { id: "dq-5", entity_type: "顧客データ", entity_id: "store-004", field_name: "review_score", severity: "medium", description: "レビュースコアの更新が7日以上停止しています。", status: "確認中", detected_at: "2026-04-25T08:00:00Z" },
  { id: "dq-6", entity_type: "人件費データ", entity_id: "store-007", field_name: "shift_data", severity: "medium", description: "シフトデータと実績の乖離が大きい日が3日あります。", status: "対応済み", detected_at: "2026-04-24T08:00:00Z" },
  { id: "dq-7", entity_type: "原価データ", entity_id: "store-008", field_name: "inventory", severity: "low", description: "棚卸データの登録が今月未実施です。", status: "未対応", detected_at: "2026-04-30T08:00:00Z" },
]

export const mockValueCases: ValueCase[] = [
  {
    id: "vc-001",
    name: "シフト最適化による人件費削減",
    issue_type: "人件費超過",
    description: "AIによるシフト最適化提案を導入し、過剰人員配置を解消",
    target_stores: 8,
    status: "進行中",
    expected_amount: 3_600_000,
    realized_amount: 2_100_000,
    start_date: "2026-03-01",
    tasks: mockTasks.slice(0, 3),
    metrics_before: { labor_cost_rate: 32.5, sales_per_labor_hour: 3800 },
    metrics_after: { labor_cost_rate: 29.8, sales_per_labor_hour: 4500 },
  },
  {
    id: "vc-002",
    name: "仕入れ先見直しによる原価改善",
    issue_type: "原価超過",
    description: "主要食材の仕入れ先を再選定し、原価率を改善",
    target_stores: 12,
    status: "進行中",
    expected_amount: 5_200_000,
    realized_amount: 1_800_000,
    start_date: "2026-03-15",
    tasks: mockTasks.slice(3, 5),
    metrics_before: { cogs_rate: 33.8 },
    metrics_after: { cogs_rate: 31.2 },
  },
  {
    id: "vc-003",
    name: "廃棄ロス削減プログラム",
    issue_type: "原価超過",
    description: "仕込み量の適正化と発注精度の向上により廃棄ロスを削減",
    target_stores: 15,
    status: "計画中",
    expected_amount: 2_800_000,
    realized_amount: 0,
    start_date: "2026-05-01",
    tasks: [],
    metrics_before: { cogs_rate: 31.5 },
    metrics_after: { cogs_rate: 31.5 },
  },
  {
    id: "vc-004",
    name: "ピークタイム売上最大化",
    issue_type: "売上減少",
    description: "ピークタイムの回転率向上とアップセル施策の導入",
    target_stores: 6,
    status: "完了",
    expected_amount: 4_000_000,
    realized_amount: 4_350_000,
    start_date: "2026-01-15",
    end_date: "2026-03-31",
    tasks: mockTasks.slice(5, 7),
    metrics_before: { avg_ticket: 1350, customer_count: 850 },
    metrics_after: { avg_ticket: 1520, customer_count: 920 },
  },
]

export const mockValueRealizationSummary: ValueRealizationSummary = {
  active_cases: 3,
  total_expected: 15_600_000,
  total_realized: 8_250_000,
  achievement_rate: 52.9,
}

export const mockAIResponses: Record<string, AIResponse> = {
  "先月利益が悪化した店舗は？": {
    conclusion: "先月（4月）に営業利益率が前月比で悪化した店舗は全48店舗中8店舗あり、特に焼肉キング東京中央店（-4.2pt）、丸源ラーメン大阪駅前店（-3.1pt）、寿司まどか愛知南店（-2.8pt）の3店舗が顕著です。",
    facts: [
      { statement: "焼肉キング東京中央店の営業利益率は3.2%で、前月比-4.2pt", source_metric: "operating_profit_rate" },
      { statement: "丸源ラーメン大阪駅前店の人件費率は35.8%で全店ワースト2位", source_metric: "labor_cost_rate" },
      { statement: "寿司まどか愛知南店の原価率は36.2%で前月比+3.1pt", source_metric: "cogs_rate" },
      { statement: "悪化8店舗の共通点として、FL比率が65%を超えている", source_metric: "fl_ratio" },
    ],
    hypotheses: [
      { statement: "焼肉キング東京中央店は、GW前の仕入れ増加と新人研修期間の重複が主因と推定", confidence: "high" },
      { statement: "丸源ラーメン大阪駅前店は、近隣の競合出店（3月末オープン）による客数減少が影響", confidence: "medium" },
      { statement: "原価率悪化店舗は、4月の食材価格上昇（特に鶏肉+8%、豚肉+5%）の影響を受けている可能性", confidence: "medium" },
    ],
    recommendations: [
      { action: "焼肉キング東京中央店：シフト表の見直しと、ピークタイム以外の人員を1名削減", expected_impact_amount: 320_000 },
      { action: "丸源ラーメン大阪駅前店：差別化メニューの投入と、SNS集客施策の強化", expected_impact_amount: 250_000 },
      { action: "原価率悪化店舗：仕入れ先の相見積もりを実施し、代替食材の検討", expected_impact_amount: 480_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "焼肉キング東京中央店" },
      { type: "store", id: "store-002", name: "丸源ラーメン大阪駅前店" },
      { type: "store", id: "store-003", name: "寿司まどか愛知南店" },
    ],
  },
  "default": {
    conclusion: "ご質問の内容を分析しました。以下に詳細な結果をお示しします。",
    facts: [
      { statement: "全店の平均FL比率は59.0%で、業界基準値(60%)を下回っています", source_metric: "fl_ratio" },
      { statement: "要注意店舗数は5店舗で、前月の3店舗から増加しています", source_metric: "health_score" },
    ],
    hypotheses: [
      { statement: "人件費率の上昇は、最低賃金改定と人手不足による時給上昇が主因と推定されます", confidence: "high" },
    ],
    recommendations: [
      { action: "人件費率上位10店舗のシフト構造を詳細分析し、最適化余地を特定", expected_impact_amount: 1_500_000 },
    ],
    confidence: "medium",
    referenced_entities: [],
  },
}

export const mockSuggestedQuestions = [
  "先月利益が悪化した店舗は？",
  "人件費率が最も高い店舗の原因は？",
  "改善施策の効果は出ていますか？",
  "今週SVが訪問すべき店舗は？",
  "原価率が悪化しているブランドは？",
]

function makeProfitGraph(): ProfitGraphData[] {
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]
  return months.map((m) => {
    const sales = 3_000_000 + Math.floor(Math.random() * 1_000_000)
    const cogs = Math.floor(sales * (0.28 + Math.random() * 0.06))
    const labor = Math.floor(sales * (0.25 + Math.random() * 0.08))
    const rent = 350_000
    const other = Math.floor(sales * 0.08)
    const profit = sales - cogs - labor - rent - other
    return {
      month: m,
      sales,
      cogs,
      labor_cost: labor,
      rent,
      other_cost: other,
      operating_profit: profit,
      operating_profit_rate: +((profit / sales) * 100).toFixed(1),
    }
  })
}

export function getMockStoreDetail(id: string): StoreDetail {
  const store = mockStores.find((s) => s.id === id) || mockStores[0]
  return {
    ...store,
    profit_graph: makeProfitGraph(),
    issues: (store.kpi.issue_types || []).map((it) => ({
      issue_type: it,
      severity: store.kpi.health_score < 50 ? "critical" : "warning",
      description: `${it}が検出されました。全店平均と比較して大きな乖離があります。`,
      peer_avg: it === "人件費超過" ? 28.5 : it === "原価超過" ? 30.0 : 0,
      current_value: it === "人件費超過" ? store.kpi.labor_cost_rate : it === "原価超過" ? store.kpi.cogs_rate : 0,
      improvement_opportunity: Math.floor(store.kpi.improvement_opportunity_amount / Math.max(store.kpi.issue_types.length, 1)),
    })),
    tasks: mockTasks.filter((t) => t.store_id === store.id),
    recent_activities: [
      { id: "a1", type: "sv_visit", title: "SV訪問", description: `${store.sv_name}が訪問しました`, date: "2026-04-22T10:00:00Z", user_name: store.sv_name },
      { id: "a2", type: "task", title: "タスク完了", description: "シフト見直しによる人件費率改善を完了", date: "2026-04-20T15:00:00Z", user_name: store.manager_name },
      { id: "a3", type: "review", title: "レビュー", description: "Google口コミスコア: 3.8 → 3.6 に低下", date: "2026-04-18T09:00:00Z", user_name: "システム" },
    ],
  }
}
