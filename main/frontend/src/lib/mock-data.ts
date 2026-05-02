import type {
  ExecutiveSummary, StoreWithKPI, SVMission, Task, MeetingPack,
  DataQualitySummary, DataQualityIssue, ValueCase, ValueRealizationSummary,
  AIResponse, StoreDetail, ProfitGraphData,
  OntologyObjectType, OntologyObject, OntologyRelationType,
  KPIDefinition, KPISimulationResult, LineageEvent, KPILineage,
  WritebackPolicy, WritebackRequest,
  DataSource, DataContractAdmin, IngestionRunAdmin, SchemaMapping, IDMapping,
  POSConnectorConfig, POSConnectorProvider,
  WorkspaceAnalysis, WorkspaceCustomKPI, WorkspaceCohort, WorkspaceSavedQuery,
  AIGovernanceConfig, AIResponseEnhanced,
} from "./types"

// Seeded PRNG for deterministic mock data
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
const seededRandom = mulberry32(42);

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
  const healthScore = isAnomaly ? 40 + i * 8 : 65 + Math.floor(seededRandom() * 30)
  const salesBase = 2_500_000 + Math.floor(seededRandom() * 3_000_000)
  const cogsRate = isAnomaly ? 34 + seededRandom() * 5 : 28 + seededRandom() * 4
  const laborRate = isAnomaly ? 32 + seededRandom() * 6 : 25 + seededRandom() * 5
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
      customer_count: 800 + Math.floor(seededRandom() * 600),
      avg_ticket: 1200 + Math.floor(seededRandom() * 800),
      cogs_rate: +cogsRate.toFixed(1),
      labor_cost_rate: +laborRate.toFixed(1),
      fl_ratio: +flRatio.toFixed(1),
      sales_per_labor_hour: 4000 + Math.floor(seededRandom() * 2000),
      health_score: healthScore,
      improvement_opportunity_amount: isAnomaly ? 800_000 + Math.floor(seededRandom() * 1_200_000) : Math.floor(seededRandom() * 400_000),
      issue_types: issues,
      net_sales_trend: isAnomaly ? -(3 + seededRandom() * 8) : -2 + seededRandom() * 7,
      customer_count_trend: -3 + seededRandom() * 8,
      avg_ticket_trend: -2 + seededRandom() * 6,
      cogs_rate_trend: -1 + seededRandom() * 3,
      labor_cost_rate_trend: -1 + seededRandom() * 3,
      operating_profit_rate: isAnomaly ? 2 + seededRandom() * 5 : 8 + seededRandom() * 8,
    },
  }
}

export const mockStores: StoreWithKPI[] = Array.from({ length: 10 }, (_, i) => makeStore(i))

// sort by health score ascending (worst first)
mockStores.sort((a, b) => a.kpi.health_score - b.kpi.health_score)
mockStores.forEach((s, i) => (s.rank = i + 1))

export const mockExecutiveSummary: ExecutiveSummary = {
  total_stores: mockStores.length,
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

const missionChecklist: string[][] = [
  ["人件費率の推移（過去3ヶ月）を確認", "シフト表と実績の乖離を確認", "ピーク時の配置人数を確認", "新人スタッフの育成進捗を確認"],
  ["原価率の推移を確認", "仕入れ伝票と在庫数の照合", "廃棄ロスの記録を確認", "冷蔵庫の温度管理ログを確認"],
  ["売上日報の推移を確認", "客数と客単価の変動を確認", "近隣競合の状況をヒアリング", "SNS・口コミの最新動向を確認"],
  ["レビュースコアの推移を確認", "直近の低評価レビュー内容を確認", "接客トレーニング実施状況を確認"],
  ["値引き実施記録を確認", "値引きルールの遵守状況を確認", "閉店間際の廃棄・値引き状況を確認"],
  ["全体KPIの前月比較を確認", "改善タスクの進捗を確認", "設備メンテナンス状況を確認"],
]

const missionActions: string[][] = [
  ["シフト表の見直しと、アイドルタイムの人員を1名削減する提案", "新人研修プログラムの短縮（動画マニュアル導入）", "店長との1on1面談でモチベーション確認"],
  ["仕入れ先の相見積もりを実施し、代替食材を検討", "廃棄ロスの削減目標を設定（現状→目標値）", "仕込み量の適正化ルールを策定"],
  ["差別化メニューの投入を検討", "SNS集客施策の強化プランを策定", "ランチタイムの回転率向上施策を提案"],
  ["接客マニュアルの再研修を実施", "顧客フィードバック対応フローを整備", "清掃・衛生チェックリストの徹底"],
  ["値引きルールの再周知と監視体制の構築", "閉店前の在庫管理オペレーションを見直し", "発注精度の向上（需要予測の活用）"],
  ["月次改善レポートの作成支援", "次月の目標KPI設定を店長と合意", "成功事例の他店舗への横展開を検討"],
]

export const mockSVMissions: SVMission[] = mockStores.slice(0, 6).map((store, i) => ({
  id: `mission-${i + 1}`,
  store,
  priority_score: 95 - i * 8,
  reasons: [
    i < 2 ? "健全度スコアが基準値(60)を下回っています" : "前月比で売上が5%以上減少しています",
    "未完了タスクが3件以上あります",
    i === 0 ? "SV訪問から14日以上経過しています" : "原価率が全店平均を5pt以上上回っています",
  ],
  suggested_actions: missionActions[i] || missionActions[5],
  checklist_items: missionChecklist[i] || missionChecklist[5],
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
    expected_impact_amount: 50_000 + Math.floor(seededRandom() * 300_000),
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
  "人件費率が最も高い店舗の原因は？": {
    conclusion: "人件費率が最も高いのは焼肉キング東京中央店（38.2%）で、全店平均28.8%を9.4pt上回っています。主因はピークタイム以外の過剰配置と新人研修の長期化です。",
    facts: [
      { statement: "焼肉キング東京中央店の人件費率は38.2%で全店ワースト1位", source_metric: "labor_cost_rate" },
      { statement: "同店の人時売上は3,200円で、全店平均4,500円を大幅に下回る", source_metric: "sales_per_labor_hour" },
      { statement: "アイドルタイム（14:00-17:00）の配置人数が平均4.2名で、同規模他店の2.8名を上回る", source_metric: "labor_hours" },
      { statement: "新人スタッフの比率が42%で全店平均25%を大きく超過", source_metric: "employee_ratio" },
    ],
    hypotheses: [
      { statement: "3月末に社員2名退職→補充のため未経験アルバイトを大量採用し、OJT工数が増大", confidence: "high" },
      { statement: "アイドルタイムの人員配置ルールが未整備のため、習慣的に過剰配置が続いている", confidence: "high" },
      { statement: "近隣店舗との人材シェア体制がないため、繁閑差を吸収できていない", confidence: "medium" },
    ],
    recommendations: [
      { action: "アイドルタイム（14:00-17:00）の配置を4名→2名に削減し、週28時間分のシフトを圧縮", expected_impact_amount: 420_000 },
      { action: "新人研修プログラムを2週間→1週間に短縮（動画マニュアル導入）", expected_impact_amount: 180_000 },
      { action: "近隣2店舗とのヘルプ体制を構築し、週末ピークの応援と平日余剰の相互融通を開始", expected_impact_amount: 150_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "焼肉キング東京中央店" },
      { type: "store", id: "store-003", name: "寿司まどか愛知南店" },
    ],
  },
  "改善施策の効果は出ていますか？": {
    conclusion: "現在進行中の3施策のうち、シフト最適化施策が最も効果を上げており、対象5店舗中3店舗で人件費率が平均2.1pt改善しています。全体の実現率は52.9%で、期待効果1,560万円に対し825万円を実現済みです。",
    facts: [
      { statement: "シフト最適化施策: 期待360万円に対し210万円実現（達成率58.3%）", source_metric: "value_realized" },
      { statement: "仕入れ先見直し施策: 期待520万円に対し180万円実現（達成率34.6%）", source_metric: "value_realized" },
      { statement: "ピークタイム売上最大化施策（完了）: 期待400万円に対し435万円実現（達成率108.8%）", source_metric: "value_realized" },
      { statement: "シフト最適化を実施した3店舗の平均人件費率: 32.5% → 29.8%（-2.7pt）", source_metric: "labor_cost_rate" },
    ],
    hypotheses: [
      { statement: "仕入れ先見直しの進捗が遅いのは、既存取引先との契約更新タイミング（6月末）を待っているため", confidence: "high" },
      { statement: "ピークタイム施策が目標超過したのは、メニューリニューアルとの相乗効果が想定以上だった", confidence: "medium" },
    ],
    recommendations: [
      { action: "シフト最適化の残り2店舗（寿司まどか愛知南店、鳥貴族福岡北店）への展開を5月第1週に前倒し", expected_impact_amount: 280_000 },
      { action: "仕入れ先見直しについて、契約更新を待たず主要3品目のスポット相見積もりを先行実施", expected_impact_amount: 350_000 },
      { action: "ピークタイム売上最大化の成功パターンを他6店舗へ横展開", expected_impact_amount: 600_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "焼肉キング東京中央店" },
      { type: "store", id: "store-003", name: "寿司まどか愛知南店" },
      { type: "store", id: "store-004", name: "鳥貴族福岡北店" },
    ],
  },
  "今週SVが訪問すべき店舗は？": {
    conclusion: "今週SVが優先訪問すべき店舗は3店舗です。焼肉キング東京中央店（優先度95）、丸源ラーメン大阪駅前店（優先度87）、寿司まどか愛知南店（優先度79）の順で訪問を推奨します。",
    facts: [
      { statement: "焼肉キング東京中央店: 健全度40、最終訪問から14日経過、未完了タスク3件", source_metric: "health_score" },
      { statement: "丸源ラーメン大阪駅前店: 健全度48、売上前月比-8.2%、客数減少が3週連続", source_metric: "net_sales_trend" },
      { statement: "寿司まどか愛知南店: 健全度56、原価率36.2%で全店ワースト、新店長着任1ヶ月", source_metric: "cogs_rate" },
      { statement: "全10店舗中、健全度60未満の要注意店舗は上記3店舗", source_metric: "health_score" },
    ],
    hypotheses: [
      { statement: "焼肉キング東京中央店はSV訪問ブランクが長く、現場のモチベーション低下リスクあり", confidence: "high" },
      { statement: "丸源ラーメン大阪駅前店の客数減少は競合出店の影響が大きいが、接客品質低下も一因", confidence: "medium" },
      { statement: "寿司まどか愛知南店は新店長のオペレーション習熟不足が原価管理に影響", confidence: "medium" },
    ],
    recommendations: [
      { action: "焼肉キング東京中央店: 田中SVが月曜に訪問し、シフト改善の進捗確認と店長1on1を実施", expected_impact_amount: 320_000 },
      { action: "丸源ラーメン大阪駅前店: 鈴木SVが水曜に訪問し、競合対策メニューの検討と接客トレーニング", expected_impact_amount: 250_000 },
      { action: "寿司まどか愛知南店: 佐藤SVが木曜に訪問し、発注・仕込み量の適正化を指導", expected_impact_amount: 180_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "焼肉キング東京中央店" },
      { type: "store", id: "store-002", name: "丸源ラーメン大阪駅前店" },
      { type: "store", id: "store-003", name: "寿司まどか愛知南店" },
    ],
  },
  "原価率が悪化しているブランドは？": {
    conclusion: "原価率が最も悪化しているブランドは寿司まどかで、前月比+2.8ptの33.8%です。次いで焼肉キング（+1.5pt、32.1%）が続きます。主因は4月の食材価格上昇（鮮魚+12%、牛肉+8%）です。",
    facts: [
      { statement: "寿司まどか: 原価率33.8%（前月比+2.8pt）、鮮魚仕入価格が前年比+12%上昇", source_metric: "cogs_rate" },
      { statement: "焼肉キング: 原価率32.1%（前月比+1.5pt）、牛肉仕入価格が前年比+8%上昇", source_metric: "cogs_rate" },
      { statement: "丸源ラーメン: 原価率29.5%（前月比+0.3pt）、小麦粉価格は安定", source_metric: "cogs_rate" },
      { statement: "鳥貴族: 原価率28.2%（前月比-0.5pt）、鶏肉価格は下落傾向", source_metric: "cogs_rate" },
      { statement: "サイゼリヤ: 原価率30.0%（前月比+0.2pt）、ほぼ横ばい", source_metric: "cogs_rate" },
    ],
    hypotheses: [
      { statement: "寿司まどかの悪化は、不漁による鮮魚価格高騰が直接的な原因。特にマグロとサーモンが影響大", confidence: "high" },
      { statement: "焼肉キングは円安による輸入牛肉コスト増が主因。国産切替が検討余地あり", confidence: "medium" },
      { statement: "廃棄ロスの増加も一因。寿司まどかの廃棄率は4.2%で前月比+1.1pt", confidence: "medium" },
    ],
    recommendations: [
      { action: "寿司まどかで季節メニューの原価設計を見直し、高騰食材の使用量を20%削減", expected_impact_amount: 380_000 },
      { action: "焼肉キングで国産牛肉（部位変更含む）への一部切替を検討。テスト導入を2店舗で開始", expected_impact_amount: 450_000 },
      { action: "全ブランドで廃棄ロス削減プログラムを5月に開始。目標: 廃棄率3.0%以下", expected_impact_amount: 280_000 },
    ],
    confidence: "medium",
    referenced_entities: [
      { type: "brand", id: "brand-001", name: "寿司まどか" },
      { type: "brand", id: "brand-002", name: "焼肉キング" },
      { type: "brand", id: "brand-003", name: "丸源ラーメン" },
      { type: "brand", id: "brand-004", name: "鳥貴族" },
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
    const sales = 3_000_000 + Math.floor(seededRandom() * 1_000_000)
    const cogs = Math.floor(sales * (0.28 + seededRandom() * 0.06))
    const labor = Math.floor(sales * (0.25 + seededRandom() * 0.08))
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

// ============================================
// Ontology Mock Data
// ============================================

export const mockOntologyObjectTypes: OntologyObjectType[] = [
  {
    id: "ot-1", object_type: "store", display_name: "店舗",
    description: "飲食店舗の基本情報を管理するオブジェクト型",
    base_schema: { store_code: "string", store_name: "string", brand_id: "string", area_id: "string", prefecture: "string", opened_at: "date", status: "string" },
    custom_schema: { seat_count: "integer", floor_area_sqm: "float", parking_spots: "integer" },
    icon: "🏢",
  },
  {
    id: "ot-2", object_type: "brand", display_name: "ブランド",
    description: "レストランブランド（業態）を管理するオブジェクト型",
    base_schema: { brand_code: "string", brand_name: "string", cuisine_type: "string", avg_ticket_target: "float" },
    custom_schema: { logo_url: "string" },
    icon: "🏷️",
  },
  {
    id: "ot-3", object_type: "area", display_name: "エリア",
    description: "管理エリアの定義",
    base_schema: { area_code: "string", area_name: "string", region: "string" },
    custom_schema: { sv_count: "integer" },
    icon: "📍",
  },
  {
    id: "ot-4", object_type: "employee", display_name: "従業員",
    description: "従業員マスターデータ",
    base_schema: { employee_code: "string", name: "string", role: "string", store_id: "string", hire_date: "date" },
    custom_schema: { certification: "string", hourly_rate: "float" },
    icon: "👤",
  },
  {
    id: "ot-5", object_type: "supplier", display_name: "仕入先",
    description: "食材・消耗品の仕入先",
    base_schema: { supplier_code: "string", supplier_name: "string", category: "string", contact_email: "string" },
    custom_schema: { payment_terms: "string", lead_time_days: "integer" },
    icon: "🚚",
  },
  {
    id: "ot-6", object_type: "menu_item", display_name: "メニュー",
    description: "メニュー商品の定義",
    base_schema: { item_code: "string", item_name: "string", category: "string", price: "float", cost: "float" },
    custom_schema: { allergens: "string", calories: "integer" },
    icon: "🍽️",
  },
]

export const mockOntologyObjects: OntologyObject[] = [
  {
    id: "obj-001", object_type: "store", canonical_id: "store-001", display_name: "焼肉キング東京中央店",
    attributes: { store_code: "S001", brand_id: "brand-001", area_id: "area-001", prefecture: "東京都", seat_count: 80, floor_area_sqm: 120.5 },
    status: "active",
    relations: [
      { id: "rel-1", relation_type: "belongs_to_brand", direction: "outgoing", related_object: { id: "obj-b1", object_type: "brand", display_name: "焼肉キング" }, attributes: {} },
      { id: "rel-2", relation_type: "belongs_to_area", direction: "outgoing", related_object: { id: "obj-a1", object_type: "area", display_name: "関東" }, attributes: {} },
      { id: "rel-3", relation_type: "employs", direction: "outgoing", related_object: { id: "obj-e1", object_type: "employee", display_name: "山田店長" }, attributes: { role: "店長" } },
    ],
  },
  {
    id: "obj-002", object_type: "store", canonical_id: "store-002", display_name: "丸源ラーメン大阪駅前店",
    attributes: { store_code: "S002", brand_id: "brand-002", area_id: "area-002", prefecture: "大阪府", seat_count: 45, floor_area_sqm: 85.0 },
    status: "active",
    relations: [
      { id: "rel-4", relation_type: "belongs_to_brand", direction: "outgoing", related_object: { id: "obj-b2", object_type: "brand", display_name: "丸源ラーメン" }, attributes: {} },
    ],
  },
  {
    id: "obj-003", object_type: "brand", canonical_id: "brand-001", display_name: "焼肉キング",
    attributes: { brand_code: "YK", cuisine_type: "焼肉", avg_ticket_target: 3500 },
    status: "active", relations: [],
  },
  {
    id: "obj-004", object_type: "brand", canonical_id: "brand-002", display_name: "丸源ラーメン",
    attributes: { brand_code: "MR", cuisine_type: "ラーメン", avg_ticket_target: 1200 },
    status: "active", relations: [],
  },
  {
    id: "obj-005", object_type: "area", canonical_id: "area-001", display_name: "関東エリア",
    attributes: { area_code: "KANTO", region: "東日本", sv_count: 3 },
    status: "active", relations: [],
  },
  {
    id: "obj-006", object_type: "employee", canonical_id: "emp-001", display_name: "山田太郎",
    attributes: { employee_code: "E001", role: "店長", store_id: "store-001", hire_date: "2022-04-01" },
    status: "active", relations: [],
  },
  {
    id: "obj-007", object_type: "supplier", canonical_id: "sup-001", display_name: "大和食品",
    attributes: { supplier_code: "SUP001", category: "精肉", contact_email: "info@yamato.co.jp", payment_terms: "月末締め翌月末払い" },
    status: "active", relations: [],
  },
  {
    id: "obj-008", object_type: "menu_item", canonical_id: "menu-001", display_name: "特選カルビ",
    attributes: { item_code: "M001", category: "焼肉", price: 1580, cost: 632, allergens: "なし", calories: 450 },
    status: "active", relations: [],
  },
]

export const mockOntologyRelationTypes: OntologyRelationType[] = [
  { id: "rt-1", relation_type: "belongs_to_brand", from_object_type: "store", to_object_type: "brand", display_name: "ブランド所属", cardinality: "many_to_one" },
  { id: "rt-2", relation_type: "belongs_to_area", from_object_type: "store", to_object_type: "area", display_name: "エリア所属", cardinality: "many_to_one" },
  { id: "rt-3", relation_type: "employs", from_object_type: "store", to_object_type: "employee", display_name: "従業員配置", cardinality: "one_to_many" },
  { id: "rt-4", relation_type: "supplies_to", from_object_type: "supplier", to_object_type: "store", display_name: "食材供給", cardinality: "many_to_many" },
  { id: "rt-5", relation_type: "serves_menu", from_object_type: "store", to_object_type: "menu_item", display_name: "メニュー提供", cardinality: "many_to_many" },
  { id: "rt-6", relation_type: "area_contains", from_object_type: "area", to_object_type: "store", display_name: "エリア内店舗", cardinality: "one_to_many" },
]

// ============================================
// KPI Definition Mock Data
// ============================================

export const mockKPIDefinitions: KPIDefinition[] = [
  {
    id: "kpi-1", kpi_code: "cogs_rate", display_name: "原価率",
    description: "売上に対する原材料費の比率。低いほど良い。",
    formula_expression: "cogs / net_sales * 100", input_objects: ["daily_store_sales", "daily_store_cogs"],
    output_unit: "%", version: 3, status: "approved",
    approved_by: "田中SV", approved_at: "2026-03-15T10:00:00Z", effective_from: "2026-04-01",
  },
  {
    id: "kpi-2", kpi_code: "labor_cost_rate", display_name: "人件費率",
    description: "売上に対する人件費の比率。",
    formula_expression: "labor_cost / net_sales * 100", input_objects: ["daily_store_sales", "daily_labor_cost"],
    output_unit: "%", version: 2, status: "approved",
    approved_by: "鈴木SV", approved_at: "2026-02-20T10:00:00Z", effective_from: "2026-03-01",
  },
  {
    id: "kpi-3", kpi_code: "fl_ratio", display_name: "FL比率",
    description: "原価率+人件費率。飲食業の重要指標。60%以下が目標。",
    formula_expression: "cogs_rate + labor_cost_rate", input_objects: ["cogs_rate", "labor_cost_rate"],
    output_unit: "%", version: 2, status: "approved",
    approved_by: "田中SV", approved_at: "2026-03-15T10:00:00Z", effective_from: "2026-04-01",
  },
  {
    id: "kpi-4", kpi_code: "avg_ticket", display_name: "客単価",
    description: "来客1人あたりの平均売上。",
    formula_expression: "net_sales / customer_count", input_objects: ["daily_store_sales", "daily_customer_count"],
    output_unit: "円", version: 1, status: "approved",
    approved_by: "佐藤SV", approved_at: "2026-01-10T10:00:00Z", effective_from: "2026-02-01",
  },
  {
    id: "kpi-5", kpi_code: "sales_per_labor_hour", display_name: "人時売上",
    description: "労働1時間あたりの売上高。生産性の指標。",
    formula_expression: "net_sales / total_labor_hours", input_objects: ["daily_store_sales", "daily_labor_hours"],
    output_unit: "円/時", version: 1, status: "under_review",
    effective_from: "2026-05-01",
  },
  {
    id: "kpi-6", kpi_code: "waste_rate", display_name: "廃棄率",
    description: "仕入れ量に対する廃棄量の比率。",
    formula_expression: "waste_amount / purchase_amount * 100", input_objects: ["daily_waste", "daily_purchase"],
    output_unit: "%", version: 1, status: "draft",
  },
  {
    id: "kpi-7", kpi_code: "repeat_rate", display_name: "リピート率",
    description: "再来店した顧客の割合。",
    formula_expression: "repeat_customers / total_customers * 100", input_objects: ["customer_visits"],
    output_unit: "%", version: 1, status: "deprecated",
    approved_by: "田中SV", approved_at: "2025-06-01T10:00:00Z", effective_from: "2025-07-01",
  },
]

export const mockKPISimulationResult: KPISimulationResult = {
  affected_stores: 48,
  sample_before_after: [
    { store_name: "焼肉キング東京中央店", old_value: 34.2, new_value: 33.8 },
    { store_name: "丸源ラーメン大阪駅前店", old_value: 31.5, new_value: 31.2 },
    { store_name: "寿司まどか愛知南店", old_value: 36.1, new_value: 35.6 },
    { store_name: "鳥貴族福岡北店", old_value: 29.8, new_value: 29.5 },
    { store_name: "サイゼリヤ宮城東店", old_value: 30.2, new_value: 29.9 },
  ],
  ranking_changes: 7,
}

// ============================================
// Lineage Mock Data
// ============================================

export const mockLineageEvents: LineageEvent[] = [
  { id: "le-1", event_type: "ingestion", source_type: "csv_file", source_id: "pos_sales_202604.csv", target_type: "canonical_table", target_id: "daily_store_sales", metadata: { row_count: 76000, duration_ms: 3200 }, created_at: "2026-05-01T06:00:00Z" },
  { id: "le-2", event_type: "schema_validation", source_type: "data_contract", source_id: "dc-pos-daily", target_type: "canonical_table", target_id: "daily_store_sales", metadata: { passed: true, violations: 0 }, created_at: "2026-05-01T06:01:00Z" },
  { id: "le-3", event_type: "id_resolution", source_type: "canonical_table", source_id: "daily_store_sales", target_type: "ontology_object", target_id: "obj-001", transformation_name: "store_code_to_canonical", metadata: { confidence: 0.98 }, created_at: "2026-05-01T06:02:00Z" },
  { id: "le-4", event_type: "kpi_calculation", source_type: "canonical_table", source_id: "daily_store_sales", target_type: "kpi_value", target_id: "cogs_rate", transformation_name: "cogs / net_sales * 100", metadata: { version: 3, period: "2026-04" }, created_at: "2026-05-01T06:05:00Z" },
  { id: "le-5", event_type: "report_generation", source_type: "kpi_value", source_id: "cogs_rate", target_type: "report", target_id: "executive_overview", metadata: { report_type: "monthly" }, created_at: "2026-05-01T06:10:00Z" },
  { id: "le-6", event_type: "ingestion", source_type: "api", source_id: "kintai_api_202604", target_type: "canonical_table", target_id: "daily_labor_cost", metadata: { row_count: 48000, duration_ms: 1800 }, created_at: "2026-05-01T06:00:00Z" },
  { id: "le-7", event_type: "kpi_calculation", source_type: "canonical_table", source_id: "daily_labor_cost", target_type: "kpi_value", target_id: "labor_cost_rate", transformation_name: "labor_cost / net_sales * 100", metadata: { version: 2, period: "2026-04" }, created_at: "2026-05-01T06:05:00Z" },
]

export const mockKPILineage: KPILineage = {
  kpi_definition: { kpi_code: "cogs_rate", display_name: "原価率", formula: "cogs / net_sales * 100", version: 3 },
  period: "2026-04",
  inputs: [
    { source_type: "POS CSV", source_name: "pos_sales_202604.csv", value: 156800000 },
    { source_type: "POS CSV", source_name: "pos_cogs_202604.csv", value: 47360000 },
  ],
  ingestion_run: { id: "ir-001", source_file: "pos_sales_202604.csv", imported_at: "2026-05-01T06:00:00Z" },
}

// ============================================
// Writeback Mock Data
// ============================================

export const mockWritebackPolicies: WritebackPolicy[] = [
  { id: "wp-1", action_type: "store_target_update", policy_name: "店舗目標値の変更", requires_approval: true, allowed_roles: ["sv", "admin"], status: "active" },
  { id: "wp-2", action_type: "kpi_threshold_update", policy_name: "KPI閾値の変更", requires_approval: true, allowed_roles: ["admin"], status: "active" },
  { id: "wp-3", action_type: "menu_price_update", policy_name: "メニュー価格の変更", requires_approval: true, allowed_roles: ["sv", "manager", "admin"], status: "active" },
  { id: "wp-4", action_type: "shift_adjustment", policy_name: "シフト調整", requires_approval: false, allowed_roles: ["sv", "manager"], status: "active" },
  { id: "wp-5", action_type: "supplier_change", policy_name: "仕入先変更", requires_approval: true, allowed_roles: ["admin"], status: "inactive" },
]

export const mockWritebackRequests: WritebackRequest[] = [
  { id: "wr-1", action_type: "store_target_update", target_object_type: "store", target_object_id: "store-001", payload: { target_sales: 3500000, target_cogs_rate: 30.0 }, status: "pending", requested_by: "田中SV", created_at: "2026-04-29T14:00:00Z" },
  { id: "wr-2", action_type: "kpi_threshold_update", target_object_type: "kpi_definition", target_object_id: "kpi-1", payload: { warning_threshold: 33, critical_threshold: 36 }, status: "approved", requested_by: "鈴木SV", approved_by: "管理者", created_at: "2026-04-28T10:00:00Z" },
  { id: "wr-3", action_type: "menu_price_update", target_object_type: "menu_item", target_object_id: "menu-001", payload: { old_price: 1480, new_price: 1580 }, status: "executed", requested_by: "佐藤SV", approved_by: "管理者", created_at: "2026-04-25T09:00:00Z" },
  { id: "wr-4", action_type: "shift_adjustment", target_object_type: "store", target_object_id: "store-003", payload: { date: "2026-05-03", reduction_hours: 4 }, status: "executed", requested_by: "高橋SV", created_at: "2026-04-27T16:00:00Z" },
  { id: "wr-5", action_type: "supplier_change", target_object_type: "store", target_object_id: "store-002", payload: { old_supplier: "大和食品", new_supplier: "三河畜産" }, status: "rejected", requested_by: "伊藤SV", created_at: "2026-04-26T11:00:00Z" },
  { id: "wr-6", action_type: "store_target_update", target_object_type: "store", target_object_id: "store-005", payload: { target_labor_rate: 28.0 }, status: "pending", requested_by: "田中SV", created_at: "2026-04-30T08:00:00Z" },
]

// ============================================
// Data Sources Mock Data
// ============================================

export const mockDataSources: DataSource[] = [
  { id: "ds-1", name: "POS売上データ", source_type: "CSV", system_category: "POS", connection_mode: "file_upload", status: "active", last_success_at: "2026-05-01T06:00:00Z" },
  { id: "ds-2", name: "勤怠管理API", source_type: "API", system_category: "勤怠", connection_mode: "api_pull", status: "active", last_success_at: "2026-05-01T06:00:00Z" },
  { id: "ds-3", name: "会計システム連携", source_type: "SFTP", system_category: "会計", connection_mode: "sftp_pull", status: "active", last_success_at: "2026-04-30T23:00:00Z" },
  { id: "ds-4", name: "在庫管理CSV", source_type: "CSV", system_category: "在庫", connection_mode: "file_upload", status: "active", last_success_at: "2026-04-28T10:00:00Z" },
  { id: "ds-5", name: "顧客レビュー API", source_type: "API", system_category: "顧客", connection_mode: "api_pull", status: "error", last_success_at: "2026-04-25T06:00:00Z", last_failure_at: "2026-05-01T06:05:00Z" },
  { id: "ds-6", name: "予約システム", source_type: "API", system_category: "予約", connection_mode: "webhook", status: "inactive" },
]

export const mockDataContracts: DataContractAdmin[] = [
  { id: "dc-1", contract_name: "POS日次売上", contract_version: 2, entity_type: "daily_store_sales", status: "active", required_fields: { business_date: "date", store_code: "string", net_sales: "float", customer_count: "integer", gross_sales: "float" }, effective_from: "2026-04-01" },
  { id: "dc-2", contract_name: "日次勤怠", contract_version: 1, entity_type: "daily_labor_cost", status: "active", required_fields: { business_date: "date", store_code: "string", total_hours: "float", labor_cost: "float" }, effective_from: "2026-03-01" },
  { id: "dc-3", contract_name: "月次会計", contract_version: 3, entity_type: "monthly_accounting", status: "active", required_fields: { year_month: "string", store_code: "string", cogs: "float", rent: "float", utilities: "float" }, effective_from: "2026-01-01" },
  { id: "dc-4", contract_name: "在庫棚卸", contract_version: 1, entity_type: "inventory_count", status: "draft", required_fields: { count_date: "date", store_code: "string", item_code: "string", quantity: "integer" }, effective_from: "2026-05-01" },
]

export const mockIngestionRuns: IngestionRunAdmin[] = [
  { id: "ir-1", data_source_name: "POS売上データ", run_status: "success", source_file_name: "pos_sales_202604.csv", source_row_count: 76000, accepted_row_count: 75850, rejected_row_count: 150, started_at: "2026-05-01T06:00:00Z", completed_at: "2026-05-01T06:03:12Z" },
  { id: "ir-2", data_source_name: "勤怠管理API", run_status: "success", source_file_name: "kintai_api_202604", source_row_count: 48000, accepted_row_count: 48000, rejected_row_count: 0, started_at: "2026-05-01T06:00:00Z", completed_at: "2026-05-01T06:01:48Z" },
  { id: "ir-3", data_source_name: "会計システム連携", run_status: "success", source_file_name: "accounting_202604.csv", source_row_count: 960, accepted_row_count: 960, rejected_row_count: 0, started_at: "2026-04-30T23:00:00Z", completed_at: "2026-04-30T23:00:32Z" },
  { id: "ir-4", data_source_name: "在庫管理CSV", run_status: "partial", source_file_name: "inventory_202604.csv", source_row_count: 12500, accepted_row_count: 11800, rejected_row_count: 700, started_at: "2026-04-28T10:00:00Z", completed_at: "2026-04-28T10:02:15Z" },
  { id: "ir-5", data_source_name: "顧客レビュー API", run_status: "failed", source_file_name: "review_api_202604", source_row_count: 0, accepted_row_count: 0, rejected_row_count: 0, started_at: "2026-05-01T06:05:00Z", completed_at: "2026-05-01T06:05:03Z" },
  { id: "ir-6", data_source_name: "POS売上データ", run_status: "success", source_file_name: "pos_sales_202603.csv", source_row_count: 73500, accepted_row_count: 73400, rejected_row_count: 100, started_at: "2026-04-01T06:00:00Z", completed_at: "2026-04-01T06:02:58Z" },
]

export const mockSchemaMappings: SchemaMapping[] = [
  { id: "sm-1", source_field: "売上日", canonical_field: "business_date", transform_rule: "date_parse(YYYY/MM/DD)", required: true, data_source_name: "POS売上データ" },
  { id: "sm-2", source_field: "店舗CD", canonical_field: "store_code", transform_rule: "prefix('S', zero_pad(3))", required: true, data_source_name: "POS売上データ" },
  { id: "sm-3", source_field: "税込売上", canonical_field: "gross_sales", transform_rule: "to_float", required: true, data_source_name: "POS売上データ" },
  { id: "sm-4", source_field: "税抜売上", canonical_field: "net_sales", transform_rule: "to_float", required: true, data_source_name: "POS売上データ" },
  { id: "sm-5", source_field: "客数", canonical_field: "customer_count", transform_rule: "to_integer", required: true, data_source_name: "POS売上データ" },
  { id: "sm-6", source_field: "勤務日", canonical_field: "business_date", transform_rule: "date_parse(YYYY-MM-DD)", required: true, data_source_name: "勤怠管理API" },
  { id: "sm-7", source_field: "店舗コード", canonical_field: "store_code", transform_rule: "direct", required: true, data_source_name: "勤怠管理API" },
  { id: "sm-8", source_field: "合計時間", canonical_field: "total_hours", transform_rule: "minutes_to_hours", required: true, data_source_name: "勤怠管理API" },
]

export const mockIDMappings: IDMapping[] = [
  { id: "im-1", source_system: "POS売上データ", source_id: "001", canonical_id: "store-001", confidence: 1.0, status: "confirmed", entity_type: "store" },
  { id: "im-2", source_system: "POS売上データ", source_id: "002", canonical_id: "store-002", confidence: 1.0, status: "confirmed", entity_type: "store" },
  { id: "im-3", source_system: "勤怠管理API", source_id: "TK-001", canonical_id: "store-001", confidence: 0.95, status: "confirmed", entity_type: "store" },
  { id: "im-4", source_system: "勤怠管理API", source_id: "TK-002", canonical_id: "store-002", confidence: 0.92, status: "confirmed", entity_type: "store" },
  { id: "im-5", source_system: "会計システム連携", source_id: "ACC-S001", canonical_id: "store-001", confidence: 0.88, status: "confirmed", entity_type: "store" },
  { id: "im-6", source_system: "会計システム連携", source_id: "ACC-S099", canonical_id: "", confidence: 0.35, status: "unresolved", entity_type: "store" },
  { id: "im-7", source_system: "在庫管理CSV", source_id: "INV-A", canonical_id: "store-003", confidence: 0.62, status: "review", entity_type: "store" },
  { id: "im-8", source_system: "顧客レビュー API", source_id: "rev-shop-1", canonical_id: "store-001", confidence: 0.78, status: "confirmed", entity_type: "store" },
]

export const mockPOSConnectorProviders: POSConnectorProvider[] = [
  {
    provider: "smaregi",
    display_name: "スマレジ Platform API",
    country: "JP",
    auth_type: "client_credentials",
    entity_types: ["daily_sales", "hourly_sales", "product_sales"],
    required_credentials: ["contract_id", "client_id_env", "client_secret_env"],
    required_scopes: ["pos.transactions:read", "pos.stores:read"],
  },
  {
    provider: "enterprise_pos_dwh",
    display_name: "大手外食 本部DWH / POSデータマート",
    country: "JP",
    auth_type: "file_or_private_api",
    entity_types: ["daily_sales", "hourly_sales", "product_sales", "store_master"],
    required_credentials: ["connection_owner"],
    required_scopes: [],
  },
]

export const mockPOSConnectorConfigs: POSConnectorConfig[] = [
  {
    id: "pc-smaregi-demo",
    provider: "smaregi",
    display_name: "スマレジ検証環境",
    status: "disconnected",
    credentials: { contract_id: "sandbox-contract", client_id_env: "SMAREGI_CLIENT_ID", client_secret_env: "SMAREGI_CLIENT_SECRET" },
    settings: { environment: "sandbox", scope: "pos.transactions:read pos.stores:read" },
    store_mappings: { "1": "S001", "2": "S002" },
    mapped_store_count: 2,
  },
  {
    id: "pc-zensho-dwh",
    provider: "enterprise_pos_dwh",
    display_name: "本部DWH 日次売上データマート",
    status: "connected",
    credentials: { connection_owner: "情報システム部" },
    settings: { contract: "daily_sales/hourly_sales/product_sales canonical bundle" },
    store_mappings: {},
    mapped_store_count: 0,
    last_success_at: "2026-05-01T06:00:00Z",
  },
]

// ============================================
// Workspace Mock Data
// ============================================

export const mockWorkspaceAnalyses: WorkspaceAnalysis[] = [
  {
    id: "analysis-zensho-priority",
    name: "ゼンショー想定: 駅前店のFL悪化分析",
    description: "駅前立地・人件費率高止まり店舗を抽出し、商品別粗利とQSCを重ねる分析",
    visibility: "team",
    spec: {
      cohort_id: "cohort-station-labor",
      metrics: ["net_sales", "labor_cost_rate", "gross_profit_rate", "qsc_score"],
      date_range: "2026-04",
    },
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-02T09:30:00Z",
  },
]

export const mockWorkspaceCustomKPIs: WorkspaceCustomKPI[] = [
  {
    id: "custom-kpi-gross-profit-per-guest",
    api_name: "gross_profit_per_guest",
    display_name: "客単位粗利",
    formula: "({net_sales} - {cogs}) / {customer_count}",
    target_object_type: "Store",
    aggregation_axis: ["brand", "store"],
    filters: { brand: "すき家" },
    unit: "円",
    version: 1,
    status: "draft",
    created_at: "2026-05-02T09:15:00Z",
  },
]

export const mockWorkspaceCohorts: WorkspaceCohort[] = [
  {
    id: "cohort-station-labor",
    name: "駅前・人件費率35%超",
    object_type: "Store",
    filter_spec: { trade_area_type: "駅前", labor_cost_rate_gt: 35 },
    instance_count: 14,
    snapshot_at: "2026-05-01T06:10:00Z",
    created_at: "2026-05-01T06:00:00Z",
  },
]

export const mockWorkspaceSavedQueries: WorkspaceSavedQuery[] = [
  {
    id: "saved-query-menu-margin",
    name: "商品粗利ワースト店舗",
    query_type: "ontology",
    query_spec: {
      object_type: "Product",
      join: ["Store", "DailyProductSales"],
      order_by: "theoretical_cogs_rate desc",
      limit: 20,
    },
    row_count: 20,
    last_run_at: "2026-05-02T08:45:00Z",
    created_at: "2026-05-01T08:30:00Z",
  },
]

// ============================================
// AI Governance Mock Data
// ============================================

export const mockAIGovernanceConfig: AIGovernanceConfig = {
  allowed_object_types: [
    { object_type: "store", display_name: "店舗", enabled: true },
    { object_type: "brand", display_name: "ブランド", enabled: true },
    { object_type: "area", display_name: "エリア", enabled: true },
    { object_type: "employee", display_name: "従業員", enabled: false },
    { object_type: "supplier", display_name: "仕入先", enabled: true },
    { object_type: "menu_item", display_name: "メニュー", enabled: true },
  ],
  restricted_fields: [
    { field_name: "hourly_rate", object_type: "employee", reason: "個人の給与情報のため" },
    { field_name: "contact_email", object_type: "supplier", reason: "取引先の個人情報のため" },
    { field_name: "hire_date", object_type: "employee", reason: "個人情報保護方針" },
  ],
  lineage_required: true,
  writeback_allowed: false,
  recent_queries: [
    { question: "先月利益が悪化した店舗は？", timestamp: "2026-04-30T14:23:00Z", confidence: "high", referenced_objects_count: 3 },
    { question: "人件費率が最も高い店舗の原因は？", timestamp: "2026-04-30T11:45:00Z", confidence: "medium", referenced_objects_count: 2 },
    { question: "改善施策の効果は出ていますか？", timestamp: "2026-04-29T16:30:00Z", confidence: "high", referenced_objects_count: 5 },
    { question: "原価率が悪化しているブランドは？", timestamp: "2026-04-29T10:15:00Z", confidence: "medium", referenced_objects_count: 4 },
    { question: "来月の売上予測は？", timestamp: "2026-04-28T15:00:00Z", confidence: "low", referenced_objects_count: 8 },
  ],
}

// ============================================
// Enhanced AI Response Mock Data
// ============================================

export const mockAIResponseEnhanced: AIResponseEnhanced = {
  answer_type: "analysis",
  conclusion: "先月（4月）に営業利益率が前月比で悪化した店舗は全48店舗中8店舗あり、特に焼肉キング東京中央店（-4.2pt）が顕著です。",
  facts: [
    { statement: "焼肉キング東京中央店の営業利益率は3.2%で、前月比-4.2pt", source_metric: "operating_profit_rate", source_entity: "store-001", period: "2026-04" },
    { statement: "丸源ラーメン大阪駅前店の人件費率は35.8%で全店ワースト2位", source_metric: "labor_cost_rate", source_entity: "store-002", period: "2026-04" },
  ],
  calculations: [
    { name: "原価率", formula: "cogs / net_sales * 100", value: 34.2, kpi_definition_id: "kpi-1" },
    { name: "FL比率", formula: "cogs_rate + labor_cost_rate", value: 69.4, kpi_definition_id: "kpi-3" },
  ],
  hypotheses: [
    { statement: "GW前の仕入れ増加と新人研修期間の重複が主因と推定", confidence: "high", supporting_facts: ["焼肉キング東京中央店の営業利益率は3.2%"] },
  ],
  recommendations: [
    { action: "シフト表の見直しと、ピークタイム以外の人員を1名削減", owner_role: "sv", expected_impact_amount: 320000, requires_human_approval: true },
    { action: "仕入れ先の相見積もりを実施", owner_role: "manager", expected_impact_amount: 480000, requires_human_approval: false },
  ],
  lineage: {
    referenced_kpis: [
      { kpi_code: "cogs_rate", version: 3 },
      { kpi_code: "labor_cost_rate", version: 2 },
      { kpi_code: "fl_ratio", version: 2 },
    ],
    referenced_objects: [
      { object_type: "store", object_id: "store-001", display_name: "焼肉キング東京中央店" },
      { object_type: "store", object_id: "store-002", display_name: "丸源ラーメン大阪駅前店" },
    ],
    data_period: "2026-04",
    data_freshness: "2026-05-01T06:10:00Z",
  },
  limitations: [
    "在庫管理データの一部（700件）が取り込みエラーのため反映されていません",
    "顧客レビューデータは4月25日以降更新されていません",
  ],
  confidence: "high",
}
