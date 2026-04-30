// Mock data: CoCo Spice (50-store curry chain)

export type Role = "owner" | "area" | "manager";

export const company = {
  name: "株式会社ココスパイス",
  brand: "CoCo Spice",
  totalStores: 48,
  areas: ["東京23区", "東京多摩", "神奈川", "埼玉", "千葉"],
};

export const roles: { id: Role; label: string; name: string; store?: string }[] = [
  { id: "owner", label: "経営", name: "山本 誠一" },
  { id: "area", label: "エリア", name: "中村 恵" },
  { id: "manager", label: "店長", name: "田中 太郎", store: "渋谷センター街店" },
];

export const areaData = [
  { id: "tokyo23", name: "東京23区", stores: 18, todaySales: 8420000, target: 9900000, monthlySales: 245000000, costRate: 29.8, laborRate: 27.2, waste: 1820000, wasteChange: -280000 },
  { id: "tama", name: "東京多摩", stores: 10, todaySales: 3980000, target: 4500000, monthlySales: 118000000, costRate: 30.5, laborRate: 28.1, waste: 1050000, wasteChange: -120000 },
  { id: "kanagawa", name: "神奈川", stores: 9, todaySales: 3650000, target: 4050000, monthlySales: 108000000, costRate: 31.2, laborRate: 28.8, waste: 1180000, wasteChange: -95000 },
  { id: "saitama", name: "埼玉", stores: 6, todaySales: 2280000, target: 2700000, monthlySales: 68000000, costRate: 32.1, laborRate: 29.5, waste: 920000, wasteChange: 45000 },
  { id: "chiba", name: "千葉", stores: 5, todaySales: 1870000, target: 2250000, monthlySales: 56000000, costRate: 31.8, laborRate: 30.2, waste: 780000, wasteChange: 28000 },
];

export const stores = [
  { id: "1", name: "渋谷センター街店", area: "東京23区", seats: 38, todaySales: 582000, yesterdaySales: 548000, targetSales: 620000, customers: 148, avgSpend: 3932, monthlySales: 17200000, monthlyTarget: 18600000, costRate: 29.2, costRateTarget: 30.0, laborCostRate: 26.8, wasteAmount: 98000, wasteReduction: 32000 },
  { id: "2", name: "新宿西口店", area: "東京23区", seats: 42, todaySales: 628000, yesterdaySales: 612000, targetSales: 680000, customers: 162, avgSpend: 3876, monthlySales: 18800000, monthlyTarget: 20400000, costRate: 28.8, costRateTarget: 30.0, laborCostRate: 25.9, wasteAmount: 82000, wasteReduction: 48000 },
  { id: "3", name: "池袋東口店", area: "東京23区", seats: 36, todaySales: 468000, yesterdaySales: 492000, targetSales: 540000, customers: 118, avgSpend: 3966, monthlySales: 14200000, monthlyTarget: 16200000, costRate: 31.5, costRateTarget: 30.0, laborCostRate: 29.8, wasteAmount: 152000, wasteReduction: -18000 },
  { id: "4", name: "吉祥寺店", area: "東京多摩", seats: 32, todaySales: 412000, yesterdaySales: 388000, targetSales: 450000, customers: 105, avgSpend: 3923, monthlySales: 12400000, monthlyTarget: 13500000, costRate: 30.2, costRateTarget: 30.0, laborCostRate: 27.5, wasteAmount: 95000, wasteReduction: 22000 },
  { id: "5", name: "横浜駅西口店", area: "神奈川", seats: 40, todaySales: 498000, yesterdaySales: 475000, targetSales: 540000, customers: 128, avgSpend: 3890, monthlySales: 14800000, monthlyTarget: 16200000, costRate: 30.8, costRateTarget: 30.0, laborCostRate: 28.2, wasteAmount: 118000, wasteReduction: 15000 },
  { id: "6", name: "大宮店", area: "埼玉", seats: 34, todaySales: 385000, yesterdaySales: 398000, targetSales: 450000, customers: 98, avgSpend: 3928, monthlySales: 11500000, monthlyTarget: 13500000, costRate: 32.5, costRateTarget: 30.0, laborCostRate: 30.1, wasteAmount: 185000, wasteReduction: -25000 },
];

export const todayAlerts = [
  { id: "1", storeId: "1", type: "stock" as const, severity: "warning" as const, message: "チキンカツ用の鶏むね、あと12食ぶん", detail: "今日の見込みだと20食は出ます", time: "14:23", icon: "🍗" },
  { id: "2", storeId: "2", type: "sales" as const, severity: "info" as const, message: "ランチ売上が先週比+18%", detail: "限定カレーが好調", time: "13:45", icon: "📈" },
  { id: "3", storeId: "3", type: "staff" as const, severity: "danger" as const, message: "ディナー帯ホール1名不足", detail: "18:00-22:00のシフトに空き", time: "15:02", icon: "⚠" },
  { id: "4", storeId: "1", type: "waste" as const, severity: "warning" as const, message: "サラダ廃棄が通常の2.3倍", detail: "セットのサラダ残しが増加", time: "12:30", icon: "📊" },
];

export const monthlyPL = {
  sales: 595000000,
  salesLastYear: 542000000,
  costOfGoods: 178500000,
  laborCost: 166600000,
  rent: 89250000,
  utilities: 23800000,
  depreciation: 17850000,
  other: 29750000,
  ebitda: 107050000,
  ebitdaLastYear: 89400000,
  ebitdaBeforeAI: 82000000,
  profit: 89200000,
  profitLastYear: 74800000,
};

export const ebitdaImpact = {
  totalImprovement: 25050000,
  breakdown: [
    { label: "食材ロス削減", amount: 8400000, pct: 33.5 },
    { label: "需要予測による仕入れ最適化", amount: 6200000, pct: 24.8 },
    { label: "シフト最適化(人件費削減)", amount: 5800000, pct: 23.1 },
    { label: "ダイナミックプライシング効果", amount: 2850000, pct: 11.4 },
    { label: "メニュー改廃による粗利改善", amount: 1800000, pct: 7.2 },
  ],
  monthlyTrend: [
    { month: "11月", ebitda: 82000000, aiContribution: 0 },
    { month: "12月", ebitda: 98000000, aiContribution: 4200000 },
    { month: "1月", ebitda: 78000000, aiContribution: 8500000 },
    { month: "2月", ebitda: 85000000, aiContribution: 12800000 },
    { month: "3月", ebitda: 95000000, aiContribution: 18200000 },
    { month: "4月", ebitda: 107050000, aiContribution: 25050000 },
  ],
  roi: { monthlyCost: 1500000, monthlyReturn: 25050000, roiMultiple: 16.7 },
};

export const monthlyTrendByArea = [
  { month: "11月", 東京23区: 228000000, 東京多摩: 108000000, 神奈川: 98000000, 埼玉: 62000000, 千葉: 52000000 },
  { month: "12月", 東京23区: 278000000, 東京多摩: 132000000, 神奈川: 118000000, 埼玉: 75000000, 千葉: 62000000 },
  { month: "1月", 東京23区: 212000000, 東京多摩: 102000000, 神奈川: 92000000, 埼玉: 58000000, 千葉: 48000000 },
  { month: "2月", 東京23区: 225000000, 東京多摩: 108000000, 神奈川: 98000000, 埼玉: 60000000, 千葉: 50000000 },
  { month: "3月", 東京23区: 238000000, 東京多摩: 115000000, 神奈川: 105000000, 埼玉: 65000000, 千葉: 54000000 },
  { month: "4月", 東京23区: 245000000, 東京多摩: 118000000, 神奈川: 108000000, 埼玉: 68000000, 千葉: 56000000 },
];

export const storeIssues = [
  { storeId: "3", store: "池袋東口店", type: "cost" as const, message: "原価率 31.5% (目標+1.5pt)", severity: "danger" as const },
  { storeId: "6", store: "大宮店", type: "cost" as const, message: "原価率 32.5% (目標+2.5pt)", severity: "danger" as const },
  { storeId: "6", store: "大宮店", type: "waste" as const, message: "食材ロスが前月比+25,000円", severity: "danger" as const },
  { storeId: "3", store: "池袋東口店", type: "labor" as const, message: "人件費率 29.8% (高水準)", severity: "warning" as const },
  { storeId: "6", store: "大宮店", type: "labor" as const, message: "人件費率 30.1% (高水準)", severity: "warning" as const },
];

export const menus = [
  { id: "1", name: "チキンカツカレー", price: 920, cost: 265, category: "カレー", monthlySales: 4200, monthlyProfit: 2751000, tag: "主役" as const },
  { id: "2", name: "ビーフカレー", price: 1080, cost: 380, category: "カレー", monthlySales: 3600, monthlyProfit: 2520000, tag: "主役" as const },
  { id: "3", name: "野菜カレー", price: 850, cost: 220, category: "カレー", monthlySales: 2800, monthlyProfit: 1764000, tag: "主役" as const },
  { id: "4", name: "シーフードカレー", price: 1180, cost: 520, category: "カレー", monthlySales: 1200, monthlyProfit: 792000, tag: "隠れた優等生" as const },
  { id: "5", name: "キーマカレー", price: 880, cost: 240, category: "カレー", monthlySales: 3200, monthlyProfit: 2048000, tag: "主役" as const },
  { id: "6", name: "ナン", price: 280, cost: 45, category: "サイド", monthlySales: 5800, monthlyProfit: 1363000, tag: "働きもの" as const },
  { id: "7", name: "タンドリーチキン", price: 480, cost: 165, category: "サイド", monthlySales: 2100, monthlyProfit: 661500, tag: "主役" as const },
  { id: "8", name: "ラッシー", price: 350, cost: 80, category: "ドリンク", monthlySales: 3400, monthlyProfit: 918000, tag: "主役" as const },
  { id: "9", name: "グリーンサラダ", price: 380, cost: 160, category: "サイド", monthlySales: 420, monthlyProfit: 92400, tag: "退場候補" as const },
  { id: "10", name: "マンゴープリン", price: 320, cost: 180, category: "デザート", monthlySales: 280, monthlyProfit: 39200, tag: "退場候補" as const },
];

export const staff = [
  { id: "1", name: "田中 太郎", role: "店長", store: "渋谷センター街店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン", "発注"], avatar: "田" },
  { id: "2", name: "佐藤 花子", role: "副店長", store: "渋谷センター街店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン"], avatar: "佐" },
  { id: "3", name: "鈴木 一郎", role: "クルー", store: "渋谷センター街店", type: "アルバイト", hourlyRate: 1250, skills: ["ホール"], avatar: "鈴" },
  { id: "4", name: "高橋 美咲", role: "クルー", store: "渋谷センター街店", type: "アルバイト", hourlyRate: 1250, skills: ["キッチン"], avatar: "高" },
  { id: "5", name: "山田 健太", role: "クルー", store: "渋谷センター街店", type: "アルバイト", hourlyRate: 1200, skills: ["ホール", "キッチン"], avatar: "山" },
];

export const shiftSchedule = [
  { staffId: "1", name: "田中 太郎", shifts: [
    { day: "月", start: "10:00", end: "19:00" }, { day: "火", start: "10:00", end: "19:00" },
    { day: "水", start: null, end: null }, { day: "木", start: "10:00", end: "19:00" },
    { day: "金", start: "10:00", end: "22:00" }, { day: "土", start: "10:00", end: "22:00" },
    { day: "日", start: null, end: null },
  ]},
  { staffId: "3", name: "鈴木 一郎", shifts: [
    { day: "月", start: "17:00", end: "22:00" }, { day: "火", start: null, end: null },
    { day: "水", start: "17:00", end: "22:00" }, { day: "木", start: null, end: null },
    { day: "金", start: "17:00", end: "23:00" }, { day: "土", start: "11:00", end: "22:00" },
    { day: "日", start: "11:00", end: "18:00" },
  ]},
  { staffId: "4", name: "高橋 美咲", shifts: [
    { day: "月", start: null, end: null }, { day: "火", start: "11:00", end: "15:00" },
    { day: "水", start: "11:00", end: "15:00" }, { day: "木", start: "17:00", end: "22:00" },
    { day: "金", start: "17:00", end: "23:00" }, { day: "土", start: null, end: null },
    { day: "日", start: "11:00", end: "18:00" },
  ]},
  { staffId: "5", name: "山田 健太", shifts: [
    { day: "月", start: "11:00", end: "15:00" }, { day: "火", start: "17:00", end: "22:00" },
    { day: "水", start: null, end: null }, { day: "木", start: "11:00", end: "15:00" },
    { day: "金", start: null, end: null }, { day: "土", start: "11:00", end: "22:00" },
    { day: "日", start: "11:00", end: "22:00" },
  ]},
];

export const ingredients = [
  { id: "1", name: "鶏むね肉", unit: "kg", currentStock: 4.2, requiredToday: 12.5, price: 480, supplier: "丸紅フーズ" },
  { id: "2", name: "玉ねぎ", unit: "kg", currentStock: 8, requiredToday: 25, price: 120, supplier: "青果市場直送" },
  { id: "3", name: "カレールー(自家製)", unit: "L", currentStock: 15, requiredToday: 22, price: 850, supplier: "自社製造" },
  { id: "4", name: "牛肉(肩ロース)", unit: "kg", currentStock: 3.5, requiredToday: 8.2, price: 1280, supplier: "丸紅フーズ" },
  { id: "5", name: "米(あきたこまち)", unit: "kg", currentStock: 35, requiredToday: 28, price: 420, supplier: "米穀卸 佐藤" },
  { id: "6", name: "ナン生地", unit: "個", currentStock: 45, requiredToday: 80, price: 35, supplier: "自社製造" },
];

export const purchaseOrders = [
  { id: "1", supplier: "丸紅フーズ", items: ["鶏むね 10kg", "牛肩ロース 6kg"], total: 12480, status: "確認待ち" as const, deadline: "17:00" },
  { id: "2", supplier: "青果市場直送", items: ["玉ねぎ 20kg", "にんじん 8kg", "じゃがいも 10kg"], total: 5200, status: "注文ずみ" as const, deadline: "15:00" },
];

export const hourlySales = [
  { hour: "11", sales: 68400, customers: 18 }, { hour: "12", sales: 142800, customers: 38 },
  { hour: "13", sales: 112200, customers: 29 }, { hour: "14", sales: 38400, customers: 10 },
  { hour: "15", sales: 22800, customers: 6 }, { hour: "16", sales: 15200, customers: 4 },
  { hour: "17", sales: 45600, customers: 12 }, { hour: "18", sales: 82400, customers: 21 },
  { hour: "19", sales: 98800, customers: 26 }, { hour: "20", sales: 72000, customers: 18 },
];

export const weeklyTrend = [
  { day: "月", sales: 485000 }, { day: "火", sales: 462000 }, { day: "水", sales: 498000 },
  { day: "木", sales: 521000 }, { day: "金", sales: 645000 }, { day: "土", sales: 712000 },
  { day: "日", sales: 568000 },
];

export const notifications = [
  { id: "1", time: "06:00", type: "forecast", title: "需要予測更新", body: "渋谷センター街店: 148名 / 約58万円見込み", read: true },
  { id: "2", time: "14:23", type: "stock", title: "在庫警告", body: "渋谷センター街店: 鶏むね残12食分", read: false },
  { id: "3", time: "13:45", type: "sales", title: "売上好調", body: "新宿西口店: 先週比+18%", read: true },
  { id: "4", time: "15:02", type: "staff", title: "シフト不足", body: "池袋東口店: ディナー帯ホール1名不足", read: false },
  { id: "5", time: "12:30", type: "waste", title: "廃棄警告", body: "渋谷センター街店: サラダ廃棄2.3倍", read: false },
];

// #5 Customer / Repeat Analysis
export const customerData = {
  totalMonthly: 42800,
  newCustomers: 8560,
  repeaters: 34240,
  repeatRate: 80.0,
  repeatRateLastMonth: 78.2,
  avgVisitsPerRepeater: 3.2,
  ltvAvg: 48600,
  ltvTrend: [
    { month: "11月", ltv: 42000 }, { month: "12月", ltv: 45200 }, { month: "1月", ltv: 44800 },
    { month: "2月", ltv: 46100 }, { month: "3月", ltv: 47500 }, { month: "4月", ltv: 48600 },
  ],
  segments: [
    { label: "ヘビーユーザー(月4回+)", pct: 12, avgSpend: 4800, count: 5136 },
    { label: "レギュラー(月2-3回)", pct: 28, avgSpend: 4200, count: 11984 },
    { label: "ライト(月1回)", pct: 40, avgSpend: 3600, count: 17120 },
    { label: "新規", pct: 20, avgSpend: 3400, count: 8560 },
  ],
  storeRepeatRanking: [
    { store: "新宿西口店", rate: 84.2 },
    { store: "渋谷センター街店", rate: 82.1 },
    { store: "吉祥寺店", rate: 80.5 },
    { store: "横浜駅西口店", rate: 78.8 },
    { store: "池袋東口店", rate: 74.2 },
    { store: "大宮店", rate: 71.8 },
  ],
};

// #6 Delivery / Takeout Channel
export const deliveryData = {
  channels: [
    { name: "イートイン", sales: 385000000, pct: 64.7, margin: 22.5, orders: 128000 },
    { name: "テイクアウト", sales: 118000000, pct: 19.8, margin: 18.8, orders: 48000 },
    { name: "UberEats", sales: 52000000, pct: 8.7, margin: 8.2, orders: 22000, commission: 35 },
    { name: "出前館", sales: 28000000, pct: 4.7, margin: 6.5, orders: 12000, commission: 38 },
    { name: "自社デリバリー", sales: 12000000, pct: 2.0, margin: 15.2, orders: 4800 },
  ],
  monthlyTrend: [
    { month: "11月", eatin: 68, takeout: 18, delivery: 14 },
    { month: "12月", eatin: 62, takeout: 20, delivery: 18 },
    { month: "1月", eatin: 65, takeout: 19, delivery: 16 },
    { month: "2月", eatin: 64, takeout: 20, delivery: 16 },
    { month: "3月", eatin: 64, takeout: 20, delivery: 16 },
    { month: "4月", eatin: 65, takeout: 20, delivery: 15 },
  ],
  commissionImpact: {
    totalCommission: 28800000,
    ifSelfDelivery: 8400000,
    potentialSaving: 20400000,
  },
  storeDeliveryRatio: [
    { store: "渋谷センター街店", eatin: 58, takeout: 24, delivery: 18 },
    { store: "新宿西口店", eatin: 55, takeout: 22, delivery: 23 },
    { store: "池袋東口店", eatin: 62, takeout: 20, delivery: 18 },
    { store: "吉祥寺店", eatin: 72, takeout: 18, delivery: 10 },
    { store: "横浜駅西口店", eatin: 68, takeout: 20, delivery: 12 },
    { store: "大宮店", eatin: 75, takeout: 16, delivery: 9 },
  ],
};

// #8 Reviews / Reputation
export const reviewData = {
  avgRating: 3.82,
  avgRatingLastMonth: 3.78,
  totalReviews: 2840,
  newReviewsThisMonth: 186,
  platforms: [
    { name: "Google", rating: 3.85, count: 1820, trend: "up" as const },
    { name: "食べログ", rating: 3.42, count: 680, trend: "flat" as const },
    { name: "Retty", rating: 3.95, count: 340, trend: "up" as const },
  ],
  storeRanking: [
    { store: "吉祥寺店", rating: 4.12, count: 320, trend: "up" as const },
    { store: "新宿西口店", rating: 3.95, count: 520, trend: "up" as const },
    { store: "渋谷センター街店", rating: 3.88, count: 480, trend: "flat" as const },
    { store: "横浜駅西口店", rating: 3.82, count: 380, trend: "flat" as const },
    { store: "池袋東口店", rating: 3.52, count: 420, trend: "down" as const },
    { store: "大宮店", rating: 3.38, count: 280, trend: "down" as const },
  ],
  recentAlerts: [
    { store: "池袋東口店", platform: "Google", rating: 1, text: "注文してから30分待たされた。カレーもぬるかった。", date: "4/28", sentiment: "negative" as const },
    { store: "大宮店", platform: "食べログ", rating: 2, text: "前は美味しかったけど最近味が落ちた気がする。ルーが薄い。", date: "4/27", sentiment: "negative" as const },
    { store: "渋谷センター街店", platform: "Google", rating: 5, text: "ランチのチキンカツカレー最高！いつも混んでるけど回転早い。", date: "4/29", sentiment: "positive" as const },
  ],
  sentimentBreakdown: { positive: 62, neutral: 24, negative: 14 },
  topKeywords: [
    { word: "コスパ", count: 142, sentiment: "positive" as const },
    { word: "スパイス", count: 98, sentiment: "positive" as const },
    { word: "待ち時間", count: 85, sentiment: "negative" as const },
    { word: "ボリューム", count: 72, sentiment: "positive" as const },
    { word: "接客", count: 64, sentiment: "neutral" as const },
    { word: "テイクアウト", count: 58, sentiment: "positive" as const },
  ],
};

// #9 Promotions / Campaigns
export const promotionData = {
  activeCampaigns: [
    { id: "1", name: "GWスパイスフェア", period: "4/27-5/6", type: "限定メニュー", status: "実施中" as const, targetStores: "全店", sales: 4200000, uplift: 12.5, cost: 180000, roi: 23.3 },
    { id: "2", name: "LINE友だち15%OFF", period: "4/1-4/30", type: "クーポン", status: "実施中" as const, targetStores: "全店", sales: 8800000, uplift: 8.2, cost: 1320000, roi: 6.7 },
    { id: "3", name: "平日14-17時100円引き", period: "4/1-4/30", type: "タイムセール", status: "実施中" as const, targetStores: "全店", sales: 3200000, uplift: 22.8, cost: 640000, roi: 5.0 },
  ],
  pastCampaigns: [
    { id: "4", name: "春のスタンプラリー", period: "3/1-3/31", type: "スタンプ", sales: 12400000, uplift: 15.2, cost: 860000, roi: 14.4 },
    { id: "5", name: "新メニュー記念500円", period: "2/15-2/28", type: "値引き", sales: 5600000, uplift: 28.5, cost: 2100000, roi: 2.7 },
  ],
  couponRedemption: {
    issued: 12400,
    redeemed: 4960,
    rate: 40.0,
    avgDiscount: 145,
    incrementalSales: 2480000,
  },
  channelROI: [
    { channel: "LINE", roi: 8.2, spend: 420000 },
    { channel: "Instagram", roi: 4.5, spend: 280000 },
    { channel: "Google広告", roi: 3.2, spend: 350000 },
    { channel: "チラシ", roi: 1.8, spend: 180000 },
    { channel: "食べログ掲載", roi: 2.1, spend: 150000 },
  ],
};

export const lineMessages = [
  {
    time: "06:00",
    content: `渋谷センター街店

明日の見込み
来客: 約148名 (+8名 vs 去年)
売上: 約58万円

TOP3
1. チキンカツカレー 42食
2. ビーフカレー 36食
3. キーマカレー 28食

鶏むね、いつもより多めに仕入れて`,
    button: "仕入れをみる",
  },
  {
    time: "14:23",
    content: `渋谷センター街店

鶏むね、あと12食ぶんです
今日の見込みだとあと20食は出ます`,
    button: "仕入れ画面をひらく",
  },
];
