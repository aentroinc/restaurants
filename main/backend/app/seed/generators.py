import uuid
import random
import math
from datetime import date, timedelta, datetime
from decimal import Decimal

RNG = random.Random(42)

TENANT_ID = "00000000-0000-0000-0000-000000000001"
COMPANY_ID = "00000000-0000-0000-0000-000000000010"

REGIONS = [
    {"name": "関東", "code": "KANTO"},
    {"name": "関西", "code": "KANSAI"},
    {"name": "中部", "code": "CHUBU"},
    {"name": "九州", "code": "KYUSHU"},
    {"name": "東北", "code": "TOHOKU"},
]

AREAS_PER_REGION = {
    "KANTO": [
        {"name": "東京都心", "code": "KT01"},
        {"name": "東京郊外", "code": "KT02"},
        {"name": "神奈川", "code": "KT03"},
    ],
    "KANSAI": [
        {"name": "大阪市内", "code": "KS01"},
        {"name": "大阪郊外", "code": "KS02"},
        {"name": "京都・神戸", "code": "KS03"},
    ],
    "CHUBU": [
        {"name": "名古屋市内", "code": "CB01"},
        {"name": "名古屋郊外", "code": "CB02"},
        {"name": "静岡・新潟", "code": "CB03"},
    ],
    "KYUSHU": [
        {"name": "福岡市内", "code": "KY01"},
        {"name": "福岡郊外", "code": "KY02"},
        {"name": "熊本・鹿児島", "code": "KY03"},
    ],
    "TOHOKU": [
        {"name": "仙台市内", "code": "TH01"},
        {"name": "仙台郊外", "code": "TH02"},
        {"name": "青森・秋田", "code": "TH03"},
    ],
}

BRANDS = [
    {"name": "牛太郎", "service_model": "beef_bowl", "store_count": 40,
     "avg_ticket_range": (500, 800), "daily_sales_range": (300000, 800000),
     "cogs_target": 32, "labor_target": 28},
    {"name": "鮨まわり", "service_model": "sushi", "store_count": 35,
     "avg_ticket_range": (1200, 2000), "daily_sales_range": (500000, 1500000),
     "cogs_target": 38, "labor_target": 26},
    {"name": "バーガーワークス", "service_model": "burger", "store_count": 25,
     "avg_ticket_range": (700, 1100), "daily_sales_range": (250000, 600000),
     "cogs_target": 30, "labor_target": 30},
]

PREFECTURES = {
    "KANTO": ["東京都", "神奈川県", "千葉県", "埼玉県"],
    "KANSAI": ["大阪府", "京都府", "兵庫県"],
    "CHUBU": ["愛知県", "静岡県", "新潟県"],
    "KYUSHU": ["福岡県", "熊本県", "鹿児島県"],
    "TOHOKU": ["宮城県", "青森県", "秋田県"],
}

CITIES = {
    "東京都": ["千代田区", "渋谷区", "新宿区", "港区", "品川区", "豊島区", "中野区", "目黒区", "世田谷区", "杉並区"],
    "神奈川県": ["横浜市", "川崎市", "相模原市", "藤沢市"],
    "千葉県": ["千葉市", "船橋市", "柏市", "松戸市"],
    "埼玉県": ["さいたま市", "川越市", "所沢市", "越谷市"],
    "大阪府": ["大阪市", "堺市", "豊中市", "吹田市", "東大阪市"],
    "京都府": ["京都市", "宇治市"],
    "兵庫県": ["神戸市", "姫路市", "西宮市"],
    "愛知県": ["名古屋市", "豊田市", "一宮市", "春日井市"],
    "静岡県": ["静岡市", "浜松市"],
    "新潟県": ["新潟市", "長岡市"],
    "福岡県": ["福岡市", "北九州市", "久留米市"],
    "熊本県": ["熊本市", "八代市"],
    "鹿児島県": ["鹿児島市", "霧島市"],
    "宮城県": ["仙台市", "石巻市"],
    "青森県": ["青森市", "八戸市"],
    "秋田県": ["秋田市", "横手市"],
}

TRADE_AREA_TYPES = ["駅前", "ロードサイド", "商業施設", "オフィス街", "住宅街"]

EMPLOYEE_ROLES = {
    "director": 5,
    "sv": 15,
    "manager": 30,
}

BEEF_PRODUCTS = {
    "メイン": [("牛丼 並", 400, 128), ("牛丼 大盛", 550, 176), ("牛丼 特盛", 700, 224), ("豚丼 並", 380, 114), ("豚丼 大盛", 530, 159)],
    "サイド": [("味噌汁", 80, 16), ("たまご", 80, 16), ("サラダ", 150, 38), ("漬物セット", 120, 24)],
    "ドリンク": [("烏龍茶", 150, 30), ("コーラ", 150, 30), ("ビール", 350, 88)],
    "限定": [("ねぎ玉牛丼", 550, 176), ("キムチ牛丼", 500, 160), ("チーズ牛丼", 580, 186)],
}

SUSHI_PRODUCTS = {
    "にぎり": [("まぐろ", 150, 68), ("サーモン", 150, 60), ("えび", 150, 53), ("いか", 120, 42), ("たまご", 100, 25),
               ("はまち", 180, 72), ("うに", 350, 175), ("いくら", 300, 150), ("あなご", 200, 80), ("中とろ", 400, 200)],
    "巻物": [("鉄火巻", 200, 70), ("かっぱ巻", 120, 24), ("納豆巻", 120, 24)],
    "サイド": [("味噌汁", 100, 20), ("茶碗蒸し", 200, 60), ("枝豆", 200, 40)],
    "セット": [("ランチセットA", 980, 343), ("ランチセットB", 1280, 448), ("贅沢セット", 2200, 880)],
    "ドリンク": [("緑茶", 0, 0), ("ビール", 400, 100), ("日本酒", 500, 125)],
}

BURGER_PRODUCTS = {
    "バーガー": [("クラシックバーガー", 500, 150), ("チーズバーガー", 580, 174), ("ダブルバーガー", 780, 234),
                ("チキンバーガー", 480, 144), ("フィッシュバーガー", 520, 156), ("てりやきバーガー", 550, 165)],
    "サイド": [("フレンチフライ S", 200, 40), ("フレンチフライ M", 280, 56), ("フレンチフライ L", 350, 70),
              ("オニオンリング", 300, 60), ("サラダ", 280, 56), ("ナゲット 5pc", 300, 75)],
    "ドリンク": [("コーラ S", 150, 23), ("コーラ M", 200, 30), ("コーラ L", 250, 38),
                ("シェイク", 350, 70), ("コーヒー", 200, 30)],
    "セット": [("バーガーセットA", 780, 234), ("バーガーセットB", 900, 270), ("ファミリーセット", 2200, 660)],
}

REVIEW_SOURCES = ["google", "tabelog", "hotpepper", "gurunavi"]

REVIEW_TEMPLATES_GOOD = [
    "味もサービスも素晴らしい。",
    "コスパが良く、大満足です。",
    "清潔で快適な店内でした。",
    "スタッフの対応が丁寧で気持ちよく食事できました。",
    "何度来ても安定した美味しさ。",
]

REVIEW_TEMPLATES_BAD = [
    "待ち時間が長すぎる。",
    "店内が汚れていた。",
    "接客態度が悪い。",
    "料理が冷めていた。",
    "価格に見合わない品質。",
]

# Anomaly store indices per brand (within their store list)
LABOR_OVERRUN_STORES = [2, 8, 15, 22, 38]  # global store indices
COGS_OVERRUN_STORES = [5, 12, 25, 33, 45]
SALES_DECLINE_STORES = [7, 18, 30, 42, 55]
REVIEW_DECLINE_STORES = [10, 28, 50]
DISCOUNT_OVERUSE_STORES = [14, 35, 60]
IMPROVEMENT_SUCCESS_STORES = [3, 20, 40, 52, 65]


def make_uuid(namespace: int) -> str:
    return str(uuid.UUID(f"00000000-0000-0000-{namespace:04x}-{RNG.randint(0, 2**48-1):012x}"))


def gen_deterministic_uuid(category: str, index: int) -> str:
    r = random.Random(f"{category}:{index}")
    return str(uuid.UUID(int=r.getrandbits(128), version=4))


def generate_regions():
    results = []
    for i, r in enumerate(REGIONS):
        results.append({
            "id": gen_deterministic_uuid("region", i),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": r["name"],
            "code": r["code"],
        })
    return results


def generate_areas(regions):
    results = []
    idx = 0
    for region in regions:
        for area_def in AREAS_PER_REGION[region["code"]]:
            results.append({
                "id": gen_deterministic_uuid("area", idx),
                "tenant_id": TENANT_ID,
                "region_id": region["id"],
                "name": area_def["name"],
                "code": area_def["code"],
                "sv_employee_id": None,
            })
            idx += 1
    return results


def generate_brands():
    results = []
    for i, b in enumerate(BRANDS):
        results.append({
            "id": gen_deterministic_uuid("brand", i),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": b["name"],
            "service_model": b["service_model"],
            "logo_url": None,
            "settings": {},
        })
    return results


def generate_employees(areas):
    results = []
    idx = 0
    last_names = ["田中", "鈴木", "佐藤", "高橋", "渡辺", "伊藤", "山本", "中村", "小林", "加藤",
                   "吉田", "山田", "松本", "井上", "木村", "林", "清水", "山崎", "阿部", "森"]
    first_names = ["太郎", "一郎", "健一", "大輔", "直人", "翔太", "雄一", "拓也", "裕子", "美咲",
                   "花子", "陽子", "真由美", "恵", "愛", "聡", "誠", "学", "博", "修"]

    for role, count in EMPLOYEE_ROLES.items():
        for j in range(count):
            ln = last_names[idx % len(last_names)]
            fn = first_names[idx % len(first_names)]
            results.append({
                "id": gen_deterministic_uuid("employee", idx),
                "tenant_id": TENANT_ID,
                "company_id": COMPANY_ID,
                "code": f"E{idx+1:04d}",
                "name": f"{ln} {fn}",
                "role": role,
                "email": f"{role}{idx+1}@aentro-foods.co.jp",
                "active": True,
            })
            idx += 1

    # assign SVs to areas
    sv_employees = [e for e in results if e["role"] == "sv"]
    for i, area in enumerate(areas):
        if i < len(sv_employees):
            area["sv_employee_id"] = sv_employees[i]["id"]

    return results


def generate_stores(brands_def, brand_records, areas, employees):
    results = []
    global_idx = 0
    manager_employees = [e for e in employees if e["role"] == "manager"]

    region_code_to_prefs = PREFECTURES

    for brand_idx, brand_def in enumerate(BRANDS):
        brand_id = brand_records[brand_idx]["id"]
        count = brand_def["store_count"]

        for j in range(count):
            area = areas[global_idx % len(areas)]
            # find region code from area
            region_code = area["code"][:2]
            region_map = {"KT": "KANTO", "KS": "KANSAI", "CB": "CHUBU", "KY": "KYUSHU", "TH": "TOHOKU"}
            region_key = region_map.get(region_code, "KANTO")
            prefs = PREFECTURES[region_key]
            pref = prefs[global_idx % len(prefs)]
            cities = CITIES.get(pref, ["市内"])
            city = cities[global_idx % len(cities)]
            trade_area = TRADE_AREA_TYPES[global_idx % len(TRADE_AREA_TYPES)]

            manager = manager_employees[global_idx % len(manager_employees)] if manager_employees else None

            lat = 35.0 + RNG.uniform(-3, 3)
            lng = 135.0 + RNG.uniform(-3, 3)

            opening_date = date(2015, 1, 1) + timedelta(days=RNG.randint(0, 3000))

            results.append({
                "id": gen_deterministic_uuid("store", global_idx),
                "tenant_id": TENANT_ID,
                "brand_id": brand_id,
                "area_id": area["id"],
                "code": f"{brand_def['service_model'][:3].upper()}{j+1:03d}",
                "name": f"{brand_def['name']} {city}{j+1}号店",
                "prefecture": pref,
                "city": city,
                "address": f"{city}{RNG.randint(1,9)}-{RNG.randint(1,30)}-{RNG.randint(1,15)}",
                "trade_area_type": trade_area,
                "opening_date": opening_date,
                "seat_count": RNG.randint(20, 80),
                "parking": trade_area == "ロードサイド",
                "drive_through": trade_area == "ロードサイド" and brand_def["service_model"] == "burger",
                "delivery": RNG.random() > 0.5,
                "takeout": True,
                "status": "active",
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "manager_employee_id": manager["id"] if manager else None,
                "_global_idx": global_idx,
                "_brand_idx": brand_idx,
                "_brand_def": brand_def,
            })
            global_idx += 1

    return results


def generate_products(brand_records):
    results = []
    product_maps = [BEEF_PRODUCTS, SUSHI_PRODUCTS, BURGER_PRODUCTS]
    idx = 0

    for brand_idx, brand in enumerate(brand_records):
        pmap = product_maps[brand_idx]
        for cat, items in pmap.items():
            for pname, price, cost in items:
                is_lto = cat in ("限定",)
                results.append({
                    "id": gen_deterministic_uuid("product", idx),
                    "tenant_id": TENANT_ID,
                    "brand_id": brand["id"],
                    "code": f"P{idx+1:04d}",
                    "name": pname,
                    "category_l1": cat,
                    "category_l2": None,
                    "price": price,
                    "theoretical_cost": cost,
                    "active": True,
                    "limited_time_offer": is_lto,
                    "_brand_idx": brand_idx,
                })
                idx += 1

    # pad to 300 with variations
    while len(results) < 300:
        base = results[idx % len(results)]
        results.append({
            "id": gen_deterministic_uuid("product", idx),
            "tenant_id": TENANT_ID,
            "brand_id": base["brand_id"],
            "code": f"P{idx+1:04d}",
            "name": f"{base['name']} (バリエーション)",
            "category_l1": base["category_l1"],
            "category_l2": "バリエーション",
            "price": base["price"] + RNG.randint(-50, 100),
            "theoretical_cost": base["theoretical_cost"] + RNG.randint(-10, 30),
            "active": True,
            "limited_time_offer": False,
            "_brand_idx": base["_brand_idx"],
        })
        idx += 1

    return results[:300]


def _seasonal_factor(d: date) -> float:
    month = d.month
    factors = {1: 0.85, 2: 0.88, 3: 0.95, 4: 1.0, 5: 1.02, 6: 0.95,
               7: 1.08, 8: 1.10, 9: 0.97, 10: 1.0, 11: 1.03, 12: 1.12}
    return factors.get(month, 1.0)


def _dow_factor(d: date) -> float:
    dow = d.weekday()
    factors = {0: 0.90, 1: 0.88, 2: 0.92, 3: 0.95, 4: 1.05, 5: 1.15, 6: 1.10}
    return factors.get(dow, 1.0)


def _growth_factor(d: date, base_date: date = date(2024, 4, 1)) -> float:
    days = (d - base_date).days
    return 1.0 + days * 0.00005


def _anomaly_factor(global_idx: int, d: date, anomaly_type: str) -> float:
    """Returns multiplier for anomaly stores, only in recent months."""
    recent_start = date(2026, 2, 1)
    if d < recent_start:
        if anomaly_type == "improvement_success" and global_idx in IMPROVEMENT_SUCCESS_STORES:
            if d >= date(2025, 10, 1) and d < date(2026, 1, 1):
                return 0.80  # bad period before improvement
        return 1.0

    if anomaly_type == "sales_decline" and global_idx in SALES_DECLINE_STORES:
        return 0.75
    if anomaly_type == "improvement_success" and global_idx in IMPROVEMENT_SUCCESS_STORES:
        return 1.10  # improved
    return 1.0


def generate_daily_sales(stores, start_date: date, end_date: date):
    """Generate daily sales records. Returns list of dicts."""
    results = []
    idx = 0
    d = start_date
    total_days = (end_date - start_date).days + 1

    for store in stores:
        global_idx = store["_global_idx"]
        brand_def = store["_brand_def"]
        base_min, base_max = brand_def["daily_sales_range"]
        base_sales = RNG.uniform(base_min, base_max)
        ticket_min, ticket_max = brand_def["avg_ticket_range"]
        base_ticket = RNG.uniform(ticket_min, ticket_max)

        d = start_date
        while d <= end_date:
            seasonal = _seasonal_factor(d)
            dow = _dow_factor(d)
            growth = _growth_factor(d)
            noise = RNG.uniform(0.92, 1.08)

            sales_anomaly = _anomaly_factor(global_idx, d, "sales_decline")
            improvement = _anomaly_factor(global_idx, d, "improvement_success")

            day_sales = base_sales * seasonal * dow * growth * noise * sales_anomaly * improvement
            net_sales = int(day_sales)
            avg_ticket = base_ticket * RNG.uniform(0.95, 1.05)
            customer_count = max(1, int(net_sales / avg_ticket))
            order_count = max(1, int(customer_count * RNG.uniform(0.95, 1.0)))

            discount_pct = RNG.uniform(2, 5)
            if global_idx in DISCOUNT_OVERUSE_STORES and d >= date(2026, 2, 1):
                discount_pct = RNG.uniform(8, 12)

            discount_amount = int(net_sales * discount_pct / 100)
            gross_sales = net_sales + discount_amount

            dine_in_pct = RNG.uniform(0.6, 0.8)
            takeout_pct = RNG.uniform(0.1, 0.25)
            delivery_pct = 1.0 - dine_in_pct - takeout_pct
            if delivery_pct < 0:
                delivery_pct = 0
                takeout_pct = 1.0 - dine_in_pct

            results.append({
                "id": gen_deterministic_uuid("daily_sales", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "business_date": d,
                "gross_sales": gross_sales,
                "net_sales": net_sales,
                "customer_count": customer_count,
                "order_count": order_count,
                "discount_amount": discount_amount,
                "dine_in_sales": int(net_sales * dine_in_pct),
                "takeout_sales": int(net_sales * takeout_pct),
                "delivery_sales": int(net_sales * delivery_pct),
                "_avg_ticket": avg_ticket,
            })
            idx += 1
            d += timedelta(days=1)

    return results


def generate_hourly_sales(daily_sales_records):
    """Generate hourly breakdown for each daily record. Sampled to reduce volume."""
    results = []
    idx = 0

    hour_weights = {
        6: 0.01, 7: 0.02, 8: 0.03, 9: 0.03, 10: 0.05,
        11: 0.12, 12: 0.18, 13: 0.10, 14: 0.05,
        15: 0.03, 16: 0.04, 17: 0.08, 18: 0.12, 19: 0.08,
        20: 0.04, 21: 0.02,
    }
    total_weight = sum(hour_weights.values())
    norm_weights = {h: w / total_weight for h, w in hour_weights.items()}

    # Only generate hourly data for last 90 days to keep volume reasonable
    cutoff = date(2026, 2, 1)

    for ds in daily_sales_records:
        if ds["business_date"] < cutoff:
            continue

        for hour, weight in norm_weights.items():
            hour_sales = int(ds["net_sales"] * weight * RNG.uniform(0.85, 1.15))
            hour_customers = max(1, int(ds["customer_count"] * weight * RNG.uniform(0.85, 1.15)))
            hour_orders = max(1, int(hour_customers * RNG.uniform(0.95, 1.0)))

            results.append({
                "id": gen_deterministic_uuid("hourly_sales", idx),
                "tenant_id": TENANT_ID,
                "store_id": ds["store_id"],
                "business_date": ds["business_date"],
                "hour": hour,
                "net_sales": hour_sales,
                "customer_count": hour_customers,
                "order_count": hour_orders,
            })
            idx += 1

    return results


def generate_product_sales(stores, products, start_date: date, end_date: date):
    """Generate daily product sales. Sample weekly to reduce volume."""
    results = []
    idx = 0

    brand_products = {}
    for p in products:
        brand_products.setdefault(str(p["brand_id"]), []).append(p)

    # Sample one day per week for product sales
    sample_dates = []
    d = start_date
    while d <= end_date:
        if d.weekday() == 2:  # Wednesday
            sample_dates.append(d)
        d += timedelta(days=1)

    for store in stores:
        store_products = brand_products.get(str(store["brand_id"]), [])
        if not store_products:
            continue

        top_products = store_products[:min(10, len(store_products))]

        for sd in sample_dates:
            brand_def = store["_brand_def"]
            base_sales = RNG.uniform(*brand_def["daily_sales_range"])
            day_sales = base_sales * _seasonal_factor(sd) * _dow_factor(sd)

            remaining = day_sales
            for pi, product in enumerate(top_products):
                share = RNG.uniform(0.05, 0.20) if pi < 3 else RNG.uniform(0.02, 0.08)
                prod_sales = int(remaining * share)
                qty = max(1, int(prod_sales / max(1, product["price"])))
                theoretical_cogs = int(qty * product["theoretical_cost"])

                results.append({
                    "id": gen_deterministic_uuid("product_sales", idx),
                    "tenant_id": TENANT_ID,
                    "store_id": store["id"],
                    "product_id": product["id"],
                    "business_date": sd,
                    "quantity": qty,
                    "net_sales": prod_sales,
                    "discount_amount": int(prod_sales * RNG.uniform(0.01, 0.04)),
                    "theoretical_cogs": theoretical_cogs,
                })
                idx += 1

    return results


def generate_labor(stores, start_date: date, end_date: date):
    results = []
    idx = 0

    for store in stores:
        global_idx = store["_global_idx"]
        brand_def = store["_brand_def"]
        base_min, base_max = brand_def["daily_sales_range"]
        base_sales = RNG.uniform(base_min, base_max)
        labor_target = brand_def["labor_target"]

        base_hourly_wage = RNG.uniform(1050, 1250)
        base_hours = (base_sales * labor_target / 100) / base_hourly_wage

        d = start_date
        while d <= end_date:
            seasonal = _seasonal_factor(d)
            day_factor = _dow_factor(d)
            noise = RNG.uniform(0.93, 1.07)

            hours = base_hours * seasonal * day_factor * noise
            cost = hours * base_hourly_wage

            # Labor overrun anomaly
            if global_idx in LABOR_OVERRUN_STORES and d >= date(2026, 2, 1):
                hours *= RNG.uniform(1.15, 1.30)
                cost = hours * base_hourly_wage

            # Improvement success: labor was bad, now better
            if global_idx in IMPROVEMENT_SUCCESS_STORES:
                if d >= date(2025, 10, 1) and d < date(2026, 1, 1):
                    hours *= 1.20
                    cost = hours * base_hourly_wage
                elif d >= date(2026, 2, 1):
                    hours *= 0.95
                    cost = hours * base_hourly_wage

            planned_hours = base_hours * seasonal * day_factor
            planned_cost = planned_hours * base_hourly_wage

            results.append({
                "id": gen_deterministic_uuid("labor", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "business_date": d,
                "labor_hours": round(hours, 2),
                "labor_cost": int(cost),
                "planned_labor_hours": round(planned_hours, 2),
                "planned_labor_cost": int(planned_cost),
            })
            idx += 1
            d += timedelta(days=1)

    return results


def generate_store_pl(stores, daily_sales, labor_records, start_date: date, end_date: date):
    results = []
    idx = 0

    sales_by_store_month = {}
    for ds in daily_sales:
        key = (str(ds["store_id"]), ds["business_date"].year, ds["business_date"].month)
        rec = sales_by_store_month.setdefault(key, {"net_sales": 0, "discount": 0})
        rec["net_sales"] += ds["net_sales"]
        rec["discount"] += ds["discount_amount"]

    labor_by_store_month = {}
    for lb in labor_records:
        key = (str(lb["store_id"]), lb["business_date"].year, lb["business_date"].month)
        rec = labor_by_store_month.setdefault(key, {"cost": 0, "hours": 0})
        rec["cost"] += lb["labor_cost"]
        rec["hours"] += float(lb["labor_hours"])

    for store in stores:
        global_idx = store["_global_idx"]
        brand_def = store["_brand_def"]
        cogs_target = brand_def["cogs_target"]
        store_id_str = str(store["id"])

        d = start_date.replace(day=1)
        while d <= end_date:
            year, month = d.year, d.month
            key = (store_id_str, year, month)

            sales_rec = sales_by_store_month.get(key, {"net_sales": 0, "discount": 0})
            labor_rec = labor_by_store_month.get(key, {"cost": 0, "hours": 0})

            net_sales = sales_rec["net_sales"]
            if net_sales == 0:
                if month == 12:
                    d = date(year + 1, 1, 1)
                else:
                    d = date(year, month + 1, 1)
                continue

            cogs_rate = cogs_target + RNG.uniform(-2, 2)
            if global_idx in COGS_OVERRUN_STORES and d >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(3, 6)

            if global_idx in IMPROVEMENT_SUCCESS_STORES:
                if d >= date(2025, 10, 1) and d < date(2026, 1, 1):
                    cogs_rate += 4
                elif d >= date(2026, 2, 1):
                    cogs_rate -= 1

            cogs = int(net_sales * cogs_rate / 100)
            gross_profit = net_sales - cogs
            labor_cost = labor_rec["cost"]
            rent = int(net_sales * RNG.uniform(0.08, 0.12))
            utilities = int(net_sales * RNG.uniform(0.03, 0.05))
            promotion = int(net_sales * RNG.uniform(0.01, 0.03))
            other = int(net_sales * RNG.uniform(0.02, 0.04))
            operating_profit = gross_profit - labor_cost - rent - utilities - promotion - other

            # period end
            if month == 12:
                period_end = date(year, 12, 31)
            else:
                period_end = date(year, month + 1, 1) - timedelta(days=1)

            results.append({
                "id": gen_deterministic_uuid("store_pl", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "period_start": d,
                "period_end": period_end,
                "period_type": "monthly",
                "sales": net_sales,
                "cogs": cogs,
                "gross_profit": gross_profit,
                "labor_cost": labor_cost,
                "rent": rent,
                "utilities": utilities,
                "promotion_cost": promotion,
                "other_expenses": other,
                "operating_profit": operating_profit,
            })
            idx += 1

            if month == 12:
                d = date(year + 1, 1, 1)
            else:
                d = date(year, month + 1, 1)

    return results


def generate_kpis(stores, daily_sales, labor_records, store_pls, reviews_list, tasks_list):
    """Generate StoreDailyKPI for last day of each month."""
    from app.services.health_scorer import (
        calculate_health_score, sales_trend_score, profit_margin_score,
        labor_efficiency_score, cogs_control_score, review_score_to_health, task_completion_score
    )
    from app.services.improvement_estimator import identify_issues, calculate_improvement_opportunity
    from app.services.peer_comparator import group_key

    results = []
    idx = 0

    # index daily sales by store+date
    ds_index = {}
    for ds in daily_sales:
        ds_index[(str(ds["store_id"]), ds["business_date"].isoformat())] = ds

    # index labor by store+date
    labor_index = {}
    for lb in labor_records:
        labor_index[(str(lb["store_id"]), lb["business_date"].isoformat())] = lb

    # index PL by store+period_start
    pl_index = {}
    for pl in store_pls:
        pl_index[(str(pl["store_id"]), pl["period_start"].isoformat())] = pl

    # latest review scores by store
    review_by_store = {}
    for r in reviews_list:
        sid = str(r["store_id"])
        review_by_store.setdefault(sid, []).append(r["rating"])

    # task completion by store
    task_completion_by_store = {}
    for t in tasks_list:
        sid = str(t["store_id"])
        rec = task_completion_by_store.setdefault(sid, {"done": 0, "total": 0})
        rec["total"] += 1
        if t["status"] == "done":
            rec["done"] += 1

    # peer medians (precompute from latest month)
    peer_data = {}
    for store in stores:
        key = group_key(str(store["brand_id"]), store["trade_area_type"])
        peer_data.setdefault(key, [])

    # Generate KPIs for end-of-month dates only (to keep volume manageable)
    kpi_dates = []
    d = date(2024, 4, 30)
    while d <= date(2026, 4, 30):
        kpi_dates.append(d)
        if d.month == 12:
            d = date(d.year + 1, 1, 31)
        else:
            next_month = d.month + 1
            next_year = d.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            import calendar
            last_day = calendar.monthrange(next_year, next_month)[1]
            d = date(next_year, next_month, last_day)

    for kpi_date in kpi_dates:
        month_start = kpi_date.replace(day=1)

        for store in stores:
            global_idx = store["_global_idx"]
            brand_def = store["_brand_def"]
            store_id_str = str(store["id"])

            ds = ds_index.get((store_id_str, kpi_date.isoformat()))
            lb = labor_index.get((store_id_str, kpi_date.isoformat()))
            pl = pl_index.get((store_id_str, month_start.isoformat()))

            if not ds:
                continue

            net_sales = ds["net_sales"]
            customer_count = ds["customer_count"]
            avg_ticket = int(net_sales / max(1, customer_count))

            # Use PL data for COGS if available, else estimate
            cogs_rate = brand_def["cogs_target"] + RNG.uniform(-2, 2)
            if global_idx in COGS_OVERRUN_STORES and kpi_date >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(3, 6)
            if global_idx in IMPROVEMENT_SUCCESS_STORES:
                if kpi_date >= date(2025, 10, 1) and kpi_date < date(2026, 1, 1):
                    cogs_rate += 4
                elif kpi_date >= date(2026, 2, 1):
                    cogs_rate -= 1

            cogs = int(net_sales * cogs_rate / 100)

            labor_cost = lb["labor_cost"] if lb else int(net_sales * brand_def["labor_target"] / 100)
            labor_hours = float(lb["labor_hours"]) if lb else 0
            labor_cost_rate_val = labor_cost / max(1, net_sales) * 100

            fl = cogs_rate + labor_cost_rate_val
            splh = int(net_sales / max(1, labor_hours)) if labor_hours else 0
            gross_profit = net_sales - cogs
            gross_profit_rate = gross_profit / max(1, net_sales) * 100

            op = 0
            op_rate = 0
            if pl:
                monthly_sales = pl["sales"]
                if monthly_sales > 0:
                    op_rate = pl["operating_profit"] / monthly_sales * 100
                    op = int(net_sales * op_rate / 100)

            # Review score
            review_scores = review_by_store.get(store_id_str, [])
            review_avg = sum(review_scores) / len(review_scores) if review_scores else 3.5

            # YoY growth (estimate)
            prev_year_key = (store_id_str, kpi_date.replace(year=kpi_date.year - 1).isoformat())
            prev_ds = ds_index.get(prev_year_key)
            yoy_growth = 0
            if prev_ds and prev_ds["net_sales"] > 0:
                yoy_growth = (net_sales - prev_ds["net_sales"]) / prev_ds["net_sales"] * 100

            # Health score
            task_rec = task_completion_by_store.get(store_id_str, {"done": 0, "total": 0})
            health = calculate_health_score(
                sales_trend=sales_trend_score(yoy_growth),
                profit_margin=profit_margin_score(op_rate),
                labor_efficiency=labor_efficiency_score(labor_cost_rate_val, brand_def["labor_target"]),
                cogs_control=cogs_control_score(cogs_rate, brand_def["cogs_target"]),
                review_score=review_score_to_health(review_avg),
                task_completion=task_completion_score(task_rec["done"], task_rec["total"]),
            )

            # Issues
            peer_key = group_key(str(store["brand_id"]), store["trade_area_type"])
            peer_medians = {"labor_cost_rate": brand_def["labor_target"], "cogs_rate": brand_def["cogs_target"]}

            monthly_sales_est = net_sales * 30
            store_metrics = {
                "labor_cost_rate": labor_cost_rate_val,
                "cogs_rate": cogs_rate,
                "yoy_growth": yoy_growth,
                "review_score_delta": review_avg - 3.5,
                "discount_rate": ds["discount_amount"] / max(1, ds["gross_sales"]) * 100,
                "monthly_sales": monthly_sales_est,
            }
            issues = identify_issues(store_metrics, peer_medians)
            improvement_opp = calculate_improvement_opportunity(issues)

            results.append({
                "id": gen_deterministic_uuid("kpi", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "business_date": kpi_date,
                "net_sales": net_sales,
                "customer_count": customer_count,
                "avg_ticket": avg_ticket,
                "cogs": cogs,
                "cogs_rate": round(cogs_rate, 2),
                "labor_cost": labor_cost,
                "labor_cost_rate": round(labor_cost_rate_val, 2),
                "fl_ratio": round(fl, 2),
                "sales_per_labor_hour": splh,
                "gross_profit": gross_profit,
                "gross_profit_rate": round(gross_profit_rate, 2),
                "operating_profit": op,
                "operating_profit_rate": round(op_rate, 2),
                "review_score": round(review_avg, 2),
                "health_score": float(health),
                "improvement_opportunity_amount": int(improvement_opp),
                "issue_types": issues if issues else None,
                "peer_group": peer_key,
            })
            idx += 1

    return results


def generate_reviews(stores, start_date: date, end_date: date):
    results = []
    idx = 0

    for store in stores:
        global_idx = store["_global_idx"]
        base_rating = RNG.uniform(3.2, 4.5)

        # Generate ~2 reviews per month per store
        d = start_date
        while d <= end_date:
            reviews_this_month = RNG.randint(1, 4)
            for _ in range(reviews_this_month):
                review_date = d + timedelta(days=RNG.randint(0, 27))
                if review_date > end_date:
                    break

                rating = base_rating + RNG.uniform(-0.5, 0.5)
                if global_idx in REVIEW_DECLINE_STORES and review_date >= date(2026, 2, 1):
                    rating -= RNG.uniform(0.5, 1.0)
                rating = max(1.0, min(5.0, rating))

                if rating >= 3.5:
                    text = RNG.choice(REVIEW_TEMPLATES_GOOD)
                else:
                    text = RNG.choice(REVIEW_TEMPLATES_BAD)

                results.append({
                    "id": gen_deterministic_uuid("review", idx),
                    "tenant_id": TENANT_ID,
                    "store_id": store["id"],
                    "review_date": review_date,
                    "source": RNG.choice(REVIEW_SOURCES),
                    "rating": round(rating, 2),
                    "text": text,
                })
                idx += 1

            if d.month == 12:
                d = date(d.year + 1, 1, 1)
            else:
                d = date(d.year, d.month + 1, 1)

    return results


def generate_sv_visits(stores, employees, start_date: date, end_date: date):
    results = []
    idx = 0
    sv_employees = [e for e in employees if e["role"] == "sv"]

    for store in stores:
        sv = sv_employees[store["_global_idx"] % len(sv_employees)]
        d = start_date
        while d <= end_date:
            visit_date = d + timedelta(days=RNG.randint(10, 25))
            if visit_date > end_date:
                break

            results.append({
                "id": gen_deterministic_uuid("sv_visit", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "sv_employee_id": sv["id"],
                "visit_date": visit_date,
                "visit_type": RNG.choice(["regular", "follow_up", "issue_resolution"]),
                "checklist_score": round(RNG.uniform(60, 100), 2),
                "notes": "定期訪問。店舗状況を確認。",
                "findings": {"cleanliness": RNG.randint(3, 5), "service": RNG.randint(3, 5), "inventory": RNG.randint(3, 5)},
            })
            idx += 1

            if d.month == 12:
                d = date(d.year + 1, 1, 1)
            else:
                d = date(d.year, d.month + 1, 1)

    return results


def generate_tasks(stores, employees):
    results = []
    idx = 0
    sv_employees = [e for e in employees if e["role"] == "sv"]
    manager_employees = [e for e in employees if e["role"] == "manager"]

    issue_types = ["labor_overrun", "cogs_overrun", "sales_decline", "review_decline", "discount_overuse"]
    statuses = ["open", "in_progress", "done", "done", "cancelled"]
    priorities = ["high", "medium", "medium", "low"]

    title_templates = {
        "labor_overrun": "人件費率改善: シフト最適化",
        "cogs_overrun": "原価率改善: 発注・ロス管理見直し",
        "sales_decline": "売上回復: 集客施策実施",
        "review_decline": "口コミ改善: サービス品質向上",
        "discount_overuse": "割引適正化: キャンペーン見直し",
    }

    for store in stores:
        num_tasks = RNG.randint(1, 5)
        for _ in range(num_tasks):
            issue_type = RNG.choice(issue_types)
            status = RNG.choice(statuses)
            priority = RNG.choice(priorities)
            assignee = RNG.choice(manager_employees + sv_employees)
            creator = RNG.choice(sv_employees)

            due_date = date(2026, 4, 1) + timedelta(days=RNG.randint(-90, 60))
            completed_at = None
            realized = None
            expected = RNG.randint(50000, 500000) * 12

            if status == "done":
                completed_at = datetime(2026, RNG.randint(1, 4), RNG.randint(1, 28))
                realized = int(expected * RNG.uniform(0.3, 1.2))

            results.append({
                "id": gen_deterministic_uuid("task", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "title": title_templates[issue_type],
                "description": f"{store['name']}における{issue_type}への対応タスク",
                "issue_type": issue_type,
                "status": status,
                "priority": priority,
                "assigned_to": assignee["id"],
                "created_by": creator["id"],
                "due_date": due_date,
                "completed_at": completed_at,
                "expected_impact_amount": expected,
                "realized_impact_amount": realized,
                "source": RNG.choice(["manual", "ai", "workflow", "sv_mission"]),
            })
            idx += 1

    return results


def generate_value_cases(stores):
    improvement_stores = [s for s in stores if s["_global_idx"] in IMPROVEMENT_SUCCESS_STORES[:3]]
    results_cases = []
    results_metrics = []

    cases_data = [
        {"name": "関東エリア人件費改善プロジェクト", "issue_type": "labor_overrun",
         "baseline_start": date(2025, 10, 1), "baseline_end": date(2025, 12, 31),
         "measurement_start": date(2026, 2, 1), "measurement_end": date(2026, 4, 30),
         "expected": 12000000, "realized": 8500000},
        {"name": "原価率適正化キャンペーン", "issue_type": "cogs_overrun",
         "baseline_start": date(2025, 10, 1), "baseline_end": date(2025, 12, 31),
         "measurement_start": date(2026, 2, 1), "measurement_end": date(2026, 4, 30),
         "expected": 8000000, "realized": 6200000},
        {"name": "売上回復施策パッケージ", "issue_type": "sales_decline",
         "baseline_start": date(2025, 10, 1), "baseline_end": date(2025, 12, 31),
         "measurement_start": date(2026, 2, 1), "measurement_end": date(2026, 4, 30),
         "expected": 15000000, "realized": 11000000},
    ]

    for i, cd in enumerate(cases_data):
        case_id = gen_deterministic_uuid("value_case", i)
        target_ids = [s["id"] for s in improvement_stores] if improvement_stores else None

        results_cases.append({
            "id": case_id,
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": cd["name"],
            "issue_type": cd["issue_type"],
            "target_store_ids": target_ids,
            "baseline_start": cd["baseline_start"],
            "baseline_end": cd["baseline_end"],
            "measurement_start": cd["measurement_start"],
            "measurement_end": cd["measurement_end"],
            "status": "completed",
            "expected_impact_amount": cd["expected"],
            "realized_impact_amount": cd["realized"],
        })

        metrics = [
            {"metric_name": "月次売上", "baseline": 15000000, "measured": 16500000,
             "peer_adjusted": 16200000, "impact": cd["realized"] // 3},
            {"metric_name": "コスト率", "baseline": 35.5, "measured": 32.1,
             "peer_adjusted": 32.5, "impact": cd["realized"] // 3},
            {"metric_name": "営業利益率", "baseline": 5.2, "measured": 8.8,
             "peer_adjusted": 8.5, "impact": cd["realized"] // 3},
        ]
        for mi, m in enumerate(metrics):
            results_metrics.append({
                "id": gen_deterministic_uuid("value_metric", i * 10 + mi),
                "value_case_id": case_id,
                "metric_name": m["metric_name"],
                "baseline_value": m["baseline"],
                "measured_value": m["measured"],
                "peer_adjusted_value": m["peer_adjusted"],
                "estimated_impact_amount": m["impact"],
            })

    return results_cases, results_metrics


def generate_workflow_templates():
    return [
        {
            "id": gen_deterministic_uuid("wf_template", 0),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": "人件費超過アラート対応フロー",
            "trigger_type": "kpi_threshold",
            "issue_type": "labor_overrun",
            "steps": [
                {"step": 1, "action": "notify_sv", "description": "SVに通知"},
                {"step": 2, "action": "create_task", "description": "シフト見直しタスク作成"},
                {"step": 3, "action": "schedule_visit", "description": "SV訪問スケジュール"},
                {"step": 4, "action": "follow_up", "description": "2週間後フォローアップ"},
            ],
            "active": True,
        },
        {
            "id": gen_deterministic_uuid("wf_template", 1),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": "原価率超過アラート対応フロー",
            "trigger_type": "kpi_threshold",
            "issue_type": "cogs_overrun",
            "steps": [
                {"step": 1, "action": "notify_sv", "description": "SVに通知"},
                {"step": 2, "action": "analyze_menu_mix", "description": "メニューミックス分析"},
                {"step": 3, "action": "create_task", "description": "原価管理タスク作成"},
                {"step": 4, "action": "follow_up", "description": "1ヶ月後フォローアップ"},
            ],
            "active": True,
        },
    ]


def generate_meeting_pack(stores, tasks_list):
    pack_id = gen_deterministic_uuid("meeting_pack", 0)
    pack = {
        "id": pack_id,
        "tenant_id": TENANT_ID,
        "company_id": COMPANY_ID,
        "title": "2026年4月度 経営会議資料",
        "meeting_date": date(2026, 5, 10),
        "status": "draft",
        "created_by": None,
    }

    items = [
        {
            "id": gen_deterministic_uuid("meeting_item", 0),
            "pack_id": pack_id,
            "item_type": "kpi_alert",
            "title": "全店KPIサマリー",
            "content": {"description": "当月の全店KPI概況。FL比率が前月比0.5pt上昇。"},
            "store_id": None,
            "task_id": None,
            "sort_order": 1,
        },
        {
            "id": gen_deterministic_uuid("meeting_item", 1),
            "pack_id": pack_id,
            "item_type": "issue",
            "title": "人件費超過店舗への対応状況",
            "content": {"description": "5店舗で人件費率が35%を超過。シフト最適化プロジェクト進行中。"},
            "store_id": stores[2]["id"] if len(stores) > 2 else None,
            "task_id": tasks_list[0]["id"] if tasks_list else None,
            "sort_order": 2,
        },
        {
            "id": gen_deterministic_uuid("meeting_item", 2),
            "pack_id": pack_id,
            "item_type": "value_case",
            "title": "Value Realization 報告",
            "content": {"description": "3つの改善プロジェクトの効果測定結果。合計2,570万円の効果を実現。"},
            "store_id": None,
            "task_id": None,
            "sort_order": 3,
        },
        {
            "id": gen_deterministic_uuid("meeting_item", 3),
            "pack_id": pack_id,
            "item_type": "task_update",
            "title": "重要タスク進捗",
            "content": {"description": "全100件中、完了42件、進行中28件、未着手30件。"},
            "store_id": None,
            "task_id": None,
            "sort_order": 4,
        },
    ]

    return pack, items


def generate_data_quality_issues(stores):
    results = []
    idx = 0

    issues = [
        ("daily_store_sales", "net_sales", "critical", "negative_value", "売上データにマイナス値が検出されました"),
        ("daily_store_sales", "customer_count", "high", "zero_value", "来客数が0のレコードがあります"),
        ("labor_actuals", "labor_hours", "medium", "outlier", "労働時間が通常範囲を超過しています"),
        ("stores", "lat", "low", "missing_value", "緯度データが未設定です"),
        ("stores", "opening_date", "low", "missing_value", "開店日が未設定です"),
        ("products", "theoretical_cost", "medium", "missing_value", "理論原価が未設定です"),
        ("daily_store_sales", "business_date", "high", "gap_detected", "売上データに欠落日があります"),
        ("reviews", "rating", "low", "outlier", "レビュースコアが異常値です"),
    ]

    for store in stores[:20]:
        issue_def = issues[idx % len(issues)]
        status = "open" if idx % 3 != 0 else "resolved"
        results.append({
            "id": gen_deterministic_uuid("dq_issue", idx),
            "tenant_id": TENANT_ID,
            "entity_type": issue_def[0],
            "entity_id": store["id"],
            "field_name": issue_def[1],
            "severity": issue_def[2],
            "rule_key": issue_def[3],
            "description": issue_def[4],
            "status": status,
            "detected_at": datetime(2026, 4, RNG.randint(1, 28)),
            "resolved_at": datetime(2026, 4, 29) if status == "resolved" else None,
        })
        idx += 1

    return results


def generate_users():
    return [
        {
            "id": gen_deterministic_uuid("user", 0),
            "tenant_id": TENANT_ID,
            "email": "admin@aentro.jp",
            "name": "管理者",
            "role": "admin",
            "employee_id": None,
            "active": True,
            "password_hash": None,
        },
        {
            "id": gen_deterministic_uuid("user", 1),
            "tenant_id": TENANT_ID,
            "email": "sv@aentro.jp",
            "name": "SV担当",
            "role": "sv",
            "employee_id": None,
            "active": True,
            "password_hash": None,
        },
        {
            "id": gen_deterministic_uuid("user", 2),
            "tenant_id": TENANT_ID,
            "email": "manager@aentro.jp",
            "name": "店長",
            "role": "manager",
            "employee_id": None,
            "active": True,
            "password_hash": None,
        },
    ]
