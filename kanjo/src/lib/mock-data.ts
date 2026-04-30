// Mock data for Kanjo restaurant management SaaS

export const stores = [
  { id: "1", name: "渋谷店", area: "渋谷区", seats: 42, status: "open" as const, todaySales: 387200, yesterdaySales: 342100, targetSales: 450000, customers: 89, avgSpend: 4350 },
  { id: "2", name: "新宿店", area: "新宿区", seats: 56, status: "open" as const, todaySales: 512800, yesterdaySales: 489300, targetSales: 550000, customers: 118, avgSpend: 4346 },
  { id: "3", name: "池袋店", area: "豊島区", seats: 38, status: "open" as const, todaySales: 298400, yesterdaySales: 315600, targetSales: 380000, customers: 72, avgSpend: 4144 },
];

export const todayAlerts = [
  { id: "1", storeId: "1", type: "stock" as const, severity: "warning" as const, message: "鶏もも、あと5人前ぐらいです", detail: "今日の見込みだと、あと8人前は出ます", time: "14:23", icon: "🐔" },
  { id: "2", storeId: "2", type: "sales" as const, severity: "info" as const, message: "ランチが去年より15%おおいです", detail: "天気がいいので客足が伸びています", time: "13:45", icon: "☀️" },
  { id: "3", storeId: "3", type: "staff" as const, severity: "danger" as const, message: "ディナー帯、ホール1人たりません", detail: "18時〜22時のシフトに空きがあります", time: "15:02", icon: "🙋" },
  { id: "4", storeId: "1", type: "waste" as const, severity: "warning" as const, message: "サラダの廃棄がいつもの2倍です", detail: "仕入れを見直してください", time: "12:30", icon: "🥗" },
];

export const tomorrowForecast = {
  date: "2026-05-01",
  dayOfWeek: "金",
  weather: "☁️ くもり",
  stores: [
    {
      storeId: "1", storeName: "渋谷店",
      expectedCustomers: 120, lastYearCustomers: 110,
      expectedSales: 480000,
      reason: "金曜日＋GW前半で客足が増える見込みです",
      topMenus: [
        { name: "唐揚げ定食", count: 35 },
        { name: "ハンバーグ", count: 28 },
        { name: "日替わり定食", count: 22 },
      ],
      warning: "ハンバーグの仕入れ、いつもより多めに",
    },
    {
      storeId: "2", storeName: "新宿店",
      expectedCustomers: 145, lastYearCustomers: 138,
      expectedSales: 620000,
      reason: "GW前の金曜で飲み需要が見込めます",
      topMenus: [
        { name: "刺身盛り合わせ", count: 42 },
        { name: "焼き鳥盛り", count: 38 },
        { name: "もつ鍋", count: 25 },
      ],
      warning: null,
    },
    {
      storeId: "3", storeName: "池袋店",
      expectedCustomers: 95, lastYearCustomers: 102,
      expectedSales: 390000,
      reason: "近隣でイベントがなく、やや落ち着く見込みです",
      topMenus: [
        { name: "ラーメンセット", count: 30 },
        { name: "餃子定食", count: 24 },
        { name: "チャーハン", count: 20 },
      ],
      warning: "レタスの残り少ない。朝イチで仕入れを",
    },
  ],
};

export const menus = [
  { id: "1", name: "唐揚げ定食", price: 980, cost: 310, category: "定食", popularity: "high" as const, profit: "high" as const, monthlySales: 840, monthlyProfit: 562800, tag: "主役" as const },
  { id: "2", name: "ハンバーグ", price: 1200, cost: 420, category: "定食", popularity: "high" as const, profit: "high" as const, monthlySales: 720, monthlyProfit: 561600, tag: "主役" as const },
  { id: "3", name: "日替わり定食", price: 850, cost: 350, category: "定食", popularity: "high" as const, profit: "low" as const, monthlySales: 650, monthlyProfit: 325000, tag: "働きもの" as const },
  { id: "4", name: "刺身盛り合わせ", price: 1800, cost: 750, category: "一品", popularity: "low" as const, profit: "high" as const, monthlySales: 180, monthlyProfit: 189000, tag: "隠れた優等生" as const },
  { id: "5", name: "枝豆", price: 380, cost: 60, category: "おつまみ", popularity: "high" as const, profit: "high" as const, monthlySales: 520, monthlyProfit: 166400, tag: "主役" as const },
  { id: "6", name: "シーザーサラダ", price: 680, cost: 280, category: "サラダ", popularity: "low" as const, profit: "low" as const, monthlySales: 95, monthlyProfit: 38000, tag: "退場候補" as const },
  { id: "7", name: "焼き鳥盛り", price: 980, cost: 340, category: "一品", popularity: "high" as const, profit: "high" as const, monthlySales: 480, monthlyProfit: 307200, tag: "主役" as const },
  { id: "8", name: "もつ鍋", price: 1500, cost: 520, category: "鍋", popularity: "medium" as const, profit: "high" as const, monthlySales: 220, monthlyProfit: 215600, tag: "隠れた優等生" as const },
  { id: "9", name: "フライドポテト", price: 450, cost: 120, category: "おつまみ", popularity: "high" as const, profit: "high" as const, monthlySales: 380, monthlyProfit: 125400, tag: "主役" as const },
  { id: "10", name: "チョコレートケーキ", price: 550, cost: 320, category: "デザート", popularity: "low" as const, profit: "low" as const, monthlySales: 45, monthlyProfit: 10350, tag: "退場候補" as const },
];

export const staff = [
  { id: "1", name: "田中 太郎", role: "店長", store: "渋谷店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン", "発注"], avatar: "T" },
  { id: "2", name: "佐藤 花子", role: "副店長", store: "渋谷店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン"], avatar: "S" },
  { id: "3", name: "鈴木 一郎", role: "アルバイト", store: "渋谷店", type: "アルバイト", hourlyRate: 1200, skills: ["ホール"], avatar: "鈴" },
  { id: "4", name: "高橋 美咲", role: "アルバイト", store: "渋谷店", type: "アルバイト", hourlyRate: 1200, skills: ["キッチン"], avatar: "高" },
  { id: "5", name: "山田 健太", role: "アルバイト", store: "渋谷店", type: "アルバイト", hourlyRate: 1150, skills: ["ホール", "キッチン"], avatar: "山" },
  { id: "6", name: "伊藤 裕子", role: "店長", store: "新宿店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン", "発注"], avatar: "伊" },
  { id: "7", name: "渡辺 大輔", role: "店長", store: "池袋店", type: "社員", hourlyRate: null, skills: ["ホール", "キッチン", "発注"], avatar: "渡" },
];

export const shiftSchedule = [
  { staffId: "1", name: "田中 太郎", shifts: [
    { day: "月", start: "10:00", end: "19:00" },
    { day: "火", start: "10:00", end: "19:00" },
    { day: "水", start: null, end: null },
    { day: "木", start: "10:00", end: "19:00" },
    { day: "金", start: "10:00", end: "22:00" },
    { day: "土", start: "10:00", end: "22:00" },
    { day: "日", start: null, end: null },
  ]},
  { staffId: "3", name: "鈴木 一郎", shifts: [
    { day: "月", start: "17:00", end: "22:00" },
    { day: "火", start: null, end: null },
    { day: "水", start: "17:00", end: "22:00" },
    { day: "木", start: null, end: null },
    { day: "金", start: "17:00", end: "23:00" },
    { day: "土", start: "11:00", end: "22:00" },
    { day: "日", start: "11:00", end: "18:00" },
  ]},
  { staffId: "4", name: "高橋 美咲", shifts: [
    { day: "月", start: null, end: null },
    { day: "火", start: "11:00", end: "15:00" },
    { day: "水", start: "11:00", end: "15:00" },
    { day: "木", start: "17:00", end: "22:00" },
    { day: "金", start: "17:00", end: "23:00" },
    { day: "土", start: null, end: null },
    { day: "日", start: "11:00", end: "18:00" },
  ]},
  { staffId: "5", name: "山田 健太", shifts: [
    { day: "月", start: "11:00", end: "15:00" },
    { day: "火", start: "17:00", end: "22:00" },
    { day: "水", start: null, end: null },
    { day: "木", start: "11:00", end: "15:00" },
    { day: "金", start: null, end: null },
    { day: "土", start: "11:00", end: "22:00" },
    { day: "日", start: "11:00", end: "22:00" },
  ]},
];

export const ingredients = [
  { id: "1", name: "鶏もも肉", unit: "kg", currentStock: 3.2, requiredToday: 8.5, price: 580, supplier: "豊洲水産" },
  { id: "2", name: "レタス", unit: "玉", currentStock: 4, requiredToday: 12, price: 150, supplier: "青果田中" },
  { id: "3", name: "牛ひき肉", unit: "kg", currentStock: 5.0, requiredToday: 6.2, price: 980, supplier: "肉のマルヨシ" },
  { id: "4", name: "たまご", unit: "パック", currentStock: 8, requiredToday: 5, price: 320, supplier: "青果田中" },
  { id: "5", name: "米", unit: "kg", currentStock: 25, requiredToday: 18, price: 450, supplier: "米屋佐藤" },
  { id: "6", name: "豚バラ", unit: "kg", currentStock: 2.1, requiredToday: 4.8, price: 720, supplier: "肉のマルヨシ" },
  { id: "7", name: "もやし", unit: "袋", currentStock: 15, requiredToday: 8, price: 35, supplier: "青果田中" },
  { id: "8", name: "玉ねぎ", unit: "個", currentStock: 20, requiredToday: 15, price: 80, supplier: "青果田中" },
];

export const purchaseOrders = [
  { id: "1", supplier: "豊洲水産", items: ["鶏もも 5kg", "エビ 2kg"], total: 8200, status: "確認待ち" as const, deadline: "17:00" },
  { id: "2", supplier: "青果田中", items: ["レタス 10玉", "もやし 10袋"], total: 1850, status: "注文ずみ" as const, deadline: "15:00" },
  { id: "3", supplier: "肉のマルヨシ", items: ["牛ひき肉 3kg", "豚バラ 4kg"], total: 5820, status: "確認待ち" as const, deadline: "16:00" },
];

export const hourlySales = [
  { hour: "11:00", sales: 42300, customers: 12 },
  { hour: "12:00", sales: 98700, customers: 28 },
  { hour: "13:00", sales: 78200, customers: 22 },
  { hour: "14:00", sales: 23400, customers: 6 },
  { hour: "15:00", sales: 15600, customers: 4 },
  { hour: "16:00", sales: 8900, customers: 2 },
  { hour: "17:00", sales: 32100, customers: 8 },
  { hour: "18:00", sales: 56800, customers: 15 },
  { hour: "19:00", sales: 78400, customers: 21 },
  { hour: "20:00", sales: 62300, customers: 17 },
];

export const weeklyTrend = [
  { day: "月", sales: 342000 },
  { day: "火", sales: 318000 },
  { day: "水", sales: 356000 },
  { day: "木", sales: 389000 },
  { day: "金", sales: 478000 },
  { day: "土", sales: 521000 },
  { day: "日", sales: 412000 },
];

export const notifications = [
  { id: "1", time: "06:00", type: "forecast", title: "あしたの見込み", body: "渋谷店: 約120人 / 約42万円", read: true },
  { id: "2", time: "14:23", type: "stock", title: "のこり少ない", body: "渋谷店: 鶏もも、あと5人前ぐらいです", read: false },
  { id: "3", time: "13:45", type: "sales", title: "ランチ好調", body: "新宿店: 去年より15%おおいです ⤴", read: true },
  { id: "4", time: "15:02", type: "staff", title: "人が足りない", body: "池袋店: ディナー帯、ホール1人たりません", read: false },
  { id: "5", time: "12:30", type: "waste", title: "ムダが多い", body: "渋谷店: サラダの廃棄がいつもの2倍", read: false },
];

export const lineMessages = [
  {
    time: "06:00",
    content: `おはようございます☀ 渋谷店

🍱 あしたの見込み
お客さん: 約120人(去年より+10人)
売上: 約42万円

よく出そうなTOP3
1. 唐揚げ定食 35食
2. ハンバーグ 28食
3. 日替わり 22食

⚠ ハンバーグの仕入れ、いつもより多めに`,
    button: "仕入れの注文をみる",
  },
  {
    time: "14:23",
    content: `🐔 渋谷店からおしらせ

鶏もも、あと5人前ぐらいです。
今日の見込みだと、あと8人前は出ます。`,
    button: "仕入れの注文画面をひらく",
  },
  {
    time: "07:00",
    content: `🛒 朝の仕入れチェック

今日の仕入れリスト
✅ 鶏もも 5kg(豊洲水産)
✅ レタス 10玉(青果田中)
✅ 牛乳 24本(明治)

合計 ¥34,560`,
    button: "注文書を送る",
  },
];
