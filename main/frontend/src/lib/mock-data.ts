import type {
  ExecutiveSummary, StoreWithKPI, SVMission, Task, MeetingPack,
  DataQualitySummary, DataQualityIssue, ValueCase, ValueRealizationSummary,
  AIResponse, StoreDetail, ProfitGraphData,
  OntologyObjectType, OntologyObject, OntologyRelationType,
  KPIDefinition, KPISimulationResult, LineageEvent, KPILineage,
  WritebackPolicy, WritebackRequest,
  DataSource, DataContractAdmin, IngestionRunAdmin, SchemaMapping, IDMapping,
  AIGovernanceConfig, AIResponseEnhanced,
  Analysis, CustomKPIDef, CohortDef, PanelSpec, OntologyObjectTypeV2, OntologyImpactReport,
  RecipeItem, IngredientItem, ShiftItem, LaborComplianceReport,
  QSCAuditItem, HACCPComplianceRate,
  FranchiseAgreementItem, RoyaltyCalcItem, BenchmarkItem, RoleItem,
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

const brands = ["郊外ロードサイド型", "都市型", "食べ放題特化型", "バンノウ水産", "デリカ事業"]
const areas = ["首都圏", "中部", "東北", "北関東", "東海"]
const prefectures: Record<string, string[]> = {
  "首都圏": ["東京都", "神奈川県", "千葉県", "埼玉県"],
  "中部": ["長野県", "新潟県", "山梨県"],
  "東北": ["福島県", "宮城県", "山形県"],
  "北関東": ["群馬県", "栃木県", "茨城県"],
  "東海": ["静岡県", "愛知県"],
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
    name: `かっぱ寿司 ${pref.replace("都", "").replace("府", "").replace("県", "")}${["中央", "駅前", "南", "北", "東"][i % 5]}店`,
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
      { id: "mpi-2", type: "alert", title: "要注意店舗: かっぱ寿司 長野稲里店", content: "健全度スコア40。人件費率38.2%、原価率35.1%。FL比率73.3%で全店ワースト。", store_id: "store-001", store_name: "かっぱ寿司 長野稲里店", order: 2 },
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
      { id: "mpi-6", type: "alert", title: "要注意店舗: かっぱ寿司 福島南店", content: "客数減少が継続。近隣の競合出店の影響と推定。", store_id: "store-002", store_name: "かっぱ寿司 福島南店", order: 2 },
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
    conclusion: "先月（4月）に営業利益率が前月比で悪化した店舗は全48店舗中8店舗あり、特にかっぱ寿司 長野稲里店（-4.2pt）、かっぱ寿司 福島南店（-3.1pt）、かっぱ寿司 郡山安積店（-2.8pt）の3店舗が顕著です。",
    facts: [
      { statement: "かっぱ寿司 長野稲里店の営業利益率は3.2%で、前月比-4.2pt", source_metric: "operating_profit_rate" },
      { statement: "かっぱ寿司 福島南店の人件費率は35.8%で全店ワースト2位", source_metric: "labor_cost_rate" },
      { statement: "かっぱ寿司 郡山安積店の原価率は36.2%で前月比+3.1pt", source_metric: "cogs_rate" },
      { statement: "悪化8店舗の共通点として、FL比率が65%を超えている", source_metric: "fl_ratio" },
    ],
    hypotheses: [
      { statement: "かっぱ寿司 長野稲里店は、GW前の仕入れ増加と新人研修期間の重複が主因と推定", confidence: "high" },
      { statement: "かっぱ寿司 福島南店は、近隣の競合出店（3月末オープン）による客数減少が影響", confidence: "medium" },
      { statement: "原価率悪化店舗は、4月の食材価格上昇（特にコメ+15%、鮮魚+12%）の影響を受けている可能性", confidence: "medium" },
    ],
    recommendations: [
      { action: "かっぱ寿司 長野稲里店：シフト表の見直しと、ピークタイム以外の人員を1名削減", expected_impact_amount: 320_000 },
      { action: "かっぱ寿司 福島南店：差別化メニューの投入と、SNS集客施策の強化", expected_impact_amount: 250_000 },
      { action: "原価率悪化店舗：仕入れ先の相見積もりを実施し、代替食材の検討", expected_impact_amount: 480_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "かっぱ寿司 長野稲里店" },
      { type: "store", id: "store-002", name: "かっぱ寿司 福島南店" },
      { type: "store", id: "store-003", name: "かっぱ寿司 郡山安積店" },
    ],
  },
  "人件費率が最も高い店舗の原因は？": {
    conclusion: "人件費率が最も高いのはかっぱ寿司 長野稲里店（38.2%）で、全店平均28.8%を9.4pt上回っています。主因はピークタイム以外の過剰配置と新人研修の長期化です。",
    facts: [
      { statement: "かっぱ寿司 長野稲里店の人件費率は38.2%で全店ワースト1位", source_metric: "labor_cost_rate" },
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
      { type: "store", id: "store-001", name: "かっぱ寿司 長野稲里店" },
      { type: "store", id: "store-003", name: "かっぱ寿司 郡山安積店" },
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
      { action: "シフト最適化の残り2店舗（かっぱ寿司 郡山安積店、かっぱ寿司 仙台泉店）への展開を5月第1週に前倒し", expected_impact_amount: 280_000 },
      { action: "仕入れ先見直しについて、契約更新を待たず主要3品目のスポット相見積もりを先行実施", expected_impact_amount: 350_000 },
      { action: "ピークタイム売上最大化の成功パターンを他6店舗へ横展開", expected_impact_amount: 600_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "かっぱ寿司 長野稲里店" },
      { type: "store", id: "store-003", name: "かっぱ寿司 郡山安積店" },
      { type: "store", id: "store-004", name: "かっぱ寿司 仙台泉店" },
    ],
  },
  "今週SVが訪問すべき店舗は？": {
    conclusion: "今週SVが優先訪問すべき店舗は3店舗です。かっぱ寿司 長野稲里店（優先度95）、かっぱ寿司 福島南店（優先度87）、かっぱ寿司 郡山安積店（優先度79）の順で訪問を推奨します。",
    facts: [
      { statement: "かっぱ寿司 長野稲里店: 健全度40、最終訪問から14日経過、未完了タスク3件", source_metric: "health_score" },
      { statement: "かっぱ寿司 福島南店: 健全度48、売上前月比-8.2%、客数減少が3週連続", source_metric: "net_sales_trend" },
      { statement: "かっぱ寿司 郡山安積店: 健全度56、原価率36.2%で全店ワースト、新店長着任1ヶ月", source_metric: "cogs_rate" },
      { statement: "全10店舗中、健全度60未満の要注意店舗は上記3店舗", source_metric: "health_score" },
    ],
    hypotheses: [
      { statement: "かっぱ寿司 長野稲里店はSV訪問ブランクが長く、現場のモチベーション低下リスクあり", confidence: "high" },
      { statement: "かっぱ寿司 福島南店の客数減少は競合出店の影響が大きいが、接客品質低下も一因", confidence: "medium" },
      { statement: "かっぱ寿司 郡山安積店は新店長のオペレーション習熟不足が原価管理に影響", confidence: "medium" },
    ],
    recommendations: [
      { action: "かっぱ寿司 長野稲里店: 田中SVが月曜に訪問し、シフト改善の進捗確認と店長1on1を実施", expected_impact_amount: 320_000 },
      { action: "かっぱ寿司 福島南店: 鈴木SVが水曜に訪問し、競合対策メニューの検討と接客トレーニング", expected_impact_amount: 250_000 },
      { action: "かっぱ寿司 郡山安積店: 佐藤SVが木曜に訪問し、発注・仕込み量の適正化を指導", expected_impact_amount: 180_000 },
    ],
    confidence: "high",
    referenced_entities: [
      { type: "store", id: "store-001", name: "かっぱ寿司 長野稲里店" },
      { type: "store", id: "store-002", name: "かっぱ寿司 福島南店" },
      { type: "store", id: "store-003", name: "かっぱ寿司 郡山安積店" },
    ],
  },
  "原価率が悪化しているブランドは？": {
    conclusion: "原価率が最も悪化しているブランドは郊外ロードサイド型で、前月比+2.8ptの33.8%です。次いでかっぱ寿司（+1.5pt、32.1%）が続きます。主因は4月の食材価格上昇（鮮魚+12%、牛肉+8%）です。",
    facts: [
      { statement: "郊外ロードサイド型: 原価率33.8%（前月比+2.8pt）、コメ仕入価格が前年比+15%上昇", source_metric: "cogs_rate" },
      { statement: "かっぱ寿司: 原価率32.1%（前月比+1.5pt）、牛肉仕入価格が前年比+10%上昇", source_metric: "cogs_rate" },
      { statement: "かっぱ寿司: 原価率29.5%（前月比+0.3pt）、小麦粉価格は安定", source_metric: "cogs_rate" },
      { statement: "食べ放題特化型: 原価率28.2%（前月比-0.5pt）、鶏肉価格は下落傾向", source_metric: "cogs_rate" },
      { statement: "都市型: 原価率30.0%（前月比+0.2pt）、ほぼ横ばい", source_metric: "cogs_rate" },
    ],
    hypotheses: [
      { statement: "郊外ロードサイド型の悪化は、コメ価格高騰と鮮魚の不漁が直接的な原因。特にマグロとサーモンが影響大", confidence: "high" },
      { statement: "かっぱ寿司は円安による輸入牛肉コスト増が主因。仕入先の多様化を検討", confidence: "medium" },
      { statement: "廃棄ロスの増加も一因。かっぱ寿司の廃棄率は4.2%で前月比+1.1pt", confidence: "medium" },
    ],
    recommendations: [
      { action: "かっぱ寿司で季節メニューの原価設計を見直し、高騰食材の使用量を20%削減", expected_impact_amount: 380_000 },
      { action: "かっぱ寿司で仕入先の多様化と代替部位の活用を検討。テスト導入を2店舗で開始", expected_impact_amount: 450_000 },
      { action: "全ブランドで廃棄ロス削減プログラムを5月に開始。目標: 廃棄率3.0%以下", expected_impact_amount: 280_000 },
    ],
    confidence: "medium",
    referenced_entities: [
      { type: "brand", id: "brand-001", name: "郊外ロードサイド型" },
      { type: "brand", id: "brand-002", name: "かっぱ寿司" },
      { type: "brand", id: "brand-003", name: "かっぱ寿司" },
      { type: "brand", id: "brand-004", name: "食べ放題特化型" },
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
  "客数が最も減少している店舗はどこ？",
  "原価率48%を下回っている店舗は？",
  "食べ放題型の廃棄率が高い店舗を教えて",
  "都市型出店（南池袋、吉祥寺）の立ち上がり状況は？",
  "スシローとの客単価差は？",
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
    id: "obj-001", object_type: "store", canonical_id: "store-001", display_name: "かっぱ寿司 長野稲里店",
    attributes: { store_code: "S001", brand_id: "brand-001", area_id: "area-001", prefecture: "東京都", seat_count: 80, floor_area_sqm: 120.5 },
    status: "active",
    relations: [
      { id: "rel-1", relation_type: "belongs_to_brand", direction: "outgoing", related_object: { id: "obj-b1", object_type: "brand", display_name: "かっぱ寿司" }, attributes: {} },
      { id: "rel-2", relation_type: "belongs_to_area", direction: "outgoing", related_object: { id: "obj-a1", object_type: "area", display_name: "関東" }, attributes: {} },
      { id: "rel-3", relation_type: "employs", direction: "outgoing", related_object: { id: "obj-e1", object_type: "employee", display_name: "山田店長" }, attributes: { role: "店長" } },
    ],
  },
  {
    id: "obj-002", object_type: "store", canonical_id: "store-002", display_name: "かっぱ寿司 福島南店",
    attributes: { store_code: "S002", brand_id: "brand-002", area_id: "area-002", prefecture: "大阪府", seat_count: 45, floor_area_sqm: 85.0 },
    status: "active",
    relations: [
      { id: "rel-4", relation_type: "belongs_to_brand", direction: "outgoing", related_object: { id: "obj-b2", object_type: "brand", display_name: "かっぱ寿司" }, attributes: {} },
    ],
  },
  {
    id: "obj-003", object_type: "brand", canonical_id: "brand-001", display_name: "かっぱ寿司",
    attributes: { brand_code: "KR", cuisine_type: "郊外ロードサイド型", avg_ticket_target: 1150 },
    status: "active", relations: [],
  },
  {
    id: "obj-004", object_type: "brand", canonical_id: "brand-002", display_name: "かっぱ寿司",
    attributes: { brand_code: "KU", cuisine_type: "都市型", avg_ticket_target: 1400 },
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
    id: "obj-007", object_type: "supplier", canonical_id: "sup-001", display_name: "豊洲水産",
    attributes: { supplier_code: "SUP001", category: "鮮魚", contact_email: "info@yamato.co.jp", payment_terms: "月末締め翌月末払い" },
    status: "active", relations: [],
  },
  {
    id: "obj-008", object_type: "menu_item", canonical_id: "menu-001", display_name: "まぐろ握り",
    attributes: { item_code: "M001", category: "牛丼", price: 430, cost: 180, allergens: "小麦", calories: 650 },
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
    { store_name: "かっぱ寿司 長野稲里店", old_value: 34.2, new_value: 33.8 },
    { store_name: "かっぱ寿司 福島南店", old_value: 31.5, new_value: 31.2 },
    { store_name: "かっぱ寿司 郡山安積店", old_value: 36.1, new_value: 35.6 },
    { store_name: "かっぱ寿司 仙台泉店", old_value: 29.8, new_value: 29.5 },
    { store_name: "かっぱ寿司 南池袋店", old_value: 30.2, new_value: 29.9 },
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
  { id: "wr-5", action_type: "supplier_change", target_object_type: "store", target_object_id: "store-002", payload: { old_supplier: "豊洲水産", new_supplier: "境港水産" }, status: "rejected", requested_by: "伊藤SV", created_at: "2026-04-26T11:00:00Z" },
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
  conclusion: "先月（4月）に営業利益率が前月比で悪化した店舗は全48店舗中8店舗あり、特にかっぱ寿司 長野稲里店（-4.2pt）が顕著です。",
  facts: [
    { statement: "かっぱ寿司 長野稲里店の営業利益率は3.2%で、前月比-4.2pt", source_metric: "operating_profit_rate", source_entity: "store-001", period: "2026-04" },
    { statement: "かっぱ寿司 福島南店の人件費率は35.8%で全店ワースト2位", source_metric: "labor_cost_rate", source_entity: "store-002", period: "2026-04" },
  ],
  calculations: [
    { name: "原価率", formula: "cogs / net_sales * 100", value: 34.2, kpi_definition_id: "kpi-1" },
    { name: "FL比率", formula: "cogs_rate + labor_cost_rate", value: 69.4, kpi_definition_id: "kpi-3" },
  ],
  hypotheses: [
    { statement: "GW前の仕入れ増加と新人研修期間の重複が主因と推定", confidence: "high", supporting_facts: ["かっぱ寿司 長野稲里店の営業利益率は3.2%"] },
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
      { object_type: "store", object_id: "store-001", display_name: "かっぱ寿司 長野稲里店" },
      { object_type: "store", object_id: "store-002", display_name: "かっぱ寿司 福島南店" },
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

// ============================================
// Workspace Mock Data
// ============================================

export const mockAnalysisPanels: Record<string, PanelSpec[]> = {
  "an-1": [
    { id: "p-1", type: "bar_chart", title: "ブランド別売上", kpi: "net_sales", group_by: "brand" },
    { id: "p-2", type: "metric_card", title: "平均客単価", kpi: "avg_ticket" },
    { id: "p-3", type: "pivot_table", title: "エリア×月次売上", kpi: "net_sales", group_by: "brand" },
  ],
  "an-2": [
    { id: "p-4", type: "bar_chart", title: "ブランド別原価率", kpi: "cogs_rate", group_by: "brand" },
    { id: "p-5", type: "scatter", title: "原価率 vs 健全度", kpi: "cogs_rate" },
  ],
  "an-3": [
    { id: "p-6", type: "metric_card", title: "全社平均人件費率", kpi: "labor_cost_rate" },
    { id: "p-7", type: "bar_chart", title: "エリア別人件費率", kpi: "labor_cost_rate", group_by: "region" },
  ],
  "an-4": [
    { id: "p-8", type: "metric_card", title: "客単価変動", kpi: "avg_ticket" },
  ],
  "an-5": [
    { id: "p-9", type: "scatter", title: "売上 vs 健全度", kpi: "net_sales" },
  ],
}

export const mockAnalyses: Analysis[] = [
  { id: "an-1", name: "関東エリア売上トレンド分析", description: "首都圏店舗の売上推移と要因分析", visibility: "private", spec: { panels: mockAnalysisPanels["an-1"] }, created_at: "2026-04-28T10:00:00Z" },
  { id: "an-2", name: "ブランド別原価率比較", description: "5ブランドの原価率の月次推移", visibility: "team", spec: { panels: mockAnalysisPanels["an-2"] }, created_at: "2026-04-25T14:00:00Z" },
  { id: "an-3", name: "人件費率改善効果レポート", description: "シフト最適化施策の効果測定", visibility: "public", spec: { panels: mockAnalysisPanels["an-3"] }, created_at: "2026-04-20T09:00:00Z" },
  { id: "an-4", name: "季節メニュー影響分析", description: "夏メニュー投入後の客単価変動", visibility: "private", spec: { panels: mockAnalysisPanels["an-4"] }, created_at: "2026-04-15T11:00:00Z" },
  { id: "an-5", name: "競合出店インパクト調査", description: "近隣出店による影響店舗の特定", visibility: "team", spec: { panels: mockAnalysisPanels["an-5"] }, created_at: "2026-04-10T16:00:00Z" },
]

export const mockCustomKPIDefs: CustomKPIDef[] = [
  { id: "ck-1", api_name: "peak_hour_efficiency", display_name: "ピーク時間効率", formula: "peak_sales / peak_labor_hours", target_object_type: "store", unit: "円/時", version: 2, status: "active" },
  { id: "ck-2", api_name: "waste_ratio", display_name: "廃棄率", formula: "waste_amount / purchase_amount * 100", target_object_type: "store", unit: "%", version: 1, status: "active" },
  { id: "ck-3", api_name: "repeat_customer_rate", display_name: "リピーター率", formula: "repeat_customers / total_customers * 100", target_object_type: "store", unit: "%", version: 1, status: "draft" },
  { id: "ck-4", api_name: "menu_mix_index", display_name: "メニューミックス指数", formula: "high_margin_items_sold / total_items_sold", target_object_type: "brand", unit: "", version: 1, status: "active" },
  { id: "ck-5", api_name: "labor_productivity_index", display_name: "労働生産性指数", formula: "(net_sales - cogs) / total_labor_hours", target_object_type: "store", unit: "円/時", version: 3, status: "active" },
]

export const mockCohortDefs: CohortDef[] = [
  { id: "co-1", name: "高収益店舗群", object_type: "store", filter_spec: { health_score: { gte: 80 } }, instance_count: 42 },
  { id: "co-2", name: "要改善店舗", object_type: "store", filter_spec: { health_score: { lt: 60 } }, instance_count: 8 },
  { id: "co-3", name: "中部郊外ロードサイド型", object_type: "store", filter_spec: { region: "中部", brand: "kappa_roadside" }, instance_count: 22 },
  { id: "co-4", name: "新規出店（1年以内）", object_type: "store", filter_spec: { opened_within_months: 12 }, instance_count: 15 },
  { id: "co-5", name: "FC加盟店", object_type: "store", filter_spec: { agreement_type: "FC" }, instance_count: 35 },
]

// ============================================
// Recipe & Ingredient Mock Data
// ============================================

export const mockRecipes: RecipeItem[] = [
  { id: "rc-1", product_name: "まぐろ握り", version: 3, yield_quantity: 1, cooking_time_minutes: 3, status: "active", theoretical_cost: 180, bom_count: 6 },
  { id: "rc-2", product_name: "サーモン握り", version: 2, yield_quantity: 1, cooking_time_minutes: 4, status: "active", theoretical_cost: 320, bom_count: 8 },
  { id: "rc-3", product_name: "中とろ", version: 4, yield_quantity: 1, cooking_time_minutes: 15, status: "active", theoretical_cost: 480, bom_count: 10 },
  { id: "rc-4", product_name: "えび握り", version: 1, yield_quantity: 1, cooking_time_minutes: 5, status: "active", theoretical_cost: 210, bom_count: 7 },
  { id: "rc-5", product_name: "茶碗蒸し", version: 2, yield_quantity: 1, cooking_time_minutes: 8, status: "active", theoretical_cost: 280, bom_count: 9 },
  { id: "rc-6", product_name: "特大穴子", version: 3, yield_quantity: 1, cooking_time_minutes: 10, status: "active", theoretical_cost: 350, bom_count: 11 },
]

export const mockIngredients: IngredientItem[] = [
  { id: "ig-1", name: "本まぐろ（冷凍）", unit: "kg", standard_cost_per_unit: 4500, storage_temperature: "冷凍(-18℃以下)", shelf_life_days: 90 },
  { id: "ig-2", name: "サーモン（ノルウェー産）", unit: "kg", standard_cost_per_unit: 3200, storage_temperature: "冷蔵(-2-2℃)", shelf_life_days: 3 },
  { id: "ig-3", name: "えび（バナメイ）", unit: "kg", standard_cost_per_unit: 1800, storage_temperature: "冷凍(-18℃以下)", shelf_life_days: 120 },
  { id: "ig-4", name: "サーモン（ノルウェー産）", unit: "kg", standard_cost_per_unit: 3200, storage_temperature: "冷蔵(-2-2℃)", shelf_life_days: 3 },
  { id: "ig-5", name: "海苔（有明産）", unit: "枚", standard_cost_per_unit: 8, storage_temperature: "常温", shelf_life_days: 180 },
  { id: "ig-6", name: "白米", unit: "kg", standard_cost_per_unit: 380, storage_temperature: "常温", shelf_life_days: 90 },
  { id: "ig-7", name: "味噌（合わせ）", unit: "kg", standard_cost_per_unit: 520, storage_temperature: "冷蔵(0-10℃)", shelf_life_days: 180 },
  { id: "ig-8", name: "抹茶パウダー", unit: "g", standard_cost_per_unit: 8, storage_temperature: "冷暗所", shelf_life_days: 365 },
]

// ============================================
// Labor / Shift Mock Data
// ============================================

export const mockShifts: ShiftItem[] = [
  { id: "sh-1", store_name: "かっぱ寿司 長野稲里店", employee_name: "田中一郎", role: "ホール", start_at: "2026-04-28T09:00:00Z", end_at: "2026-04-28T22:00:00Z", violations: ["overtime"] },
  { id: "sh-2", store_name: "かっぱ寿司 長野稲里店", employee_name: "佐藤花子", role: "キッチン", start_at: "2026-04-28T17:00:00Z", end_at: "2026-04-29T02:00:00Z", violations: ["rest_interval"] },
  { id: "sh-3", store_name: "かっぱ寿司 福島南店", employee_name: "山田太郎", role: "店長", start_at: "2026-04-28T08:00:00Z", end_at: "2026-04-28T23:00:00Z", violations: ["overtime", "short_break"] },
  { id: "sh-4", store_name: "かっぱ寿司 郡山安積店", employee_name: "鈴木次郎", role: "ホール", start_at: "2026-04-28T11:00:00Z", end_at: "2026-04-28T20:00:00Z", violations: [] },
  { id: "sh-5", store_name: "かっぱ寿司 仙台泉店", employee_name: "高橋美咲", role: "調理", start_at: "2026-04-28T16:00:00Z", end_at: "2026-04-29T01:30:00Z", violations: ["short_break"] },
  { id: "sh-6", store_name: "かっぱ寿司 南池袋店", employee_name: "伊藤健", role: "ホール", start_at: "2026-04-27T09:00:00Z", end_at: "2026-04-27T21:00:00Z", violations: ["overtime"] },
  { id: "sh-7", store_name: "かっぱ寿司 高崎飯塚店", employee_name: "渡辺翔", role: "調理", start_at: "2026-04-27T06:00:00Z", end_at: "2026-04-27T15:00:00Z", violations: [] },
]

export const mockLaborCompliance: LaborComplianceReport = {
  total_shifts: 1842,
  violation_count: 127,
  violation_rate: 6.9,
  violations: [
    { type: "overtime", count: 58, description: "36協定超過" },
    { type: "short_break", count: 42, description: "休憩時間不足" },
    { type: "rest_interval", count: 27, description: "勤務間インターバル不足" },
  ],
}

// ============================================
// QSC Audit Mock Data
// ============================================

export const mockQSCAudits: QSCAuditItem[] = [
  { id: "qsc-1", store_name: "かっぱ寿司 長野稲里店", audit_date: "2026-04-25", quality_score: 72, service_score: 68, cleanliness_score: 75, overall_score: 71.7 },
  { id: "qsc-2", store_name: "かっぱ寿司 福島南店", audit_date: "2026-04-24", quality_score: 88, service_score: 85, cleanliness_score: 90, overall_score: 87.7 },
  { id: "qsc-3", store_name: "かっぱ寿司 郡山安積店", audit_date: "2026-04-23", quality_score: 65, service_score: 70, cleanliness_score: 60, overall_score: 65.0 },
  { id: "qsc-4", store_name: "かっぱ寿司 仙台泉店", audit_date: "2026-04-22", quality_score: 92, service_score: 90, cleanliness_score: 88, overall_score: 90.0 },
  { id: "qsc-5", store_name: "かっぱ寿司 南池袋店", audit_date: "2026-04-21", quality_score: 80, service_score: 78, cleanliness_score: 82, overall_score: 80.0 },
  { id: "qsc-6", store_name: "かっぱ寿司 高崎飯塚店", audit_date: "2026-04-20", quality_score: 55, service_score: 60, cleanliness_score: 50, overall_score: 55.0 },
  { id: "qsc-7", store_name: "かっぱ寿司 水戸笠原店", audit_date: "2026-04-19", quality_score: 85, service_score: 82, cleanliness_score: 86, overall_score: 84.3 },
]

// ============================================
// HACCP Mock Data
// ============================================

export const mockHACCPCompliance: HACCPComplianceRate = {
  total_records: 4520,
  compliant: 4385,
  compliance_rate: 97.0,
}

export const mockHACCPMonitoring = [
  { id: "hm-1", store_name: "かっぱ寿司 長野稲里店", checkpoint: "冷蔵庫温度", recorded_value: "3.2℃", threshold: "0-5℃", compliant: true, recorded_at: "2026-04-30T08:00:00Z" },
  { id: "hm-2", store_name: "かっぱ寿司 長野稲里店", checkpoint: "調理温度（中心）", recorded_value: "78℃", threshold: "75℃以上", compliant: true, recorded_at: "2026-04-30T12:00:00Z" },
  { id: "hm-3", store_name: "かっぱ寿司 福島南店", checkpoint: "冷蔵庫温度", recorded_value: "7.1℃", threshold: "0-5℃", compliant: false, recorded_at: "2026-04-30T08:00:00Z" },
  { id: "hm-4", store_name: "かっぱ寿司 郡山安積店", checkpoint: "手洗い記録", recorded_value: "実施済", threshold: "全員実施", compliant: true, recorded_at: "2026-04-30T07:00:00Z" },
  { id: "hm-5", store_name: "かっぱ寿司 仙台泉店", checkpoint: "揚げ油温度", recorded_value: "172℃", threshold: "170-180℃", compliant: true, recorded_at: "2026-04-30T11:30:00Z" },
  { id: "hm-6", store_name: "かっぱ寿司 南池袋店", checkpoint: "冷凍庫温度", recorded_value: "-15℃", threshold: "-18℃以下", compliant: false, recorded_at: "2026-04-30T08:00:00Z" },
]

export const mockAllergenMatrix = [
  { product: "まぐろ握り", allergens: { "小麦": true, "卵": false, "乳": false, "えび": false, "かに": false, "そば": false, "落花生": false } },
  { product: "サーモン握り", allergens: { "小麦": true, "卵": false, "乳": false, "えび": false, "かに": false, "そば": false, "落花生": false } },
  { product: "中とろ", allergens: { "小麦": true, "卵": true, "乳": true, "えび": false, "かに": false, "そば": false, "落花生": false } },
  { product: "えび握り", allergens: { "小麦": true, "卵": true, "乳": false, "えび": false, "かに": false, "そば": false, "落花生": false } },
  { product: "茶碗蒸し", allergens: { "小麦": true, "卵": false, "乳": false, "えび": false, "かに": false, "そば": false, "落花生": false } },
  { product: "特大穴子", allergens: { "小麦": true, "卵": true, "乳": false, "えび": false, "かに": false, "そば": false, "落花生": false } },
]

// ============================================
// Franchise Mock Data
// ============================================

export const mockFranchiseAgreements: FranchiseAgreementItem[] = [
  { id: "fa-1", store_name: "かっぱ寿司 長野稲里店", agreement_type: "直営", royalty_structure: { type: "none" }, effective_from: "2021-04-01" },
  { id: "fa-2", store_name: "かっぱ寿司 福島南店", agreement_type: "直営", royalty_structure: { type: "none" }, effective_from: "2022-01-01" },
  { id: "fa-3", store_name: "かっぱ寿司 郡山安積店", agreement_type: "FC", royalty_structure: { type: "revenue_share", rate: 4.5 }, effective_from: "2023-03-01" },
  { id: "fa-4", store_name: "かっぱ寿司 仙台泉店", agreement_type: "直営", royalty_structure: { type: "none" }, effective_from: "2022-06-01" },
  { id: "fa-5", store_name: "かっぱ寿司 南池袋店", agreement_type: "FC", royalty_structure: { type: "fixed_plus_rate", fixed: 200000, rate: 3.0 }, effective_from: "2024-01-01" },
  { id: "fa-6", store_name: "かっぱ寿司 高崎飯塚店", agreement_type: "直営", royalty_structure: { type: "none" }, effective_from: "2023-09-01" },
]

export const mockRoyaltyCalcs: RoyaltyCalcItem[] = [
  { id: "ry-1", store_name: "かっぱ寿司 福島南店", period: "2026-04", gross_revenue: 4500000, royalty_amount: 225000, net_payable: 4275000, status: "confirmed" },
  { id: "ry-2", store_name: "かっぱ寿司 郡山安積店", period: "2026-04", gross_revenue: 3800000, royalty_amount: 171000, net_payable: 3629000, status: "confirmed" },
  { id: "ry-3", store_name: "かっぱ寿司 南池袋店", period: "2026-04", gross_revenue: 3200000, royalty_amount: 296000, net_payable: 2904000, status: "pending" },
  { id: "ry-4", store_name: "かっぱ寿司 高崎飯塚店", period: "2026-04", gross_revenue: 4100000, royalty_amount: 225500, net_payable: 3874500, status: "confirmed" },
  { id: "ry-5", store_name: "かっぱ寿司 福島南店", period: "2026-03", gross_revenue: 4200000, royalty_amount: 210000, net_payable: 3990000, status: "paid" },
  { id: "ry-6", store_name: "かっぱ寿司 郡山安積店", period: "2026-03", gross_revenue: 3600000, royalty_amount: 162000, net_payable: 3438000, status: "paid" },
]

// ============================================
// Benchmark Mock Data
// ============================================

export const mockBenchmarks: BenchmarkItem[] = [
  { business_category: "回転寿司（郊外型）", metric_name: "原価率", p25: 44.0, p50: 47.0, p75: 50.0, p90: 53.0 },
  { business_category: "回転寿司（郊外型）", metric_name: "人件費率", p25: 25.0, p50: 28.0, p75: 31.0, p90: 34.0 },
  { business_category: "回転寿司（都市型）", metric_name: "原価率", p25: 42.0, p50: 45.0, p75: 48.0, p90: 51.0 },
  { business_category: "回転寿司（都市型）", metric_name: "人件費率", p25: 27.0, p50: 30.0, p75: 33.0, p90: 36.0 },
  { business_category: "食べ放題", metric_name: "原価率", p25: 48.0, p50: 52.0, p75: 56.0, p90: 60.0 },
  { business_category: "食べ放題", metric_name: "人件費率", p25: 22.0, p50: 25.0, p75: 28.0, p90: 31.0 },
]

// ============================================
// Role Mock Data
// ============================================

export const mockRoles: RoleItem[] = [
  { id: "role-1", name: "admin", display_name: "システム管理者", description: "全機能にアクセス可能", is_system: true, permission_count: 48 },
  { id: "role-2", name: "sv", display_name: "スーパーバイザー", description: "担当エリアの店舗管理", is_system: true, permission_count: 32 },
  { id: "role-3", name: "manager", display_name: "店長", description: "自店舗の運営管理", is_system: true, permission_count: 18 },
  { id: "role-4", name: "analyst", display_name: "アナリスト", description: "データ分析・レポート閲覧", is_system: false, permission_count: 24 },
  { id: "role-5", name: "fc_owner", display_name: "FC加盟オーナー", description: "加盟店舗の売上・会計閲覧", is_system: false, permission_count: 12 },
  { id: "role-6", name: "viewer", display_name: "閲覧者", description: "ダッシュボード閲覧のみ", is_system: true, permission_count: 8 },
]

export const mockRolePermissions: Record<string, { resource: string; action: string; scope: string }[]> = {
  "role-1": [
    { resource: "store", action: "read", scope: "all" }, { resource: "store", action: "write", scope: "all" },
    { resource: "kpi", action: "read", scope: "all" }, { resource: "kpi", action: "write", scope: "all" },
    { resource: "user", action: "read", scope: "all" }, { resource: "user", action: "write", scope: "all" },
    { resource: "role", action: "read", scope: "all" }, { resource: "role", action: "write", scope: "all" },
  ],
  "role-2": [
    { resource: "store", action: "read", scope: "area" }, { resource: "store", action: "write", scope: "area" },
    { resource: "kpi", action: "read", scope: "area" }, { resource: "task", action: "read", scope: "area" },
    { resource: "task", action: "write", scope: "area" },
  ],
  "role-3": [
    { resource: "store", action: "read", scope: "own" }, { resource: "store", action: "write", scope: "own" },
    { resource: "kpi", action: "read", scope: "own" }, { resource: "task", action: "read", scope: "own" },
  ],
  "role-4": [
    { resource: "store", action: "read", scope: "all" }, { resource: "kpi", action: "read", scope: "all" },
    { resource: "analysis", action: "read", scope: "all" }, { resource: "analysis", action: "write", scope: "own" },
  ],
  "role-5": [
    { resource: "store", action: "read", scope: "own" }, { resource: "kpi", action: "read", scope: "own" },
    { resource: "royalty", action: "read", scope: "own" },
  ],
  "role-6": [
    { resource: "dashboard", action: "read", scope: "all" },
  ],
}

// ============================================
// Ontology v2 Mock Data
// ============================================

export const mockObjectTypesV2: OntologyObjectTypeV2[] = [
  {
    id: "otv2-1", api_name: "store", display_name: "店舗", icon: "🏢", version: 2, status: "active",
    properties: [
      { id: "pt-1", api_name: "store_code", display_name: "店舗コード", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-2", api_name: "name", display_name: "店舗名", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-3", api_name: "prefecture", display_name: "都道府県", data_type: "string", required: false, pii_level: "none" },
      { id: "pt-4", api_name: "seat_count", display_name: "座席数", data_type: "int", required: false, pii_level: "none" },
      { id: "pt-5", api_name: "trade_area", display_name: "商圏タイプ", data_type: "enum", required: false, pii_level: "none" },
      { id: "pt-6", api_name: "opened_at", display_name: "開店日", data_type: "timestamp", required: true, pii_level: "none" },
    ],
  },
  {
    id: "otv2-2", api_name: "brand", display_name: "ブランド", icon: "🏷️", version: 3, status: "active",
    properties: [
      { id: "pt-7", api_name: "brand_code", display_name: "ブランドコード", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-8", api_name: "brand_name", display_name: "ブランド名", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-9", api_name: "cuisine_type", display_name: "業態", data_type: "enum", required: true, pii_level: "none" },
      { id: "pt-10", api_name: "avg_ticket_target", display_name: "目標客単価", data_type: "float", required: false, pii_level: "none" },
    ],
  },
  {
    id: "otv2-3", api_name: "product", display_name: "商品", icon: "🍽️", version: 1, status: "active",
    properties: [
      { id: "pt-11", api_name: "product_code", display_name: "商品コード", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-12", api_name: "product_name", display_name: "商品名", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-13", api_name: "price", display_name: "価格", data_type: "float", required: true, pii_level: "none" },
      { id: "pt-14", api_name: "category", display_name: "カテゴリ", data_type: "enum", required: false, pii_level: "none" },
    ],
  },
  {
    id: "otv2-4", api_name: "employee", display_name: "従業員", icon: "👤", version: 1, status: "active",
    properties: [
      { id: "pt-15", api_name: "employee_code", display_name: "社員番号", data_type: "string", required: true, pii_level: "low" },
      { id: "pt-16", api_name: "name", display_name: "氏名", data_type: "string", required: true, pii_level: "high" },
      { id: "pt-17", api_name: "role", display_name: "役職", data_type: "enum", required: true, pii_level: "none" },
      { id: "pt-18", api_name: "hire_date", display_name: "入社日", data_type: "timestamp", required: true, pii_level: "low" },
      { id: "pt-19", api_name: "hourly_rate", display_name: "時給", data_type: "float", required: false, pii_level: "high" },
    ],
  },
  {
    id: "otv2-5", api_name: "task", display_name: "タスク", icon: "📋", version: 1, status: "draft",
    properties: [
      { id: "pt-20", api_name: "task_code", display_name: "タスクコード", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-21", api_name: "title", display_name: "タイトル", data_type: "string", required: true, pii_level: "none" },
      { id: "pt-22", api_name: "status", display_name: "ステータス", data_type: "enum", required: true, pii_level: "none" },
      { id: "pt-23", api_name: "due_date", display_name: "期限", data_type: "timestamp", required: false, pii_level: "none" },
    ],
  },
]

export const mockImpactReport: Record<string, OntologyImpactReport> = {
  "otv2-1": { kpi_count: 5, instance_count: 100, link_count: 7, lineage_count: 23, breaking_changes: [] },
  "otv2-2": { kpi_count: 3, instance_count: 5, link_count: 4, lineage_count: 12, breaking_changes: [] },
  "otv2-3": { kpi_count: 2, instance_count: 450, link_count: 3, lineage_count: 8, breaking_changes: [] },
  "otv2-4": { kpi_count: 4, instance_count: 2800, link_count: 5, lineage_count: 15, breaking_changes: [] },
  "otv2-5": { kpi_count: 1, instance_count: 340, link_count: 2, lineage_count: 5, breaking_changes: [] },
}

// ============================================
// Huff Prediction Mock
// ============================================
export const mockHuffResult = {
  total_monthly_visits: 12500,
  monthly_revenue_estimate_jpy: 8750000,
  first_year_revenue_estimate_jpy: 73500000,
  breakeven_months_estimate: 18,
  cannibalization_pct: 8.3,
  competitive_density: 7,
}

// ============================================
// Menu Engineering Mock
// ============================================
export const mockMenuEngineering = [
  { product_name: "まぐろ（110円皿）", sales_count: 45000, gross_margin_pct: 64.9, quadrant: "star" },
  { product_name: "まぐろ", sales_count: 22000, gross_margin_pct: 52.0, quadrant: "star" },
  { product_name: "中とろ", sales_count: 8500, gross_margin_pct: 69.9, quadrant: "puzzle" },
  { product_name: "ウニ", sales_count: 3200, gross_margin_pct: 60.0, quadrant: "puzzle" },
  { product_name: "唐揚げ", sales_count: 28000, gross_margin_pct: 70.0, quadrant: "star" },
  { product_name: "サーモン", sales_count: 35000, gross_margin_pct: 57.3, quadrant: "plowhorse" },
  { product_name: "中とろ", sales_count: 8000, gross_margin_pct: 50.0, quadrant: "puzzle" },
  { product_name: "フライドポテト", sales_count: 18000, gross_margin_pct: 80.0, quadrant: "star" },
  { product_name: "ビール", sales_count: 5000, gross_margin_pct: 74.9, quadrant: "puzzle" },
  { product_name: "味噌汁", sales_count: 30000, gross_margin_pct: 80.0, quadrant: "star" },
  { product_name: "えびマヨ", sales_count: 15000, gross_margin_pct: 64.9, quadrant: "plowhorse" },
  { product_name: "茶碗蒸し", sales_count: 4000, gross_margin_pct: 70.0, quadrant: "puzzle" },
  { product_name: "日本酒", sales_count: 2000, gross_margin_pct: 74.9, quadrant: "puzzle" },
  { product_name: "ほたて", sales_count: 12000, gross_margin_pct: 70.0, quadrant: "plowhorse" },
  { product_name: "ビール", sales_count: 25000, gross_margin_pct: 89.9, quadrant: "star" },
]

// ============================================
// Product Detail Mock
// ============================================
export const mockProductDetail = {
  id: "prod-001",
  name: "まぐろ（110円皿）",
  brand_name: "かっぱ寿司",
  category: "メイン",
  price: 450,
  theoretical_cost: 158,
  cost_rate: 35.1,
  monthly_sales: 45000,
  elasticity: -0.42,
  elasticity_ci: [-0.58, -0.26],
  monthly_trend: [
    { month: "2025-05", sales: 38000000, quantity: 42000 },
    { month: "2025-06", sales: 39500000, quantity: 43500 },
    { month: "2025-07", sales: 41200000, quantity: 44800 },
    { month: "2025-08", sales: 43000000, quantity: 46200 },
    { month: "2025-09", sales: 40500000, quantity: 44000 },
    { month: "2025-10", sales: 39800000, quantity: 43200 },
    { month: "2025-11", sales: 38500000, quantity: 42500 },
    { month: "2025-12", sales: 42000000, quantity: 45000 },
    { month: "2026-01", sales: 40000000, quantity: 43800 },
    { month: "2026-02", sales: 38800000, quantity: 42800 },
    { month: "2026-03", sales: 41500000, quantity: 44500 },
    { month: "2026-04", sales: 42500000, quantity: 45000 },
  ],
  price_history: [
    { date: "2025-09-01", old_price: 480, new_price: 450, reason: "客数回復のため値下げ", actual_volume_change: "+12%" },
    { date: "2025-03-01", old_price: 430, new_price: 480, reason: "原材料費高騰に対応", actual_volume_change: "-5%" },
    { date: "2024-10-01", old_price: 400, new_price: 430, reason: "原価率改善", actual_volume_change: "-3%" },
  ],
  bom: [
    { ingredient: "牛バラ肉", quantity: 80, unit: "g", unit_price: 1.2, subtotal: 96 },
    { ingredient: "白米", quantity: 200, unit: "g", unit_price: 0.15, subtotal: 30 },
    { ingredient: "玉ねぎ", quantity: 30, unit: "g", unit_price: 0.3, subtotal: 9 },
    { ingredient: "醤油タレ", quantity: 20, unit: "ml", unit_price: 0.5, subtotal: 10 },
    { ingredient: "紅しょうが", quantity: 5, unit: "g", unit_price: 0.8, subtotal: 4 },
  ],
}

// ============================================
// Price Elasticity Mock
// ============================================
export const mockPriceElasticities = [
  { product_id: "prod-001", product_name: "まぐろ（110円皿）", elasticity: -0.42, ci_low: -0.58, ci_high: -0.26 },
  { product_id: "prod-002", product_name: "唐揚げ", elasticity: -0.65, ci_low: -0.82, ci_high: -0.48 },
  { product_id: "prod-003", product_name: "味噌汁", elasticity: -0.18, ci_low: -0.30, ci_high: -0.06 },
  { product_id: "prod-004", product_name: "サーモン", elasticity: -1.12, ci_low: -1.35, ci_high: -0.89 },
  { product_id: "prod-005", product_name: "フライドポテト", elasticity: -0.31, ci_low: -0.45, ci_high: -0.17 },
]

// ============================================
// Price Decisions Mock
// ============================================
export const mockPriceDecisions = [
  { id: "pd-001", product_id: "prod-001", product_name: "まぐろ（110円皿）", date: "2025-09-01", old_price: 480, new_price: 450, reason: "客数回復のため値下げ", actual_volume_change: "+12%" },
  { id: "pd-002", product_id: "prod-001", product_name: "まぐろ（110円皿）", date: "2025-03-01", old_price: 430, new_price: 480, reason: "原材料費高騰に対応", actual_volume_change: "-5%" },
  { id: "pd-003", product_id: "prod-002", product_name: "唐揚げ", date: "2025-06-01", old_price: 400, new_price: 430, reason: "原価率改善", actual_volume_change: "-3%" },
]

// ============================================
// Zensho Pilot Package Mock
// ============================================
export const mockPilotThemes = [
  {
    theme_id: "ZP-01",
    name: "欠品・廃棄削減 POC",
    description: "需要予測精度向上 → 在庫補充タイミング最適化で廃棄/欠品を同時削減",
    primary_kpis: ["waste_amount", "stockout_rate", "gross_profit_rate"],
    default_brands: ["かっぱ寿司", "かっぱ寿司"],
  },
  {
    theme_id: "ZP-02",
    name: "深夜帯人員配置最適化 POC",
    description: "深夜帯のシフト過剰/過少を解消、人時売上を改善",
    primary_kpis: ["sales_per_labor_hour", "labor_cost_rate", "overtime_hours"],
    default_brands: ["かっぱ寿司"],
  },
  {
    theme_id: "ZP-03",
    name: "SV 訪問優先順位最適化 POC",
    description: "SV ミッションを improvement opportunity 順に再配分",
    primary_kpis: ["sv_visit_effectiveness", "underperforming_store_count", "health_score"],
    default_brands: ["郊外ロードサイド型", "都市型"],
  },
  {
    theme_id: "ZP-04",
    name: "QSC/HACCP 監査統合 POC",
    description: "監査スコアと実 KPI 連動を可視化、是正完了率を改善",
    primary_kpis: ["qsc_score", "haccp_compliance_rate", "corrective_action_close_rate"],
    default_brands: ["全ブランド"],
  },
  {
    theme_id: "ZP-05",
    name: "M&A ブランド可視化 POC",
    description: "買収ブランドの KPI 統一・データ接続を進捗可視化",
    primary_kpis: ["data_integration_rate", "kpi_unification_rate"],
    default_brands: ["ロッテリア"],
  },
]

export const mockPilots = [
  {
    id: "pilot-001",
    name: "かっぱ寿司 廃棄削減 POC",
    theme: "ZP-01",
    description: "需要予測精度向上 → 在庫補充タイミング最適化で廃棄/欠品を同時削減",
    target_store_ids: Array(20).fill("").map((_, i) => `store-${i + 1}`),
    control_store_ids: Array(10).fill("").map((_, i) => `store-${i + 21}`),
    baseline_start_date: "2026-02-01",
    baseline_end_date: "2026-03-02",
    intervention_start_date: "2026-03-03",
    intervention_end_date: "2026-03-30",
    success_kpis: ["waste_amount", "stockout_rate", "gross_profit_rate"],
    target_improvement_pct: { waste_amount: -3.0, stockout_rate: -5.0 },
    sponsor_name: "カッパ・クリエイト 経営企画 山本 太郎",
    status: "running",
    overlay_mode: "read_only",
    weekly_plan: [
      "W1: データ取り込み + DQ レビュー",
      "W2: ベースライン KPI 確定 + 介入店舗選定",
      "W3-4: 介入実施 + 日次モニタリング",
      "W5-6: 効果計測 + 仮説検証",
      "W7: 中間レポート",
      "W8: 最終報告書 + 本展開提案",
    ],
    data_required: ["daily_sales", "product_sales", "inventory_snapshot"],
  },
]

export const mockPilotResults = [
  { kpi_name: "waste_amount", baseline_value: 18500, intervention_value: 14200, delta_pct: -23.2, p_value: 0.012, significant: true, annualized_impact_yen: 31_400_000, sample_size: 560, calculation_method: "did" },
  { kpi_name: "stockout_rate", baseline_value: 2.8, intervention_value: 1.4, delta_pct: -50.0, p_value: 0.003, significant: true, annualized_impact_yen: 25_200_000, sample_size: 560, calculation_method: "did" },
  { kpi_name: "gross_profit_rate", baseline_value: 31.2, intervention_value: 32.1, delta_pct: 2.9, p_value: 0.18, significant: false, annualized_impact_yen: 16_200_000, sample_size: 560, calculation_method: "did" },
]

export const mockPilotSummary = {
  pilot_id: "pilot-001",
  name: "かっぱ寿司 廃棄削減 POC",
  theme: "ZP-01",
  theme_name: "欠品・廃棄削減 POC",
  sponsor_name: "カッパ・クリエイト 経営企画 山本 太郎",
  status: "running",
  overlay_mode: "read_only",
  target_store_count: 20,
  control_store_count: 10,
  baseline_period: "2026-02-01 〜 2026-03-02",
  intervention_period: "2026-03-03 〜 2026-03-30",
  results: mockPilotResults.map((r) => ({
    kpi_name: r.kpi_name,
    baseline: r.baseline_value,
    intervention: r.intervention_value,
    delta_pct: r.delta_pct,
    p_value: r.p_value,
    significant: r.significant,
    annualized_impact_yen: r.annualized_impact_yen,
    ci: [r.intervention_value * 0.92, r.intervention_value * 1.08],
    method: r.calculation_method,
  })),
  total_annualized_impact_yen: 72_800_000,
  significant_kpi_count: 2,
  kpi_count: 3,
  verdict: "成功: 統計的有意 2/3 KPI、年間 72,800,000円 改善見込み",
  next_actions: [
    "有意改善が出た KPI（waste_amount, stockout_rate）について本契約スコープでの全店展開を提案",
    "Read-only から writeback approved への移行を IT 部門と協議",
  ],
}

// ============================================
// Connector Health Mock
// ============================================
export const mockConnectorHealth = [
  { data_source_id: "ds-001", name: "スマレジ POS", source_type: "smaregi", status: "connected", health_score: 95, health_badge: "good", last_sync_at: "2026-05-02T03:15:00Z", freshness_hours: 7.2, recent_failures_7d: 0, last_error: null },
  { data_source_id: "ds-002", name: "KING OF TIME 勤怠", source_type: "king_of_time", status: "connected", health_score: 78, health_badge: "warning", last_sync_at: "2026-05-01T03:00:00Z", freshness_hours: 31.5, recent_failures_7d: 1, last_error: "Rate limit (429)" },
  { data_source_id: "ds-003", name: "Hacobu 物流 TMS", source_type: "hacobu", status: "error", health_score: 35, health_badge: "critical", last_sync_at: "2026-04-28T03:00:00Z", freshness_hours: 96.2, recent_failures_7d: 4, last_error: "Authentication expired" },
  { data_source_id: "ds-004", name: "本部 CSV (毎日 03:00)", source_type: "csv_sftp", status: "connected", health_score: 100, health_badge: "good", last_sync_at: "2026-05-02T03:01:00Z", freshness_hours: 7.4, recent_failures_7d: 0, last_error: null },
]

// ============================================
// Column Policy Mock
// ============================================
export const mockColumnPolicies = [
  { id: "cp-001", role_id: null, resource_name: "employee", column_name: "name", action: "read", mask_type: "full", enabled: true },
  { id: "cp-002", role_id: null, resource_name: "employee", column_name: "hourly_rate", action: "read", mask_type: "full", enabled: true },
  { id: "cp-003", role_id: null, resource_name: "review", column_name: "author_email", action: "read", mask_type: "hash", enabled: true },
  { id: "cp-004", role_id: null, resource_name: "store", column_name: "manager_name", action: "read", mask_type: "partial", enabled: true },
]

export const mockPIIRedactionLogs = [
  { id: "pl-001", pii_type: "email", redaction_method: "mask", occurrences: 3, resource_type: "ai_prompt", created_at: "2026-05-02T10:23:00Z" },
  { id: "pl-002", pii_type: "phone_jp", redaction_method: "mask", occurrences: 2, resource_type: "api_response", created_at: "2026-05-02T09:45:00Z" },
  { id: "pl-003", pii_type: "name_jp", redaction_method: "mask", occurrences: 5, resource_type: "ai_prompt", created_at: "2026-05-02T08:12:00Z" },
]

export const mockPIISummary = [
  { pii_type: "email", total_occurrences: 124 },
  { pii_type: "phone_jp", total_occurrences: 87 },
  { pii_type: "name_jp", total_occurrences: 256 },
  { pii_type: "employee_id", total_occurrences: 45 },
]

// ============================================
// SV Mission Mock (Zensho)
// ============================================
export const mockSVMissionPlan = {
  week_start: "2026-05-05",
  missions: [
    { store_id: "store-021", store_name: "かっぱ寿司 渋谷駅前店", priority: 1, scheduled_date: "2026-05-05", reason: "health_score 52.1 で要改善", expected_impact_yen: 2_800_000, checklist: ["QSC 状況確認", "シフト充足率チェック", "在庫水準確認", "店長との 1on1（30分）", "改善 task の現場展開状況確認"] },
    { store_id: "store-103", store_name: "郊外ロードサイド型 横浜港北店", priority: 2, scheduled_date: "2026-05-06", reason: "health_score 58.4 で要改善", expected_impact_yen: 1_900_000, checklist: ["QSC 状況確認", "シフト充足率チェック", "在庫水準確認", "店長との 1on1（30分）"] },
    { store_id: "store-067", store_name: "かっぱ寿司 千葉ニュータウン店", priority: 3, scheduled_date: "2026-05-07", reason: "health_score 60.8 で要改善", expected_impact_yen: 1_500_000, checklist: ["QSC 状況確認", "シフト充足率チェック", "在庫水準確認"] },
    { store_id: "store-218", store_name: "食べ放題特化型 池袋東口店", priority: 4, scheduled_date: "2026-05-08", reason: "health_score 62.3 で要改善", expected_impact_yen: 1_200_000, checklist: ["QSC 状況確認", "店長との 1on1（30分）"] },
    { store_id: "store-145", store_name: "都市型 大井町店", priority: 5, scheduled_date: "2026-05-09", reason: "health_score 65.0 で要改善", expected_impact_yen: 950_000, checklist: ["QSC 状況確認", "改善 task の現場展開状況確認"] },
  ],
  total_expected_impact_yen: 8_350_000,
  optimization_goal: "improvement_opportunity",
}

// ============================================
// Store Manager Brief Mock
// ============================================
export const mockStoreManagerBrief = {
  store_name: "かっぱ寿司 渋谷駅前店",
  store_id: "store-021",
  business_date: "2026-05-02",
  today_kpis: [
    { name: "今日の客数（予測）", value: "412人", trend: "+8%", positive: true },
    { name: "今日の売上（予測）", value: "¥318,000", trend: "+5%", positive: true },
    { name: "現在の在庫充足率", value: "92%", trend: "良好", positive: true },
    { name: "本日のシフト人数", value: "9名", trend: "標準", positive: true },
  ],
  this_week_actions: [
    { id: "a-001", title: "深夜帯の在庫補充タイミングを 22:30 → 21:00 に変更", priority: "high", from: "本部", due_date: "2026-05-04" },
    { id: "a-002", title: "SV 訪問対応（5/5 14:00 山田 SV）", priority: "high", from: "本部", due_date: "2026-05-05" },
    { id: "a-003", title: "QSC スコア改善: トイレ清掃チェックリスト導入", priority: "medium", from: "SV", due_date: "2026-05-09" },
  ],
  yoy_comparison: {
    sales_yoy: "+3.2%",
    customer_count_yoy: "-1.5%",
    avg_ticket_yoy: "+4.8%",
  },
  weekly_action_completion: { total: 8, completed: 5, rate: 0.625 },
}

export const mockAuditLogs = [
  { id: "1", timestamp: "2026-04-30 14:32:10", user: "admin@aentro.jp", method: "GET", path: "/api/v1/executive/summary", result: "allow", ip: "10.0.1.12" },
  { id: "2", timestamp: "2026-04-30 14:31:55", user: "sv@aentro.jp", method: "GET", path: "/api/v1/stores/ranking", result: "allow", ip: "10.0.1.15" },
  { id: "3", timestamp: "2026-04-30 14:30:22", user: "unknown@test.jp", method: "POST", path: "/api/v1/auth/login", result: "deny", ip: "192.168.1.100" },
  { id: "4", timestamp: "2026-04-30 14:28:01", user: "manager@aentro.jp", method: "PUT", path: "/api/v1/tasks/t-001", result: "allow", ip: "10.0.1.20" },
  { id: "5", timestamp: "2026-04-30 14:25:44", user: "admin@aentro.jp", method: "DELETE", path: "/api/v1/writeback/requests/wr-003", result: "allow", ip: "10.0.1.12" },
  { id: "6", timestamp: "2026-04-30 14:20:10", user: "sv@aentro.jp", method: "GET", path: "/api/v1/sv/missions", result: "allow", ip: "10.0.1.15" },
  { id: "7", timestamp: "2026-04-30 14:18:33", user: "viewer@aentro.jp", method: "GET", path: "/api/v1/stores/ranking", result: "allow", ip: "10.0.1.30" },
  { id: "8", timestamp: "2026-04-30 14:15:02", user: "viewer@aentro.jp", method: "POST", path: "/api/v1/rbac/users/u-001/roles", result: "deny", ip: "10.0.1.30" },
  { id: "9", timestamp: "2026-04-30 14:10:50", user: "admin@aentro.jp", method: "POST", path: "/api/v1/ai/query", result: "allow", ip: "10.0.1.12" },
  { id: "10", timestamp: "2026-04-30 14:05:11", user: "manager@aentro.jp", method: "GET", path: "/api/v1/vertical/labor/shifts", result: "allow", ip: "10.0.1.20" },
]

export const mockUserList = [
  { id: "u-001", name: "田中 太郎", email: "admin@aentro.jp", roles: ["admin", "executive"], active: true, created_at: "2025-01-15" },
  { id: "u-002", name: "鈴木 花子", email: "sv@aentro.jp", roles: ["sv"], active: true, created_at: "2025-03-01" },
  { id: "u-003", name: "佐藤 一郎", email: "manager@aentro.jp", roles: ["manager"], active: true, created_at: "2025-06-10" },
]
