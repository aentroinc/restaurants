// =============================================================================
// AENTRO PRO — 中規模チェーン向けモックデータ
// とんかつチェーン「かつ善」28店舗 (東京・神奈川・埼玉)
// =============================================================================

export const chain = {
  name: "とんかつ かつ善",
  store_count: 28,
  areas: ["東京東部","東京西部","神奈川・埼玉"],
  plan: "PRO（月額¥198,000）",
};

export interface Area {
  id: string;
  name: string;
  manager: string;
  store_count: number;
  monthly_sales: number;
  monthly_prev: number;
  avg_food_cost: number;
  avg_labor_cost: number;
  alert_count: number;
}

export const areas: Area[] = [
  { id: "A1", name: "東京東部", manager: "中村SV", store_count: 10, monthly_sales: 42_800_000, monthly_prev: 41_200_000, avg_food_cost: 31.2, avg_labor_cost: 28.5, alert_count: 3 },
  { id: "A2", name: "東京西部", manager: "佐々木SV", store_count: 10, monthly_sales: 39_500_000, monthly_prev: 40_100_000, avg_food_cost: 32.5, avg_labor_cost: 29.8, alert_count: 5 },
  { id: "A3", name: "神奈川・埼玉", manager: "田辺SV", store_count: 8, monthly_sales: 31_200_000, monthly_prev: 29_800_000, avg_food_cost: 30.8, avg_labor_cost: 27.2, alert_count: 2 },
];

export interface Store {
  id: string;
  name: string;
  area_id: string;
  type: "駅前" | "ロードサイド" | "商業施設";
  seats: number;
  daily_sales: number;
  customers: number;
  avg_ticket: number;
  food_cost_pct: number;
  labor_cost_pct: number;
  trend: "up" | "flat" | "down";
}

const storeNames = [
  // A1: 東京東部
  { name: "上野店", area: "A1", type: "駅前" as const },
  { name: "秋葉原店", area: "A1", type: "駅前" as const },
  { name: "錦糸町店", area: "A1", type: "駅前" as const },
  { name: "北千住店", area: "A1", type: "駅前" as const },
  { name: "亀有店", area: "A1", type: "ロードサイド" as const },
  { name: "葛西店", area: "A1", type: "ロードサイド" as const },
  { name: "船橋店", area: "A1", type: "ロードサイド" as const },
  { name: "押上店", area: "A1", type: "商業施設" as const },
  { name: "豊洲店", area: "A1", type: "商業施設" as const },
  { name: "有明店", area: "A1", type: "商業施設" as const },
  // A2: 東京西部
  { name: "新宿店", area: "A2", type: "駅前" as const },
  { name: "渋谷店", area: "A2", type: "駅前" as const },
  { name: "池袋店", area: "A2", type: "駅前" as const },
  { name: "吉祥寺店", area: "A2", type: "駅前" as const },
  { name: "立川店", area: "A2", type: "駅前" as const },
  { name: "八王子店", area: "A2", type: "ロードサイド" as const },
  { name: "調布店", area: "A2", type: "ロードサイド" as const },
  { name: "二子玉川店", area: "A2", type: "商業施設" as const },
  { name: "町田店", area: "A2", type: "商業施設" as const },
  { name: "聖蹟桜ヶ丘店", area: "A2", type: "ロードサイド" as const },
  // A3: 神奈川・埼玉
  { name: "横浜駅前店", area: "A3", type: "駅前" as const },
  { name: "川崎店", area: "A3", type: "駅前" as const },
  { name: "武蔵小杉店", area: "A3", type: "駅前" as const },
  { name: "藤沢店", area: "A3", type: "ロードサイド" as const },
  { name: "相模原店", area: "A3", type: "ロードサイド" as const },
  { name: "大宮店", area: "A3", type: "駅前" as const },
  { name: "所沢店", area: "A3", type: "ロードサイド" as const },
  { name: "ららぽーと海老名店", area: "A3", type: "商業施設" as const },
];

const seed = (i: number, offset: number) => ((i * 7 + offset * 13 + 37) % 100) / 100;

export const stores: Store[] = storeNames.map((s, i) => {
  const isStation = s.type === "駅前";
  const isMall = s.type === "商業施設";
  const baseSales = isStation ? 185000 : isMall ? 168000 : 155000;
  const sales = Math.round(baseSales + seed(i, 1) * 50000);
  const customers = Math.round(sales / (isStation ? 1380 : 1250));
  return {
    id: `P${String(i + 1).padStart(2, "0")}`,
    name: s.name,
    area_id: s.area,
    type: s.type,
    seats: Math.round(35 + seed(i, 2) * 25),
    daily_sales: sales,
    customers,
    avg_ticket: Math.round(sales / customers),
    food_cost_pct: Math.round((30 + seed(i, 3) * 5) * 10) / 10,
    labor_cost_pct: Math.round((27 + seed(i, 4) * 5) * 10) / 10,
    trend: seed(i, 5) > 0.7 ? "up" : seed(i, 5) < 0.3 ? "down" : "flat",
  };
});

export const totalKpi = {
  monthly_sales: areas.reduce((s, a) => s + a.monthly_sales, 0),
  monthly_prev: areas.reduce((s, a) => s + a.monthly_prev, 0),
  daily_sales: stores.reduce((s, st) => s + st.daily_sales, 0),
  total_customers: stores.reduce((s, st) => s + st.customers, 0),
  avg_ticket: Math.round(stores.reduce((s, st) => s + st.daily_sales, 0) / stores.reduce((s, st) => s + st.customers, 0)),
  avg_food_cost: 31.5,
  avg_labor_cost: 28.5,
  profit_estimate: 9_800_000,
  alert_count: areas.reduce((s, a) => s + a.alert_count, 0),
  updated_at: "22:30",
};

// キャンペーン
export interface Campaign {
  id: string;
  name: string;
  period: string;
  target_stores: number;
  sales_lift_pct: number;
  customer_lift_pct: number;
  status: "実施中" | "終了" | "計画中";
}

export const campaigns: Campaign[] = [
  { id: "C01", name: "GW限定 海老フライ定食", period: "4/29-5/6", target_stores: 28, sales_lift_pct: 12.4, customer_lift_pct: 8.2, status: "実施中" },
  { id: "C02", name: "平日ランチ ¥200引き", period: "4/1-4/30", target_stores: 20, sales_lift_pct: 5.8, customer_lift_pct: 15.1, status: "終了" },
  { id: "C03", name: "新メニュー: チーズメンチカツ", period: "5/10-6/10", target_stores: 28, sales_lift_pct: 0, customer_lift_pct: 0, status: "計画中" },
];

// 需要予測（店舗タイプ別の来週予測）
export const demandForecast = {
  next_week: [
    { dow: "月", station: 128, roadside: 105, mall: 115, total: 348 },
    { dow: "火", station: 135, roadside: 110, mall: 108, total: 353 },
    { dow: "水", station: 138, roadside: 112, mall: 112, total: 362 },
    { dow: "木", station: 142, roadside: 115, mall: 118, total: 375 },
    { dow: "金", station: 168, roadside: 135, mall: 142, total: 445 },
    { dow: "土", station: 185, roadside: 158, mall: 172, total: 515 },
    { dow: "日", station: 155, roadside: 148, mall: 168, total: 471 },
  ],
  confidence: "High" as const,
  notes: "GWの影響で木-日が通常比+15%の予測。食材発注量を1.2倍に調整推奨。",
};

// AIシグナル
export interface Signal {
  id: string;
  type: "異常検知" | "需要変動" | "コスト警告" | "改善提案" | "キャンペーン";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  affected: string;
  action: string;
  impact: string;
}

export const signals: Signal[] = [
  {
    id: "SIG-01", type: "異常検知", severity: "critical",
    title: "渋谷店の売上が3日連続で予測比-22%",
    detail: "渋谷店の売上が火〜木で予測比-22%。客数は-18%、客単価は-5%。近隣の競合出店(5/1に「松のや渋谷店」オープン)が影響の可能性。",
    affected: "渋谷店 (東京西部エリア)",
    action: "ランチセット¥100引きクーポンを渋谷店限定で配布。佐々木SVが明日訪店して状況確認。",
    impact: "対応しない場合、月間売上-¥180,000の見込み",
  },
  {
    id: "SIG-02", type: "コスト警告", severity: "high",
    title: "東京西部エリアの原価率が32.5%で目標超過",
    detail: "東京西部10店舗の4月原価率が32.5%(目標31%)。主因は豚ロースの仕入値上昇(+6%)と廃棄増加。特に渋谷・池袋で顕著。",
    affected: "東京西部エリア 10店舗",
    action: "仕入先との価格交渉を今週中に実施。廃棄の多い3店舗に対し仕込み量ガイドラインを再配布。",
    impact: "改善すれば月間原価-¥320,000",
  },
  {
    id: "SIG-03", type: "需要変動", severity: "medium",
    title: "GW期間中の需要予測: 全店+15%",
    detail: "5/3-5/6のGW後半は全店で客数+15%を予測。特にロードサイド・商業施設型で+20%超。食材の前倒し発注と金土のシフト増強が必要。",
    affected: "全28店舗",
    action: "食材発注量を1.2倍に調整。金土日のバイトを各店1名追加。",
    impact: "準備不足の場合、機会損失-¥850,000",
  },
  {
    id: "SIG-04", type: "キャンペーン", severity: "medium",
    title: "海老フライ定食キャンペーンが好調",
    detail: "GW限定メニューの海老フライ定食が開始3日で売上リフト+12.4%。特に商業施設型店舗で+18%。延長を検討する価値あり。",
    affected: "全28店舗",
    action: "5/6終了予定を5/15まで延長する場合、海老の追加発注を5/4までに決定。",
    impact: "延長すれば追加売上+¥2,200,000(10日間)",
  },
  {
    id: "SIG-05", type: "改善提案", severity: "low",
    title: "ランチ客単価の店舗間格差が大きい",
    detail: "ランチ客単価: 最高¥1,450(上野店) vs 最低¥1,080(相模原店)。上野店はセットメニューの訴求が強い。相模原店はセット率が38%(上野72%)。",
    affected: "客単価下位5店舗",
    action: "上野店のセットメニュー訴求方法(卓上POP・券売機表示順)を下位5店舗に横展開。",
    impact: "対象5店舗の客単価+¥150 → 月間+¥450,000",
  },
];

// アクション
export interface Action {
  id: string;
  signal_id: string;
  title: string;
  owner: string;
  due_date: string;
  status: "pending" | "approved" | "in-progress" | "completed";
  impact: string;
}

export const actions: Action[] = [
  { id: "ACT-01", signal_id: "SIG-01", title: "渋谷店限定クーポン配布(ランチ¥100引き)", owner: "佐々木SV", due_date: "5/2", status: "pending", impact: "売上-22%の回復" },
  { id: "ACT-02", signal_id: "SIG-01", title: "佐々木SVが渋谷店を訪店確認", owner: "佐々木SV", due_date: "5/2", status: "approved", impact: "現場状況の把握" },
  { id: "ACT-03", signal_id: "SIG-02", title: "豚ロース仕入先と価格交渉", owner: "購買担当 木村", due_date: "5/3", status: "in-progress", impact: "原価率-1.5pt" },
  { id: "ACT-04", signal_id: "SIG-03", title: "GW期間の食材発注量1.2倍に調整", owner: "各店長", due_date: "5/2", status: "completed", impact: "機会損失¥850k回避" },
  { id: "ACT-05", signal_id: "SIG-04", title: "海老フライ定食キャンペーン延長判断", owner: "商品部 高橋", due_date: "5/4", status: "pending", impact: "追加売上+¥2.2M" },
  { id: "ACT-06", signal_id: "SIG-05", title: "セットメニュー訴求POPを下位5店舗に配布", owner: "中村SV", due_date: "5/7", status: "pending", impact: "月間+¥450k" },
];
