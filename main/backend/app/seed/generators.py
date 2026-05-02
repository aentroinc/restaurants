import uuid
import random
import math
from datetime import date, timedelta, datetime
from decimal import Decimal

RNG = random.Random(42)

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")

REGIONS = [
    {"name": "北海道", "code": "HOKKAIDO"},
    {"name": "東北", "code": "TOHOKU"},
    {"name": "関東", "code": "KANTO"},
    {"name": "首都圏", "code": "METRO"},
    {"name": "中部", "code": "CHUBU"},
    {"name": "東海", "code": "TOKAI"},
    {"name": "関西", "code": "KANSAI"},
    {"name": "中国四国", "code": "CHUSHIKOKU"},
    {"name": "九州", "code": "KYUSHU"},
]

AREAS_PER_REGION = {
    "HOKKAIDO": [
        {"name": "札幌", "code": "HK01"},
        {"name": "旭川・函館", "code": "HK02"},
    ],
    "TOHOKU": [
        {"name": "仙台", "code": "TH01"},
        {"name": "盛岡", "code": "TH02"},
    ],
    "KANTO": [
        {"name": "宇都宮", "code": "KT01"},
        {"name": "高崎", "code": "KT02"},
        {"name": "水戸", "code": "KT03"},
    ],
    "METRO": [
        {"name": "品川(本社)", "code": "MT01"},
        {"name": "新宿・渋谷", "code": "MT02"},
        {"name": "横浜", "code": "MT03"},
        {"name": "千葉", "code": "MT04"},
        {"name": "大宮", "code": "MT05"},
        {"name": "八王子・町田", "code": "MT06"},
    ],
    "CHUBU": [
        {"name": "長野", "code": "CB01"},
        {"name": "新潟", "code": "CB02"},
        {"name": "金沢", "code": "CB03"},
    ],
    "TOKAI": [
        {"name": "名古屋", "code": "TK01"},
        {"name": "静岡", "code": "TK02"},
        {"name": "浜松", "code": "TK03"},
    ],
    "KANSAI": [
        {"name": "大阪", "code": "KS01"},
        {"name": "京都", "code": "KS02"},
        {"name": "神戸", "code": "KS03"},
    ],
    "CHUSHIKOKU": [
        {"name": "広島", "code": "CS01"},
        {"name": "岡山", "code": "CS02"},
        {"name": "松山・高松", "code": "CS03"},
    ],
    "KYUSHU": [
        {"name": "福岡", "code": "KY01"},
        {"name": "熊本", "code": "KY02"},
        {"name": "鹿児島", "code": "KY03"},
    ],
}

BRANDS = [
    {"name": "すき家", "service_model": "beef_bowl", "store_count": 50,
     "avg_ticket_range": (450, 600), "daily_sales_range": (350000, 900000),
     "cogs_target": 35, "labor_target": 27},
    {"name": "はま寿司", "service_model": "sushi", "store_count": 20,
     "avg_ticket_range": (1000, 1200), "daily_sales_range": (500000, 1500000),
     "cogs_target": 42, "labor_target": 25},
    {"name": "ココス", "service_model": "family_restaurant", "store_count": 15,
     "avg_ticket_range": (1000, 1500), "daily_sales_range": (400000, 1000000),
     "cogs_target": 32, "labor_target": 32},
    {"name": "なか卯", "service_model": "donburi_udon", "store_count": 10,
     "avg_ticket_range": (500, 700), "daily_sales_range": (250000, 600000),
     "cogs_target": 33, "labor_target": 28},
    {"name": "ジョリーパスタ", "service_model": "pasta", "store_count": 5,
     "avg_ticket_range": (900, 1200), "daily_sales_range": (350000, 800000),
     "cogs_target": 30, "labor_target": 30},
]

PREFECTURES = {
    "HOKKAIDO": ["北海道"],
    "TOHOKU": ["宮城県", "岩手県"],
    "KANTO": ["栃木県", "群馬県", "茨城県"],
    "METRO": ["東京都", "神奈川県", "千葉県", "埼玉県"],
    "CHUBU": ["長野県", "新潟県", "石川県"],
    "TOKAI": ["愛知県", "静岡県"],
    "KANSAI": ["大阪府", "京都府", "兵庫県"],
    "CHUSHIKOKU": ["広島県", "岡山県", "愛媛県", "香川県"],
    "KYUSHU": ["福岡県", "熊本県", "鹿児島県"],
}

CITIES = {
    "北海道": ["札幌市", "旭川市", "函館市"],
    "宮城県": ["仙台市", "石巻市"],
    "岩手県": ["盛岡市", "一関市"],
    "栃木県": ["宇都宮市", "小山市"],
    "群馬県": ["高崎市", "前橋市"],
    "茨城県": ["水戸市", "つくば市"],
    "東京都": ["品川区", "新宿区", "渋谷区", "港区", "豊島区", "中野区", "目黒区", "世田谷区", "八王子市", "町田市"],
    "神奈川県": ["横浜市", "川崎市", "相模原市", "藤沢市"],
    "千葉県": ["千葉市", "船橋市", "柏市", "松戸市"],
    "埼玉県": ["さいたま市", "川越市", "所沢市", "越谷市"],
    "長野県": ["長野市", "松本市"],
    "新潟県": ["新潟市", "長岡市"],
    "石川県": ["金沢市", "白山市"],
    "愛知県": ["名古屋市", "豊田市", "一宮市", "春日井市"],
    "静岡県": ["静岡市", "浜松市", "沼津市"],
    "大阪府": ["大阪市", "堺市", "豊中市", "吹田市", "東大阪市"],
    "京都府": ["京都市", "宇治市"],
    "兵庫県": ["神戸市", "姫路市", "西宮市"],
    "広島県": ["広島市", "福山市"],
    "岡山県": ["岡山市", "倉敷市"],
    "愛媛県": ["松山市", "今治市"],
    "香川県": ["高松市", "丸亀市"],
    "福岡県": ["福岡市", "北九州市", "久留米市"],
    "熊本県": ["熊本市", "八代市"],
    "鹿児島県": ["鹿児島市", "霧島市"],
}

TRADE_AREA_TYPES = ["駅前", "ロードサイド", "商業施設", "オフィス街", "住宅街"]

EMPLOYEE_ROLES = {
    "director": 5,
    "sv": 15,
    "manager": 30,
}

SUKIYA_PRODUCTS = {
    "メイン": [("牛丼並盛", 450, 158), ("牛丼大盛", 580, 203), ("牛丼特盛", 730, 256), ("豚丼並盛", 400, 132)],
    "バリエーション": [("ねぎ玉牛丼", 550, 193), ("キムチ牛丼", 530, 186), ("チーズ牛丼", 550, 193)],
    "カレー": [("カレー並盛", 550, 165), ("牛あいがけカレー", 680, 238)],
    "サイド": [("味噌汁", 80, 16), ("サラダ", 140, 28), ("牛皿", 350, 123)],
    "限定": [("うな丼", 980, 392)],
}

HAMAZUSHI_PRODUCTS = {
    "にぎり": [("まぐろ", 160, 72), ("サーモン", 160, 64), ("えび", 160, 56), ("いか", 160, 48), ("たまご", 160, 20)],
    "プレミアム": [("中とろ", 330, 165), ("特盛りサーモン", 330, 132)],
    "サイド": [("味噌汁", 110, 22), ("茶碗蒸し", 220, 66)],
    "セット": [("ランチセット", 580, 232)],
    "ドリンク": [("ビール", 418, 105), ("日本酒", 418, 105)],
}

COCOS_PRODUCTS = {
    "メイン": [("包み焼きハンバーグ", 1099, 330), ("チーズインハンバーグ", 1199, 360),
              ("ビーフシチュー", 1299, 390), ("ミックスグリル", 1399, 420)],
    "サイド": [("シーザーサラダ", 549, 110), ("ドリンクバー", 319, 32), ("ライス", 220, 44), ("スープバー", 319, 48)],
}

NAKAU_PRODUCTS = {
    "丼": [("親子丼並", 490, 162), ("親子丼大盛", 590, 195), ("カツ丼並", 590, 207), ("牛丼並", 450, 158)],
    "うどん": [("京風きつねうどん", 430, 129), ("鶏塩うどん", 530, 159)],
    "セット": [("小うどんセット", 190, 57)],
    "サイド": [("味噌汁", 80, 16)],
}

JOLLYPASTA_PRODUCTS = {
    "パスタ": [("ミートソース", 769, 231), ("カルボナーラ", 879, 264), ("ペペロンチーノ", 769, 231),
              ("シーフードパスタ", 979, 294)],
    "ピザ": [("マルゲリータピザ", 879, 264)],
    "サイド": [("サラダ", 439, 88), ("ドリンクバー", 319, 32), ("ティラミス", 439, 132)],
}

REVIEW_SOURCES = ["google", "tabelog", "hotpepper", "gurunavi"]

REVIEW_TEMPLATES_GOOD = [
    # すき家
    "牛丼のタレが絶妙。何度来ても飽きない。",
    "24時間営業がありがたい。深夜でもクオリティが安定している。",
    "テイクアウトの注文が簡単になった。アプリが便利。",
    "セルフレジの導入で回転が速くなった。",
    # はま寿司
    "160円でこの品質は驚き。ネタが新鮮。",
    "タッチパネルの注文が子供でも使いやすい。",
    "期間限定メニューが毎回楽しみ。",
    # ココス
    "包み焼きハンバーグは鉄板メニュー。ジューシーで美味しい。",
    "ドリンクバーの種類が豊富。ゆっくりできる。",
    "子供連れに最適。キッズメニューが充実。",
    # なか卯
    "親子丼の卵がトロトロで最高。",
    "京風うどんのダシが本格的。関西出身としても満足。",
    # ジョリーパスタ
    "生パスタのモチモチ感が他チェーンとは違う。",
    "ランチセットがお得。スープバー付きで嬉しい。",
    # 共通
    "清潔で快適な店内でした。",
    "スタッフの対応が丁寧で気持ちよく食事できました。",
    "コスパが良く、大満足です。",
    "駐車場が広くて停めやすい。",
    "何度来ても安定した美味しさ。",
    "テイクアウトの包装が丁寧。",
]

REVIEW_TEMPLATES_BAD = [
    # すき家（異物混入関連）
    "最近のニュースが気になる。安全管理は大丈夫なのか。",
    "以前より明らかに味が落ちた。コストカットしすぎ。",
    "深夜のワンオペが心配。店員さんが大変そう。",
    # はま寿司
    "値上げ後のコスパが微妙。160円は高く感じる。",
    "待ち時間が30分以上。回転が悪すぎる。",
    "ネタが小さくなった気がする。",
    # ココス
    "ランチの提供が遅い。15分以上待った。",
    "人手不足なのか、呼んでもなかなか来ない。",
    # なか卯
    "券売機の操作がわかりにくい。年配者には厳しい。",
    "うどんの量が減った。",
    # ジョリーパスタ
    "価格に見合わない。もう少し安くしてほしい。",
    # 共通
    "店内が汚れていた。テーブルが拭かれていない。",
    "接客態度が悪い。挨拶もない。",
    "料理が冷めていた。作り置き感がある。",
    "トイレが不衛生。",
    "混雑時の対応が雑。",
    "エアコンが効きすぎて寒い。",
    "メニューの写真と実物が違いすぎる。",
    "配膳間違いがあった。",
    "騒がしい客がいても注意しない。",
]

# Brand-specific bad review templates for anomaly stores
REVIEW_TEMPLATES_SUKIYA_INCIDENT = [
    "異物混入の件があってから不安で足が遠のいている。",
    "SNSで異物混入の話を見て以来行っていない。衛生管理は大丈夫なのか。",
    "異物混入が心配。子供を連れて行くのが怖い。",
    "前に来た時に髪の毛が入っていた。それ以来行っていない。",
    "衛生面が心配。しばらく様子見。",
]

REVIEW_TEMPLATES_HAMAZUSHI_PRICE = [
    "コメの値段が上がったせいか、以前よりネタが小さくなった気がする。",
    "値上げ後のコスパが悪い。以前の160円一皿が懐かしい。",
    "シャリの量が減った？原価高騰の影響を感じる。",
]

REVIEW_TEMPLATES_COCOS_WAIT = [
    "休日のランチは1時間待ち。もう少しスタッフを増やしてほしい。",
    "料理の提供が遅すぎる。人手不足なのはわかるが改善してほしい。",
    "注文してから30分以上待たされた。スタッフが足りていない。",
]

# Anomaly store indices per brand (global store indices)
# すき家 = 0-49, はま寿司 = 50-69, ココス = 70-84, なか卯 = 85-94, ジョリーパスタ = 95-99

# --- Existing 6 ---
LABOR_OVERRUN_STORES = [2, 8, 15, 22, 38]
COGS_OVERRUN_STORES = [5, 12, 25, 33, 45]
SALES_DECLINE_STORES = [7, 18, 30, 42, 55]
REVIEW_DECLINE_STORES = [10, 28, 50]
DISCOUNT_OVERUSE_STORES = [14, 35, 60]
IMPROVEMENT_SUCCESS_STORES = [3, 20, 40, 52, 65]

# --- New 14 ---
CONTAMINATION_IMPACT_STORES = [1, 6, 11, 16, 21]       # すき家 異物混入
LATE_NIGHT_LABOR_STORES = [0, 4, 9, 13, 19, 23, 27, 31, 36, 39]  # すき家 深夜帯
TAKEOUT_RATIO_DROP_STORES = [3, 17, 24]                 # テイクアウト低下
RICE_COST_SURGE_STORES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68]  # はま寿司 コメ高騰
WASTE_INCREASE_STORES = [51, 53, 57, 61]                # はま寿司 廃棄増
WAIT_TIME_LONG_STORES = [55, 59, 63]                    # はま寿司 待ち時間
PEAK_UNDERSTAFFED_STORES = [70, 73, 76, 79, 82]         # ココス ピーク人員不足
MINIMUM_WAGE_IMPACT_STORES = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49]  # 全ブランド 最低賃金
DELIVERY_MARGIN_STORES = [6, 16, 26, 36, 46]            # デリバリー利益率悪化
ENERGY_COST_STORES = [3, 13, 23, 33, 43, 53, 63, 73, 83, 93]  # 光熱費高騰
NEW_STORE_RAMPUP_STORES = [97, 98, 99]                  # 新店立ち上がり好調
UDON_SEASON_STORES = [90, 91, 92]                       # なか卯 うどん季節需要
TICKET_MACHINE_ISSUE_STORES = [93, 94]                   # なか卯 券売機トラブル
DRINK_BAR_COST_STORES = [75, 78]                         # ココス ドリンクバー原価上昇


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
                "email": f"{role}{idx+1}@zensho.co.jp",
                "active": True,
            })
            idx += 1

    # assign SVs to areas
    sv_employees = [e for e in results if e["role"] == "sv"]
    for i, area in enumerate(areas):
        if i < len(sv_employees):
            area["sv_employee_id"] = sv_employees[i]["id"]

    return results


# Realistic store location names per brand
SUKIYA_STORE_LOCATIONS = [
    "品川港南", "新宿三丁目", "渋谷宮益坂", "横浜鶴見", "千葉中央", "大宮東口", "八王子南口", "町田中央",
    "札幌北24条", "仙台泉中央", "盛岡青山", "宇都宮東", "高崎問屋町", "水戸笠原",
    "長野稲里", "新潟紫竹山", "金沢有松", "名古屋錦", "静岡馬渕", "浜松高丘",
    "大阪堺筋本町", "京都四条大宮", "神戸三宮", "広島大州", "岡山大安寺", "松山南",
    "福岡天神", "熊本東バイパス", "鹿児島中央", "川崎幸", "船橋北口", "川越脇田",
    "品川大井", "新宿南口", "渋谷桜丘", "横浜都筑", "柏東口", "越谷東大沢",
    "目黒三田", "世田谷上馬", "豊島要町", "中野新橋", "相模原橋本", "藤沢石川",
    "松戸八柱", "所沢東", "名古屋東別院", "一宮大和", "豊田山之手", "春日井高蔵寺",
]

HAMAZUSHI_STORE_LOCATIONS = [
    "品川シーサイド", "横浜六角橋", "千葉都賀", "大宮吉敷", "八王子堀之内",
    "札幌白石", "仙台南吉成", "宇都宮鶴田", "高崎貝沢",
    "名古屋茶屋", "静岡清水", "浜松志都呂",
    "大阪鶴見", "京都伏見", "神戸多聞",
    "広島祇園", "岡山久米",
    "福岡志免", "熊本佐土原", "鹿児島吉野",
]

COCOS_STORE_LOCATIONS = [
    "品川大井町", "横浜港北", "千葉おゆみ野", "大宮三橋", "町田小山",
    "仙台富沢", "宇都宮インターパーク",
    "名古屋守山", "静岡安倍川",
    "大阪枚方", "京都桂",
    "広島五日市",
    "福岡大野城", "熊本清水", "鹿児島荒田",
]

NAKAU_STORE_LOCATIONS = [
    "品川駅東口", "新宿靖国通り", "渋谷宮下公園", "横浜駅西口", "千葉駅前",
    "大宮駅東口", "名古屋栄", "大阪梅田",
    "京都河原町", "神戸元町",
]

JOLLYPASTA_STORE_LOCATIONS = [
    "品川ウィング", "横浜センター北", "千葉ペリエ", "名古屋緑", "大阪堺中百舌鳥",
]


def generate_stores(brands_def, brand_records, areas, employees):
    results = []
    global_idx = 0
    manager_employees = [e for e in employees if e["role"] == "manager"]

    store_location_lists = [
        SUKIYA_STORE_LOCATIONS,
        HAMAZUSHI_STORE_LOCATIONS,
        COCOS_STORE_LOCATIONS,
        NAKAU_STORE_LOCATIONS,
        JOLLYPASTA_STORE_LOCATIONS,
    ]

    region_map = {
        "HK": "HOKKAIDO", "TH": "TOHOKU", "KT": "KANTO", "MT": "METRO",
        "CB": "CHUBU", "TK": "TOKAI", "KS": "KANSAI", "CS": "CHUSHIKOKU", "KY": "KYUSHU",
    }

    # Brand-specific trade area tendencies
    brand_trade_areas = {
        "beef_bowl": ["ロードサイド", "ロードサイド", "ロードサイド", "駅前", "住宅街"],  # mostly ロードサイド
        "sushi": ["ロードサイド", "ロードサイド", "商業施設", "住宅街", "駅前"],
        "family_restaurant": ["ロードサイド", "ロードサイド", "商業施設", "商業施設", "住宅街"],
        "donburi_udon": ["駅前", "駅前", "駅前", "オフィス街", "商業施設"],  # mostly 駅前
        "pasta": ["商業施設", "ロードサイド", "駅前", "住宅街", "商業施設"],
    }

    for brand_idx, brand_def in enumerate(BRANDS):
        brand_id = brand_records[brand_idx]["id"]
        count = brand_def["store_count"]
        locations = store_location_lists[brand_idx]
        trade_areas = brand_trade_areas[brand_def["service_model"]]

        for j in range(count):
            area = areas[global_idx % len(areas)]
            region_code = area["code"][:2]
            region_key = region_map.get(region_code, "METRO")
            prefs = PREFECTURES[region_key]
            pref = prefs[global_idx % len(prefs)]
            cities = CITIES.get(pref, ["市内"])
            city = cities[global_idx % len(cities)]
            trade_area = trade_areas[global_idx % len(trade_areas)]

            manager = manager_employees[global_idx % len(manager_employees)] if manager_employees else None

            lat = 35.0 + RNG.uniform(-3, 3)
            lng = 135.0 + RNG.uniform(-3, 3)

            opening_date = date(2015, 1, 1) + timedelta(days=RNG.randint(0, 3000))

            # Use realistic store name from location list
            location_name = locations[j % len(locations)]
            if brand_def["name"] == "すき家":
                store_name = f"すき家 {location_name}店"
            elif brand_def["name"] == "はま寿司":
                store_name = f"はま寿司 {location_name}店"
            elif brand_def["name"] == "ココス":
                store_name = f"ココス {location_name}店"
            elif brand_def["name"] == "なか卯":
                store_name = f"なか卯 {location_name}店"
            else:
                store_name = f"ジョリーパスタ {location_name}店"

            # すき家 drive-through at roadside
            has_drive_through = trade_area == "ロードサイド" and brand_def["service_model"] == "beef_bowl"

            results.append({
                "id": gen_deterministic_uuid("store", global_idx),
                "tenant_id": TENANT_ID,
                "brand_id": brand_id,
                "area_id": area["id"],
                "code": f"{brand_def['service_model'][:3].upper()}{j+1:03d}",
                "name": store_name,
                "prefecture": pref,
                "city": city,
                "address": f"{city}{RNG.randint(1,9)}-{RNG.randint(1,30)}-{RNG.randint(1,15)}",
                "trade_area_type": trade_area,
                "opening_date": opening_date,
                "seat_count": RNG.randint(20, 80),
                "parking": trade_area == "ロードサイド",
                "drive_through": has_drive_through,
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
    product_maps = [SUKIYA_PRODUCTS, HAMAZUSHI_PRODUCTS, COCOS_PRODUCTS, NAKAU_PRODUCTS, JOLLYPASTA_PRODUCTS]
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


def _growth_factor(d: date, base_date: date = date(2023, 4, 1)) -> float:
    days = (d - base_date).days
    return 1.0 + days * 0.00005


def _anomaly_factor(global_idx: int, d: date, anomaly_type: str) -> float:
    """Returns multiplier for anomaly stores, only in recent months."""
    recent_start = date(2026, 2, 1)

    # Pre-improvement bad period (always applies before recent)
    if anomaly_type == "improvement_success" and global_idx in IMPROVEMENT_SUCCESS_STORES:
        if d >= date(2025, 10, 1) and d < date(2026, 1, 1):
            return 0.80
        if d >= recent_start:
            return 1.10
        return 1.0

    # New store ramp-up: starts low, grows quickly
    if anomaly_type == "new_store_rampup" and global_idx in NEW_STORE_RAMPUP_STORES:
        if d >= date(2025, 11, 1) and d < date(2026, 1, 1):
            return 0.65  # just opened, ramping
        if d >= date(2026, 1, 1) and d < recent_start:
            return 0.85
        if d >= recent_start:
            return 1.15  # now performing well
        return 1.0

    # Udon seasonal: boost in winter months
    if anomaly_type == "udon_season" and global_idx in UDON_SEASON_STORES:
        if d.month in (11, 12, 1, 2):
            return 1.12
        if d.month in (7, 8):
            return 0.88
        return 1.0

    if d < recent_start:
        return 1.0

    # --- Recent-period anomalies (2026-02+) ---
    if anomaly_type == "sales_decline" and global_idx in SALES_DECLINE_STORES:
        return 0.75
    if anomaly_type == "contamination_impact" and global_idx in CONTAMINATION_IMPACT_STORES:
        return 0.82
    if anomaly_type == "takeout_ratio_drop" and global_idx in TAKEOUT_RATIO_DROP_STORES:
        return 0.90
    if anomaly_type == "ticket_machine_issue" and global_idx in TICKET_MACHINE_ISSUE_STORES:
        return 0.88
    if anomaly_type == "wait_time_long" and global_idx in WAIT_TIME_LONG_STORES:
        return 0.92
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
            contamination = _anomaly_factor(global_idx, d, "contamination_impact")
            takeout_drop = _anomaly_factor(global_idx, d, "takeout_ratio_drop")
            new_ramp = _anomaly_factor(global_idx, d, "new_store_rampup")
            udon = _anomaly_factor(global_idx, d, "udon_season")
            ticket_issue = _anomaly_factor(global_idx, d, "ticket_machine_issue")
            wait_long = _anomaly_factor(global_idx, d, "wait_time_long")

            day_sales = (base_sales * seasonal * dow * growth * noise
                         * sales_anomaly * improvement * contamination
                         * takeout_drop * new_ramp * udon * ticket_issue * wait_long)
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
            if global_idx in TAKEOUT_RATIO_DROP_STORES and d >= date(2026, 2, 1):
                takeout_pct *= 0.6
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

    # Product sales: last 6 months only (2025-11 to 2026-04)
    product_sales_start = date(2025, 11, 1)
    sample_dates = []
    d = max(start_date, product_sales_start)
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

            # Late night labor: higher cost due to night premium
            if global_idx in LATE_NIGHT_LABOR_STORES and d >= date(2026, 2, 1):
                hours *= RNG.uniform(1.05, 1.15)
                cost = hours * base_hourly_wage * 1.10  # night premium effect

            # Peak understaffed: fewer hours but lower productivity
            if global_idx in PEAK_UNDERSTAFFED_STORES and d >= date(2026, 2, 1):
                hours *= RNG.uniform(0.85, 0.92)
                cost = hours * base_hourly_wage * RNG.uniform(1.10, 1.20)  # higher wage to attract

            # Minimum wage impact: same hours, higher cost
            if global_idx in MINIMUM_WAGE_IMPACT_STORES and d >= date(2026, 1, 1):
                cost = hours * (base_hourly_wage * RNG.uniform(1.05, 1.12))

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
            if global_idx in RICE_COST_SURGE_STORES and d >= date(2026, 1, 1):
                cogs_rate += RNG.uniform(2, 4)
            if global_idx in WASTE_INCREASE_STORES and d >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(1.5, 3)
            if global_idx in DRINK_BAR_COST_STORES and d >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(1, 2)

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
            if global_idx in ENERGY_COST_STORES and d >= date(2026, 1, 1):
                utilities = int(utilities * RNG.uniform(1.20, 1.40))
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
    d = date(2023, 4, 30)
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
            if global_idx in RICE_COST_SURGE_STORES and kpi_date >= date(2026, 1, 1):
                cogs_rate += RNG.uniform(2, 4)
            if global_idx in WASTE_INCREASE_STORES and kpi_date >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(1.5, 3)
            if global_idx in DRINK_BAR_COST_STORES and kpi_date >= date(2026, 2, 1):
                cogs_rate += RNG.uniform(1, 2)
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
            try:
                prev_kpi_date = kpi_date.replace(year=kpi_date.year - 1)
            except ValueError:
                prev_kpi_date = kpi_date.replace(year=kpi_date.year - 1, day=28)
            prev_year_key = (store_id_str, prev_kpi_date.isoformat())
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

            # Enrich issue_types with new anomaly patterns
            if kpi_date >= date(2026, 2, 1):
                if issues is None:
                    issues = []
                if global_idx in CONTAMINATION_IMPACT_STORES:
                    issues.append({"issue_type": "contamination_impact", "severity": "critical", "detail": "異物混入後の客数減少", "gap": 0, "impact_amount": 0})
                if global_idx in LATE_NIGHT_LABOR_STORES:
                    issues.append({"issue_type": "late_night_labor", "severity": "medium", "detail": "深夜帯人件費過多", "gap": 0, "impact_amount": 0})
                if global_idx in TAKEOUT_RATIO_DROP_STORES:
                    issues.append({"issue_type": "takeout_ratio_drop", "severity": "low", "detail": "テイクアウト比率低下", "gap": 0, "impact_amount": 0})
                if global_idx in RICE_COST_SURGE_STORES:
                    issues.append({"issue_type": "rice_cost_surge", "severity": "high", "detail": "コメ高騰による原価率上昇", "gap": 0, "impact_amount": 0})
                if global_idx in WASTE_INCREASE_STORES:
                    issues.append({"issue_type": "waste_increase", "severity": "medium", "detail": "廃棄率上昇", "gap": 0, "impact_amount": 0})
                if global_idx in WAIT_TIME_LONG_STORES:
                    issues.append({"issue_type": "wait_time_long", "severity": "medium", "detail": "待ち時間長期化", "gap": 0, "impact_amount": 0})
                if global_idx in PEAK_UNDERSTAFFED_STORES:
                    issues.append({"issue_type": "peak_understaffed", "severity": "high", "detail": "ピーク帯人員不足", "gap": 0, "impact_amount": 0})
                if global_idx in MINIMUM_WAGE_IMPACT_STORES:
                    issues.append({"issue_type": "minimum_wage_impact", "severity": "medium", "detail": "最低賃金改定影響", "gap": 0, "impact_amount": 0})
                if global_idx in DELIVERY_MARGIN_STORES:
                    issues.append({"issue_type": "delivery_margin_squeeze", "severity": "medium", "detail": "デリバリー利益率悪化", "gap": 0, "impact_amount": 0})
                if global_idx in ENERGY_COST_STORES:
                    issues.append({"issue_type": "energy_cost_spike", "severity": "medium", "detail": "光熱費高騰", "gap": 0, "impact_amount": 0})
                if global_idx in TICKET_MACHINE_ISSUE_STORES:
                    issues.append({"issue_type": "ticket_machine_issue", "severity": "medium", "detail": "券売機トラブル", "gap": 0, "impact_amount": 0})
                if global_idx in DRINK_BAR_COST_STORES:
                    issues.append({"issue_type": "drink_bar_cost", "severity": "low", "detail": "ドリンクバー原価上昇", "gap": 0, "impact_amount": 0})
                if global_idx in NEW_STORE_RAMPUP_STORES:
                    issues.append({"issue_type": "new_store_rampup", "severity": "positive", "detail": "新店立ち上がり好調", "gap": 0, "impact_amount": 0})
                if global_idx in UDON_SEASON_STORES and kpi_date.month in (11, 12, 1, 2):
                    issues.append({"issue_type": "udon_season_surge", "severity": "positive", "detail": "うどん季節需要急増", "gap": 0, "impact_amount": 0})
                if not issues:
                    issues = None

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
        brand_idx = store["_brand_idx"]
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
                if global_idx in CONTAMINATION_IMPACT_STORES and review_date >= date(2026, 2, 1):
                    rating -= RNG.uniform(0.3, 0.8)
                if global_idx in WAIT_TIME_LONG_STORES and review_date >= date(2026, 2, 1):
                    rating -= RNG.uniform(0.2, 0.5)
                if global_idx in TICKET_MACHINE_ISSUE_STORES and review_date >= date(2026, 2, 1):
                    rating -= RNG.uniform(0.2, 0.4)
                rating = max(1.0, min(5.0, rating))

                if rating >= 3.5:
                    text = RNG.choice(REVIEW_TEMPLATES_GOOD)
                else:
                    # Brand-specific bad review templates
                    if global_idx in CONTAMINATION_IMPACT_STORES and brand_idx == 0 and review_date >= date(2026, 2, 1):
                        text = RNG.choice(REVIEW_TEMPLATES_SUKIYA_INCIDENT)
                    elif global_idx in REVIEW_DECLINE_STORES and brand_idx == 0 and review_date >= date(2026, 2, 1):
                        text = RNG.choice(REVIEW_TEMPLATES_SUKIYA_INCIDENT)
                    elif brand_idx == 1 and review_date >= date(2026, 1, 1):
                        text = RNG.choice(REVIEW_TEMPLATES_HAMAZUSHI_PRICE + REVIEW_TEMPLATES_BAD)
                    elif brand_idx == 2:
                        text = RNG.choice(REVIEW_TEMPLATES_COCOS_WAIT + REVIEW_TEMPLATES_BAD)
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

    issue_types = [
        "labor_overrun", "cogs_overrun", "sales_decline", "review_decline", "discount_overuse",
        "contamination_impact", "late_night_labor", "takeout_ratio_drop", "rice_cost_surge",
        "waste_increase", "wait_time_long", "peak_understaffed", "minimum_wage_impact",
        "delivery_margin_squeeze", "energy_cost_spike", "new_store_rampup", "udon_season_surge",
        "ticket_machine_issue", "drink_bar_cost",
    ]
    statuses = ["open", "in_progress", "done", "done", "cancelled"]
    priorities = ["high", "medium", "medium", "low"]

    title_templates = {
        "labor_overrun": "人件費率改善: シフト最適化",
        "cogs_overrun": "原価率改善: 発注・ロス管理見直し",
        "sales_decline": "売上回復: 集客施策実施",
        "review_decline": "口コミ改善: サービス品質向上",
        "discount_overuse": "割引適正化: キャンペーン見直し",
        "contamination_impact": "異物混入対策: 衛生管理強化",
        "late_night_labor": "深夜帯コスト最適化: シフト見直し",
        "takeout_ratio_drop": "テイクアウト比率向上: アプリ施策",
        "rice_cost_surge": "コメ高騰対策: メニュー最適化",
        "waste_increase": "廃棄ロス削減: 需要予測改善",
        "wait_time_long": "待ち時間短縮: オペレーション改善",
        "peak_understaffed": "ピーク帯人員配置: シフト増強",
        "minimum_wage_impact": "最低賃金対応: 生産性向上",
        "delivery_margin_squeeze": "デリバリー利益率改善: 手数料交渉",
        "energy_cost_spike": "光熱費削減: 省エネ施策",
        "new_store_rampup": "新店立ち上がり加速: 集客強化",
        "udon_season_surge": "うどん季節需要対応: 仕入れ調整",
        "ticket_machine_issue": "券売機改善: UI見直し",
        "drink_bar_cost": "ドリンクバー原価管理: 仕入れ最適化",
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
    store_by_idx = {s["_global_idx"]: s for s in stores}
    results_cases = []
    results_metrics = []

    cases_data = [
        {"name": "すき家首都圏 異物混入後の客数回復", "issue_type": "contamination_impact",
         "store_idxs": [1, 6, 11], "status": "active",
         "expected": 18000000, "realized": None,
         "metrics": [
             {"metric_name": "来客数", "baseline": 9200, "measured": 8100, "peer_adjusted": 8300, "share": 0.5},
             {"metric_name": "口コミスコア", "baseline": 3.8, "measured": 3.1, "peer_adjusted": 3.2, "share": 0.3},
             {"metric_name": "月次売上", "baseline": 14000000, "measured": 12500000, "peer_adjusted": 12800000, "share": 0.2},
         ]},
        {"name": "はま寿司 コメ高騰対策メニュー最適化", "issue_type": "cogs_overrun",
         "store_idxs": [50, 52, 54], "status": "completed",
         "expected": 8000000, "realized": 6200000,
         "metrics": [
             {"metric_name": "原価率", "baseline": 46.0, "measured": 43.0, "peer_adjusted": 43.5, "share": 0.6},
             {"metric_name": "理論原価乖離率", "baseline": 4.5, "measured": 1.8, "peer_adjusted": 2.0, "share": 0.2},
             {"metric_name": "粗利率", "baseline": 54.0, "measured": 57.0, "peer_adjusted": 56.5, "share": 0.2},
         ]},
        {"name": "ココス 首都圏シフト最適化", "issue_type": "labor_overrun",
         "store_idxs": [70, 73, 76], "status": "completed",
         "expected": 12000000, "realized": 8500000,
         "metrics": [
             {"metric_name": "人件費率", "baseline": 36.0, "measured": 31.5, "peer_adjusted": 32.0, "share": 0.6},
             {"metric_name": "人時売上高", "baseline": 4200, "measured": 5100, "peer_adjusted": 4950, "share": 0.2},
             {"metric_name": "営業利益率", "baseline": 4.8, "measured": 7.5, "peer_adjusted": 7.2, "share": 0.2},
         ]},
        {"name": "なか卯 テイクアウト比率向上", "issue_type": "sales_decline",
         "store_idxs": [90, 91], "status": "completed",
         "expected": 10000000, "realized": 7800000,
         "metrics": [
             {"metric_name": "テイクアウト比率", "baseline": 22.0, "measured": 31.0, "peer_adjusted": 30.0, "share": 0.5},
             {"metric_name": "月次売上", "baseline": 8500000, "measured": 9800000, "peer_adjusted": 9600000, "share": 0.3},
             {"metric_name": "客単価", "baseline": 580, "measured": 610, "peer_adjusted": 600, "share": 0.2},
         ]},
        {"name": "ジョリーパスタ 値上げ後の客数維持", "issue_type": "sales_decline",
         "store_idxs": [95, 96], "status": "active",
         "expected": 6000000, "realized": None,
         "metrics": [
             {"metric_name": "来客数", "baseline": 280, "measured": 245, "peer_adjusted": 250, "share": 0.5},
             {"metric_name": "客単価", "baseline": 1050, "measured": 1120, "peer_adjusted": 1100, "share": 0.3},
             {"metric_name": "月次売上", "baseline": 9000000, "measured": 8400000, "peer_adjusted": 8500000, "share": 0.2},
         ]},
        {"name": "全社 深夜帯労働コスト最適化", "issue_type": "labor_overrun",
         "store_idxs": [0, 4, 9], "status": "completed",
         "expected": 15000000, "realized": 11000000,
         "metrics": [
             {"metric_name": "深夜人件費率", "baseline": 38.0, "measured": 32.0, "peer_adjusted": 33.0, "share": 0.6},
             {"metric_name": "人時売上高", "baseline": 3800, "measured": 4600, "peer_adjusted": 4400, "share": 0.2},
             {"metric_name": "営業利益率", "baseline": 3.5, "measured": 6.2, "peer_adjusted": 5.8, "share": 0.2},
         ]},
        {"name": "はま寿司 廃棄ロス削減", "issue_type": "cogs_overrun",
         "store_idxs": [51, 53, 57], "status": "active",
         "expected": 5000000, "realized": None,
         "metrics": [
             {"metric_name": "廃棄率", "baseline": 5.2, "measured": 4.8, "peer_adjusted": 4.9, "share": 0.5},
             {"metric_name": "原価率", "baseline": 44.0, "measured": 43.0, "peer_adjusted": 43.2, "share": 0.3},
             {"metric_name": "粗利率", "baseline": 56.0, "measured": 57.0, "peer_adjusted": 56.8, "share": 0.2},
         ]},
        {"name": "ココス ピーク帯人員配置最適化", "issue_type": "labor_overrun",
         "store_idxs": [79, 82], "status": "completed",
         "expected": 7000000, "realized": 5500000,
         "metrics": [
             {"metric_name": "ピーク待ち時間", "baseline": 25, "measured": 12, "peer_adjusted": 14, "share": 0.4},
             {"metric_name": "人件費率", "baseline": 34.0, "measured": 31.0, "peer_adjusted": 31.5, "share": 0.3},
             {"metric_name": "テーブル回転", "baseline": 2.1, "measured": 2.8, "peer_adjusted": 2.6, "share": 0.3},
         ]},
        {"name": "全社 最低賃金改定対応", "issue_type": "labor_overrun",
         "store_idxs": [14, 19, 24], "status": "active",
         "expected": 20000000, "realized": None,
         "metrics": [
             {"metric_name": "人件費率", "baseline": 30.0, "measured": 32.5, "peer_adjusted": 32.0, "share": 0.5},
             {"metric_name": "人時売上高", "baseline": 5000, "measured": 4600, "peer_adjusted": 4700, "share": 0.3},
             {"metric_name": "営業利益率", "baseline": 7.0, "measured": 5.5, "peer_adjusted": 5.8, "share": 0.2},
         ]},
        {"name": "すき家 新店立ち上がり加速", "issue_type": "improvement_success",
         "store_idxs": [97, 98, 99], "status": "completed",
         "expected": 9000000, "realized": 10500000,
         "metrics": [
             {"metric_name": "月次売上", "baseline": 6000000, "measured": 9500000, "peer_adjusted": 9000000, "share": 0.5},
             {"metric_name": "来客数", "baseline": 5500, "measured": 8200, "peer_adjusted": 7800, "share": 0.3},
             {"metric_name": "口コミスコア", "baseline": 3.5, "measured": 4.1, "peer_adjusted": 4.0, "share": 0.2},
         ]},
    ]

    for i, cd in enumerate(cases_data):
        case_id = gen_deterministic_uuid("value_case", i)
        target_ids = [store_by_idx[idx]["id"] for idx in cd["store_idxs"] if idx in store_by_idx]

        results_cases.append({
            "id": case_id,
            "tenant_id": TENANT_ID,
            "company_id": COMPANY_ID,
            "name": cd["name"],
            "issue_type": cd["issue_type"],
            "target_store_ids": target_ids if target_ids else None,
            "baseline_start": date(2025, 10, 1),
            "baseline_end": date(2025, 12, 31),
            "measurement_start": date(2026, 2, 1),
            "measurement_end": date(2026, 4, 30),
            "status": cd["status"],
            "expected_impact_amount": cd["expected"],
            "realized_impact_amount": cd["realized"],
        })

        realized_or_expected = cd["realized"] if cd["realized"] else cd["expected"]
        for mi, m in enumerate(cd["metrics"]):
            results_metrics.append({
                "id": gen_deterministic_uuid("value_metric", i * 10 + mi),
                "value_case_id": case_id,
                "metric_name": m["metric_name"],
                "baseline_value": m["baseline"],
                "measured_value": m["measured"],
                "peer_adjusted_value": m["peer_adjusted"],
                "estimated_impact_amount": int(realized_or_expected * m["share"]),
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
        "title": "2026年4月度 ゼンショーHD 経営会議資料",
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
            "content": {"description": "国内5ブランド100店舗KPI概況。はま寿司のコメ高騰影響でFL比率が前月比0.5pt上昇。"},
            "store_id": None,
            "task_id": None,
            "sort_order": 1,
        },
        {
            "id": gen_deterministic_uuid("meeting_item", 1),
            "pack_id": pack_id,
            "item_type": "issue",
            "title": "人件費超過店舗への対応状況",
            "content": {"description": "ココス首都圏5店舗で人件費率が35%を超過。シフト最適化プロジェクト進行中。"},
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
            "email": "admin@zensho.co.jp",
            "name": "管理者",
            "role": "admin",
            "employee_id": None,
            "active": True,
            "password_hash": None,
        },
        {
            "id": gen_deterministic_uuid("user", 1),
            "tenant_id": TENANT_ID,
            "email": "sv@zensho.co.jp",
            "name": "SV担当",
            "role": "sv",
            "employee_id": None,
            "active": True,
            "password_hash": None,
        },
        {
            "id": gen_deterministic_uuid("user", 2),
            "tenant_id": TENANT_ID,
            "email": "manager@zensho.co.jp",
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

    # Collect anomaly stores across all patterns for 20 instances
    all_anomaly_idxs = (
        LABOR_OVERRUN_STORES[:3] + COGS_OVERRUN_STORES[:3] +
        CONTAMINATION_IMPACT_STORES[:2] + RICE_COST_SURGE_STORES[:2] +
        PEAK_UNDERSTAFFED_STORES[:2] + LATE_NIGHT_LABOR_STORES[:2] +
        MINIMUM_WAGE_IMPACT_STORES[:2] + ENERGY_COST_STORES[:2]
    )
    store_by_idx = {s["_global_idx"]: s for s in stores}
    anomaly_stores = [store_by_idx[idx] for idx in all_anomaly_idxs if idx in store_by_idx]
    # Pad if needed
    while len(anomaly_stores) < 20:
        anomaly_stores.append(stores[len(anomaly_stores) % len(stores)])

    event_idx = 0
    for i in range(20):
        store = anomaly_stores[i]
        template = templates[i % len(templates)]
        instance_id = gen_deterministic_uuid("wf_instance", i)
        sv = sv_employees[i % len(sv_employees)]

        is_completed = i < 8
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

        if i < 14:
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
            "name": "すき家改善プレイブック",
            "kpi_definitions": [
                {"code": "sales_per_labor_hour", "name": "人時売上", "target": 5500, "unit": "円/時"},
                {"code": "hourly_sales_mix", "name": "時間帯別売上構成", "target": None, "unit": "%"},
                {"code": "takeout_ratio", "name": "テイクアウト比率", "target": 30, "unit": "%"},
                {"code": "cogs_rate", "name": "原価率", "target": 35, "unit": "%"},
                {"code": "avg_ticket", "name": "客単価", "target": 550, "unit": "円"},
            ],
            "issue_rules": [
                {"issue_type": "idle_time_labor", "description": "アイドルタイムの人件費過剰", "threshold": {"sales_per_labor_hour": {"below": 4500}}},
                {"issue_type": "peak_understaffing", "description": "ピーク時間帯の人員不足", "threshold": {"peak_wait_time": {"above": 10}}},
                {"issue_type": "takeout_decline", "description": "テイクアウト比率低下", "threshold": {"takeout_ratio": {"below": 25}}},
                {"issue_type": "cogs_rice_meat", "description": "米・肉の原価高騰", "threshold": {"cogs_rate": {"above": 38}}},
                {"issue_type": "incident_review_decline", "description": "異物混入による口コミ低下", "threshold": {"review_score": {"below": 3.0}}},
            ],
            "recommended_actions": [
                {"action": "アイドルタイムシフト削減", "description": "14-17時のシフト人数を見直し、人時売上を改善", "expected_impact": 200000},
                {"action": "ピーク配置最適化", "description": "11-13時のキッチン・フロア配置バランスを調整", "expected_impact": 150000},
                {"action": "セット販売強化", "description": "味噌汁・サラダのセット推奨で客単価向上", "expected_impact": 100000},
                {"action": "衛生管理強化", "description": "異物混入対策の徹底とSNS対策", "expected_impact": 300000},
            ],
        },
        {
            "service_model": "sushi",
            "name": "はま寿司改善プレイブック",
            "kpi_definitions": [
                {"code": "fish_cogs_rate", "name": "ネタ原価率", "target": 42, "unit": "%"},
                {"code": "waste_rate", "name": "廃棄率", "target": 3, "unit": "%"},
                {"code": "table_turnover", "name": "テーブル回転", "target": 3.5, "unit": "回/日"},
                {"code": "avg_ticket", "name": "客単価", "target": 1100, "unit": "円"},
                {"code": "wait_time", "name": "待ち時間", "target": 15, "unit": "分"},
            ],
            "issue_rules": [
                {"issue_type": "fish_cogs_overrun", "description": "ネタ原価率超過", "threshold": {"fish_cogs_rate": {"above": 45}}},
                {"issue_type": "rice_cost_increase", "description": "コメ価格高騰による原価率悪化", "threshold": {"cogs_rate": {"above": 44}}},
                {"issue_type": "waste_increase", "description": "廃棄率上昇", "threshold": {"waste_rate": {"above": 5}}},
                {"issue_type": "turnover_decline", "description": "テーブル回転率低下", "threshold": {"table_turnover": {"below": 3.0}}},
            ],
            "recommended_actions": [
                {"action": "仕入単価交渉", "description": "主要仕入先との価格交渉および代替仕入先の開拓", "expected_impact": 300000},
                {"action": "廃棄削減オペ", "description": "レーン管理の見直しと需要予測に基づく握り調整", "expected_impact": 200000},
                {"action": "コメ仕入先多様化", "description": "国産米の複数産地調達でコスト安定化", "expected_impact": 250000},
                {"action": "高単価商品訴求", "description": "季節ネタや限定メニューの訴求強化", "expected_impact": 180000},
            ],
        },
        {
            "service_model": "family_restaurant",
            "name": "ココス改善プレイブック",
            "kpi_definitions": [
                {"code": "labor_cost_rate", "name": "人件費率", "target": 32, "unit": "%"},
                {"code": "avg_ticket", "name": "客単価", "target": 1200, "unit": "円"},
                {"code": "table_turnover", "name": "テーブル回転", "target": 2.5, "unit": "回/日"},
                {"code": "drink_bar_ratio", "name": "ドリンクバー付帯率", "target": 60, "unit": "%"},
                {"code": "cogs_rate", "name": "原価率", "target": 32, "unit": "%"},
            ],
            "issue_rules": [
                {"issue_type": "labor_overrun", "description": "人件費率超過（人手不足による時給高騰）", "threshold": {"labor_cost_rate": {"above": 35}}},
                {"issue_type": "peak_understaffing", "description": "ランチピーク時の待ち時間超過", "threshold": {"wait_time": {"above": 20}}},
                {"issue_type": "turnover_decline", "description": "テーブル回転率低下", "threshold": {"table_turnover": {"below": 2.0}}},
                {"issue_type": "cogs_overrun", "description": "原価率超過", "threshold": {"cogs_rate": {"above": 35}}},
            ],
            "recommended_actions": [
                {"action": "シフト最適化", "description": "時間帯別需要予測に基づくシフト編成の見直し", "expected_impact": 250000},
                {"action": "セルフオーダー導入", "description": "タブレットオーダー拡大でホールスタッフ効率化", "expected_impact": 200000},
                {"action": "ドリンクバー付帯促進", "description": "セット提案による付帯率向上で客単価改善", "expected_impact": 150000},
                {"action": "ランチ回転率改善", "description": "ランチ限定メニュー導入で滞在時間短縮", "expected_impact": 180000},
            ],
        },
        {
            "service_model": "donburi_udon",
            "name": "なか卯改善プレイブック",
            "kpi_definitions": [
                {"code": "sales_per_labor_hour", "name": "人時売上", "target": 5000, "unit": "円/時"},
                {"code": "takeout_ratio", "name": "テイクアウト比率", "target": 35, "unit": "%"},
                {"code": "cogs_rate", "name": "原価率", "target": 33, "unit": "%"},
                {"code": "avg_ticket", "name": "客単価", "target": 600, "unit": "円"},
                {"code": "mobile_order_ratio", "name": "モバイルオーダー比率", "target": 25, "unit": "%"},
            ],
            "issue_rules": [
                {"issue_type": "idle_time_labor", "description": "アイドルタイムの人件費過剰", "threshold": {"sales_per_labor_hour": {"below": 4000}}},
                {"issue_type": "takeout_decline", "description": "テイクアウト比率低下", "threshold": {"takeout_ratio": {"below": 30}}},
                {"issue_type": "cogs_overrun", "description": "原価率超過", "threshold": {"cogs_rate": {"above": 36}}},
            ],
            "recommended_actions": [
                {"action": "テイクアウト強化", "description": "モバイルオーダー・事前注文の促進", "expected_impact": 200000},
                {"action": "セットメニュー推奨", "description": "小うどんセット提案で客単価向上", "expected_impact": 120000},
                {"action": "アイドルタイム施策", "description": "15-17時の限定メニューで集客強化", "expected_impact": 100000},
            ],
        },
        {
            "service_model": "pasta",
            "name": "ジョリーパスタ改善プレイブック",
            "kpi_definitions": [
                {"code": "avg_ticket", "name": "客単価", "target": 1050, "unit": "円"},
                {"code": "cogs_rate", "name": "原価率", "target": 30, "unit": "%"},
                {"code": "labor_cost_rate", "name": "人件費率", "target": 30, "unit": "%"},
                {"code": "customer_count", "name": "来客数", "target": 300, "unit": "人/日"},
                {"code": "drink_bar_ratio", "name": "ドリンクバー付帯率", "target": 55, "unit": "%"},
            ],
            "issue_rules": [
                {"issue_type": "sales_decline_price_hike", "description": "値上げ後の客数減少", "threshold": {"customer_count_yoy": {"below": -10}}},
                {"issue_type": "cogs_overrun", "description": "原材料高騰による原価率超過", "threshold": {"cogs_rate": {"above": 33}}},
                {"issue_type": "labor_overrun", "description": "人件費率超過", "threshold": {"labor_cost_rate": {"above": 33}}},
            ],
            "recommended_actions": [
                {"action": "セットメニュー価値訴求", "description": "サラダ・ドリンクバーセットでお得感を演出", "expected_impact": 150000},
                {"action": "ランチ集客強化", "description": "平日ランチ限定パスタセットの訴求強化", "expected_impact": 180000},
                {"action": "SNS施策", "description": "生パスタの訴求強化によるブランド認知向上", "expected_impact": 100000},
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


def generate_ontology_v2_data(stores):
    """Generate v2 dynamic ontology data: object types, properties, link types, and store instances."""

    # --- 9 Object Types ---
    object_type_defs = [
        {"api_name": "Store", "display_name": "店舗", "icon": "store", "pk": "store_code"},
        {"api_name": "Brand", "display_name": "ブランド", "icon": "tag", "pk": "name"},
        {"api_name": "Product", "display_name": "商品", "icon": "package", "pk": "product_code"},
        {"api_name": "Employee", "display_name": "従業員", "icon": "user", "pk": "code"},
        {"api_name": "Task", "display_name": "タスク", "icon": "check-square", "pk": "id"},
        {"api_name": "SVVisit", "display_name": "SV訪問", "icon": "clipboard", "pk": "id"},
        {"api_name": "Review", "display_name": "レビュー", "icon": "message-circle", "pk": "id"},
        {"api_name": "MeetingPack", "display_name": "経営会議パック", "icon": "briefcase", "pk": "id"},
        {"api_name": "ValueCase", "display_name": "改善施策", "icon": "trending-up", "pk": "id"},
    ]

    object_types = []
    ot_id_map = {}
    for i, otd in enumerate(object_type_defs):
        ot_id = gen_deterministic_uuid("ontology_v2_ot", i)
        ot_id_map[otd["api_name"]] = ot_id
        object_types.append({
            "id": ot_id,
            "tenant_id": TENANT_ID,
            "api_name": otd["api_name"],
            "display_name": otd["display_name"],
            "icon": otd["icon"],
            "primary_key_field": otd["pk"],
            "version": 1,
            "status": "active",
        })

    # --- Properties per object type ---
    property_defs = {
        "Store": [
            ("store_code", "店舗コード", "string", True, None, None, 0),
            ("name", "店舗名", "string", True, None, None, 1),
            ("prefecture", "都道府県", "string", False, None, None, 2),
            ("city", "市区町村", "string", False, None, None, 3),
            ("trade_area_type", "商圏タイプ", "enum", False, ["駅前", "ロードサイド", "商業施設", "オフィス街", "住宅街"], None, 4),
            ("seat_count", "座席数", "int", False, None, {"min": 1, "max": 500}, 5),
            ("status", "ステータス", "enum", False, ["active", "closed", "planned"], None, 6),
            ("opening_date", "開店日", "timestamp", False, None, None, 7),
            ("parking", "駐車場", "bool", False, None, None, 8),
            ("drive_through", "ドライブスルー", "bool", False, None, None, 9),
            ("delivery", "デリバリー", "bool", False, None, None, 10),
            ("takeout", "テイクアウト", "bool", False, None, None, 11),
            ("lat", "緯度", "float", False, None, {"min": -90, "max": 90}, 12),
            ("lng", "経度", "float", False, None, {"min": -180, "max": 180}, 13),
        ],
        "Product": [
            ("product_code", "商品コード", "string", True, None, None, 0),
            ("name", "商品名", "string", True, None, None, 1),
            ("category_l1", "カテゴリ大", "string", False, None, None, 2),
            ("category_l2", "カテゴリ小", "string", False, None, None, 3),
            ("price", "販売価格", "float", True, None, {"min": 0}, 4),
            ("theoretical_cost", "理論原価", "float", False, None, {"min": 0}, 5),
            ("active", "販売中", "bool", False, None, None, 6),
            ("limited_time_offer", "期間限定", "bool", False, None, None, 7),
        ],
        "Brand": [
            ("name", "ブランド名", "string", True, None, None, 0),
            ("service_model", "サービスモデル", "enum", False, ["beef_bowl", "sushi", "family_restaurant", "donburi_udon", "pasta"], None, 1),
            ("logo_url", "ロゴURL", "string", False, None, None, 2),
        ],
        "Employee": [
            ("code", "社員コード", "string", True, None, None, 0),
            ("name", "氏名", "string", True, None, None, 1),
            ("role", "役職", "enum", False, ["director", "sv", "manager", "staff"], None, 2),
            ("email", "メール", "string", False, None, None, 3),
        ],
        "Task": [
            ("title", "タスク名", "string", True, None, None, 0),
            ("status", "ステータス", "enum", False, ["open", "in_progress", "done", "cancelled"], None, 1),
            ("priority", "優先度", "enum", False, ["high", "medium", "low"], None, 2),
            ("category", "カテゴリ", "string", False, None, None, 3),
            ("due_date", "期限", "timestamp", False, None, None, 4),
        ],
        "SVVisit": [
            ("visit_date", "訪問日", "timestamp", True, None, None, 0),
            ("overall_score", "総合スコア", "float", False, None, {"min": 0, "max": 100}, 1),
            ("checklist_results", "チェックリスト結果", "object", False, None, None, 2),
            ("memo", "メモ", "string", False, None, None, 3),
        ],
        "Review": [
            ("platform", "プラットフォーム", "enum", False, ["google", "tabelog", "hotpepper"], None, 0),
            ("rating", "評価", "float", False, None, {"min": 1, "max": 5}, 1),
            ("comment", "コメント", "string", False, None, None, 2),
            ("sentiment", "感情分析", "enum", False, ["positive", "neutral", "negative"], None, 3),
            ("posted_at", "投稿日時", "timestamp", False, None, None, 4),
        ],
        "MeetingPack": [
            ("title", "タイトル", "string", True, None, None, 0),
            ("meeting_date", "会議日", "timestamp", True, None, None, 1),
            ("status", "ステータス", "enum", False, ["draft", "published", "archived"], None, 2),
        ],
        "ValueCase": [
            ("title", "施策名", "string", True, None, None, 0),
            ("category", "カテゴリ", "string", False, None, None, 1),
            ("status", "ステータス", "enum", False, ["proposed", "active", "completed", "rejected"], None, 2),
            ("estimated_impact", "推定効果額", "float", False, None, {"min": 0}, 3),
        ],
    }

    properties = []
    prop_idx = 0
    for ot_name, prop_list in property_defs.items():
        ot_id = ot_id_map[ot_name]
        for api_name, display, dtype, required, enum_vals, validation, sort in prop_list:
            properties.append({
                "id": gen_deterministic_uuid("ontology_v2_prop", prop_idx),
                "tenant_id": TENANT_ID,
                "object_type_id": ot_id,
                "api_name": api_name,
                "display_name": display,
                "data_type": dtype,
                "required": required,
                "enum_values": enum_vals,
                "validation": validation,
                "pii_level": "low" if api_name in ("email", "name") and ot_name == "Employee" else "none",
                "sort_order": sort,
                "version": 1,
            })
            prop_idx += 1

    # --- 7 Link Types ---
    link_type_defs = [
        ("store_belongs_to_brand", "ブランド所属", "Store", "Brand", "many_to_one"),
        ("store_managed_by", "店長", "Store", "Employee", "many_to_one"),
        ("store_has_task", "タスク割当", "Store", "Task", "one_to_many"),
        ("store_has_review", "レビュー", "Store", "Review", "one_to_many"),
        ("brand_has_product", "商品提供", "Brand", "Product", "one_to_many"),
        ("task_assigned_to", "担当者", "Task", "Employee", "many_to_one"),
        ("store_has_sv_visit", "SV訪問", "Store", "SVVisit", "one_to_many"),
    ]

    link_types = []
    for i, (api_name, display, from_t, to_t, card) in enumerate(link_type_defs):
        link_types.append({
            "id": gen_deterministic_uuid("ontology_v2_lt", i),
            "tenant_id": TENANT_ID,
            "api_name": api_name,
            "display_name": display,
            "from_object_type_id": ot_id_map[from_t],
            "to_object_type_id": ot_id_map[to_t],
            "cardinality": card,
            "version": 1,
            "status": "active",
        })

    # --- Store Instances (copy from stores table data) ---
    instances = []
    store_ot_id = ot_id_map["Store"]
    for i, s in enumerate(stores):
        props = {
            "store_code": s["code"],
            "name": s["name"],
            "prefecture": s["prefecture"],
            "city": s["city"],
            "trade_area_type": s["trade_area_type"],
            "seat_count": s["seat_count"],
            "status": s["status"],
            "opening_date": s["opening_date"].isoformat() if s.get("opening_date") else None,
            "parking": s["parking"],
            "drive_through": s["drive_through"],
            "delivery": s["delivery"],
            "takeout": s["takeout"],
            "lat": s["lat"],
            "lng": s["lng"],
        }
        instances.append({
            "id": gen_deterministic_uuid("ontology_v2_inst_store", i),
            "tenant_id": TENANT_ID,
            "object_type_id": store_ot_id,
            "object_type_version": 1,
            "primary_key_value": s["code"],
            "properties": props,
            "status": "active",
        })

    return object_types, properties, link_types, instances


def generate_roles_and_permissions():
    role_defs = [
        ("admin", "管理者", "全権限を持つシステム管理者", True),
        ("executive", "経営層", "全リソースの閲覧権限", True),
        ("brand_manager", "ブランドマネージャー", "ブランド配下の店舗・タスクの管理", True),
        ("area_manager", "エリアマネージャー", "エリア配下の店舗・タスクの管理", True),
        ("sv", "SV", "担当店舗の巡回・タスク管理", True),
        ("store_staff", "店舗スタッフ", "自店舗の閲覧のみ", True),
        ("viewer", "閲覧者", "集計済みKPIの閲覧のみ", True),
        ("analyst", "アナリスト", "ワークスペース全権限、店舗・KPI閲覧", True),
    ]

    roles = []
    role_id_map = {}
    for i, (name, display, desc, is_system) in enumerate(role_defs):
        rid = gen_deterministic_uuid("role", i)
        role_id_map[name] = rid
        roles.append({
            "id": rid,
            "tenant_id": TENANT_ID,
            "name": name,
            "display_name": display,
            "description": desc,
            "is_system": is_system,
        })

    perm_defs = {
        "admin": [
            ("store", "read"), ("store", "write"), ("store", "delete"),
            ("task", "read"), ("task", "write"), ("task", "delete"),
            ("meeting_pack", "read"), ("meeting_pack", "write"), ("meeting_pack", "delete"),
            ("ai_analyst", "read"), ("ai_analyst", "execute"),
            ("kpi_definition", "read"), ("kpi_definition", "write"), ("kpi_definition", "delete"),
            ("workspace", "read"), ("workspace", "write"), ("workspace", "delete"),
        ],
        "executive": [
            ("store", "read"), ("task", "read"), ("meeting_pack", "read"),
            ("ai_analyst", "read"), ("ai_analyst", "execute"),
            ("kpi_definition", "read"), ("workspace", "read"),
        ],
        "brand_manager": [
            ("store", "read", {"field": "brand_id", "operator": "eq", "value": "{user.brand_ids}"}),
            ("store", "write", {"field": "brand_id", "operator": "eq", "value": "{user.brand_ids}"}),
            ("task", "read", {"field": "brand_id", "operator": "eq", "value": "{user.brand_ids}"}),
            ("task", "write", {"field": "brand_id", "operator": "eq", "value": "{user.brand_ids}"}),
            ("meeting_pack", "read"),
            ("kpi_definition", "read"),
        ],
        "area_manager": [
            ("store", "read", {"field": "region", "operator": "eq", "value": "{user.region}"}),
            ("store", "write", {"field": "region", "operator": "eq", "value": "{user.region}"}),
            ("task", "read", {"field": "region", "operator": "eq", "value": "{user.region}"}),
            ("task", "write", {"field": "region", "operator": "eq", "value": "{user.region}"}),
            ("kpi_definition", "read"),
        ],
        "sv": [
            ("store", "read", {"field": "assigned_stores", "operator": "in", "value": "{user.store_ids}"}),
            ("store", "write", {"field": "assigned_stores", "operator": "in", "value": "{user.store_ids}"}),
            ("task", "read", {"field": "assigned_stores", "operator": "in", "value": "{user.store_ids}"}),
            ("task", "write", {"field": "assigned_stores", "operator": "in", "value": "{user.store_ids}"}),
        ],
        "store_staff": [
            ("store", "read", {"field": "store_id", "operator": "eq", "value": "{user.store_id}"}),
        ],
        "viewer": [
            ("store", "read"),
            ("kpi_definition", "read"),
        ],
        "analyst": [
            ("workspace", "read"), ("workspace", "write"), ("workspace", "delete"), ("workspace", "execute"),
            ("store", "read"), ("kpi_definition", "read"),
            ("ai_analyst", "read"), ("ai_analyst", "execute"),
        ],
    }

    permissions = []
    perm_idx = 0
    for role_name, perm_list in perm_defs.items():
        role_id = role_id_map[role_name]
        for pdef in perm_list:
            resource, action = pdef[0], pdef[1]
            scope = pdef[2] if len(pdef) > 2 else None
            permissions.append({
                "id": gen_deterministic_uuid("permission", perm_idx),
                "tenant_id": TENANT_ID,
                "role_id": role_id,
                "resource": resource,
                "action": action,
                "scope": scope,
            })
            perm_idx += 1

    user_roles = [
        {
            "id": gen_deterministic_uuid("user_role", 0),
            "user_id": gen_deterministic_uuid("user", 0),
            "role_id": role_id_map["admin"],
            "tenant_id": TENANT_ID,
            "granted_by": None,
        },
        {
            "id": gen_deterministic_uuid("user_role", 1),
            "user_id": gen_deterministic_uuid("user", 1),
            "role_id": role_id_map["sv"],
            "tenant_id": TENANT_ID,
            "granted_by": gen_deterministic_uuid("user", 0),
        },
        {
            "id": gen_deterministic_uuid("user_role", 2),
            "user_id": gen_deterministic_uuid("user", 2),
            "role_id": role_id_map["store_staff"],
            "tenant_id": TENANT_ID,
            "granted_by": gen_deterministic_uuid("user", 0),
        },
    ]

    return roles, permissions, user_roles


def generate_workspace_data():
    admin_id = gen_deterministic_uuid("user", 0)

    analyses = [
        {
            "id": gen_deterministic_uuid("analysis", 0),
            "tenant_id": TENANT_ID,
            "name": "粗利率トレンド分析",
            "description": "ブランド別・月次の粗利率推移を可視化し、原価高騰の影響を分析",
            "owner_user_id": admin_id,
            "visibility": "tenant",
            "spec": {
                "panels": [
                    {"type": "line_chart", "kpi": "gross_profit_rate", "axis": ["brand", "month"],
                     "filters": {}, "title": "ブランド別粗利率推移"},
                    {"type": "table", "kpi": "cogs_rate", "axis": ["brand", "month"],
                     "filters": {}, "title": "原価率一覧"},
                ],
                "layout": {"columns": 2},
            },
        },
        {
            "id": gen_deterministic_uuid("analysis", 1),
            "tenant_id": TENANT_ID,
            "name": "エリア別人件費比較",
            "description": "エリア間の人件費率・人時売上の比較分析",
            "owner_user_id": admin_id,
            "visibility": "tenant",
            "spec": {
                "panels": [
                    {"type": "bar_chart", "kpi": "labor_cost_rate", "axis": ["area"],
                     "filters": {}, "title": "エリア別人件費率"},
                    {"type": "scatter", "x_kpi": "sales_per_labor_hour", "y_kpi": "labor_cost_rate",
                     "axis": ["store"], "title": "人時売上 vs 人件費率"},
                ],
                "layout": {"columns": 2},
            },
        },
        {
            "id": gen_deterministic_uuid("analysis", 2),
            "tenant_id": TENANT_ID,
            "name": "改善施策効果追跡",
            "description": "施策実施前後のKPI変化を追跡するダッシュボード",
            "owner_user_id": admin_id,
            "visibility": "private",
            "spec": {
                "panels": [
                    {"type": "line_chart", "kpi": "net_sales", "axis": ["store", "month"],
                     "filters": {"cohort": "low_profit_stores"}, "title": "対象店舗の売上推移"},
                    {"type": "metric", "kpi": "health_score", "axis": ["store"],
                     "title": "ヘルススコア変化"},
                ],
                "layout": {"columns": 1},
            },
        },
    ]

    custom_kpis = [
        {
            "id": gen_deterministic_uuid("custom_kpi", 0),
            "tenant_id": TENANT_ID,
            "api_name": "takeout_ratio",
            "display_name": "テイクアウト比率",
            "formula": "{takeout_sales} / {net_sales}",
            "target_object_type": "Store",
            "aggregation_axis": ["brand", "month"],
            "filters": None,
            "unit": "%",
            "created_by": admin_id,
            "version": 1,
            "status": "active",
        },
        {
            "id": gen_deterministic_uuid("custom_kpi", 1),
            "tenant_id": TENANT_ID,
            "api_name": "splh_yoy_improvement",
            "display_name": "人時売上改善率",
            "formula": "({sales_per_labor_hour} - {sales_per_labor_hour}) / {sales_per_labor_hour}",
            "target_object_type": "Store",
            "aggregation_axis": ["region", "month"],
            "filters": None,
            "unit": "%",
            "created_by": admin_id,
            "version": 1,
            "status": "draft",
        },
    ]

    cohorts = [
        {
            "id": gen_deterministic_uuid("cohort", 0),
            "tenant_id": TENANT_ID,
            "name": "首都圏ココス低収益店舗",
            "object_type": "Store",
            "filter_spec": {
                "region": "関東",
                "trade_area_type": "駅前",
                "health_score_lt": 50,
            },
            "instance_count": None,
            "snapshot_at": None,
            "created_by": admin_id,
        },
        {
            "id": gen_deterministic_uuid("cohort", 1),
            "tenant_id": TENANT_ID,
            "name": "ココス人件費超過店舗群",
            "object_type": "Store",
            "filter_spec": {
                "labor_cost_rate_gt": 35,
            },
            "instance_count": None,
            "snapshot_at": None,
            "created_by": admin_id,
        },
    ]

    saved_queries = [
        {
            "id": gen_deterministic_uuid("saved_query", 0),
            "tenant_id": TENANT_ID,
            "name": "ブランド別月次売上サマリ",
            "query_type": "ontology",
            "query_spec": {
                "object_type": "Store",
                "measures": ["net_sales", "customer_count"],
                "dimensions": ["brand", "month"],
                "filters": {},
                "sort": [{"field": "net_sales", "direction": "desc"}],
            },
            "last_run_at": None,
            "row_count": None,
            "created_by": admin_id,
        },
        {
            "id": gen_deterministic_uuid("saved_query", 1),
            "tenant_id": TENANT_ID,
            "name": "低スコア店舗のタスク完了率",
            "query_type": "kpi",
            "query_spec": {
                "kpi": "task_completion_rate",
                "cohort_id": str(gen_deterministic_uuid("cohort", 0)),
                "period": "last_90_days",
            },
            "last_run_at": None,
            "row_count": None,
            "created_by": admin_id,
        },
    ]

    return analyses, custom_kpis, cohorts, saved_queries


# =====================================================================
# Vertical depth generators (Phase A + B)
# =====================================================================

JAPANESE_ALLERGENS_7 = ["えび", "かに", "小麦", "そば", "卵", "乳", "落花生"]
JAPANESE_ALLERGENS_21 = [
    "アーモンド", "あわび", "いか", "いくら", "オレンジ", "カシューナッツ",
    "キウイフルーツ", "牛肉", "くるみ", "ごま", "さけ", "さば", "大豆",
    "鶏肉", "バナナ", "豚肉", "まつたけ", "もも", "やまいも", "りんご", "ゼラチン",
]
ALL_ALLERGENS = JAPANESE_ALLERGENS_7 + JAPANESE_ALLERGENS_21

INGREDIENT_DEFS = [
    ("白米", "g", 0.30, [], "常温", 365),
    ("酢飯", "g", 0.45, [], "冷蔵", 1),
    ("牛バラ肉", "g", 2.80, ["牛肉"], "冷凍", 90),
    ("豚バラ肉", "g", 2.20, ["豚肉"], "冷凍", 90),
    ("鶏胸肉", "g", 1.50, ["鶏肉"], "冷凍", 90),
    ("牛ひき肉", "g", 2.50, ["牛肉"], "冷凍", 60),
    ("玉ねぎ", "g", 0.20, [], "常温", 30),
    ("レタス", "g", 0.40, [], "冷蔵", 5),
    ("トマト", "g", 0.50, [], "冷蔵", 7),
    ("醤油", "ml", 0.30, ["大豆", "小麦"], "常温", 365),
    ("味噌", "g", 0.60, ["大豆"], "冷蔵", 180),
    ("サーモン", "g", 4.50, ["さけ"], "冷凍", 60),
    ("マグロ", "g", 6.00, [], "冷凍", 60),
    ("エビ", "g", 5.00, ["えび"], "冷凍", 90),
    ("鯛", "g", 5.50, [], "冷凍", 60),
    ("いか", "g", 3.50, ["いか"], "冷凍", 60),
    ("海苔", "枚", 5.00, [], "常温", 180),
    ("たまご", "個", 25.00, ["卵"], "冷蔵", 14),
    ("パン粉", "g", 0.30, ["小麦"], "常温", 180),
    ("食用油", "ml", 0.20, [], "常温", 365),
    ("フレンチフライ用ポテト", "g", 0.35, [], "冷凍", 180),
    ("バンズ", "個", 40.00, ["小麦", "卵", "乳"], "冷凍", 60),
    ("チーズ", "g", 1.80, ["乳"], "冷蔵", 30),
    ("ケチャップ", "g", 0.25, [], "常温", 365),
    ("マスタード", "g", 0.40, [], "常温", 365),
    ("わさび", "g", 3.00, [], "冷蔵", 30),
    ("ガリ", "g", 0.50, [], "冷蔵", 90),
    ("枝豆", "g", 0.80, ["大豆"], "冷凍", 180),
    ("納豆", "パック", 30.00, ["大豆"], "冷蔵", 10),
    ("きゅうり", "g", 0.30, [], "冷蔵", 7),
]

RECIPE_DEFS = {
    "牛丼並盛": [("白米", 250), ("牛バラ肉", 100), ("玉ねぎ", 50), ("醤油", 20)],
    "牛丼大盛": [("白米", 350), ("牛バラ肉", 130), ("玉ねぎ", 60), ("醤油", 25)],
    "牛丼特盛": [("白米", 450), ("牛バラ肉", 170), ("玉ねぎ", 80), ("醤油", 30)],
    "豚丼並盛": [("白米", 250), ("豚バラ肉", 100), ("玉ねぎ", 50), ("醤油", 20)],
    "ねぎ玉牛丼": [("白米", 250), ("牛バラ肉", 100), ("玉ねぎ", 70), ("醤油", 20), ("たまご", 1)],
    "キムチ牛丼": [("白米", 250), ("牛バラ肉", 100), ("玉ねぎ", 50), ("醤油", 20)],
    "チーズ牛丼": [("白米", 250), ("牛バラ肉", 100), ("玉ねぎ", 50), ("醤油", 20), ("チーズ", 20)],
    "味噌汁": [("味噌", 15), ("玉ねぎ", 20)],
    "まぐろ": [("酢飯", 20), ("マグロ", 15), ("わさび", 1)],
    "サーモン": [("酢飯", 20), ("サーモン", 15), ("わさび", 1)],
    "えび": [("酢飯", 20), ("エビ", 12), ("わさび", 1)],
    "いか": [("酢飯", 20), ("いか", 15), ("わさび", 1)],
    "たまご": [("酢飯", 20), ("たまご", 1)],
    "中とろ": [("酢飯", 20), ("マグロ", 20), ("わさび", 1)],
    "茶碗蒸し": [("たまご", 2), ("エビ", 10), ("鶏胸肉", 15)],
    "親子丼並": [("白米", 250), ("鶏胸肉", 80), ("たまご", 2), ("玉ねぎ", 40), ("醤油", 15)],
    "カツ丼並": [("白米", 250), ("豚バラ肉", 100), ("たまご", 2), ("パン粉", 20), ("食用油", 20)],
    "京風きつねうどん": [("白米", 0), ("醤油", 20), ("玉ねぎ", 30)],
    "カルボナーラ": [("たまご", 2), ("チーズ", 30), ("豚バラ肉", 50)],
    "ミートソース": [("牛ひき肉", 80), ("トマト", 100), ("玉ねぎ", 50)],
    "ペペロンチーノ": [("食用油", 30), ("トマト", 20)],
}

CCP_DEFS = [
    ("揚げ物中心温度", 75.0, None, "per_batch", "中心温度計による測定"),
    ("冷蔵庫温度", None, 10.0, "daily", "温度計の目視確認"),
    ("冷凍庫温度", None, -15.0, "daily", "温度計の目視確認"),
    ("食材入荷時温度", None, 10.0, "per_batch", "非接触温度計"),
    ("手洗い確認", 1.0, None, "hourly", "目視チェック"),
    ("加熱調理温度", 63.0, None, "per_batch", "中心温度計"),
]

QSC_TEMPLATE_SECTIONS = [
    {
        "name": "品質 (Quality)",
        "weight": 0.4,
        "items": [
            {"question": "料理の温度は適切か", "max_score": 10},
            {"question": "盛り付けは基準通りか", "max_score": 10},
            {"question": "食材の鮮度は問題ないか", "max_score": 10},
            {"question": "メニュー表通りの提供か", "max_score": 10},
            {"question": "味付けは基準通りか", "max_score": 10},
        ],
    },
    {
        "name": "サービス (Service)",
        "weight": 0.35,
        "items": [
            {"question": "入店時の挨拶はあったか", "max_score": 10},
            {"question": "注文から提供までの時間", "max_score": 10},
            {"question": "スタッフの身だしなみ", "max_score": 10},
            {"question": "クレーム対応力", "max_score": 10},
        ],
    },
    {
        "name": "清潔 (Cleanliness)",
        "weight": 0.25,
        "items": [
            {"question": "客席の清潔さ", "max_score": 10},
            {"question": "トイレの清潔さ", "max_score": 10},
            {"question": "厨房の清潔さ", "max_score": 10},
            {"question": "外観・看板の清潔さ", "max_score": 10},
        ],
    },
]


def generate_ingredients():
    results = []
    for i, (name, unit, cost, allergens, storage, shelf) in enumerate(INGREDIENT_DEFS):
        results.append({
            "id": gen_deterministic_uuid("ingredient", i),
            "tenant_id": TENANT_ID,
            "name": name,
            "unit": unit,
            "supplier_id": None,
            "standard_cost_per_unit": Decimal(str(cost)),
            "allergen_codes": allergens,
            "storage_temperature": storage,
            "shelf_life_days": shelf,
        })
    return results


def generate_ingredient_price_history(ingredients):
    results = []
    idx = 0
    base_date = date(2023, 4, 1)
    for ing in ingredients:
        cost = float(ing["standard_cost_per_unit"])
        for month_offset in range(36):
            d = base_date + timedelta(days=month_offset * 30)
            seasonal = 1.0 + RNG.uniform(-0.08, 0.08)
            results.append({
                "id": gen_deterministic_uuid("ing_price", idx),
                "tenant_id": TENANT_ID,
                "ingredient_id": ing["id"],
                "supplier_id": None,
                "unit_price": Decimal(str(round(cost * seasonal, 2))),
                "effective_date": d,
                "source": RNG.choice(["contract", "spot", "seasonal_forecast"]),
            })
            idx += 1
    return results


def generate_recipes_and_bom(products, ingredients):
    ing_map = {ing["name"]: ing for ing in ingredients}
    prod_map = {p["name"]: p for p in products}

    recipes = []
    bom_entries = []
    r_idx = 0
    b_idx = 0

    for recipe_name, ing_list in RECIPE_DEFS.items():
        product = prod_map.get(recipe_name)
        if not product:
            continue

        recipe_id = gen_deterministic_uuid("recipe", r_idx)
        recipes.append({
            "id": recipe_id,
            "tenant_id": TENANT_ID,
            "product_id": product["id"],
            "version": 1,
            "yield_quantity": 1,
            "cooking_time_minutes": RNG.randint(2, 15),
            "instructions": None,
            "status": "active",
            "valid_from": datetime(2024, 4, 1),
            "valid_to": None,
        })

        for ing_name, qty in ing_list:
            ingredient = ing_map.get(ing_name)
            if not ingredient:
                continue
            bom_entries.append({
                "id": gen_deterministic_uuid("bom", b_idx),
                "tenant_id": TENANT_ID,
                "recipe_id": recipe_id,
                "ingredient_id": ingredient["id"],
                "quantity": Decimal(str(qty)),
                "unit": ingredient["unit"],
                "notes": None,
            })
            b_idx += 1

        r_idx += 1

    return recipes, bom_entries


SHIFT_ROLES = ["調理", "ホール", "レジ", "清掃", "店長"]

def generate_shifts(stores, employees):
    results = []
    idx = 0
    base_date = date(2026, 3, 1)
    manager_emps = [e for e in employees if e["role"] == "manager"]
    sv_emps = [e for e in employees if e["role"] == "sv"]
    all_emps = manager_emps + sv_emps

    for day_offset in range(30):
        current_date = base_date + timedelta(days=day_offset)
        for store in stores[:20]:
            n_shifts = RNG.randint(3, 6)
            for s in range(n_shifts):
                emp = all_emps[idx % len(all_emps)]
                role = RNG.choice(SHIFT_ROLES)

                # normal shifts: 6-8 hours
                start_hour = RNG.choice([6, 7, 8, 9, 10, 11, 14, 15, 17, 18])
                duration = RNG.choice([6, 7, 8, 9])

                violations = []
                # ~8% of shifts have violations
                if RNG.random() < 0.08:
                    violation_type = RNG.choice([
                        "overtime", "short_break", "night_minor", "short_rest"
                    ])
                    if violation_type == "overtime":
                        duration = RNG.randint(10, 13)
                    elif violation_type == "short_break":
                        pass  # handled below
                    elif violation_type == "night_minor":
                        start_hour = 22
                        duration = 6
                    elif violation_type == "short_rest":
                        start_hour = 6  # early start after late shift

                start_at = datetime(current_date.year, current_date.month, current_date.day, start_hour, 0)
                end_hour = start_hour + duration
                end_day = current_date
                if end_hour >= 24:
                    end_hour -= 24
                    end_day = current_date + timedelta(days=1)
                end_at = datetime(end_day.year, end_day.month, end_day.day, end_hour, 0)

                work_hours = duration
                break_minutes = 0
                if work_hours >= 8:
                    break_minutes = 60
                elif work_hours >= 6:
                    break_minutes = 45

                # inject short break violations
                if RNG.random() < 0.05 and work_hours >= 6:
                    break_minutes = RNG.randint(0, 30)
                    violations.append("insufficient_break")

                overtime_hours = max(0, work_hours - break_minutes / 60 - 8)
                night_hours = Decimal("0")
                if start_hour >= 22 or (end_hour <= 5 and end_hour > 0):
                    night_hours = Decimal(str(min(work_hours, 7)))

                if overtime_hours > 0 and duration > 10:
                    violations.append("daily_overtime_exceeded")

                results.append({
                    "id": gen_deterministic_uuid("shift", idx),
                    "tenant_id": TENANT_ID,
                    "store_id": store["id"],
                    "employee_id": emp["id"],
                    "role": role,
                    "start_at": start_at,
                    "end_at": end_at,
                    "actual_start_at": start_at + timedelta(minutes=RNG.randint(-5, 10)),
                    "actual_end_at": end_at + timedelta(minutes=RNG.randint(-10, 15)),
                    "break_minutes": break_minutes,
                    "overtime_hours": Decimal(str(round(overtime_hours, 2))),
                    "night_hours": night_hours,
                    "legal_violations": violations,
                })
                idx += 1

    return results


def generate_labor_law_profile():
    return [{
        "id": gen_deterministic_uuid("labor_law", 0),
        "tenant_id": TENANT_ID,
        "weekly_max_hours": 40,
        "daily_max_hours": 8,
        "night_premium_rate": Decimal("1.25"),
        "overtime_premium_rate": Decimal("1.25"),
        "rest_min_minutes_per_6h": 45,
        "rest_min_minutes_per_8h": 60,
        "rest_interval_min_hours": 11,
        "minor_under_18_no_night": True,
    }]


def generate_qsc_audits(stores):
    templates = [{
        "id": gen_deterministic_uuid("qsc_template", 0),
        "tenant_id": TENANT_ID,
        "name": "標準QSCチェックシート v1",
        "version": 1,
        "sections": QSC_TEMPLATE_SECTIONS,
    }]

    audits = []
    idx = 0
    base_date = date(2025, 1, 1)
    template_id = templates[0]["id"]

    for store in stores:
        n_audits = RNG.randint(1, 4)
        for a in range(n_audits):
            audit_date = base_date + timedelta(days=RNG.randint(0, 450))
            # scores 60-95
            q_score = round(RNG.uniform(60, 95), 2)
            s_score = round(RNG.uniform(60, 95), 2)
            c_score = round(RNG.uniform(60, 95), 2)
            overall = round((q_score + s_score + c_score) / 3, 2)

            audits.append({
                "id": gen_deterministic_uuid("qsc_audit", idx),
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "auditor_user_id": None,
                "audit_date": audit_date,
                "quality_score": Decimal(str(q_score)),
                "service_score": Decimal(str(s_score)),
                "cleanliness_score": Decimal(str(c_score)),
                "overall_score": Decimal(str(overall)),
                "template_id": template_id,
                "answers": {},
                "photos": [],
                "notes": None,
            })
            idx += 1

    return templates, audits


def generate_haccp_data(stores, products):
    ccps = []
    for i, (name, t_min, t_max, freq, method) in enumerate(CCP_DEFS):
        ccps.append({
            "id": gen_deterministic_uuid("ccp", i),
            "tenant_id": TENANT_ID,
            "name": name,
            "threshold_min": Decimal(str(t_min)) if t_min is not None else None,
            "threshold_max": Decimal(str(t_max)) if t_max is not None else None,
            "monitoring_frequency": freq,
            "monitoring_method": method,
        })

    monitoring = []
    m_idx = 0
    base_date = date(2025, 6, 1)
    target_stores = stores[:15]

    for day_offset in range(60):
        current_date = base_date + timedelta(days=day_offset)
        for store in target_stores:
            for ccp in ccps:
                # compliance 85-98%
                is_compliant = RNG.random() < 0.93

                if ccp["threshold_min"] is not None:
                    target = float(ccp["threshold_min"])
                    if is_compliant:
                        measured = target + RNG.uniform(0, 15)
                    else:
                        measured = target - RNG.uniform(1, 10)
                elif ccp["threshold_max"] is not None:
                    target = float(ccp["threshold_max"])
                    if is_compliant:
                        measured = target - RNG.uniform(0, abs(target) * 0.3)
                    else:
                        measured = target + RNG.uniform(1, 5)
                else:
                    measured = RNG.uniform(0, 100)

                deviation_action = None
                if not is_compliant:
                    deviation_action = RNG.choice([
                        "再加熱実施", "食材廃棄", "機器点検・修理依頼",
                        "温度調整実施", "衛生管理者に報告",
                    ])

                monitoring.append({
                    "id": gen_deterministic_uuid("haccp_mon", m_idx),
                    "tenant_id": TENANT_ID,
                    "store_id": store["id"],
                    "ccp_id": ccp["id"],
                    "monitoring_date_time": datetime(
                        current_date.year, current_date.month, current_date.day,
                        RNG.randint(6, 22), RNG.randint(0, 59)
                    ),
                    "measured_value": Decimal(str(round(measured, 2))),
                    "is_compliant": is_compliant,
                    "deviation_action": deviation_action,
                })
                m_idx += 1

    # allergen matrix for products
    allergen_matrix = []
    am_idx = 0
    product_allergen_map = {
        "牛丼": ["牛肉", "大豆", "小麦"],
        "豚丼": ["豚肉", "大豆", "小麦"],
        "カレー": ["小麦", "乳"],
        "うな丼": [],
        "まぐろ": [],
        "サーモン": ["さけ"],
        "えび": ["えび"],
        "いか": ["いか"],
        "たまご": ["卵"],
        "中とろ": [],
        "ハンバーグ": ["小麦", "卵", "乳", "牛肉"],
        "ビーフシチュー": ["小麦", "卵", "乳", "牛肉"],
        "ミックスグリル": ["小麦", "卵", "乳", "牛肉", "豚肉", "鶏肉"],
        "親子丼": ["卵", "鶏肉", "小麦", "大豆"],
        "カツ丼": ["卵", "豚肉", "小麦"],
        "うどん": ["小麦", "大豆"],
        "カルボナーラ": ["卵", "乳", "小麦", "豚肉"],
        "ミートソース": ["小麦", "牛肉"],
        "ペペロンチーノ": ["小麦"],
        "シーフード": ["えび", "いか", "小麦"],
        "ピザ": ["小麦", "乳"],
        "味噌汁": ["大豆"],
        "茶碗蒸し": ["卵", "えび", "鶏肉"],
        "チーズ": ["乳"],
        "ティラミス": ["卵", "乳", "小麦"],
    }

    for product in products[:50]:
        matched_allergens = set()
        for keyword, allergens in product_allergen_map.items():
            if keyword in product["name"]:
                matched_allergens.update(allergens)

        for allergen in ALL_ALLERGENS:
            if allergen in matched_allergens:
                presence = "contains"
            elif RNG.random() < 0.05:
                presence = "trace"
            else:
                presence = "none"

            cross_risk = presence == "trace" or (presence == "none" and RNG.random() < 0.02)

            allergen_matrix.append({
                "id": gen_deterministic_uuid("allergen", am_idx),
                "tenant_id": TENANT_ID,
                "product_id": product["id"],
                "allergen_code": allergen,
                "presence": presence,
                "cross_contamination_risk": cross_risk,
            })
            am_idx += 1

    return ccps, monitoring, allergen_matrix


def generate_franchise_data(stores):
    fc_stores = stores[5:20]

    agreements = []
    royalty_calcs = []
    a_idx = 0
    r_idx = 0

    royalty_structures = [
        {"type": "revenue_pct", "rate": 0.05},
        {"type": "revenue_pct", "rate": 0.04},
        {"type": "revenue_pct", "rate": 0.06},
        {"type": "tiered", "tiers": [
            {"threshold": 10000000, "rate": 0.04},
            {"threshold": 20000000, "rate": 0.05},
            {"threshold": 0, "rate": 0.06},
        ]},
        {"type": "fixed", "fixed_amount": 500000},
    ]

    for i, store in enumerate(fc_stores):
        structure = royalty_structures[i % len(royalty_structures)]
        agreement_id = gen_deterministic_uuid("fc_agreement", a_idx)

        agreements.append({
            "id": agreement_id,
            "tenant_id": TENANT_ID,
            "franchisee_company_id": None,
            "store_id": store["id"],
            "agreement_type": "franchise",
            "effective_from": date(2020, 1, 1) + timedelta(days=RNG.randint(0, 1000)),
            "effective_to": None,
            "royalty_structure": structure,
            "advertising_fund_rate": Decimal(str(RNG.choice([0.01, 0.015, 0.02]))),
            "territory_rights": {"radius_km": RNG.choice([3, 5, 10])},
            "minimum_revenue_guarantee": Decimal(str(RNG.choice([8000000, 10000000, 12000000]))),
        })
        a_idx += 1

        # 6 months of royalty calcs
        for month_offset in range(6):
            m = 10 + month_offset  # Oct 2025 - Mar 2026
            y = 2025 if m <= 12 else 2026
            if m > 12:
                m -= 12

            monthly_revenue = Decimal(str(RNG.randint(8000000, 20000000)))
            rate_val = Decimal(str(structure.get("rate", 0.05)))

            if structure["type"] == "revenue_pct":
                royalty_amount = monthly_revenue * rate_val
            elif structure["type"] == "fixed":
                royalty_amount = Decimal(str(structure.get("fixed_amount", 500000)))
            else:
                royalty_amount = monthly_revenue * Decimal("0.05")

            ad_rate = Decimal(str(RNG.choice([0.01, 0.015, 0.02])))
            ad_amount = monthly_revenue * ad_rate
            net = royalty_amount + ad_amount

            status = "paid" if month_offset < 4 else ("invoiced" if month_offset == 4 else "draft")

            royalty_calcs.append({
                "id": gen_deterministic_uuid("fc_royalty", r_idx),
                "tenant_id": TENANT_ID,
                "agreement_id": agreement_id,
                "store_id": store["id"],
                "period_year": y,
                "period_month": m,
                "gross_revenue": monthly_revenue,
                "royalty_base": monthly_revenue,
                "royalty_amount": royalty_amount,
                "advertising_amount": ad_amount,
                "net_payable": net,
                "status": status,
                "invoice_id": f"INV-{y}{m:02d}-{i+1:03d}" if status != "draft" else None,
            })
            r_idx += 1

    return agreements, royalty_calcs


def generate_industry_benchmarks():
    results = []
    idx = 0

    categories = {
        "牛丼": {
            "food_cost_ratio": (0.30, 0.35, 0.38, 0.42),
            "labor_ratio": (0.23, 0.27, 0.30, 0.34),
            "rent_ratio": (0.08, 0.10, 0.12, 0.15),
            "operating_margin": (0.02, 0.05, 0.08, 0.12),
            "avg_ticket": (400, 500, 600, 750),
            "turnover": (2.5, 3.0, 3.5, 4.2),
            "customer_count_per_seat": (8, 12, 16, 22),
            "waste_ratio": (0.01, 0.02, 0.03, 0.05),
        },
        "回転寿司": {
            "food_cost_ratio": (0.38, 0.42, 0.46, 0.50),
            "labor_ratio": (0.21, 0.25, 0.28, 0.32),
            "rent_ratio": (0.08, 0.10, 0.13, 0.16),
            "operating_margin": (0.01, 0.04, 0.07, 0.11),
            "avg_ticket": (900, 1100, 1300, 1600),
            "turnover": (1.8, 2.5, 3.2, 4.0),
            "customer_count_per_seat": (5, 8, 12, 16),
            "waste_ratio": (0.02, 0.03, 0.05, 0.08),
        },
        "ファミレス": {
            "food_cost_ratio": (0.28, 0.32, 0.36, 0.42),
            "labor_ratio": (0.28, 0.32, 0.36, 0.40),
            "rent_ratio": (0.07, 0.09, 0.12, 0.15),
            "operating_margin": (0.01, 0.03, 0.06, 0.10),
            "avg_ticket": (900, 1100, 1400, 1700),
            "turnover": (1.5, 2.0, 2.8, 3.5),
            "customer_count_per_seat": (4, 6, 9, 13),
            "waste_ratio": (0.02, 0.03, 0.05, 0.07),
        },
        "丼・うどん": {
            "food_cost_ratio": (0.28, 0.33, 0.37, 0.40),
            "labor_ratio": (0.24, 0.28, 0.32, 0.36),
            "rent_ratio": (0.08, 0.10, 0.12, 0.15),
            "operating_margin": (0.02, 0.05, 0.08, 0.12),
            "avg_ticket": (450, 550, 650, 800),
            "turnover": (2.5, 3.0, 3.5, 4.2),
            "customer_count_per_seat": (7, 11, 15, 20),
            "waste_ratio": (0.01, 0.02, 0.03, 0.05),
        },
        "パスタ": {
            "food_cost_ratio": (0.26, 0.30, 0.34, 0.38),
            "labor_ratio": (0.26, 0.30, 0.34, 0.38),
            "rent_ratio": (0.08, 0.10, 0.13, 0.16),
            "operating_margin": (0.02, 0.04, 0.07, 0.11),
            "avg_ticket": (800, 1000, 1200, 1500),
            "turnover": (1.8, 2.3, 3.0, 3.8),
            "customer_count_per_seat": (5, 8, 11, 15),
            "waste_ratio": (0.01, 0.02, 0.04, 0.06),
        },
    }

    for cat_name, metrics in categories.items():
        for metric_name, (p25, p50, p75, p90) in metrics.items():
            for year in [2024, 2025]:
                results.append({
                    "id": gen_deterministic_uuid("benchmark", idx),
                    "business_category": cat_name,
                    "metric_name": metric_name,
                    "period_year": year,
                    "period_month": None,
                    "p25": Decimal(str(p25)),
                    "p50": Decimal(str(p50)),
                    "p75": Decimal(str(p75)),
                    "p90": Decimal(str(p90)),
                    "sample_size": RNG.randint(80, 500),
                    "source": "日本フードサービス協会",
                })
                idx += 1

    return results


def generate_data_sources():
    ds_defs = [
        {
            "name": "CSV アップロード",
            "source_type": "csv",
            "system_category": "manual",
            "auth_type": "none",
            "config": {},
            "status": "connected",
            "last_sync_at": datetime(2026, 4, 28, 3, 0),
        },
        {
            "name": "スマレジ (sandbox)",
            "source_type": "smaregi",
            "system_category": "pos",
            "auth_type": "oauth2",
            "config": {"sandbox_mode": True},
            "status": "connected",
            "last_sync_at": datetime(2026, 4, 30, 3, 0),
        },
        {
            "name": "Airレジ",
            "source_type": "airregi",
            "system_category": "pos",
            "auth_type": "oauth2",
            "config": {},
            "status": "disconnected",
            "last_sync_at": None,
        },
        {
            "name": "KING OF TIME",
            "source_type": "king_of_time",
            "system_category": "labor",
            "auth_type": "api_key",
            "config": {},
            "status": "disconnected",
            "last_sync_at": None,
        },
    ]

    sources = []
    for i, d in enumerate(ds_defs):
        sources.append({
            "id": gen_deterministic_uuid("data_source_v2", i),
            "tenant_id": TENANT_ID,
            "name": d["name"],
            "source_type": d["source_type"],
            "system_category": d["system_category"],
            "auth_type": d["auth_type"],
            "config": d["config"],
            "status": d["status"],
            "last_sync_at": d["last_sync_at"],
            "last_error": None,
            "created_by": None,
        })

    csv_ds_id = sources[0]["id"]
    job_defs = [
        {"job_type": "csv_upload", "status": "success", "rows_fetched": 120, "rows_loaded": 118, "rows_rejected": 2,
         "started_at": datetime(2026, 4, 15, 10, 0), "finished_at": datetime(2026, 4, 15, 10, 1)},
        {"job_type": "csv_upload", "status": "success", "rows_fetched": 90, "rows_loaded": 90, "rows_rejected": 0,
         "started_at": datetime(2026, 4, 18, 14, 30), "finished_at": datetime(2026, 4, 18, 14, 31)},
        {"job_type": "csv_upload", "status": "failed", "rows_fetched": 50, "rows_loaded": 0, "rows_rejected": 50,
         "started_at": datetime(2026, 4, 20, 9, 0), "finished_at": datetime(2026, 4, 20, 9, 0)},
        {"job_type": "csv_upload", "status": "success", "rows_fetched": 200, "rows_loaded": 198, "rows_rejected": 2,
         "started_at": datetime(2026, 4, 25, 11, 0), "finished_at": datetime(2026, 4, 25, 11, 2)},
        {"job_type": "csv_upload", "status": "success", "rows_fetched": 150, "rows_loaded": 150, "rows_rejected": 0,
         "started_at": datetime(2026, 4, 28, 3, 0), "finished_at": datetime(2026, 4, 28, 3, 1)},
    ]

    jobs = []
    for i, j in enumerate(job_defs):
        error_log = []
        if j["status"] == "failed":
            error_log = [{"error": "CSV parsing error: invalid date format in column 'business_date'", "row": 1}]
        jobs.append({
            "id": gen_deterministic_uuid("ingestion_job", i),
            "tenant_id": TENANT_ID,
            "data_source_id": csv_ds_id,
            "job_type": j["job_type"],
            "status": j["status"],
            "started_at": j["started_at"],
            "finished_at": j["finished_at"],
            "rows_fetched": j["rows_fetched"],
            "rows_loaded": j["rows_loaded"],
            "rows_rejected": j["rows_rejected"],
            "cursor_value": None,
            "error_log": error_log,
        })

    return sources, jobs


def generate_identity_providers():
    return [
        {
            "id": gen_deterministic_uuid("idp", 0),
            "tenant_id": TENANT_ID,
            "type": "local",
            "name": "ローカル認証",
            "config": {},
            "is_default": True,
            "role_mapping": {},
            "enabled": True,
        },
        {
            "id": gen_deterministic_uuid("idp", 1),
            "tenant_id": TENANT_ID,
            "type": "oidc",
            "name": "Azure AD (テスト)",
            "config": {
                "client_id": "00000000-0000-0000-0000-000000000000",
                "client_secret": "***",
                "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                "userinfo_url": "https://graph.microsoft.com/oidc/userinfo",
                "redirect_uri": "http://localhost:8000/api/v1/identity-providers/oidc/callback",
            },
            "is_default": False,
            "role_mapping": {
                "engineering": "analyst",
                "exec": "executive",
                "managers": "brand_manager",
            },
            "enabled": False,
        },
    ]


def generate_access_logs():
    results = []
    user_ids = [gen_deterministic_uuid("user", i) for i in range(3)]
    methods = ["GET", "GET", "GET", "GET", "POST", "PUT", "DELETE"]
    paths = [
        "/api/v1/stores", "/api/v1/executive/summary", "/api/v1/kpi",
        "/api/v1/tasks", "/api/v1/stores/123", "/api/v1/products",
        "/api/v1/employees", "/api/v1/daily-sales",
    ]
    resources = ["store", "kpi", "task", "product", "employee", "daily_sales"]
    actions = ["read", "read", "read", "read", "write", "write", "delete"]
    user_agents = [
        "Mozilla/5.0 Chrome/120", "Mozilla/5.0 Safari/17", "AENTRO-CLI/1.0",
    ]
    ips = ["192.168.1.10", "10.0.0.5", "172.16.0.100", "203.0.113.42"]

    for i in range(50):
        method = methods[i % len(methods)]
        action = "read" if method == "GET" else ("write" if method in ("POST", "PUT") else "delete")
        is_deny = i in (12, 37)

        results.append({
            "id": gen_deterministic_uuid("access_log", i),
            "tenant_id": TENANT_ID,
            "user_id": user_ids[i % len(user_ids)],
            "timestamp": datetime(2026, 4, 1 + i % 28, 8 + (i * 3) % 14, (i * 17) % 60),
            "method": method,
            "path": paths[i % len(paths)],
            "resource": resources[i % len(resources)],
            "action": action,
            "object_ids": [str(gen_deterministic_uuid("obj", i * 10 + j)) for j in range(RNG.randint(0, 3))],
            "columns_accessed": [],
            "result": "deny" if is_deny else "allow",
            "deny_reason": "insufficient_permission" if is_deny else None,
            "ip_address": ips[i % len(ips)],
            "user_agent": user_agents[i % len(user_agents)],
            "request_id": str(gen_deterministic_uuid("reqid", i)),
        })
    return results


def generate_login_attempts():
    results = []
    emails = ["admin@zensho.co.jp", "sv@zensho.co.jp", "manager@zensho.co.jp", "unknown@example.com"]
    ips = ["192.168.1.10", "10.0.0.5", "172.16.0.100"]

    for i in range(20):
        if i < 15:
            success = True
            email = emails[i % 3]
            reason = None
        else:
            success = False
            email = emails[(i % 3) if i < 18 else 3]
            reason = RNG.choice(["bad_password", "user_not_found", "bad_mfa_code"])

        results.append({
            "id": gen_deterministic_uuid("login_attempt", i),
            "tenant_id": TENANT_ID,
            "email": email,
            "ip_address": ips[i % len(ips)],
            "success": success,
            "failure_reason": reason,
            "attempted_at": datetime(2026, 4, 15 + i % 15, 8 + i % 12, (i * 7) % 60),
        })
    return results


# ---------------------------------------------------------------------------
# Trade Areas, Competitors, Population Meshes, Pricing
# ---------------------------------------------------------------------------

COMPETITOR_BRANDS = [
    ("マクドナルド", "ハンバーガー"),
    ("吉野家", "牛丼"),
    ("スシロー", "回転寿司"),
    ("ガスト", "ファミレス"),
    ("松屋", "牛丼"),
    ("CoCo壱番屋", "カレー"),
    ("餃子の王将", "中華"),
    ("サイゼリヤ", "イタリアン"),
    ("丸亀製麺", "うどん"),
    ("日高屋", "中華"),
]

METRO_AREAS = [
    # (name, center_lat, center_lon, mesh_count)
    ("東京", 35.6812, 139.7671, 40),
    ("大阪", 34.6937, 135.5022, 30),
    ("名古屋", 35.1815, 136.9066, 30),
]


def generate_trade_areas(stores):
    results = []
    for i, s in enumerate(stores):
        pop = 15000 + (i * 7919) % 85000
        daytime = int(pop * (0.8 + (i % 5) * 0.15))
        hh = int(pop * 0.42)
        market = int(pop * 120 * 12)  # 120 yen/person/month eating out
        results.append({
            "id": gen_deterministic_uuid("trade_area", i),
            "tenant_id": TENANT_ID,
            "store_id": s["id"],
            "radius_m": RNG.choice([500, 1000, 1500, 2000, 3000]),
            "population_count": pop,
            "daytime_population": daytime,
            "households": hh,
            "estimated_market_size_jpy": market,
            "last_calculated_at": datetime(2026, 4, 1),
        })
    return results


def generate_competitors(stores):
    results = []
    store_locs = [(s.get("lat") or 35.68 + (i % 10) * 0.02, s.get("lng") or 139.76 + (i % 10) * 0.015) for i, s in enumerate(stores)]

    for i in range(50):
        brand_name, category = COMPETITOR_BRANDS[i % len(COMPETITOR_BRANDS)]
        area_idx = i % len(METRO_AREAS)
        area_name, center_lat, center_lon, _ = METRO_AREAS[area_idx]
        lat = center_lat + (RNG.random() - 0.5) * 0.08
        lon = center_lon + (RNG.random() - 0.5) * 0.1

        # Find nearest own store distance
        min_dist = None
        for slat, slng in store_locs[:20]:
            if slat and slng:
                d = ((lat - slat) ** 2 + (lon - slng) ** 2) ** 0.5 * 111000
                if min_dist is None or d < min_dist:
                    min_dist = d

        suffix_names = ["駅前店", "南口店", "中央店", "東口店", "本町店"]
        results.append({
            "id": gen_deterministic_uuid("competitor", i),
            "tenant_id": TENANT_ID,
            "name": f"{brand_name}{area_name}{suffix_names[i % len(suffix_names)]}",
            "brand_name": brand_name,
            "business_category": category,
            "lat": round(lat, 7),
            "lon": round(lon, 7),
            "estimated_revenue_jpy": RNG.randint(15000000, 80000000),
            "distance_to_nearest_own_m": round(min_dist, 1) if min_dist else None,
            "source": RNG.choice(["manual", "google_places"]),
        })
    return results


def generate_population_meshes():
    results = []
    idx = 0
    for area_name, center_lat, center_lon, mesh_count in METRO_AREAS:
        for j in range(mesh_count):
            row = j // int(mesh_count ** 0.5 + 1)
            col = j % int(mesh_count ** 0.5 + 1)
            lat = center_lat + (row - mesh_count ** 0.5 / 2) * 0.009
            lon = center_lon + (col - mesh_count ** 0.5 / 2) * 0.011

            pop = 800 + (idx * 6271) % 12000
            daytime = int(pop * (1.2 if area_name == "東京" else 1.0))

            results.append({
                "mesh_code": f"{5300 + idx // 100:04d}-{(idx // 10) % 100:02d}-{idx % 10:02d}",
                "lat": round(lat, 7),
                "lon": round(lon, 7),
                "population": pop,
                "daytime_population": daytime,
                "households": int(pop * 0.45),
                "age_distribution": {
                    "0-14": round(pop * 0.11),
                    "15-64": round(pop * 0.63),
                    "65+": round(pop * 0.26),
                },
                "income_class": {"low": 0.2, "middle": 0.55, "high": 0.25},
                "last_updated": datetime(2026, 1, 1),
            })
            idx += 1
    return results


def generate_pricing_data(products):
    decisions = []
    elasticities = []

    # 20 price decisions across various products
    for i in range(min(20, len(products))):
        p = products[i]
        price = int(float(p.get("price", 500)))
        change = RNG.choice([-50, -30, -20, 20, 30, 50, 100])
        new_price = max(100, price + change)
        decisions.append({
            "id": gen_deterministic_uuid("price_decision", i),
            "tenant_id": TENANT_ID,
            "product_id": p["id"],
            "decided_price": new_price,
            "previous_price": price,
            "effective_from": date(2026, 1 + i % 4, 1),
            "effective_to": date(2026, 4 + i % 3, 30) if i % 3 != 0 else None,
            "rationale": RNG.choice([
                "原材料費高騰に伴う価格改定",
                "競合対抗値下げ",
                "季節メニュー価格設定",
                "利益率改善のための価格見直し",
                "弾力性分析に基づく最適化",
            ]),
            "decision_method": RNG.choice(["manual", "data_driven", "competitive", "cost_plus"]),
            "expected_volume_change_pct": round(RNG.uniform(-15, 10), 1),
            "actual_volume_change_pct": round(RNG.uniform(-12, 8), 1) if i < 15 else None,
            "decided_by": None,
            "decided_at": datetime(2025, 12, 15 + i % 15, 10, 0),
        })

    # 50 elasticity calculations
    used_products = set()
    for i in range(min(50, len(products))):
        p = products[i]
        if p["id"] in used_products:
            continue
        used_products.add(p["id"])
        e = round(RNG.uniform(-2.5, -0.3), 3)
        std_err = round(abs(e) * RNG.uniform(0.08, 0.25), 3)
        r2 = round(RNG.uniform(0.35, 0.92), 4)

        elasticities.append({
            "id": gen_deterministic_uuid("price_elasticity", i),
            "tenant_id": TENANT_ID,
            "product_id": p["id"],
            "elasticity": e,
            "confidence_interval_low": round(e - 1.96 * std_err, 3),
            "confidence_interval_high": round(e + 1.96 * std_err, 3),
            "sample_period_start": date(2024, 4, 1),
            "sample_period_end": date(2026, 3, 31),
            "sample_size": RNG.randint(60, 500),
            "r_squared": r2,
            "calculated_at": datetime(2026, 4, 15, 6, 0),
        })

    return decisions, elasticities
