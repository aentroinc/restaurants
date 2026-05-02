import uuid
import random
import math
from datetime import date, timedelta, datetime
from decimal import Decimal

RNG = random.Random(42)

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")

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


def make_uuid(namespace: int) -> uuid.UUID:
    return uuid.UUID(f"00000000-0000-0000-{namespace:04x}-{RNG.randint(0, 2**48-1):012x}")


def gen_deterministic_uuid(category: str, index: int) -> uuid.UUID:
    r = random.Random(f"{category}:{index}")
    return uuid.UUID(int=r.getrandbits(128), version=4)


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

        if cd["issue_type"] == "labor_overrun":
            metrics = [
                {"metric_name": "人件費率", "baseline": 35.0, "measured": 30.0,
                 "peer_adjusted": 30.5, "impact": cd["realized"] * 6 // 10},
                {"metric_name": "人時売上高", "baseline": 4200, "measured": 5100,
                 "peer_adjusted": 4950, "impact": cd["realized"] * 2 // 10},
                {"metric_name": "営業利益率", "baseline": 5.2, "measured": 8.1,
                 "peer_adjusted": 7.8, "impact": cd["realized"] * 2 // 10},
            ]
        elif cd["issue_type"] == "cogs_overrun":
            metrics = [
                {"metric_name": "原価率", "baseline": 38.0, "measured": 34.0,
                 "peer_adjusted": 34.5, "impact": cd["realized"] * 6 // 10},
                {"metric_name": "理論原価乖離率", "baseline": 4.5, "measured": 1.8,
                 "peer_adjusted": 2.0, "impact": cd["realized"] * 2 // 10},
                {"metric_name": "粗利率", "baseline": 62.0, "measured": 66.0,
                 "peer_adjusted": 65.5, "impact": cd["realized"] * 2 // 10},
            ]
        else:  # sales_decline
            metrics = [
                {"metric_name": "月次売上", "baseline": 12000000, "measured": 13800000,
                 "peer_adjusted": 13500000, "impact": cd["realized"] * 6 // 10},
                {"metric_name": "来客数", "baseline": 8500, "measured": 9800,
                 "peer_adjusted": 9600, "impact": cd["realized"] * 2 // 10},
                {"metric_name": "客単価", "baseline": 1410, "measured": 1410,
                 "peer_adjusted": 1410, "impact": cd["realized"] * 2 // 10},
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


def generate_lineage_events(stores):
    results = []
    idx = 0
    entity_types = ["daily_sales", "labor", "store_pl", "stores", "products", "reviews"]

    # 6 ingestion events
    for i, et in enumerate(entity_types):
        results.append({
            "id": gen_deterministic_uuid("lineage", idx),
            "tenant_id": TENANT_ID,
            "event_type": "ingestion",
            "source_type": "csv_file",
            "source_id": None,
            "target_type": "staging_batch",
            "target_id": gen_deterministic_uuid("lineage_batch", i),
            "transformation_name": "csv_parse",
            "transformation_version": "1.0",
            "metadata_": {"file_name": f"{et}_20260430.csv", "row_count": RNG.randint(500, 5000),
                          "valid_rows": RNG.randint(490, 4990), "entity_type": et},
            "created_at": datetime(2026, 4, 30, 2, 0 + i * 5),
        })
        idx += 1

    # 6 promotion events
    for i, et in enumerate(entity_types):
        results.append({
            "id": gen_deterministic_uuid("lineage", idx),
            "tenant_id": TENANT_ID,
            "event_type": "promotion",
            "source_type": "staging_batch",
            "source_id": gen_deterministic_uuid("lineage_batch", i),
            "target_type": "canonical_table",
            "target_id": None,
            "transformation_name": "promote_to_canonical",
            "transformation_version": "1.0",
            "metadata_": {"entity_type": et, "promoted_count": RNG.randint(480, 4900)},
            "created_at": datetime(2026, 4, 30, 3, 0 + i * 5),
        })
        idx += 1

    # 3 KPI calculation events
    for i in range(3):
        results.append({
            "id": gen_deterministic_uuid("lineage", idx),
            "tenant_id": TENANT_ID,
            "event_type": "kpi_calculation",
            "source_type": "canonical_table",
            "source_id": None,
            "target_type": "kpi_result",
            "target_id": None,
            "transformation_name": "kpi_recalculate",
            "transformation_version": "1.0",
            "metadata_": {"stores": RNG.randint(20, 100), "records": RNG.randint(20, 100),
                          "period": f"2026-04-{1+i*10:02d} to 2026-04-{10+i*10:02d}"},
            "created_at": datetime(2026, 4, 30, 6, i * 10),
        })
        idx += 1

    # 3 report generation events
    for i in range(3):
        results.append({
            "id": gen_deterministic_uuid("lineage", idx),
            "tenant_id": TENANT_ID,
            "event_type": "report_generation",
            "source_type": "kpi_result",
            "source_id": None,
            "target_type": "report",
            "target_id": gen_deterministic_uuid("lineage_report", i),
            "transformation_name": "monthly_report",
            "transformation_version": "1.0",
            "metadata_": {"report_type": ["executive_summary", "area_comparison", "store_detail"][i],
                          "period": "2026-04"},
            "created_at": datetime(2026, 4, 30, 7, i * 15),
        })
        idx += 1

    # 2 AI query events
    for i in range(2):
        store = stores[i] if i < len(stores) else stores[0]
        results.append({
            "id": gen_deterministic_uuid("lineage", idx),
            "tenant_id": TENANT_ID,
            "event_type": "ai_query",
            "source_type": "kpi_result",
            "source_id": None,
            "target_type": "ai_answer",
            "target_id": gen_deterministic_uuid("lineage_ai", i),
            "transformation_name": "ai_insight",
            "transformation_version": "2.0",
            "metadata_": {"query": ["原価率が高い店舗の改善策は？", "人件費率のトレンドを分析して"][i],
                          "store_id": str(store["id"]), "model": "aentro-insight-v2"},
            "created_at": datetime(2026, 4, 30, 8, i * 30),
        })
        idx += 1

    return results


def generate_writeback_data(stores):
    policies = [
        {
            "id": gen_deterministic_uuid("wb_policy", 0),
            "tenant_id": TENANT_ID,
            "action_type": "task_create",
            "policy_name": "タスク作成",
            "requires_approval": True,
            "allowed_roles": ["admin", "director", "sv"],
            "allowed_object_types": ["task"],
            "external_write_enabled": False,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("wb_policy", 1),
            "tenant_id": TENANT_ID,
            "action_type": "meeting_item_add",
            "policy_name": "会議アジェンダ追加",
            "requires_approval": False,
            "allowed_roles": ["admin", "director", "sv"],
            "allowed_object_types": ["meeting_item"],
            "external_write_enabled": False,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("wb_policy", 2),
            "tenant_id": TENANT_ID,
            "action_type": "sv_mission_create",
            "policy_name": "SVミッション作成",
            "requires_approval": True,
            "allowed_roles": ["admin", "director"],
            "allowed_object_types": ["sv_mission"],
            "external_write_enabled": False,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("wb_policy", 3),
            "tenant_id": TENANT_ID,
            "action_type": "comment_add",
            "policy_name": "コメント追加",
            "requires_approval": False,
            "allowed_roles": ["admin", "director", "sv", "manager"],
            "allowed_object_types": ["comment"],
            "external_write_enabled": False,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("wb_policy", 4),
            "tenant_id": TENANT_ID,
            "action_type": "report_update",
            "policy_name": "レポート更新",
            "requires_approval": True,
            "allowed_roles": ["admin", "director"],
            "allowed_object_types": ["report"],
            "external_write_enabled": False,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("wb_policy", 5),
            "tenant_id": TENANT_ID,
            "action_type": "kpi_change",
            "policy_name": "KPI定義変更",
            "requires_approval": True,
            "allowed_roles": ["admin"],
            "allowed_object_types": ["kpi_definition"],
            "external_write_enabled": False,
            "status": "active",
        },
    ]

    store0 = stores[0] if stores else None
    store1 = stores[4] if len(stores) > 4 else stores[0] if stores else None

    requests = [
        {
            "id": gen_deterministic_uuid("wb_request", 0),
            "tenant_id": TENANT_ID,
            "action_type": "task_create",
            "display_name": f"{store0['name']}: 原価率改善タスク作成" if store0 else "原価率改善タスク作成",
            "requested_by": None,
            "target_object_type": "task",
            "target_object_id": None,
            "payload": {"store_id": str(store0["id"]) if store0 else None, "title": "食材ロス削減（4月度原価率2.1%超過）",
                        "issue_type": "cogs", "priority": "high"},
            "status": "pending",
            "approved_by": None,
            "approved_at": None,
            "executed_at": None,
            "rollback_payload": None,
            "result": None,
        },
        {
            "id": gen_deterministic_uuid("wb_request", 1),
            "tenant_id": TENANT_ID,
            "action_type": "sv_mission_create",
            "display_name": f"{store1['name']}: SV重点チェックミッション" if store1 else "SV重点チェックミッション",
            "requested_by": None,
            "target_object_type": "sv_mission",
            "target_object_id": None,
            "payload": {"store_id": str(store1["id"]) if store1 else None,
                        "mission": "衛生管理・食材保管状況の重点確認", "due_date": "2026-05-07"},
            "status": "approved",
            "approved_by": None,
            "approved_at": datetime(2026, 4, 30, 9, 15),
            "executed_at": None,
            "rollback_payload": None,
            "result": None,
        },
        {
            "id": gen_deterministic_uuid("wb_request", 2),
            "tenant_id": TENANT_ID,
            "action_type": "meeting_item_add",
            "display_name": "5月度取締役会: FL比率改善進捗レポート追加",
            "requested_by": None,
            "target_object_type": "meeting_item",
            "target_object_id": None,
            "payload": {"meeting_type": "board", "item_title": "FL比率改善進捗（4月度実績）"},
            "status": "executed",
            "approved_by": None,
            "approved_at": None,
            "executed_at": datetime(2026, 4, 29, 18, 0, 5),
            "rollback_payload": None,
            "result": {"success": True, "meeting_pack_id": "mp-2026-05"},
        },
        {
            "id": gen_deterministic_uuid("wb_request", 3),
            "tenant_id": TENANT_ID,
            "action_type": "task_create",
            "display_name": f"{store0['name']}: シフト最適化タスク" if store0 else "シフト最適化タスク",
            "requested_by": None,
            "target_object_type": "task",
            "target_object_id": None,
            "payload": {"store_id": str(store0["id"]) if store0 else None, "title": "シフト最適化（人件費率3%超過）",
                        "issue_type": "labor_overrun", "priority": "medium"},
            "status": "approved",
            "approved_by": None,
            "approved_at": datetime(2026, 4, 28, 14, 30),
            "executed_at": None,
            "rollback_payload": None,
            "result": None,
        },
        {
            "id": gen_deterministic_uuid("wb_request", 4),
            "tenant_id": TENANT_ID,
            "action_type": "comment_add",
            "display_name": "店舗コメント追加",
            "requested_by": None,
            "target_object_type": "comment",
            "target_object_id": None,
            "payload": {"store_id": str(store1["id"]) if store1 else None,
                        "comment": "4月後半の売上回復傾向を確認。引き続きモニタリング。"},
            "status": "executed",
            "approved_by": None,
            "approved_at": None,
            "executed_at": datetime(2026, 4, 30, 10, 0),
            "rollback_payload": None,
            "result": {"success": True},
        },
    ]

    return policies, requests


def generate_workflow_instances(templates, stores, tasks_list, employees):
    results_instances = []
    results_events = []
    sv_employees = [e for e in employees if e["role"] == "sv"]

    anomaly_stores = [s for s in stores if s["_global_idx"] in LABOR_OVERRUN_STORES + COGS_OVERRUN_STORES]
    if len(anomaly_stores) < 8:
        anomaly_stores = stores[:8]

    event_idx = 0
    for i in range(min(8, len(anomaly_stores))):
        store = anomaly_stores[i]
        template = templates[i % len(templates)]
        instance_id = gen_deterministic_uuid("wf_instance", i)
        sv = sv_employees[i % len(sv_employees)]

        is_completed = i < 3
        status = "completed" if is_completed else "active"
        current_step = len(template["steps"]) - 1 if is_completed else RNG.randint(0, 2)

        results_instances.append({
            "id": instance_id,
            "tenant_id": TENANT_ID,
            "template_id": template["id"],
            "related_object_type": "store",
            "related_object_id": store["id"],
            "status": status,
            "current_step": current_step,
            "started_at": datetime(2026, 3, RNG.randint(1, 15)),
            "completed_at": datetime(2026, 4, RNG.randint(10, 25)) if is_completed else None,
        })

        results_events.append({
            "id": gen_deterministic_uuid("wf_event", event_idx),
            "workflow_instance_id": instance_id,
            "event_type": "triggered",
            "actor_id": None,
            "payload": {
                "issue_type": template["issue_type"],
                "store_name": store["name"],
                "business_date": "2026-03-31",
            },
            "created_at": datetime(2026, 3, RNG.randint(1, 15)),
        })
        event_idx += 1

        related_task = tasks_list[i % len(tasks_list)] if tasks_list else None
        results_events.append({
            "id": gen_deterministic_uuid("wf_event", event_idx),
            "workflow_instance_id": instance_id,
            "event_type": "task_created",
            "actor_id": None,
            "payload": {
                "task_id": str(related_task["id"]) if related_task else None,
                "task_title": related_task["title"] if related_task else "タスク",
            },
            "created_at": datetime(2026, 3, RNG.randint(1, 15)),
        })
        event_idx += 1

        if i < 6:
            results_events.append({
                "id": gen_deterministic_uuid("wf_event", event_idx),
                "workflow_instance_id": instance_id,
                "event_type": "sv_visited",
                "actor_id": sv["id"],
                "payload": {"visit_note": "店舗訪問、状況確認完了"},
                "created_at": datetime(2026, 3, RNG.randint(16, 28)),
            })
            event_idx += 1

        if current_step > 0 or is_completed:
            results_events.append({
                "id": gen_deterministic_uuid("wf_event", event_idx),
                "workflow_instance_id": instance_id,
                "event_type": "step_advanced",
                "actor_id": sv["id"],
                "payload": {"step": 1, "action": template["steps"][1]["action"] if len(template["steps"]) > 1 else "unknown"},
                "created_at": datetime(2026, 4, RNG.randint(1, 10)),
            })
            event_idx += 1

        if is_completed:
            results_events.append({
                "id": gen_deterministic_uuid("wf_event", event_idx),
                "workflow_instance_id": instance_id,
                "event_type": "completed",
                "actor_id": sv["id"],
                "payload": {"completed_at": datetime(2026, 4, RNG.randint(10, 25)).isoformat()},
                "created_at": datetime(2026, 4, RNG.randint(10, 25)),
            })
            event_idx += 1

    return results_instances, results_events


def generate_kpi_definitions():
    defs = [
        {
            "kpi_code": "net_sales",
            "display_name": "純売上",
            "description": "値引き・クーポン適用後の実売上高。全KPIの基盤指標。",
            "formula_expression": "gross_sales - discount_amount",
            "input_objects": ["gross_sales", "discount_amount"],
            "output_unit": "円",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "cogs_rate",
            "display_name": "原価率",
            "description": "売上に対する食材原価の比率。業態別ベンチマークと比較して管理。",
            "formula_expression": "cogs / net_sales * 100",
            "input_objects": ["cogs", "net_sales"],
            "output_unit": "%",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "labor_cost_rate",
            "display_name": "人件費率",
            "description": "売上に対する人件費（社員+PA）の比率。シフト最適化の基準指標。",
            "formula_expression": "labor_cost / net_sales * 100",
            "input_objects": ["labor_cost", "net_sales"],
            "output_unit": "%",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "fl_ratio",
            "display_name": "FL比率",
            "description": "Food & Labor比率。飲食業の最重要コスト管理指標。60%以下が目安。",
            "formula_expression": "cogs_rate + labor_cost_rate",
            "input_objects": ["cogs_rate", "labor_cost_rate"],
            "output_unit": "%",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "sales_per_labor_hour",
            "display_name": "人時売上",
            "description": "従業員1時間あたりの売上。シフト効率の直接指標。",
            "formula_expression": "net_sales / total_labor_hours",
            "input_objects": ["net_sales", "total_labor_hours"],
            "output_unit": "円/時",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "gross_profit_rate",
            "display_name": "粗利率",
            "description": "売上から原価を差し引いた粗利益の比率。",
            "formula_expression": "(net_sales - cogs) / net_sales * 100",
            "input_objects": ["net_sales", "cogs"],
            "output_unit": "%",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "operating_profit_rate",
            "display_name": "営業利益率",
            "description": "全経費控除後の営業利益率。店舗の最終的な収益性指標。",
            "formula_expression": "operating_profit / sales * 100",
            "input_objects": ["operating_profit", "sales"],
            "output_unit": "%",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "avg_ticket",
            "display_name": "客単価",
            "description": "来店客1人あたりの平均売上。メニューミックスとアップセル施策の効果を測定。",
            "formula_expression": "net_sales / customer_count",
            "input_objects": ["net_sales", "customer_count"],
            "output_unit": "円",
            "version": 1,
            "status": "approved",
        },
        {
            "kpi_code": "health_score",
            "display_name": "健全度スコア",
            "description": "複数KPIの加重平均による店舗の総合健全度。0〜100点。ランキングとアラートの基準。",
            "formula_expression": "weighted_composite(cogs_rate, labor_cost_rate, fl_ratio, review_score, task_completion_rate)",
            "input_objects": ["cogs_rate", "labor_cost_rate", "fl_ratio", "review_score", "task_completion_rate"],
            "output_unit": "点",
            "version": 2,
            "status": "approved",
        },
        {
            "kpi_code": "improvement_opportunity",
            "display_name": "改善余地",
            "description": "同業態ピアグループの中央値まで改善した場合に見込まれる月間利益増加額。",
            "formula_expression": "(peer_median - current_value) * revenue_scale_factor",
            "input_objects": ["peer_median", "current_kpi_values", "monthly_net_sales"],
            "output_unit": "円/月",
            "version": 1,
            "status": "approved",
        },
    ]

    results = []
    approved_at = datetime(2025, 1, 1)
    for i, d in enumerate(defs):
        results.append({
            "id": gen_deterministic_uuid("kpi_def", i),
            "tenant_id": TENANT_ID,
            "kpi_code": d["kpi_code"],
            "display_name": d["display_name"],
            "description": d["description"],
            "formula_expression": d["formula_expression"],
            "input_objects": d["input_objects"],
            "output_unit": d["output_unit"],
            "version": d["version"],
            "status": d["status"],
            "approved_by": None,
            "approved_at": approved_at,
            "effective_from": approved_at,
            "effective_to": None,
        })
    return results


def generate_ontology_data():
    object_types_defs = [
        {"name": "store", "display_name": "店舗", "description": "飲食店舗マスタ。POSデータ・勤怠データの集約単位。", "base_table": "stores", "icon": "store"},
        {"name": "brand", "display_name": "ブランド", "description": "飲食ブランド。複数店舗を束ねるサービスモデル単位。", "base_table": "brands", "icon": "tag"},
        {"name": "product", "display_name": "商品", "description": "メニュー商品マスタ。原価・カテゴリ情報を保持。", "base_table": "products", "icon": "package"},
        {"name": "employee", "display_name": "従業員", "description": "店舗スタッフ・SV・エリアマネージャー等の人事マスタ。", "base_table": "employees", "icon": "user"},
        {"name": "task", "display_name": "タスク", "description": "改善タスク。AIまたはSVが起票し、店舗で実行。", "base_table": "tasks", "icon": "check-square"},
        {"name": "sv_visit", "display_name": "SV訪問", "description": "SVによる店舗訪問記録。チェックリスト結果を含む。", "base_table": "sv_visits", "icon": "clipboard"},
        {"name": "review", "display_name": "レビュー", "description": "Googleレビュー等の口コミデータ。感情分析結果付き。", "base_table": "reviews", "icon": "message-circle"},
        {"name": "meeting_pack", "display_name": "経営会議パック", "description": "経営会議用の資料パッケージ。", "base_table": "board_meeting_packs", "icon": "briefcase"},
        {"name": "value_case", "display_name": "改善施策", "description": "改善施策の効果測定ケース。", "base_table": "value_cases", "icon": "trending-up"},
    ]

    object_types = []
    ot_id_map = {}
    for i, ot in enumerate(object_types_defs):
        ot_id = gen_deterministic_uuid("ontology_ot", i)
        ot_id_map[ot["name"]] = ot_id
        object_types.append({
            "id": ot_id,
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": ot["name"],
            "display_name": ot["display_name"],
            "description": ot["description"],
            "base_table": ot["base_table"],
            "icon": ot["icon"],
            "is_system": True,
        })

    # Fields for Store type
    store_fields_defs = [
        ("store_code", "店舗コード", "string", "code"),
        ("store_name", "店舗名", "string", "name"),
        ("prefecture", "都道府県", "string", "prefecture"),
        ("city", "市区町村", "string", "city"),
        ("trade_area_type", "商圏タイプ", "string", "trade_area_type"),
        ("seat_count", "座席数", "integer", "seat_count"),
        ("status", "ステータス", "string", "status"),
        ("opening_date", "開店日", "date", "opening_date"),
        ("parking", "駐車場", "boolean", "parking"),
        ("drive_through", "ドライブスルー", "boolean", "drive_through"),
        ("delivery", "デリバリー", "boolean", "delivery"),
        ("takeout", "テイクアウト", "boolean", "takeout"),
        ("lat", "緯度", "float", "lat"),
        ("lng", "経度", "float", "lng"),
    ]

    fields = []
    store_ot_id = ot_id_map["store"]
    for i, (name, display, ftype, source) in enumerate(store_fields_defs):
        fields.append({
            "id": gen_deterministic_uuid("ontology_field", i),
            "object_type_id": store_ot_id,
            "name": name,
            "display_name": display,
            "field_type": ftype,
            "source_column": source,
            "is_required": name in ("store_code", "store_name", "status"),
            "is_filterable": True,
            "is_sensitive": False,
        })

    # Relation types
    relation_defs = [
        ("belongs_to_brand", "ブランド所属", "store", "brand", "many_to_one", "店舗はひとつのブランドに所属"),
        ("belongs_to_area", "エリア所属", "store", "brand", "many_to_one", "店舗はひとつのエリアに所属"),
        ("managed_by", "店長", "store", "employee", "many_to_one", "店舗は店長が管理"),
        ("has_task", "タスク割当", "store", "task", "one_to_many", "店舗は複数のタスクを持つ"),
        ("has_review", "レビュー", "store", "review", "one_to_many", "店舗は複数のレビューを持つ"),
        ("has_product", "商品提供", "brand", "product", "one_to_many", "ブランドは複数の商品を持つ"),
        ("assigned_to", "担当者", "task", "employee", "many_to_one", "タスクは担当者に割当"),
    ]

    relation_types = []
    for i, (name, display, from_t, to_t, card, desc) in enumerate(relation_defs):
        relation_types.append({
            "id": gen_deterministic_uuid("ontology_rel", i),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": name,
            "display_name": display,
            "from_object_type_id": ot_id_map[from_t],
            "to_object_type_id": ot_id_map[to_t],
            "cardinality": card,
            "description": desc,
        })

    return object_types, fields, relation_types


def generate_industry_playbooks():
    playbooks = [
        {
            "service_model": "beef_bowl",
            "name": "牛丼・定食チェーン改善プレイブック",
            "kpi_definitions": [
                {"code": "sales_per_labor_hour", "name": "人時売上", "target": 5000, "unit": "円/時"},
                {"code": "hourly_sales_mix", "name": "時間帯別売上構成", "target": None, "unit": "%"},
                {"code": "takeout_ratio", "name": "テイクアウト比率", "target": 25, "unit": "%"},
                {"code": "cogs_rate", "name": "原価率", "target": 32, "unit": "%"},
                {"code": "avg_ticket", "name": "客単価", "target": 650, "unit": "円"},
            ],
            "issue_rules": [
                {"issue_type": "idle_time_labor", "description": "アイドルタイムの人件費過剰", "threshold": {"sales_per_labor_hour": {"below": 4000}}},
                {"issue_type": "peak_understaffing", "description": "ピーク時間帯の人員不足", "threshold": {"peak_wait_time": {"above": 10}}},
                {"issue_type": "takeout_decline", "description": "テイクアウト比率低下", "threshold": {"takeout_ratio": {"below": 20}}},
                {"issue_type": "cogs_rice_meat", "description": "米・肉の原価高騰", "threshold": {"cogs_rate": {"above": 35}}},
            ],
            "recommended_actions": [
                {"action": "アイドルタイムシフト削減", "description": "14-17時のシフト人数を見直し、人時売上を改善", "expected_impact": 200000},
                {"action": "ピーク配置最適化", "description": "11-13時のキッチン・フロア配置バランスを調整", "expected_impact": 150000},
                {"action": "セット販売強化", "description": "味噌汁・サラダのセット推奨で客単価向上", "expected_impact": 100000},
                {"action": "低粗利商品見直し", "description": "原価率40%超の商品の価格改定またはメニュー変更", "expected_impact": 250000},
            ],
        },
        {
            "service_model": "sushi",
            "name": "回転寿司チェーン改善プレイブック",
            "kpi_definitions": [
                {"code": "fish_cogs_rate", "name": "ネタ原価率", "target": 38, "unit": "%"},
                {"code": "waste_rate", "name": "廃棄率", "target": 3, "unit": "%"},
                {"code": "table_turnover", "name": "テーブル回転", "target": 3.5, "unit": "回/日"},
                {"code": "avg_ticket", "name": "客単価", "target": 1500, "unit": "円"},
                {"code": "wait_time", "name": "待ち時間", "target": 15, "unit": "分"},
            ],
            "issue_rules": [
                {"issue_type": "fish_cogs_overrun", "description": "ネタ原価率超過", "threshold": {"fish_cogs_rate": {"above": 42}}},
                {"issue_type": "waste_increase", "description": "廃棄率上昇", "threshold": {"waste_rate": {"above": 5}}},
                {"issue_type": "turnover_decline", "description": "テーブル回転率低下", "threshold": {"table_turnover": {"below": 3.0}}},
                {"issue_type": "premium_mix_decline", "description": "高単価商品比率低下", "threshold": {"premium_ratio": {"below": 15}}},
            ],
            "recommended_actions": [
                {"action": "仕入単価交渉", "description": "主要仕入先との価格交渉および代替仕入先の開拓", "expected_impact": 300000},
                {"action": "廃棄削減オペ", "description": "レーン管理の見直しと需要予測に基づく握り調整", "expected_impact": 200000},
                {"action": "回転率改善", "description": "予約管理と配膳効率化によるテーブル回転向上", "expected_impact": 250000},
                {"action": "高単価商品訴求", "description": "季節ネタや限定メニューの訴求強化", "expected_impact": 180000},
            ],
        },
        {
            "service_model": "burger",
            "name": "バーガー/QSRチェーン改善プレイブック",
            "kpi_definitions": [
                {"code": "service_time", "name": "提供時間", "target": 180, "unit": "秒"},
                {"code": "set_rate", "name": "セット率", "target": 65, "unit": "%"},
                {"code": "drive_through_ratio", "name": "ドライブスルー売上比率", "target": 35, "unit": "%"},
                {"code": "mobile_order_ratio", "name": "モバイルオーダー比率", "target": 20, "unit": "%"},
                {"code": "cogs_rate", "name": "原価率", "target": 30, "unit": "%"},
            ],
            "issue_rules": [
                {"issue_type": "service_time_increase", "description": "提供時間超過", "threshold": {"service_time": {"above": 240}}},
                {"issue_type": "set_rate_decline", "description": "セット率低下", "threshold": {"set_rate": {"below": 55}}},
                {"issue_type": "drive_through_decline", "description": "ドライブスルー売上低下", "threshold": {"drive_through_ratio": {"below": 25}}},
                {"issue_type": "mobile_order_decline", "description": "モバイルオーダー比率低下", "threshold": {"mobile_order_ratio": {"below": 15}}},
            ],
            "recommended_actions": [
                {"action": "キッチンフロー最適化", "description": "調理工程の並列化とバッファ在庫の設定", "expected_impact": 200000},
                {"action": "セット推奨トレーニング", "description": "レジスタッフのセット提案トークスクリプト導入", "expected_impact": 150000},
                {"action": "DT動線改善", "description": "ドライブスルーの注文・受取動線の効率化", "expected_impact": 180000},
                {"action": "アプリクーポン施策", "description": "モバイルオーダー限定クーポンで利用率向上", "expected_impact": 120000},
            ],
        },
    ]

    results = []
    for i, pb in enumerate(playbooks):
        results.append({
            "id": gen_deterministic_uuid("playbook", i),
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "service_model": pb["service_model"],
            "name": pb["name"],
            "kpi_definitions": pb["kpi_definitions"],
            "issue_rules": pb["issue_rules"],
            "recommended_actions": pb["recommended_actions"],
        })

    return results
