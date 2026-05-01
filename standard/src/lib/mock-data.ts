// =============================================================================
// AENTRO STANDARD — 小規模チェーン向けモックデータ
// 焼肉ダイニング「炎(ほのお)」5店舗
// =============================================================================

export const chain = {
  name: "焼肉ダイニング 炎",
  store_count: 5,
  area: "東京・神奈川",
  owner: "石井",
  plan: "STANDARD（月額¥49,800）",
};

export interface Store {
  id: string;
  name: string;
  area: string;
  seats: number;
  daily_sales: number;
  daily_customers: number;
  avg_ticket: number;
  food_cost_pct: number;
  labor_cost_pct: number;
  waste_pct: number;
  staff_coverage: number;
  trend: "up" | "flat" | "down";
  issues: string[];
}

export const stores: Store[] = [
  { id: "S01", name: "下北沢本店", area: "世田谷", seats: 45, daily_sales: 312000, daily_customers: 68, avg_ticket: 4588, food_cost_pct: 32.1, labor_cost_pct: 27.5, waste_pct: 2.8, staff_coverage: 0.95, trend: "up", issues: [] },
  { id: "S02", name: "三軒茶屋店", area: "世田谷", seats: 38, daily_sales: 275000, daily_customers: 58, avg_ticket: 4741, food_cost_pct: 31.5, labor_cost_pct: 29.2, waste_pct: 3.1, staff_coverage: 0.88, trend: "flat", issues: ["金曜夜のホール不足"] },
  { id: "S03", name: "武蔵小杉店", area: "川崎", seats: 52, daily_sales: 348000, daily_customers: 75, avg_ticket: 4640, food_cost_pct: 30.8, labor_cost_pct: 26.8, waste_pct: 2.2, staff_coverage: 0.97, trend: "up", issues: [] },
  { id: "S04", name: "自由が丘店", area: "目黒", seats: 35, daily_sales: 245000, daily_customers: 52, avg_ticket: 4711, food_cost_pct: 33.8, labor_cost_pct: 30.5, waste_pct: 4.5, staff_coverage: 0.82, trend: "down", issues: ["原価率超過", "廃棄増加", "人員不足"] },
  { id: "S05", name: "溝の口店", area: "川崎", seats: 40, daily_sales: 268000, daily_customers: 60, avg_ticket: 4467, food_cost_pct: 31.2, labor_cost_pct: 28.8, waste_pct: 2.9, staff_coverage: 0.92, trend: "flat", issues: [] },
];

// 月商 = 日商合計 × 営業日数(26日/月、月曜定休4日)
export const totalKpi = {
  daily_sales: stores.reduce((s, st) => s + st.daily_sales, 0),
  monthly_sales: Math.round(stores.reduce((s, st) => s + st.daily_sales, 0) * 26),
  monthly_prev: Math.round(stores.reduce((s, st) => s + st.daily_sales, 0) * 26 * 0.965),
  total_customers: stores.reduce((s, st) => s + st.daily_customers, 0),
  avg_ticket: Math.round(stores.reduce((s, st) => s + st.daily_sales, 0) / stores.reduce((s, st) => s + st.daily_customers, 0)),
  avg_food_cost: 31.9,
  avg_labor_cost: 28.6,
  total_waste_pct: 3.1,
  profit_estimate: 3_200_000,
  profit_prev: 2_850_000,
  alert_count: 4,
  updated_at: "22:30",
};

// 店舗別日次売上（7日間）
export const storeWeeklySales = stores.map(store => ({
  store_id: store.id,
  store_name: store.name,
  days: Array.from({ length: 7 }, (_, i) => {
    const dow = ["木","金","土","日","月","火","水"][i];
    const isMonday = dow === "月";
    const isFriSat = dow === "金" || dow === "土";
    const base = isMonday ? 0 : isFriSat ? store.daily_sales * 1.25 : store.daily_sales * 0.92;
    const seed = ((store.id.charCodeAt(1) * 7 + i * 13 + 37) % 20 - 10) * 2000;
    return {
      dow,
      sales: isMonday ? 0 : Math.round(base + seed),
      isClosed: isMonday,
    };
  }),
}));

// メニュー（焼肉向け）
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  total_orders: number;
  by_store: { store_id: string; orders: number }[];
  trend: "up" | "flat" | "down";
}

export const menuItems: MenuItem[] = [
  { id: "F01", name: "特選カルビ", category: "焼肉", price: 1580, cost: 580, total_orders: 145, by_store: [{store_id:"S01",orders:35},{store_id:"S02",orders:28},{store_id:"S03",orders:38},{store_id:"S04",orders:18},{store_id:"S05",orders:26}], trend: "up" },
  { id: "F02", name: "上ハラミ", category: "焼肉", price: 1380, cost: 480, total_orders: 128, by_store: [{store_id:"S01",orders:30},{store_id:"S02",orders:25},{store_id:"S03",orders:32},{store_id:"S04",orders:16},{store_id:"S05",orders:25}], trend: "up" },
  { id: "F03", name: "タン塩", category: "焼肉", price: 980, cost: 350, total_orders: 165, by_store: [{store_id:"S01",orders:38},{store_id:"S02",orders:32},{store_id:"S03",orders:42},{store_id:"S04",orders:22},{store_id:"S05",orders:31}], trend: "flat" },
  { id: "F04", name: "石焼ビビンバ", category: "ご飯", price: 880, cost: 220, total_orders: 92, by_store: [{store_id:"S01",orders:20},{store_id:"S02",orders:18},{store_id:"S03",orders:22},{store_id:"S04",orders:14},{store_id:"S05",orders:18}], trend: "flat" },
  { id: "F05", name: "冷麺", category: "麺", price: 780, cost: 180, total_orders: 78, by_store: [{store_id:"S01",orders:18},{store_id:"S02",orders:15},{store_id:"S03",orders:20},{store_id:"S04",orders:10},{store_id:"S05",orders:15}], trend: "down" },
  { id: "F06", name: "ナムル盛り", category: "サイド", price: 480, cost: 95, total_orders: 110, by_store: [{store_id:"S01",orders:25},{store_id:"S02",orders:22},{store_id:"S03",orders:28},{store_id:"S04",orders:15},{store_id:"S05",orders:20}], trend: "flat" },
  { id: "F07", name: "チーズトッポギ", category: "サイド", price: 580, cost: 140, total_orders: 65, by_store: [{store_id:"S01",orders:18},{store_id:"S02",orders:12},{store_id:"S03",orders:15},{store_id:"S04",orders:8},{store_id:"S05",orders:12}], trend: "up" },
  { id: "F08", name: "生ビール(中)", category: "ドリンク", price: 550, cost: 165, total_orders: 320, by_store: [{store_id:"S01",orders:72},{store_id:"S02",orders:60},{store_id:"S03",orders:82},{store_id:"S04",orders:42},{store_id:"S05",orders:64}], trend: "flat" },
  { id: "F09", name: "ハイボール", category: "ドリンク", price: 450, cost: 90, total_orders: 245, by_store: [{store_id:"S01",orders:55},{store_id:"S02",orders:48},{store_id:"S03",orders:62},{store_id:"S04",orders:32},{store_id:"S05",orders:48}], trend: "up" },
  { id: "F10", name: "ホルモン盛り", category: "焼肉", price: 980, cost: 280, total_orders: 88, by_store: [{store_id:"S01",orders:22},{store_id:"S02",orders:15},{store_id:"S03",orders:25},{store_id:"S04",orders:10},{store_id:"S05",orders:16}], trend: "flat" },
];

// AIアラート
export interface Alert {
  id: string;
  store_id: string;
  store_name: string;
  type: "売上" | "原価" | "人員" | "廃棄" | "在庫";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  suggested_action: string;
  impact: string;
}

export const alerts: Alert[] = [
  {
    id: "A01", store_id: "S04", store_name: "自由が丘店", type: "原価", severity: "high",
    title: "原価率33.8%で目標超過（目標32%）",
    detail: "カルビの仕入値上昇(+8%)と廃棄増加が主因。今週の廃棄率は4.5%で全店最悪。",
    suggested_action: "カルビの仕入先を武蔵小杉店と同じ「肉の山崎」に変更(kg単価-¥80)。廃棄の多い副菜の仕込み量を20%削減。",
    impact: "原価率33.8%→31.5%（月間-¥52,000）",
  },
  {
    id: "A02", store_id: "S04", store_name: "自由が丘店", type: "人員", severity: "high",
    title: "金土の夜帯に常にホール1名不足",
    detail: "4月の金土は平均充足率82%。提供遅延クレームが月3件発生。近隣店舗からのヘルプも限界。",
    suggested_action: "金土19-23時の固定バイトを1名追加採用。時給¥1,250×4h×8日=月¥40,000の増加。",
    impact: "クレーム削減＋回転率改善で売上+¥60,000/月",
  },
  {
    id: "A03", store_id: "S02", store_name: "三軒茶屋店", type: "売上", severity: "medium",
    title: "水曜の客数が4週連続で減少",
    detail: "水曜の客数: 4週前58→今週42人(-28%)。近隣に新規オープンした韓国料理店への流出が推測される。",
    suggested_action: "水曜限定「炎の焼肉食べ放題¥3,980」を試験導入。食べ放題は原価率35%だが客数回復効果が見込める。",
    impact: "水曜客数42→55人（+¥58,000/週）",
  },
  {
    id: "A04", store_id: "S03", store_name: "武蔵小杉店", type: "売上", severity: "low",
    title: "チーズトッポギが全店で伸びている",
    detail: "今月+22%。武蔵小杉店が特に好調。SNSでの投稿が増えている可能性。",
    suggested_action: "全店でSNS映えを意識した盛り付けに統一。卓上POPを作成して全店配布。",
    impact: "全店売上+¥25,000/週",
  },
];

// 在庫（全店集計）
export interface InventoryItem {
  name: string;
  unit: string;
  stores: { store_id: string; stock: number; days_left: number; status: "ok" | "low" | "out" }[];
}

export const inventory: InventoryItem[] = [
  { name: "カルビ(上)", unit: "kg", stores: [
    { store_id: "S01", stock: 8, days_left: 2, status: "ok" },
    { store_id: "S02", stock: 5, days_left: 2, status: "ok" },
    { store_id: "S03", stock: 3, days_left: 1, status: "low" },
    { store_id: "S04", stock: 2, days_left: 1, status: "low" },
    { store_id: "S05", stock: 6, days_left: 2, status: "ok" },
  ]},
  { name: "ハラミ", unit: "kg", stores: [
    { store_id: "S01", stock: 6, days_left: 2, status: "ok" },
    { store_id: "S02", stock: 4, days_left: 2, status: "ok" },
    { store_id: "S03", stock: 7, days_left: 3, status: "ok" },
    { store_id: "S04", stock: 1, days_left: 0, status: "out" },
    { store_id: "S05", stock: 5, days_left: 2, status: "ok" },
  ]},
  { name: "タン", unit: "kg", stores: [
    { store_id: "S01", stock: 4, days_left: 1, status: "low" },
    { store_id: "S02", stock: 3, days_left: 1, status: "low" },
    { store_id: "S03", stock: 5, days_left: 2, status: "ok" },
    { store_id: "S04", stock: 2, days_left: 1, status: "low" },
    { store_id: "S05", stock: 4, days_left: 2, status: "ok" },
  ]},
  { name: "生ビール(樽)", unit: "樽", stores: [
    { store_id: "S01", stock: 2, days_left: 3, status: "ok" },
    { store_id: "S02", stock: 1, days_left: 1, status: "low" },
    { store_id: "S03", stock: 2, days_left: 2, status: "ok" },
    { store_id: "S04", stock: 1, days_left: 1, status: "low" },
    { store_id: "S05", stock: 2, days_left: 3, status: "ok" },
  ]},
  { name: "米", unit: "kg", stores: [
    { store_id: "S01", stock: 15, days_left: 4, status: "ok" },
    { store_id: "S02", stock: 12, days_left: 3, status: "ok" },
    { store_id: "S03", stock: 18, days_left: 5, status: "ok" },
    { store_id: "S04", stock: 8, days_left: 2, status: "ok" },
    { store_id: "S05", stock: 10, days_left: 3, status: "ok" },
  ]},
];
