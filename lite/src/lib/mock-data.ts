// =============================================================================
// AENTRO LITE — 個人飲食店向けモックデータ
// =============================================================================
// 設計根拠:
// - 28席居酒屋、夜営業のみ (17:00-24:00)
// - 平均滞在2h、回転率1.5〜2.0回/夜
// - 平日: 客数40-50人、金土: 55-70人
// - 客単価: ¥3,200前後 (ドリンク2-3杯 + フード3-4品)
// - 月商: 営業25日 × 平均¥170k = ¥4,250k
// - 原価率: 30-32% (飲食業平均)
// - 人件費率: 28-30%
// - 家賃/光熱/雑費: 約25% → 営業利益率 10-12%

// --- 店舗情報 ---
export const shop = {
  name: "居酒屋やまと",
  type: "居酒屋",
  seats: 28,
  address: "東京都世田谷区下北沢2-14-3",
  open_hours: "17:00 - 24:00",
  closed_day: "月曜定休",
  owner: "山田",
  plan: "LITE（月額¥9,800）",
};

// --- 今日のKPI (5/1 木曜、22:30時点) ---
export const todayKpi = {
  sales: 168400,
  sales_forecast: 162000,
  customers: 48,
  customers_forecast: 45,
  avg_ticket: 3508,
  avg_ticket_prev: 3420,
  food_cost_pct: 31.2,
  food_cost_target: 30.0,
  waste_yen: 3200,
  waste_prev_avg: 4100,
  labor_cost_pct: 29.1,
  labor_target: 30.0,
  reservations_tonight: 5,
  walk_in_pct: 65,
  updated_at: "22:30",
};

// --- メニュー（20品）---
// 原価は食材費のみ。居酒屋の業界平均原価率: フード30-35%、ドリンク20-25%
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
  { id: "M01", name: "刺身盛り合わせ(3種)", category: "刺身", price: 1580, cost: 580, today_orders: 10, avg_daily_orders: 8, trend: "up" },
  { id: "M02", name: "サーモン刺", category: "刺身", price: 780, cost: 270, today_orders: 6, avg_daily_orders: 7, trend: "flat" },
  { id: "M03", name: "鶏の唐揚げ(6個)", category: "揚げ物", price: 580, cost: 175, today_orders: 14, avg_daily_orders: 12, trend: "up" },
  { id: "M04", name: "ポテトフライ", category: "揚げ物", price: 380, cost: 120, today_orders: 9, avg_daily_orders: 10, trend: "flat" },
  { id: "M05", name: "枝豆", category: "おつまみ", price: 320, cost: 80, today_orders: 16, avg_daily_orders: 15, trend: "flat" },
  { id: "M06", name: "焼き鳥盛り(5本)", category: "焼き鳥", price: 880, cost: 290, today_orders: 11, avg_daily_orders: 9, trend: "up" },
  { id: "M07", name: "軟骨唐揚げ", category: "揚げ物", price: 480, cost: 145, today_orders: 5, avg_daily_orders: 6, trend: "flat" },
  { id: "M08", name: "だし巻き卵", category: "一品", price: 480, cost: 120, today_orders: 7, avg_daily_orders: 8, trend: "flat" },
  { id: "M09", name: "肉じゃが", category: "一品", price: 580, cost: 170, today_orders: 4, avg_daily_orders: 5, trend: "down" },
  { id: "M10", name: "冷やしトマト", category: "おつまみ", price: 380, cost: 110, today_orders: 4, avg_daily_orders: 3, trend: "up" },
  { id: "M11", name: "焼きおにぎり(2個)", category: "〆", price: 380, cost: 85, today_orders: 6, avg_daily_orders: 4, trend: "up" },
  { id: "M12", name: "お茶漬け", category: "〆", price: 480, cost: 100, today_orders: 3, avg_daily_orders: 4, trend: "flat" },
  { id: "M13", name: "生ビール(中)", category: "ドリンク", price: 550, cost: 165, today_orders: 28, avg_daily_orders: 26, trend: "up" },
  { id: "M14", name: "ハイボール", category: "ドリンク", price: 450, cost: 90, today_orders: 18, avg_daily_orders: 16, trend: "up" },
  { id: "M15", name: "レモンサワー", category: "ドリンク", price: 450, cost: 85, today_orders: 15, avg_daily_orders: 13, trend: "up" },
  { id: "M16", name: "日本酒(1合)", category: "ドリンク", price: 700, cost: 210, today_orders: 6, avg_daily_orders: 5, trend: "flat" },
  { id: "M17", name: "ソフトドリンク", category: "ドリンク", price: 300, cost: 45, today_orders: 4, avg_daily_orders: 4, trend: "flat" },
  { id: "M18", name: "鯖の塩焼き", category: "焼き物", price: 680, cost: 250, today_orders: 3, avg_daily_orders: 5, trend: "down" },
  { id: "M19", name: "豚キムチ", category: "一品", price: 550, cost: 160, today_orders: 5, avg_daily_orders: 5, trend: "flat" },
  { id: "M20", name: "バニラアイス", category: "デザート", price: 350, cost: 75, today_orders: 3, avg_daily_orders: 2, trend: "up" },
];

// --- 売上推移（過去30日）---
// 営業日は月曜休み=25日/月。平日¥155k-175k、金土¥195k-225k
export const dailySales = Array.from({ length: 30 }, (_, i) => {
  const day = 30 - i;
  const date = new Date(2026, 3, day + 1); // April
  const dow = date.getDay();
  const isFriSat = dow === 5 || dow === 6;
  const isSunday = dow === 0;
  const isMonday = dow === 1;
  const isTueWed = dow === 2 || dow === 3;
  const base = isMonday ? 0 : isFriSat ? 208000 : isSunday ? 145000 : isTueWed ? 148000 : 162000;
  const variance = ((day * 7 + 13) % 20 - 10) * 1500;
  const sales = isMonday ? 0 : base + variance;
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    dow: ["日","月","火","水","木","金","土"][dow],
    sales,
    customers: isMonday ? 0 : Math.round(sales / 3400),
    isClosed: isMonday,
  };
});

// --- 時間帯別売上（今日 5/1 木曜、22:30時点）---
export const hourlySales = [
  { hour: "17:00", sales: 8200, customers: 3 },
  { hour: "18:00", sales: 22400, customers: 7 },
  { hour: "19:00", sales: 38600, customers: 11 },
  { hour: "20:00", sales: 35200, customers: 10 },
  { hour: "21:00", sales: 28800, customers: 8 },
  { hour: "22:00", sales: 21400, customers: 6 },
  { hour: "23:00", sales: 13800, customers: 3 },
];

// --- シフト（今週）---
export interface ShiftSlot {
  name: string;
  role: "社員" | "バイト";
  hourly_rate: number;
  slots: { date: string; start: string; end: string }[];
}

export const staff: ShiftSlot[] = [
  { name: "山田(店長)", role: "社員", hourly_rate: 0, slots: [
    { date: "5/1", start: "16:00", end: "24:00" },
    { date: "5/2", start: "16:00", end: "24:00" },
    { date: "5/3", start: "16:00", end: "24:00" },
    { date: "5/4", start: "16:00", end: "24:00" },
    { date: "5/6", start: "16:00", end: "24:00" },
    { date: "5/7", start: "16:00", end: "24:00" },
  ]},
  { name: "佐藤", role: "社員", hourly_rate: 1400, slots: [
    { date: "5/1", start: "17:00", end: "24:00" },
    { date: "5/2", start: "17:00", end: "24:00" },
    { date: "5/4", start: "17:00", end: "24:00" },
    { date: "5/6", start: "17:00", end: "24:00" },
    { date: "5/7", start: "17:00", end: "24:00" },
  ]},
  { name: "田中", role: "バイト", hourly_rate: 1200, slots: [
    { date: "5/1", start: "18:00", end: "22:00" },
    { date: "5/3", start: "18:00", end: "23:00" },
    { date: "5/4", start: "18:00", end: "23:00" },
    { date: "5/7", start: "18:00", end: "22:00" },
  ]},
  { name: "鈴木", role: "バイト", hourly_rate: 1200, slots: [
    { date: "5/2", start: "18:00", end: "23:00" },
    { date: "5/3", start: "17:00", end: "23:00" },
    { date: "5/6", start: "18:00", end: "23:00" },
  ]},
  { name: "小林", role: "バイト", hourly_rate: 1150, slots: [
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
  supplier: string | null;
}

export const inventory: InventoryItem[] = [
  { name: "鶏もも肉", category: "肉", stock: "2.5kg", days_left: 1, status: "low", order_suggestion: "明日朝までに5kg発注", supplier: "丸一食品" },
  { name: "サーモン(冊)", category: "魚", stock: "4冊", days_left: 2, status: "ok", order_suggestion: null, supplier: null },
  { name: "鯖", category: "魚", stock: "1尾", days_left: 0, status: "out", order_suggestion: "本日中に3尾発注", supplier: "築地川勝" },
  { name: "豚バラ", category: "肉", stock: "1.8kg", days_left: 2, status: "ok", order_suggestion: null, supplier: null },
  { name: "卵", category: "その他", stock: "12個", days_left: 1, status: "low", order_suggestion: "明日30個発注", supplier: "丸一食品" },
  { name: "トマト", category: "野菜", stock: "8個", days_left: 3, status: "ok", order_suggestion: null, supplier: null },
  { name: "レモン", category: "果物", stock: "3個", days_left: 1, status: "low", order_suggestion: "金土の需要増。10個発注推奨", supplier: "八百勝" },
  { name: "枝豆(冷凍)", category: "冷凍", stock: "2袋", days_left: 5, status: "ok", order_suggestion: null, supplier: null },
  { name: "米(コシヒカリ)", category: "穀物", stock: "8kg", days_left: 3, status: "ok", order_suggestion: null, supplier: null },
  { name: "生ビール(樽)", category: "ドリンク", stock: "残1/3樽", days_left: 1, status: "low", order_suggestion: "金曜までに2樽発注", supplier: "アサヒ営業" },
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
    id: "adv-1", type: "売上", title: "刺身盛りが好調 — 金土の仕入れ増を推奨",
    detail: "今週の刺身盛り合わせは1日平均10食で、先週(8食)比+25%。金土はさらに伸びる傾向があります。サーモン・まぐろ・ぶりの仕入れ量を通常の1.3倍に調整すると、品切れによる機会損失(推定¥4,700/日)を防げます。",
    impact: "週末2日で+¥9,400の売上確保", priority: "high", actionable: true,
  },
  {
    id: "adv-2", type: "コスト", title: "鯖の仕入値上昇 — 価格改定を検討",
    detail: "鯖の仕入値が4月から+15%(¥220→¥250/尾)。現在の販売価格¥680では原価率36.8%で、フード目標30%を大幅超過。¥750に改定するか、秋鮭の塩焼き(原価¥200、想定売価¥680)への差替えを推奨。",
    impact: "改定なら月間原価-¥4,500", priority: "medium", actionable: true,
  },
  {
    id: "adv-3", type: "集客", title: "火・水の客数が弱い — ハッピーアワーを提案",
    detail: "4月の火・水曜の平均客数は42人で、先月(48人)比-12%。近隣「酒場きたざわ」が火曜17-19時ドリンク半額を開始した時期と一致。対抗案: 火・水17-19時に生ビール¥350(通常¥550)のハッピーアワーを実施。原価¥165なので¥350でも利益が出ます。",
    impact: "火水の客数+6人/日 → 月+¥80,000", priority: "high", actionable: true,
  },
  {
    id: "adv-4", type: "シフト", title: "明日金曜19-21時のホールが1名足りない",
    detail: "明日金曜の予約は6組(18名)。19-21時のピーク帯にホール2名+キッチン2名の4名体制ですが、過去金曜のデータでは来店ピーク時に平均5.2名必要。小林さん(19:00〜可)に追加シフトを打診してください。",
    impact: "提供遅延・クレームの回避", priority: "high", actionable: true,
  },
  {
    id: "adv-5", type: "発注", title: "レモンが金土の需要に不足",
    detail: "レモンサワーが4月は1日平均15杯(前月13杯から+15%)。レモン1個で約5杯分。現在3個=15杯分で金曜1日分しかありません。金土2日で30杯=6個必要。+7個(予備含む)を明日朝までに発注してください。",
    impact: "欠品による売上損失¥6,750を回避", priority: "medium", actionable: true,
  },
  {
    id: "adv-6", type: "売上", title: "〆の焼きおにぎりが伸びている",
    detail: "22時以降の焼きおにぎり注文が4月後半から平均+50%(4食→6食/日)。卓上POPに「〆の一品に」と追加すると、23時台の追加注文が見込めます。焼きおにぎりは原価率22%で利益率が高いメニューです。",
    impact: "深夜帯の客単価+¥200/人", priority: "low", actionable: true,
  },
];

// --- 月次サマリー ---
// 4月: 営業25日(月曜5回休み)
// 平日17日 × ¥162k = ¥2,754k + 金土8日 × ¥208k = ¥1,664k = 合計¥4,418k
// 実績はやや上振れで¥4,480k
export const monthlySummary = {
  sales: 4_480_000,
  sales_prev: 4_320_000,
  customers: 1_280,
  customers_prev: 1_240,
  avg_ticket: 3_500,
  food_cost_pct: 31.0,
  labor_cost_pct: 28.8,
  rent_and_fixed: 1_075_000,  // 家賃65万+光熱15万+雑費17.5万
  profit_estimate: 430_000,   // 売上448万 - 原価139万 - 人件費129万 - 固定費107.5万 = 約43万
  profit_prev: 380_000,
  best_menu: "鶏の唐揚げ",
  worst_trend: "鯖の塩焼き",
  busiest_day: "土曜",
  slowest_day: "火曜",
};
