// =============================================================================
// AENTRO LITE — 個人飲食店向けモックデータ
// =============================================================================

// --- 店舗情報 ---
export const shop = {
  name: "居酒屋やまと",
  type: "居酒屋",
  seats: 28,
  address: "東京都世田谷区下北沢2-14-3",
  open_hours: "17:00 - 24:00",
  closed_day: "月曜",
  owner: "山田",
  plan: "LITE（月額¥9,800）",
};

// --- 今日のKPI ---
export const todayKpi = {
  sales: 184200,
  sales_forecast: 172000,
  customers: 62,
  customers_forecast: 58,
  avg_ticket: 2971,
  avg_ticket_prev: 2880,
  food_cost_pct: 31.2,
  food_cost_target: 30.0,
  waste_yen: 4800,
  waste_prev_avg: 6200,
  labor_cost_pct: 28.5,
  labor_target: 30.0,
  reservations_tonight: 8,
  walk_in_estimate: 15,
  updated_at: "15:45",
};

// --- メニュー（20品） ---
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  today_orders: number;
  avg_daily_orders: number;
  trend: "up" | "flat" | "down";
}

export const menuItems: MenuItem[] = [
  { id: "M01", name: "刺身盛り合わせ", category: "刺身", price: 1580, cost: 620, today_orders: 14, avg_daily_orders: 11, trend: "up" },
  { id: "M02", name: "サーモン刺", category: "刺身", price: 780, cost: 280, today_orders: 8, avg_daily_orders: 9, trend: "flat" },
  { id: "M03", name: "鶏の唐揚げ", category: "揚げ物", price: 580, cost: 140, today_orders: 18, avg_daily_orders: 16, trend: "up" },
  { id: "M04", name: "ポテトフライ", category: "揚げ物", price: 380, cost: 65, today_orders: 12, avg_daily_orders: 13, trend: "flat" },
  { id: "M05", name: "枝豆", category: "おつまみ", price: 320, cost: 45, today_orders: 22, avg_daily_orders: 20, trend: "flat" },
  { id: "M06", name: "焼き鳥盛り(5本)", category: "焼き鳥", price: 880, cost: 260, today_orders: 15, avg_daily_orders: 12, trend: "up" },
  { id: "M07", name: "軟骨唐揚げ", category: "揚げ物", price: 480, cost: 110, today_orders: 7, avg_daily_orders: 8, trend: "flat" },
  { id: "M08", name: "だし巻き卵", category: "一品", price: 480, cost: 90, today_orders: 9, avg_daily_orders: 10, trend: "flat" },
  { id: "M09", name: "肉じゃが", category: "一品", price: 580, cost: 150, today_orders: 6, avg_daily_orders: 7, trend: "down" },
  { id: "M10", name: "冷やしトマト", category: "おつまみ", price: 380, cost: 80, today_orders: 5, avg_daily_orders: 4, trend: "up" },
  { id: "M11", name: "焼きおにぎり", category: "〆", price: 280, cost: 40, today_orders: 8, avg_daily_orders: 6, trend: "up" },
  { id: "M12", name: "お茶漬け", category: "〆", price: 380, cost: 55, today_orders: 4, avg_daily_orders: 5, trend: "flat" },
  { id: "M13", name: "生ビール", category: "ドリンク", price: 520, cost: 130, today_orders: 38, avg_daily_orders: 35, trend: "up" },
  { id: "M14", name: "ハイボール", category: "ドリンク", price: 420, cost: 70, today_orders: 25, avg_daily_orders: 22, trend: "up" },
  { id: "M15", name: "レモンサワー", category: "ドリンク", price: 420, cost: 65, today_orders: 20, avg_daily_orders: 18, trend: "up" },
  { id: "M16", name: "日本酒(1合)", category: "ドリンク", price: 680, cost: 200, today_orders: 8, avg_daily_orders: 7, trend: "flat" },
  { id: "M17", name: "ソフトドリンク", category: "ドリンク", price: 280, cost: 30, today_orders: 6, avg_daily_orders: 5, trend: "flat" },
  { id: "M18", name: "鯖の塩焼き", category: "焼き物", price: 680, cost: 220, today_orders: 5, avg_daily_orders: 6, trend: "down" },
  { id: "M19", name: "豚キムチ", category: "一品", price: 520, cost: 130, today_orders: 7, avg_daily_orders: 6, trend: "up" },
  { id: "M20", name: "アイスクリーム", category: "デザート", price: 320, cost: 60, today_orders: 4, avg_daily_orders: 3, trend: "up" },
];

// --- 売上推移（過去30日） ---
export const dailySales = Array.from({ length: 30 }, (_, i) => {
  const day = 30 - i;
  const date = new Date(2026, 3, day + 1); // April
  const dow = date.getDay();
  const isWeekend = dow === 5 || dow === 6; // 金土が繁忙
  const isMonday = dow === 1; // 定休
  const base = isMonday ? 0 : isWeekend ? 210000 : 165000;
  const variance = ((day * 7 + 13) % 20 - 10) * 2000;
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    dow: ["日","月","火","水","木","金","土"][dow],
    sales: isMonday ? 0 : base + variance,
    customers: isMonday ? 0 : Math.round((base + variance) / 2900),
    isClosed: isMonday,
  };
});

// --- 時間帯別売上（今日） ---
export const hourlySales = [
  { hour: "17:00", sales: 12400, customers: 4 },
  { hour: "18:00", sales: 28600, customers: 10 },
  { hour: "19:00", sales: 42100, customers: 14 },
  { hour: "20:00", sales: 38500, customers: 12 },
  { hour: "21:00", sales: 31200, customers: 10 },
  { hour: "22:00", sales: 18900, customers: 7 },
  { hour: "23:00", sales: 12500, customers: 5 },
];

// --- シフト（今週） ---
export interface ShiftSlot {
  name: string;
  role: "社員" | "バイト";
  slots: { date: string; start: string; end: string }[];
}

export const staff: ShiftSlot[] = [
  { name: "山田(店長)", role: "社員", slots: [
    { date: "5/1", start: "16:00", end: "24:00" },
    { date: "5/2", start: "16:00", end: "24:00" },
    { date: "5/3", start: "16:00", end: "24:00" },
    { date: "5/4", start: "16:00", end: "24:00" },
    { date: "5/6", start: "16:00", end: "24:00" },
    { date: "5/7", start: "16:00", end: "24:00" },
  ]},
  { name: "佐藤", role: "社員", slots: [
    { date: "5/1", start: "17:00", end: "24:00" },
    { date: "5/2", start: "17:00", end: "24:00" },
    { date: "5/4", start: "17:00", end: "24:00" },
    { date: "5/6", start: "17:00", end: "24:00" },
    { date: "5/7", start: "17:00", end: "24:00" },
  ]},
  { name: "田中", role: "バイト", slots: [
    { date: "5/1", start: "18:00", end: "22:00" },
    { date: "5/3", start: "18:00", end: "23:00" },
    { date: "5/4", start: "18:00", end: "23:00" },
    { date: "5/7", start: "18:00", end: "22:00" },
  ]},
  { name: "鈴木", role: "バイト", slots: [
    { date: "5/2", start: "18:00", end: "23:00" },
    { date: "5/3", start: "17:00", end: "22:00" },
    { date: "5/6", start: "18:00", end: "23:00" },
  ]},
  { name: "小林", role: "バイト", slots: [
    { date: "5/1", start: "19:00", end: "24:00" },
    { date: "5/4", start: "19:00", end: "24:00" },
    { date: "5/7", start: "19:00", end: "24:00" },
  ]},
];

export const weekDates = ["5/1","5/2","5/3","5/4","5/5","5/6","5/7"];
export const weekDow = ["木","金","土","日","月","火","水"];

// --- 食材在庫 & 発注アラート ---
export interface InventoryItem {
  name: string;
  category: string;
  stock: string;
  days_left: number;
  status: "ok" | "low" | "out";
  order_suggestion: string | null;
}

export const inventory: InventoryItem[] = [
  { name: "鶏もも肉", category: "肉", stock: "2.5kg", days_left: 1, status: "low", order_suggestion: "明日朝までに5kg発注" },
  { name: "サーモン(冊)", category: "魚", stock: "4冊", days_left: 2, status: "ok", order_suggestion: null },
  { name: "鯖", category: "魚", stock: "1尾", days_left: 0, status: "out", order_suggestion: "本日中に3尾発注" },
  { name: "豚バラ", category: "肉", stock: "1.8kg", days_left: 2, status: "ok", order_suggestion: null },
  { name: "卵", category: "その他", stock: "12個", days_left: 1, status: "low", order_suggestion: "明日30個発注" },
  { name: "トマト", category: "野菜", stock: "8個", days_left: 3, status: "ok", order_suggestion: null },
  { name: "レモン", category: "野菜", stock: "3個", days_left: 1, status: "low", order_suggestion: "金土の需要増。10個発注推奨" },
  { name: "枝豆(冷凍)", category: "冷凍", stock: "2袋", days_left: 5, status: "ok", order_suggestion: null },
  { name: "米", category: "穀物", stock: "8kg", days_left: 3, status: "ok", order_suggestion: null },
  { name: "生ビール(樽)", category: "ドリンク", stock: "1樽", days_left: 1, status: "low", order_suggestion: "金曜までに2樽発注" },
];

// --- AIアドバイス ---
export interface Advice {
  id: string;
  type: "売上" | "コスト" | "集客" | "シフト" | "発注";
  title: string;
  detail: string;
  impact: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
}

export const aiAdvice: Advice[] = [
  {
    id: "adv-1", type: "売上", title: "刺身盛りが好調。おすすめ表示を継続",
    detail: "刺身盛り合わせが今週+27%。金土はさらに伸びる傾向。仕入れ量を1.3倍に調整すると機会損失を防げます。",
    impact: "週末売上+¥8,000〜12,000", priority: "high", actionable: true,
  },
  {
    id: "adv-2", type: "コスト", title: "鯖の塩焼きの原価率が上昇中",
    detail: "鯖の仕入値が先月比+15%。注文数は減少傾向。価格改定(¥680→¥750)または代替メニューの検討を推奨。",
    impact: "月間原価-¥4,500", priority: "medium", actionable: true,
  },
  {
    id: "adv-3", type: "集客", title: "火・水曜の客数が先月比-12%",
    detail: "平日前半の集客が弱い。近隣の競合が火曜ハッピーアワーを開始した影響の可能性。対抗施策を検討。",
    impact: "平日売上+¥15,000/週", priority: "high", actionable: true,
  },
  {
    id: "adv-4", type: "シフト", title: "金曜19-21時が人手不足の見込み",
    detail: "予約8組に対してホール2名体制。過去データから3名必要。小林さんに追加シフトを打診してください。",
    impact: "提供遅延の回避", priority: "high", actionable: true,
  },
  {
    id: "adv-5", type: "発注", title: "レモンの在庫が金土の需要に不足",
    detail: "レモンサワーが好調(+11%)。現在3個で金土の推定消費は15個。早めに発注してください。",
    impact: "欠品によるドリンク売上損失を回避", priority: "medium", actionable: true,
  },
  {
    id: "adv-6", type: "売上", title: "焼きおにぎりの〆注文が増加傾向",
    detail: "22時以降の焼きおにぎり注文が+33%。夜帯の〆メニューとしてPOP掲示で更に伸ばせる可能性。",
    impact: "深夜帯客単価+¥200", priority: "low", actionable: true,
  },
];

// --- 月次サマリー ---
export const monthlySummary = {
  sales: 4_820_000,
  sales_prev: 4_650_000,
  customers: 1_620,
  customers_prev: 1_580,
  avg_ticket: 2_975,
  food_cost_pct: 30.8,
  labor_cost_pct: 28.2,
  profit_estimate: 680_000,
  profit_prev: 620_000,
  best_menu: "鶏の唐揚げ",
  worst_trend: "鯖の塩焼き",
  busiest_day: "土曜",
  slowest_day: "火曜",
};
