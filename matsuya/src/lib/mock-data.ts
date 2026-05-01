// =============================================================================
// Matsuya Operations Ontology — Mock Data
// =============================================================================

// --- Brands ---
export const brands = [
  { brand_id: "matsuya", name: "松屋", category: "牛丼" },
  { brand_id: "matsunoya", name: "松のや", category: "とんかつ" },
  { brand_id: "mycurry", name: "マイカリー食堂", category: "カレー" },
  { brand_id: "sushimatsu", name: "すし松", category: "寿司" },
  { brand_id: "matsunoken", name: "松軒中華食堂", category: "中華" },
  { brand_id: "other", name: "その他", category: "その他" },
] as const;

export type BrandId = (typeof brands)[number]["brand_id"];

// --- Regions / Areas ---
const regions = ["北海道","東北","北関東","首都圏","甲信越","東海","関西","中国","四国","九州"] as const;
const areas = [
  "札幌","仙台","宇都宮","新宿","渋谷","池袋","品川","横浜","千葉","大宮",
  "八王子","町田","立川","吉祥寺","川崎","船橋","松戸","柏","所沢","川越",
  "高崎","水戸","長野","新潟","名古屋","静岡","浜松","岐阜","大阪","梅田",
  "難波","京都","神戸","岡山","広島","松山","福岡","熊本","鹿児島","那覇",
] as const;

const locationTypes = ["駅前","ロードサイド","商業施設","住宅地"] as const;
export type LocationType = (typeof locationTypes)[number];

// --- Stores (120) ---
export interface Store {
  store_id: string;
  name: string;
  brand: BrandId;
  region: string;
  area: string;
  location_type: LocationType;
  lat: number;
  lon: number;
  seats: number;
  open_date: string;
  daily_sales: number;
  daily_customers: number;
  avg_ticket: number;
  gross_margin: number;
  waste_pct: number;
  staff_coverage: number;
  stockout_risk: boolean;
  renovation_date: string | null;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const rng = seededRandom(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const rand = (min: number, max: number) => Math.round((rng() * (max - min) + min) * 100) / 100;

const brandDistribution: BrandId[] = [
  ...Array(55).fill("matsuya"),
  ...Array(25).fill("matsunoya"),
  ...Array(15).fill("mycurry"),
  ...Array(10).fill("sushimatsu"),
  ...Array(10).fill("matsunoken"),
  ...Array(5).fill("other"),
];

const baseLats: Record<string, [number, number]> = {
  "北海道": [43.06, 141.35], "東北": [38.26, 140.87], "北関東": [36.39, 139.06],
  "首都圏": [35.68, 139.69], "甲信越": [36.23, 137.97], "東海": [35.18, 136.91],
  "関西": [34.69, 135.50], "中国": [34.39, 132.46], "四国": [33.84, 132.77],
  "九州": [33.59, 130.40],
};

export const stores: Store[] = Array.from({ length: 120 }, (_, i) => {
  const brand = brandDistribution[i % brandDistribution.length];
  const region = i < 60 ? "首都圏" : pick(regions);
  const area = pick(areas);
  const locType = pick(locationTypes);
  const base = baseLats[region] || [35.68, 139.69];
  const isRenovated = rng() < 0.25;
  const isStockoutRisk = rng() < 0.19;
  const staffCoverage = rand(0.72, 1.05);

  return {
    store_id: `M-${String(1001 + i).padStart(4, "0")}`,
    name: `${brands.find(b => b.brand_id === brand)!.name} ${area}${i < 10 ? "南口" : i < 20 ? "北口" : i < 30 ? "東口" : ""}店`,
    brand,
    region,
    area,
    location_type: locType,
    lat: base[0] + rand(-0.5, 0.5),
    lon: base[1] + rand(-0.5, 0.5),
    seats: Math.round(rand(18, 60)),
    open_date: `20${Math.round(rand(5, 23))}-${String(Math.round(rand(1, 12))).padStart(2, "0")}-01`,
    daily_sales: Math.round(rand(280000, 850000)),
    daily_customers: Math.round(rand(180, 650)),
    avg_ticket: Math.round(rand(620, 1350)),
    gross_margin: rand(0.58, 0.72),
    waste_pct: rand(0.01, 0.06),
    staff_coverage: staffCoverage,
    stockout_risk: isStockoutRisk,
    renovation_date: isRenovated ? `202${Math.round(rand(3, 5))}-${String(Math.round(rand(1, 12))).padStart(2, "0")}-15` : null,
  };
});

// --- Factories (4) ---
export interface Factory {
  factory_id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  capacity_tons_day: number;
  utilization: number;
}

export const factories: Factory[] = [
  { factory_id: "F-01", name: "川島生産物流センター", region: "北関東", lat: 35.94, lon: 139.47, capacity_tons_day: 120, utilization: 0.87 },
  { factory_id: "F-02", name: "嵐山工場", region: "北関東", lat: 36.03, lon: 139.33, capacity_tons_day: 80, utilization: 0.79 },
  { factory_id: "F-03", name: "六甲生産物流センター", region: "関西", lat: 34.74, lon: 135.24, capacity_tons_day: 95, utilization: 0.82 },
  { factory_id: "F-04", name: "九州物流センター", region: "九州", lat: 33.55, lon: 130.72, capacity_tons_day: 55, utilization: 0.71 },
];

// --- Distribution Centers ---
export interface DistributionCenter {
  dc_id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  throughput_capacity: number;
}

export const distributionCenters: DistributionCenter[] = [
  { dc_id: "DC-01", name: "川島DC", region: "北関東", lat: 35.94, lon: 139.48, throughput_capacity: 5000 },
  { dc_id: "DC-02", name: "横浜DC", region: "首都圏", lat: 35.44, lon: 139.64, throughput_capacity: 4200 },
  { dc_id: "DC-03", name: "大阪DC", region: "関西", lat: 34.68, lon: 135.52, throughput_capacity: 3800 },
  { dc_id: "DC-04", name: "福岡DC", region: "九州", lat: 33.58, lon: 130.42, throughput_capacity: 2200 },
];

// --- SKUs (80) ---
export interface SKU {
  sku_id: string;
  name: string;
  category: string;
  shelf_life_days: number;
  unit_cost: number;
  storage_type: "冷蔵" | "冷凍" | "常温";
  produced_at: string;
}

const skuCategories = [
  { cat: "牛肉", items: ["牛バラ","牛モモ","牛肩ロース","合挽ミンチ","牛すじ","牛カルビ","ハラミ","牛タン"] },
  { cat: "豚肉", items: ["豚ロース","豚バラ","豚ヒレ","豚肩ロース","豚挽肉"] },
  { cat: "鶏肉", items: ["鶏モモ","鶏ムネ","鶏挽肉","手羽先","ささみ"] },
  { cat: "米穀", items: ["白米","酢飯","もち米"] },
  { cat: "野菜", items: ["玉ねぎ","キャベツ","レタス","ネギ","人参","じゃがいも","トマト","ほうれん草","もやし"] },
  { cat: "水産", items: ["サーモン","マグロ","エビ","イカ","タコ","ホタテ"] },
  { cat: "調味料", items: ["醤油","味噌","タレA","タレB","カレールー","ドレッシング","マヨネーズ","ソース"] },
  { cat: "麺類", items: ["中華麺","うどん","そば"] },
  { cat: "油脂", items: ["揚げ油","ごま油","ラード"] },
  { cat: "その他", items: ["卵","豆腐","パン粉","天かす","紅しょうが","味噌汁具材","漬物","海苔","わかめ","ガリ"] },
];

export const skus: SKU[] = [];
let skuIdx = 0;
for (const cat of skuCategories) {
  for (const item of cat.items) {
    skuIdx++;
    const storageType = ["牛肉","豚肉","鶏肉","水産"].includes(cat.cat) ? "冷凍" as const
      : ["野菜"].includes(cat.cat) ? "冷蔵" as const : "常温" as const;
    skus.push({
      sku_id: `SKU-${String(skuIdx).padStart(3, "0")}`,
      name: item,
      category: cat.cat,
      shelf_life_days: storageType === "冷凍" ? Math.round(rand(60, 180)) : storageType === "冷蔵" ? Math.round(rand(3, 14)) : Math.round(rand(30, 365)),
      unit_cost: Math.round(rand(80, 2800)),
      storage_type: storageType,
      produced_at: pick(factories).factory_id,
    });
  }
}

// --- Menu Items (60) ---
export interface MenuItem {
  menu_id: string;
  name: string;
  brand: BrandId;
  category: string;
  price: number;
  gross_margin_estimate: number;
  consumes_skus: string[];
  is_new: boolean;
}

const menuDefs: { brand: BrandId; items: { name: string; cat: string; price: number }[] }[] = [
  { brand: "matsuya", items: [
    { name: "牛めし並盛", cat: "丼", price: 400 }, { name: "牛めし大盛", cat: "丼", price: 550 },
    { name: "牛めし特盛", cat: "丼", price: 690 }, { name: "キムチ牛めし", cat: "丼", price: 480 },
    { name: "ネギたっぷり旨辛牛めし", cat: "丼", price: 530 }, { name: "ビビン丼", cat: "丼", price: 560 },
    { name: "カルビ焼肉定食", cat: "定食", price: 730 }, { name: "牛焼肉定食", cat: "定食", price: 680 },
    { name: "豚肩ロースの生姜焼定食", cat: "定食", price: 720 }, { name: "ブラウンソースハンバーグ定食", cat: "定食", price: 780 },
    { name: "鉄皿焼ビーフハンバーグ定食", cat: "定食", price: 850 }, { name: "粗挽き肉と茄子の麻婆", cat: "定食", price: 650 },
    { name: "牛ステーキ丼", cat: "丼", price: 880 }, { name: "オリジナルカレー", cat: "カレー", price: 490 },
    { name: "ごろごろチキンカレー", cat: "カレー", price: 620 }, { name: "味噌汁", cat: "サイド", price: 60 },
    { name: "豚汁", cat: "サイド", price: 190 }, { name: "生野菜", cat: "サイド", price: 130 },
    { name: "プレミアム牛めし", cat: "丼", price: 620 }, { name: "牛めしバーガー", cat: "新商品", price: 480 },
  ]},
  { brand: "matsunoya", items: [
    { name: "ロースかつ定食", cat: "定食", price: 680 }, { name: "ヒレかつ定食", cat: "定食", price: 780 },
    { name: "おろしロースかつ定食", cat: "定食", price: 750 }, { name: "カツ丼", cat: "丼", price: 590 },
    { name: "ササミかつ定食", cat: "定食", price: 650 }, { name: "大判ヒレかつ定食", cat: "定食", price: 920 },
    { name: "エビフライ定食", cat: "定食", price: 820 }, { name: "カキフライ定食", cat: "定食", price: 850 },
    { name: "味噌ロースかつ定食", cat: "定食", price: 780 }, { name: "チーズチキンかつ定食", cat: "新商品", price: 810 },
  ]},
  { brand: "mycurry", items: [
    { name: "マイカリー", cat: "カレー", price: 490 }, { name: "チキンカレー", cat: "カレー", price: 590 },
    { name: "ハンバーグカレー", cat: "カレー", price: 690 }, { name: "チーズカレー", cat: "カレー", price: 550 },
    { name: "カツカレー", cat: "カレー", price: 720 }, { name: "野菜カレー", cat: "カレー", price: 530 },
    { name: "キーマカレー", cat: "カレー", price: 560 }, { name: "スパイスカレー", cat: "新商品", price: 620 },
  ]},
  { brand: "sushimatsu", items: [
    { name: "まぐろ握り", cat: "寿司", price: 120 }, { name: "サーモン握り", cat: "寿司", price: 130 },
    { name: "えび握り", cat: "寿司", price: 140 }, { name: "ほたて握り", cat: "寿司", price: 180 },
    { name: "ネギトロ巻", cat: "寿司", price: 220 }, { name: "ちらし丼", cat: "丼", price: 680 },
    { name: "海鮮丼", cat: "丼", price: 780 }, { name: "炙りサーモン丼", cat: "新商品", price: 720 },
  ]},
  { brand: "matsunoken", items: [
    { name: "五目あんかけ焼そば", cat: "麺", price: 620 }, { name: "担々麺", cat: "麺", price: 580 },
    { name: "回鍋肉定食", cat: "定食", price: 650 }, { name: "酢豚定食", cat: "定食", price: 680 },
    { name: "麻婆豆腐定食", cat: "定食", price: 620 }, { name: "レバニラ定食", cat: "定食", price: 640 },
    { name: "チャーハン", cat: "飯", price: 490 }, { name: "黒酢酢豚定食", cat: "新商品", price: 720 },
  ]},
];

export const menuItems: MenuItem[] = [];
let menuIdx = 0;
for (const brandMenu of menuDefs) {
  for (const item of brandMenu.items) {
    menuIdx++;
    menuItems.push({
      menu_id: `MENU-${String(menuIdx).padStart(3, "0")}`,
      name: item.name,
      brand: brandMenu.brand,
      category: item.cat,
      price: item.price,
      gross_margin_estimate: rand(0.55, 0.75),
      consumes_skus: [skus[Math.floor(rng() * skus.length)].sku_id, skus[Math.floor(rng() * skus.length)].sku_id],
      is_new: item.cat === "新商品",
    });
  }
}

// --- Delivery Routes (40) ---
export interface DeliveryRoute {
  route_id: string;
  origin: string;
  destination_area: string;
  destination_stores: string[];
  departure_time: string;
  eta_hours: number;
  status: "on-time" | "delayed" | "at-risk";
  delay_minutes: number;
  load_pct: number;
}

export const deliveryRoutes: DeliveryRoute[] = Array.from({ length: 40 }, (_, i) => {
  const origin = pick(distributionCenters).dc_id;
  const storeSlice = stores.slice(i * 3, i * 3 + 3).map(s => s.store_id);
  const status = rng() < 0.15 ? "delayed" as const : rng() < 0.25 ? "at-risk" as const : "on-time" as const;
  return {
    route_id: `R-${String(i + 1).padStart(2, "0")}`,
    origin,
    destination_area: pick(areas),
    destination_stores: storeSlice.length > 0 ? storeSlice : [stores[0].store_id],
    departure_time: i % 2 === 0 ? "04:00" : "14:00",
    eta_hours: rand(1.5, 6),
    status,
    delay_minutes: status === "delayed" ? Math.round(rand(30, 120)) : status === "at-risk" ? Math.round(rand(10, 45)) : 0,
    load_pct: rand(0.65, 0.98),
  };
});

// --- Shifts (1 week, sampled) ---
export interface Shift {
  shift_id: string;
  store_id: string;
  date: string;
  slot: string;
  required: number;
  assigned: number;
  coverage_ratio: number;
}

const shiftSlots = ["06:00-11:00","11:00-14:00","14:00-18:00","18:00-22:00","22:00-02:00"];
const weekDates = ["2026-04-27","2026-04-28","2026-04-29","2026-04-30","2026-05-01","2026-05-02","2026-05-03"];

export const shifts: Shift[] = [];
let shiftIdx = 0;
for (const store of stores.slice(0, 30)) {
  for (const date of weekDates) {
    for (const slot of shiftSlots) {
      shiftIdx++;
      const required = Math.round(rand(3, 8));
      const assigned = Math.max(1, required - Math.round(rng() < 0.3 ? rand(1, 3) : 0));
      shifts.push({
        shift_id: `SH-${String(shiftIdx).padStart(5, "0")}`,
        store_id: store.store_id,
        date,
        slot,
        required,
        assigned,
        coverage_ratio: assigned / required,
      });
    }
  }
}

// --- Campaigns (5) ---
export interface Campaign {
  campaign_id: string;
  name: string;
  target_menu: string[];
  start_date: string;
  end_date: string;
  target_segment: string;
  sales_lift_pct: number;
  customer_lift_pct: number;
}

export const campaigns: Campaign[] = [
  { campaign_id: "CMP-01", name: "春のランチ強化", target_menu: ["MENU-001","MENU-002","MENU-014"], start_date: "2026-04-15", end_date: "2026-05-15", target_segment: "ランチ帯ビジネス層", sales_lift_pct: 8.2, customer_lift_pct: 5.4 },
  { campaign_id: "CMP-02", name: "松のや新作フェア", target_menu: ["MENU-030"], start_date: "2026-04-20", end_date: "2026-05-10", target_segment: "全セグメント", sales_lift_pct: 12.5, customer_lift_pct: 7.8 },
  { campaign_id: "CMP-03", name: "GW特別メニュー", target_menu: ["MENU-019","MENU-020"], start_date: "2026-04-29", end_date: "2026-05-06", target_segment: "ファミリー", sales_lift_pct: 15.1, customer_lift_pct: 11.2 },
  { campaign_id: "CMP-04", name: "カレーフェスティバル", target_menu: ["MENU-031","MENU-038"], start_date: "2026-05-01", end_date: "2026-05-31", target_segment: "カレーファン", sales_lift_pct: 6.7, customer_lift_pct: 4.1 },
  { campaign_id: "CMP-05", name: "牛めしバーガー発売記念", target_menu: ["MENU-020"], start_date: "2026-04-25", end_date: "2026-05-25", target_segment: "若年層", sales_lift_pct: 18.3, customer_lift_pct: 14.6 },
];

// --- Renovation Projects (30) ---
export interface RenovationProject {
  project_id: string;
  store_id: string;
  store_name: string;
  capex_myen: number;
  start_date: string;
  end_date: string;
  status: "completed" | "in-progress" | "planned";
  ticket_lift_pct: number;
  customer_lift_pct: number;
  payback_months: number;
}

export const renovationProjects: RenovationProject[] = Array.from({ length: 30 }, (_, i) => {
  const store = stores[i * 4];
  const status = i < 12 ? "completed" as const : i < 20 ? "in-progress" as const : "planned" as const;
  return {
    project_id: `REN-${String(i + 1).padStart(3, "0")}`,
    store_id: store.store_id,
    store_name: store.name,
    capex_myen: Math.round(rand(8, 35)),
    start_date: `2025-${String(Math.round(rand(1, 12))).padStart(2, "0")}-01`,
    end_date: `2026-${String(Math.round(rand(1, 6))).padStart(2, "0")}-28`,
    status,
    ticket_lift_pct: status === "completed" ? rand(3.5, 12) : rand(4, 10),
    customer_lift_pct: status === "completed" ? rand(1.5, 8) : rand(2, 7),
    payback_months: Math.round(rand(14, 36)),
  };
});

// --- Location Candidates (20) ---
export interface LocationCandidate {
  candidate_id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  population_radius_1km: number;
  competitor_count: number;
  cannibalization_risk: number;
  delivery_distance_km: number;
  staff_difficulty: "low" | "medium" | "high";
  expected_daily_sales: number;
  total_score: number;
  payback_months: number;
}

export const locationCandidates: LocationCandidate[] = Array.from({ length: 20 }, (_, i) => {
  const region = pick(regions);
  const base = baseLats[region] || [35.68, 139.69];
  return {
    candidate_id: `C-${String(i + 1).padStart(3, "0")}`,
    name: `${pick(areas)}${pick(["駅前","ロードサイド","SC内","交差点"])}候補`,
    lat: base[0] + rand(-0.3, 0.3),
    lon: base[1] + rand(-0.3, 0.3),
    region,
    population_radius_1km: Math.round(rand(8000, 65000)),
    competitor_count: Math.round(rand(2, 12)),
    cannibalization_risk: rand(0.02, 0.25),
    delivery_distance_km: rand(5, 45),
    staff_difficulty: rng() < 0.3 ? "high" : rng() < 0.6 ? "medium" : "low",
    expected_daily_sales: Math.round(rand(350000, 900000)),
    total_score: rand(55, 95),
    payback_months: Math.round(rand(18, 42)),
  };
});

// --- Incidents / Events (8 scenarios from spec) ---
export interface Incident {
  incident_id: string;
  type: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  impacted_stores: string[];
  impacted_skus: string[];
  impacted_routes: string[];
  status: "active" | "mitigating" | "resolved";
  detected_at: string;
}

export const incidents: Incident[] = [
  {
    incident_id: "INC-001", type: "demand-surge", title: "首都圏駅前ランチ需要急増",
    description: "新宿・渋谷・池袋エリアの駅前店舗で11:30-13:30の客数が予測比+18%。近隣オフィス復帰率上昇が主因と推定。",
    severity: "high",
    impacted_stores: stores.filter(s => s.region === "首都圏" && s.location_type === "駅前").slice(0, 15).map(s => s.store_id),
    impacted_skus: ["SKU-001","SKU-002","SKU-005"], impacted_routes: ["R-01","R-02","R-03"],
    status: "active", detected_at: "2026-05-01T10:15:00",
  },
  {
    incident_id: "INC-002", type: "weather-delay", title: "天候悪化による関西配送遅延リスク",
    description: "本日午後から関西地方で強雨予報。六甲センターからの午後便に30-90分の遅延リスク。",
    severity: "medium",
    impacted_stores: stores.filter(s => s.region === "関西").slice(0, 8).map(s => s.store_id),
    impacted_skus: [], impacted_routes: ["R-15","R-16","R-17"],
    status: "active", detected_at: "2026-05-01T08:30:00",
  },
  {
    incident_id: "INC-003", type: "stockout-risk", title: "牛肉系SKU欠品リスク",
    description: "SKU「牛バラ(Beef-Prime-01)」が明日15:00時点で23店舗にて在庫切れ予測。需要増と定期発注量のギャップが原因。",
    severity: "critical",
    impacted_stores: stores.filter(s => s.stockout_risk).map(s => s.store_id),
    impacted_skus: ["SKU-001","SKU-002","SKU-006"], impacted_routes: ["R-01","R-05","R-08"],
    status: "active", detected_at: "2026-05-01T09:45:00",
  },
  {
    incident_id: "INC-004", type: "menu-performance", title: "新メニュー販売の地域差",
    description: "牛めしバーガーはロードサイド店舗で昼帯に客単価+12%だが、駅前店舗の夜帯では構成比2.1%と低迷。",
    severity: "low",
    impacted_stores: stores.filter(s => s.brand === "matsuya").slice(0, 20).map(s => s.store_id),
    impacted_skus: [], impacted_routes: [],
    status: "active", detected_at: "2026-05-01T07:00:00",
  },
  {
    incident_id: "INC-005", type: "renovation-lift", title: "改装済み店舗の客単価改善",
    description: "過去30日で改装完了した12店舗の平均客単価が+7.4%。セルフレジ導入とレイアウト変更が寄与。",
    severity: "low",
    impacted_stores: renovationProjects.filter(r => r.status === "completed").slice(0, 5).map(r => r.store_id),
    impacted_skus: [], impacted_routes: [],
    status: "resolved", detected_at: "2026-04-30T18:00:00",
  },
  {
    incident_id: "INC-006", type: "staffing-gap", title: "夕方ピーク帯人員不足",
    description: "18:00-21:00の必要人員に対して12店舗で充足率80%未満。提供時間が平均+2.3分延長。",
    severity: "high",
    impacted_stores: stores.filter(s => s.staff_coverage < 0.85).slice(0, 12).map(s => s.store_id),
    impacted_skus: [], impacted_routes: [],
    status: "active", detected_at: "2026-05-01T16:30:00",
  },
  {
    incident_id: "INC-007", type: "event-surge", title: "近隣イベントによる客数増",
    description: "渋谷エリアで大型音楽イベント開催中。対象3店舗で14:00-19:00の客数が通常比+35%。",
    severity: "medium",
    impacted_stores: stores.filter(s => s.area === "渋谷").slice(0, 3).map(s => s.store_id),
    impacted_skus: ["SKU-001","SKU-005","SKU-009"], impacted_routes: ["R-02"],
    status: "active", detected_at: "2026-05-01T13:00:00",
  },
  {
    incident_id: "INC-008", type: "expansion-constraint", title: "新規出店候補の物流制約",
    description: "候補地C-014は想定売上が高いが、最寄DCからの配送距離が42kmあり、既存ルート追加で積載率が98%に達する。",
    severity: "medium",
    impacted_stores: [], impacted_skus: [], impacted_routes: ["R-22"],
    status: "active", detected_at: "2026-04-29T10:00:00",
  },
];

// --- Actions ---
export interface Action {
  action_id: string;
  incident_id: string;
  title: string;
  owner_role: string;
  owner_name: string;
  due_date: string;
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed";
  expected_impact: string;
  confidence: "High" | "Medium" | "Low";
  requires_approval: boolean;
  audit_log: { timestamp: string; actor: string; action: string }[];
}

export const actions: Action[] = [
  {
    action_id: "ACT-001", incident_id: "INC-003", title: "朝便で牛バラ+12ケースを対象23店舗へ前倒し補充",
    owner_role: "物流担当", owner_name: "佐藤", due_date: "2026-05-02T04:00:00",
    status: "pending", expected_impact: "欠品23店舗→4店舗", confidence: "High", requires_approval: true,
    audit_log: [{ timestamp: "2026-05-01T10:00:00", actor: "AI Engine", action: "対応案を生成" }],
  },
  {
    action_id: "ACT-002", incident_id: "INC-003", title: "都心15店舗の券売機推奨表示を牛めし→カルビ焼肉に変更",
    owner_role: "商品部", owner_name: "田中", due_date: "2026-05-01T16:00:00",
    status: "pending", expected_impact: "欠品23店舗→11店舗（売上機会損失リスクあり）", confidence: "Medium", requires_approval: true,
    audit_log: [{ timestamp: "2026-05-01T10:00:00", actor: "AI Engine", action: "対応案を生成" }],
  },
  {
    action_id: "ACT-003", incident_id: "INC-003", title: "嵐山工場で牛バラ追加生産ライン稼働",
    owner_role: "工場長", owner_name: "鈴木", due_date: "2026-05-01T22:00:00",
    status: "pending", expected_impact: "欠品23店舗→0店舗（残業・原価増）", confidence: "High", requires_approval: true,
    audit_log: [{ timestamp: "2026-05-01T10:00:00", actor: "AI Engine", action: "対応案を生成" }],
  },
  {
    action_id: "ACT-004", incident_id: "INC-006", title: "18:00-21:00帯に近隣店舗からヘルプ要員を3名配置",
    owner_role: "エリアマネージャー", owner_name: "山田", due_date: "2026-05-01T17:30:00",
    status: "approved", expected_impact: "充足率80%→95%、提供時間-1.8分", confidence: "High", requires_approval: false,
    audit_log: [
      { timestamp: "2026-05-01T16:35:00", actor: "AI Engine", action: "対応案を生成" },
      { timestamp: "2026-05-01T16:42:00", actor: "山田(AM)", action: "承認" },
    ],
  },
  {
    action_id: "ACT-005", incident_id: "INC-002", title: "関西午後便を六甲→大阪DCルートに切替",
    owner_role: "物流担当", owner_name: "高橋", due_date: "2026-05-01T13:00:00",
    status: "in-progress", expected_impact: "遅延90分→15分", confidence: "Medium", requires_approval: true,
    audit_log: [
      { timestamp: "2026-05-01T08:35:00", actor: "AI Engine", action: "対応案を生成" },
      { timestamp: "2026-05-01T09:10:00", actor: "高橋(物流)", action: "承認" },
      { timestamp: "2026-05-01T09:15:00", actor: "System", action: "配送計画を更新" },
    ],
  },
  {
    action_id: "ACT-006", incident_id: "INC-001", title: "新宿南口・渋谷3店舗のランチ帯追加食材を川島DCから緊急出荷",
    owner_role: "SCM", owner_name: "伊藤", due_date: "2026-05-01T11:00:00",
    status: "completed", expected_impact: "ランチ帯欠品回避", confidence: "High", requires_approval: true,
    audit_log: [
      { timestamp: "2026-05-01T10:20:00", actor: "AI Engine", action: "対応案を生成" },
      { timestamp: "2026-05-01T10:28:00", actor: "伊藤(SCM)", action: "承認" },
      { timestamp: "2026-05-01T10:30:00", actor: "System", action: "出荷指示を発行" },
      { timestamp: "2026-05-01T11:45:00", actor: "System", action: "配送完了を確認" },
    ],
  },
  {
    action_id: "ACT-007", incident_id: "INC-007", title: "渋谷3店舗のディナー帯にスポット人員2名追加",
    owner_role: "店舗運営部", owner_name: "小林", due_date: "2026-05-01T16:00:00",
    status: "pending", expected_impact: "提供時間+2.3分→+0.5分", confidence: "Medium", requires_approval: true,
    audit_log: [{ timestamp: "2026-05-01T13:05:00", actor: "AI Engine", action: "対応案を生成" }],
  },
  {
    action_id: "ACT-008", incident_id: "INC-004", title: "駅前店舗の夜帯に牛めしバーガーのセット訴求POP追加",
    owner_role: "商品部", owner_name: "渡辺", due_date: "2026-05-02T10:00:00",
    status: "pending", expected_impact: "夜帯構成比2.1%→5%（推定）", confidence: "Low", requires_approval: false,
    audit_log: [{ timestamp: "2026-05-01T07:10:00", actor: "AI Engine", action: "対応案を生成" }],
  },
];

// --- KPI Summary ---
export const kpiSummary = {
  total_stores: stores.length,
  brands_count: brands.length,
  today_sales_forecast_pct: "+6.8%",
  customer_forecast_pct: "+3.1%",
  avg_ticket_forecast_pct: "+4.2%",
  gross_margin_yoy: "-0.8pt",
  stockout_risk_stores: 23,
  waste_risk_myen: 142,
  staffing_gap_slots: 38,
  delivery_delay_routes: 7,
  renovation_ticket_lift: "+7.4%",
  expansion_top_candidates: 5,
  last_updated: "2026-05-01T15:45:00",
  update_interval: "15min",
};

// --- Ontology relationships ---
export const ontologyRelationships = [
  { from: "Store", rel: "belongs_to", to: "Brand" },
  { from: "Store", rel: "sells", to: "MenuItem" },
  { from: "MenuItem", rel: "consumes", to: "SKU" },
  { from: "SKU", rel: "produced_at", to: "Factory" },
  { from: "SKU", rel: "stored_at", to: "DistributionCenter" },
  { from: "DeliveryRoute", rel: "delivers_to", to: "Store" },
  { from: "Shift", rel: "covers", to: "Store" },
  { from: "Campaign", rel: "promotes", to: "MenuItem" },
  { from: "Campaign", rel: "targets", to: "Store" },
  { from: "RenovationProject", rel: "improves", to: "Store" },
  { from: "LocationCandidate", rel: "may_cannibalize", to: "Store" },
  { from: "Incident", rel: "impacts", to: "Store / Route / SKU / Factory" },
  { from: "Action", rel: "mitigates", to: "Incident" },
];
