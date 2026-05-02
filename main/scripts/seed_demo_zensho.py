"""Zensho demo seed — idempotent overlay on top of existing 'demo' tenant.

Adds 80 demo stores across 3 brands (すき家 50 / なか卯 10 / ココス 20) with
- 200 employees (高校生 / シニア / 外国人技能実習生 mix)
- 90 days of hourly sales with realistic variance:
  * 月曜雨パターン: -15% sales
  * 給料日後 (毎月25日翌日〜): +12%
  * 台風休業: 数店舗で 0 売上
  * 平日ランチ・週末ディナーピーク
- SV visit reports: 各店舗 直近90日で 2-4回
- 過去インシデント 8件 (異物混入 / クレーム / 食中毒疑い 等)
- レビュー 200件 (好評 / 不評 ミックス、すき家異物事件文脈含む)
- HACCP 監視レコード (CCP × 店舗 × 30日)

Identification: 全レコードに demo_tag='ZENSHO_DEMO' を仕掛けるか、
店舗 code prefix 'ZD-' で識別。再実行時は ZD- 店舗とその関連を消してから再投入。

Usage:
    # ホスト直接 (backend/venv 推奨)
    DATABASE_URL_SYNC=postgresql://aentro:aentro_dev@localhost:5432/restaurant_os \
        python scripts/seed_demo_zensho.py

    # docker compose 経由
    make demo-seed
"""
import os
import sys
import uuid
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

# Add backend to path
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "backend"))

# Allow running inside the api container where /app is the backend root
if os.path.isdir("/app/app"):
    sys.path.insert(0, "/app")

from sqlalchemy import text  # noqa: E402
from app.database import sync_engine, SyncSession, Base  # noqa: E402
import app.models  # noqa: F401,E402  - registers all SQLAlchemy mappings on Base
from app.models.tenant import Tenant  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.brand import Brand  # noqa: E402
from app.models.region import Region  # noqa: E402
from app.models.area import Area  # noqa: E402
from app.models.employee import Employee  # noqa: E402
from app.models.store import Store  # noqa: E402
from app.models.daily_sales import DailyStoreSales  # noqa: E402
from app.models.hourly_sales import HourlyStoreSales  # noqa: E402
from app.models.review import Review  # noqa: E402
from app.models.sv_visit import SVVisit  # noqa: E402
from app.models.incident import Incident  # noqa: E402
from app.models.haccp import CCPDefinition, HACCPMonitoring  # noqa: E402

RNG = random.Random(2026)
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Demo store config: 50 sukiya direct + 30 FC across 3 brands
# Direct: 50 stores
# FC: 30 stores (sukiya FC 15 / nakau FC 8 / cocos FC 7)
DEMO_BRANDS = ["すき家", "なか卯", "ココス"]

# Region distribution
DEMO_REGIONS = ["METRO", "KANSAI", "KYUSHU"]

PREF_CITY = {
    "METRO": [("東京都", "品川区"), ("東京都", "新宿区"), ("東京都", "渋谷区"),
              ("神奈川県", "横浜市"), ("千葉県", "千葉市")],
    "KANSAI": [("大阪府", "大阪市"), ("大阪府", "堺市"), ("京都府", "京都市"),
               ("兵庫県", "神戸市"), ("兵庫県", "姫路市")],
    "KYUSHU": [("福岡県", "福岡市"), ("福岡県", "北九州市"), ("熊本県", "熊本市"),
               ("鹿児島県", "鹿児島市")],
}

EMPLOYEE_PROFILES = [
    ("高校生", 0.30, ["朝日 太郎", "山田 さくら", "佐藤 健", "鈴木 美咲", "高橋 翔太",
                  "田中 莉子", "渡辺 颯", "伊藤 結愛", "中村 蓮", "小林 陽菜"]),
    ("シニア", 0.20, ["山本 義男", "加藤 雅子", "吉田 茂", "佐々木 和子", "山口 武",
                "松本 久子", "井上 信夫", "木村 道子", "斎藤 政男", "清水 春江"]),
    ("外国人技能実習生", 0.20, ["Nguyen Van A", "Tran Thi B", "Le Hoang C",
                       "Pham Quoc D", "Hoang Minh E", "Vo Thanh F",
                       "Bui Hong G", "Dang Tuan H", "Nong Lin I", "Wang Wei J"]),
    ("正社員", 0.20, ["佐藤 一郎", "鈴木 健太", "高橋 和也", "田中 直樹", "渡辺 裕美",
              "伊藤 智", "山本 理恵", "中村 翔", "小林 大輔", "加藤 美穂"]),
    ("パート主婦", 0.10, ["山田 美香", "佐藤 由美", "鈴木 真理", "高橋 啓子", "田中 麻衣",
                  "渡辺 紀子", "伊藤 香織", "中村 涼子", "小林 直美", "加藤 千鶴"]),
]


# ---- helpers ----
def get_or_create_demo_brands(session) -> dict:
    """Return {brand_name: brand_row} ensuring demo brands exist."""
    out = {}
    for name in DEMO_BRANDS:
        row = session.execute(
            text("SELECT id, company_id FROM brands WHERE tenant_id=:t AND name=:n LIMIT 1"),
            {"t": str(TENANT_ID), "n": name},
        ).first()
        if not row:
            company_row = session.execute(
                text("SELECT id FROM companies WHERE tenant_id=:t LIMIT 1"),
                {"t": str(TENANT_ID)},
            ).first()
            if not company_row:
                # Bootstrap minimal tenant + company
                session.execute(text(
                    "INSERT INTO tenants (id, name, slug, settings, active) "
                    "VALUES (:id, 'demo', 'demo', '{}', TRUE) ON CONFLICT (id) DO NOTHING"
                ), {"id": str(TENANT_ID)})
                cid = uuid.uuid4()
                session.execute(text(
                    "INSERT INTO companies (id, tenant_id, name) "
                    "VALUES (:id, :t, 'ゼンショーホールディングス')"
                ), {"id": str(cid), "t": str(TENANT_ID)})
                company_id = cid
            else:
                company_id = company_row[0]
            bid = uuid.uuid4()
            sm = {"すき家": "beef_bowl", "なか卯": "donburi_udon", "ココス": "family_restaurant"}[name]
            session.execute(text(
                "INSERT INTO brands (id, tenant_id, company_id, name, service_model, settings) "
                "VALUES (:id, :t, :c, :n, :sm, '{}')"
            ), {"id": str(bid), "t": str(TENANT_ID), "c": str(company_id), "n": name, "sm": sm})
            out[name] = {"id": bid, "company_id": company_id}
        else:
            out[name] = {"id": row[0], "company_id": row[1]}
    session.commit()
    return out


def get_or_create_demo_areas(session) -> dict:
    """Return {region_code: [area_row,...]}."""
    out = {}
    for code in DEMO_REGIONS:
        # Region must exist
        rrow = session.execute(
            text("SELECT id FROM regions WHERE tenant_id=:t AND code=:c LIMIT 1"),
            {"t": str(TENANT_ID), "c": code},
        ).first()
        if not rrow:
            rid = uuid.uuid4()
            company_row = session.execute(
                text("SELECT id FROM companies WHERE tenant_id=:t LIMIT 1"),
                {"t": str(TENANT_ID)},
            ).first()
            session.execute(text(
                "INSERT INTO regions (id, tenant_id, company_id, name, code) "
                "VALUES (:id, :t, :c, :n, :code)"
            ), {"id": str(rid), "t": str(TENANT_ID), "c": str(company_row[0]),
                "n": code, "code": code})
            region_id = rid
        else:
            region_id = rrow[0]
        arows = session.execute(
            text("SELECT id, name FROM areas WHERE tenant_id=:t AND region_id=:r"),
            {"t": str(TENANT_ID), "r": str(region_id)},
        ).all()
        if not arows:
            aid = uuid.uuid4()
            session.execute(text(
                "INSERT INTO areas (id, tenant_id, region_id, name, code) "
                "VALUES (:id, :t, :r, :n, :code)"
            ), {"id": str(aid), "t": str(TENANT_ID), "r": str(region_id),
                "n": code + "中央", "code": "ZD-" + code[:3]})
            arows = [(aid, code + "中央")]
        out[code] = arows
    session.commit()
    return out


def clear_existing_demo(session):
    """Idempotent: delete previously seeded ZD- demo records."""
    print("Clearing existing ZENSHO_DEMO data...")
    # store ids
    sids = [r[0] for r in session.execute(text(
        "SELECT id FROM stores WHERE tenant_id=:t AND code LIKE 'ZD-%'"
    ), {"t": str(TENANT_ID)}).all()]
    if sids:
        ids_str = ",".join([f"'{s}'" for s in sids])
        for tbl in ["haccp_monitoring", "sv_visits", "reviews",
                    "hourly_store_sales", "daily_store_sales"]:
            session.execute(text(f"DELETE FROM {tbl} WHERE store_id IN ({ids_str})"))
        session.execute(text(f"DELETE FROM stores WHERE id IN ({ids_str})"))
    # demo employees
    session.execute(text(
        "DELETE FROM employees WHERE tenant_id=:t AND code LIKE 'ZD-%'"
    ), {"t": str(TENANT_ID)})
    # demo incidents
    session.execute(text(
        "DELETE FROM incidents WHERE tenant_id=:t AND title LIKE '[DEMO]%'"
    ), {"t": str(TENANT_ID)})
    # demo CCPs and their monitoring
    ccp_rows = session.execute(text(
        "SELECT id FROM ccp_definitions WHERE tenant_id=:t AND name LIKE '[DEMO]%'"
    ), {"t": str(TENANT_ID)}).all()
    if ccp_rows:
        ids_str = ",".join([f"'{r[0]}'" for r in ccp_rows])
        session.execute(text(f"DELETE FROM haccp_monitoring WHERE ccp_id IN ({ids_str})"))
        session.execute(text(f"DELETE FROM ccp_definitions WHERE id IN ({ids_str})"))
    session.commit()


def seed_employees(session, brands, company_id):
    """200 employees across profile mix."""
    rows = []
    counter = 1
    for profile, ratio, names in EMPLOYEE_PROFILES:
        n = int(200 * ratio)
        for i in range(n):
            base = RNG.choice(names)
            code = f"ZD-EMP-{counter:04d}"
            role = "manager" if profile == "正社員" and RNG.random() < 0.2 else "staff"
            if profile == "正社員" and RNG.random() < 0.05:
                role = "sv"
            rows.append({
                "id": uuid.uuid4(),
                "tenant_id": TENANT_ID,
                "company_id": company_id,
                "code": code,
                "name": f"{base}_{counter}",
                "role": role,
                "email": f"emp{counter}@demo-zensho.local",
                "active": True,
            })
            counter += 1
    session.bulk_insert_mappings(Employee, rows)
    session.commit()
    print(f"  inserted {len(rows)} employees")
    return rows


def seed_stores(session, brands, areas):
    """80 stores: 50 sukiya direct + 30 FC."""
    plan = []
    # 50 すき家 direct
    for i in range(50):
        plan.append(("すき家", "direct", i))
    # 15 すき家 FC
    for i in range(15):
        plan.append(("すき家", "fc", i))
    # 8 なか卯 FC
    for i in range(8):
        plan.append(("なか卯", "fc", i))
    # 7 ココス FC
    for i in range(7):
        plan.append(("ココス", "fc", i))

    rows = []
    for idx, (bname, ownership, seq) in enumerate(plan):
        region_code = DEMO_REGIONS[idx % len(DEMO_REGIONS)]
        area_id, area_name = RNG.choice(areas[region_code])
        pref, city = RNG.choice(PREF_CITY[region_code])
        code = f"ZD-{bname[:1]}{idx:03d}"
        prefix = "直営" if ownership == "direct" else "FC"
        rows.append({
            "id": uuid.uuid4(),
            "tenant_id": TENANT_ID,
            "brand_id": brands[bname]["id"],
            "area_id": area_id,
            "code": code,
            "name": f"{bname} {prefix}{city}{seq+1}号店",
            "prefecture": pref,
            "city": city,
            "address": f"{pref}{city}1-{seq+1}-{RNG.randint(1,30)}",
            "trade_area_type": RNG.choice(["駅前", "ロードサイド", "商業施設", "オフィス街"]),
            "opening_date": date(2018, 1, 1) + timedelta(days=RNG.randint(0, 2400)),
            "seat_count": RNG.choice([28, 32, 40, 48, 56, 64]),
            "parking": ownership == "fc" or RNG.random() < 0.5,
            "drive_through": bname == "すき家" and RNG.random() < 0.3,
            "delivery": True,
            "takeout": True,
            "status": "active",
            "lat": 35.0 + RNG.random() * 6.0,
            "lng": 130.0 + RNG.random() * 9.0,
        })
    session.bulk_insert_mappings(Store, rows)
    session.commit()
    print(f"  inserted {len(rows)} stores")
    return rows


def is_payday_after(d: date) -> bool:
    """26-30 of month: bump."""
    return 26 <= d.day <= 30


def is_typhoon_day(d: date) -> bool:
    """Two specific demo typhoon days within last 90."""
    today = date.today()
    return d in {today - timedelta(days=42), today - timedelta(days=18)}


def is_rainy_monday(d: date) -> bool:
    return d.weekday() == 0 and (d.toordinal() % 3 == 0)


def seed_sales(session, stores):
    """90 days hourly + daily sales with realistic variance."""
    today = date.today()
    days = [today - timedelta(days=i) for i in range(90, 0, -1)]
    daily_rows = []
    hourly_rows = []

    BRAND_BASE = {"すき家": 550000, "なか卯": 320000, "ココス": 620000}
    for store in stores:
        # base from brand (lookup brand name via brand_id)
        bname = next(b for b, info in BRANDS_CACHE.items() if info["id"] == store["brand_id"])
        base = BRAND_BASE[bname] * RNG.uniform(0.7, 1.25)

        # store-level demo flags for variance
        is_typhoon_target = RNG.random() < 0.10
        is_late_night_understaffed = bname == "すき家" and RNG.random() < 0.20
        is_payday_strong = RNG.random() < 0.4

        for d in days:
            mult = 1.0
            if is_rainy_monday(d):
                mult *= 0.85
            if is_payday_after(d) and is_payday_strong:
                mult *= 1.12
            if is_typhoon_day(d) and is_typhoon_target:
                mult = 0.0  # closed
            if d.weekday() in (5, 6):
                mult *= 1.18  # weekend
            mult *= RNG.uniform(0.92, 1.08)  # noise

            net_sales = int(base * mult)
            if net_sales == 0:
                # closed day - skip
                continue
            avg_ticket = {"すき家": 520, "なか卯": 580, "ココス": 1200}[bname]
            customer_count = max(20, int(net_sales / avg_ticket))
            order_count = int(customer_count * 0.95)

            daily_id = uuid.uuid4()
            daily_rows.append({
                "id": daily_id,
                "tenant_id": TENANT_ID,
                "store_id": store["id"],
                "business_date": d,
                "gross_sales": int(net_sales * 1.10),
                "net_sales": net_sales,
                "customer_count": customer_count,
                "order_count": order_count,
                "discount_amount": int(net_sales * 0.05),
                "dine_in_sales": int(net_sales * 0.65),
                "takeout_sales": int(net_sales * 0.20),
                "delivery_sales": int(net_sales * 0.15),
            })

            # hourly distribution
            hour_pattern = [
                0.01, 0.01, 0.005, 0.005, 0.005, 0.01,  # 0-5
                0.04, 0.06, 0.05, 0.04, 0.05, 0.10,    # 6-11
                0.13, 0.10, 0.06, 0.05, 0.04, 0.06,    # 12-17
                0.08, 0.09, 0.07, 0.04, 0.025, 0.015,  # 18-23
            ]
            for h, p in enumerate(hour_pattern):
                # late-night understaffed: 22-3am dampened
                hp = p
                if is_late_night_understaffed and (h >= 22 or h <= 3):
                    hp *= 0.7
                hsales = int(net_sales * hp)
                hcust = max(0, int(customer_count * hp))
                if hsales == 0 and hcust == 0:
                    continue
                hourly_rows.append({
                    "id": uuid.uuid4(),
                    "tenant_id": TENANT_ID,
                    "store_id": store["id"],
                    "business_date": d,
                    "hour": h,
                    "net_sales": hsales,
                    "customer_count": hcust,
                    "order_count": int(hcust * 0.95),
                })
    # batch insert
    BATCH = 5000
    for i in range(0, len(daily_rows), BATCH):
        session.bulk_insert_mappings(DailyStoreSales, daily_rows[i:i+BATCH])
        session.commit()
    print(f"  inserted {len(daily_rows)} daily_sales")
    for i in range(0, len(hourly_rows), BATCH):
        session.bulk_insert_mappings(HourlyStoreSales, hourly_rows[i:i+BATCH])
        session.commit()
    print(f"  inserted {len(hourly_rows)} hourly_sales")
    return daily_rows, hourly_rows


def seed_sv_visits(session, stores, employees):
    """各店舗 直近90日で 2-4回."""
    sv_pool = [e for e in employees if e["role"] in ("sv", "manager")]
    if not sv_pool:
        sv_pool = employees[:10]
    today = date.today()
    rows = []
    for s in stores:
        n_visits = RNG.randint(2, 4)
        for _ in range(n_visits):
            visit_date = today - timedelta(days=RNG.randint(1, 90))
            sv = RNG.choice(sv_pool)
            score = Decimal(str(round(RNG.uniform(72.0, 96.0), 1)))
            findings = {
                "qsc_score": float(score),
                "issues": RNG.sample(
                    ["温度管理OK", "在庫過多", "シフト乱れ", "清掃要", "笑顔接客◎",
                     "POP更新遅延", "包装雑", "オーダー復唱抜け"],
                    k=RNG.randint(1, 3),
                ),
                "next_actions": ["店長面談", "シフト見直し", "再訪予定"],
            }
            rows.append({
                "id": uuid.uuid4(),
                "tenant_id": TENANT_ID,
                "store_id": s["id"],
                "sv_employee_id": sv["id"],
                "visit_date": visit_date,
                "visit_type": RNG.choice(["regular", "follow_up", "emergency"]),
                "checklist_score": score,
                "notes": "直近の客数推移と人時生産性に注視。",
                "findings": findings,
            })
    session.bulk_insert_mappings(SVVisit, rows)
    session.commit()
    print(f"  inserted {len(rows)} sv_visits")
    return rows


def seed_incidents(session, stores):
    """過去 8件 (異物混入 / クレーム / 食中毒疑い 等)."""
    today = datetime.now(timezone.utc)
    sukiya_stores = [s for s in stores if "すき家" in s["name"]][:5]
    cocos_stores = [s for s in stores if "ココス" in s["name"]][:3]

    presets = [
        ("contamination", "[DEMO] すき家 異物混入(髪の毛) - SNS拡散",
         "critical", 35,
         {"summary": "顧客から異物混入(髪の毛)報告。SNS拡散により周辺店舗に客足影響。",
          "stores": [s["id"] for s in sukiya_stores[:2]]}),
        ("food_safety", "[DEMO] すき家 食中毒疑い 保健所指導",
         "high", 60,
         {"summary": "客 4 名から胃腸症状申告。保健所立入。3 日休業対応。",
          "stores": [sukiya_stores[2]["id"]]}),
        ("complaint", "[DEMO] ココス 接客クレーム集中(待ち時間)",
         "medium", 12,
         {"summary": "ピーク時待ち時間 60 分超。SNS星評価低下。シフト不足顕著。",
          "stores": [s["id"] for s in cocos_stores[:2]]}),
        ("equipment", "[DEMO] フライヤー故障 終日提供停止",
         "medium", 20,
         {"summary": "フライヤー基板故障で揚げ物提供停止。代替メニュー提示。",
          "stores": [sukiya_stores[3]["id"]]}),
        ("supply", "[DEMO] 牛肉ロット遅延 - 北米港湾ストライキ",
         "high", 8,
         {"summary": "北米港湾ストで牛肉ロット2日遅延。CK→店舗へ振替。",
          "stores": [s["id"] for s in sukiya_stores]}),
        ("hr", "[DEMO] 深夜ワンオペ過労疑い 労基相談",
         "high", 22,
         {"summary": "従業員 1 名から労基への相談。深夜帯の人員配置見直し。",
          "stores": [sukiya_stores[4]["id"]]}),
        ("haccp", "[DEMO] 冷蔵庫温度逸脱 - HACCP記録",
         "medium", 5,
         {"summary": "夜間 4 時間冷蔵温度逸脱。該当ロット廃棄。教育徹底。",
          "stores": [cocos_stores[2]["id"]]}),
        ("review", "[DEMO] Google レビュー集中低評価(★1.8 → ★1.5)",
         "medium", 30,
         {"summary": "短期で★1 投稿が集中。返信対応要。原因分析中。",
          "stores": [sukiya_stores[1]["id"], cocos_stores[0]["id"]]}),
    ]
    rows = []
    for itype, title, severity, days_ago, payload in presets:
        rows.append({
            "id": uuid.uuid4(),
            "tenant_id": TENANT_ID,
            "incident_type": itype,
            "title": title,
            "severity": severity,
            "status": "resolved" if days_ago > 14 else "active",
            "summary": payload["summary"],
            "impacted_stores": [str(x) for x in payload["stores"]],
            "impacted_skus": [],
            "impacted_routes": [],
            "impacted_factories": [],
            "detected_at": today - timedelta(days=days_ago),
            "resolved_at": (today - timedelta(days=max(0, days_ago - 4))) if days_ago > 14 else None,
        })
    session.bulk_insert_mappings(Incident, rows)
    session.commit()
    print(f"  inserted {len(rows)} incidents")
    return rows


REVIEW_GOOD = [
    "牛丼のタレが絶妙。何度来ても飽きない。",
    "セルフレジで会計が早い。ストレスなし。",
    "親子丼の卵がトロトロで最高。",
    "包み焼きハンバーグ、子供に大好評。",
    "深夜でも提供スピードが安定している。",
    "店員さんの挨拶が気持ちよかった。",
    "テイクアウトのアプリ予約が便利。",
    "コスパ良好。リピート確定。",
]
REVIEW_BAD = [
    "異物混入のニュースを見て不安が残る。",
    "深夜のワンオペが心配。店員さん大丈夫か。",
    "提供が遅い。20 分以上待った。",
    "店内が汚れていてテーブル拭きが雑。",
    "値上げ後の量が物足りない。",
    "接客の挨拶がない。",
    "券売機の操作が分かりにくい。",
    "料理が冷めていた。作り置き感あり。",
]
REVIEW_NEUTRAL = [
    "可もなく不可もなし。普通。",
    "メニューが多すぎて選べない。",
    "立地が便利なので利用している。",
]


def seed_reviews(session, stores):
    """200 reviews mix."""
    today = date.today()
    rows = []
    for _ in range(200):
        s = RNG.choice(stores)
        roll = RNG.random()
        if roll < 0.55:
            text_t = RNG.choice(REVIEW_GOOD)
            rating = Decimal(str(round(RNG.uniform(4.0, 5.0), 1)))
        elif roll < 0.85:
            text_t = RNG.choice(REVIEW_BAD)
            rating = Decimal(str(round(RNG.uniform(1.5, 2.5), 1)))
        else:
            text_t = RNG.choice(REVIEW_NEUTRAL)
            rating = Decimal(str(round(RNG.uniform(3.0, 3.9), 1)))
        rows.append({
            "id": uuid.uuid4(),
            "tenant_id": TENANT_ID,
            "store_id": s["id"],
            "review_date": today - timedelta(days=RNG.randint(1, 90)),
            "source": RNG.choice(["google", "tabelog", "hotpepper", "gurunavi"]),
            "rating": rating,
            "text": text_t,
        })
    session.bulk_insert_mappings(Review, rows)
    session.commit()
    print(f"  inserted {len(rows)} reviews")
    return rows


def seed_haccp(session, stores):
    """CCP 3点 × 各店舗 × 30日."""
    ccp_rows = [
        {"id": uuid.uuid4(), "tenant_id": TENANT_ID,
         "name": "[DEMO] 冷蔵庫温度", "threshold_min": Decimal("0.0"),
         "threshold_max": Decimal("5.0"), "monitoring_frequency": "hourly",
         "monitoring_method": "デジタル温度計"},
        {"id": uuid.uuid4(), "tenant_id": TENANT_ID,
         "name": "[DEMO] 加熱中心温度", "threshold_min": Decimal("75.0"),
         "threshold_max": Decimal("99.0"), "monitoring_frequency": "per_batch",
         "monitoring_method": "中心温度計"},
        {"id": uuid.uuid4(), "tenant_id": TENANT_ID,
         "name": "[DEMO] 油温管理(フライヤー)", "threshold_min": Decimal("160.0"),
         "threshold_max": Decimal("185.0"), "monitoring_frequency": "every_2h",
         "monitoring_method": "サーモセンサ"},
    ]
    session.bulk_insert_mappings(CCPDefinition, ccp_rows)
    session.commit()

    today = date.today()
    monitoring = []
    for s in stores:
        for d in range(30):
            target_date = today - timedelta(days=d)
            for ccp in ccp_rows:
                if "冷蔵" in ccp["name"]:
                    val = Decimal(str(round(RNG.uniform(1.5, 4.5), 2)))
                    if RNG.random() < 0.02:
                        val = Decimal(str(round(RNG.uniform(6.0, 8.5), 2)))
                elif "加熱" in ccp["name"]:
                    val = Decimal(str(round(RNG.uniform(78.0, 92.0), 2)))
                else:
                    val = Decimal(str(round(RNG.uniform(165.0, 180.0), 2)))
                compliant = (
                    (ccp["threshold_min"] is None or val >= ccp["threshold_min"]) and
                    (ccp["threshold_max"] is None or val <= ccp["threshold_max"])
                )
                monitoring.append({
                    "id": uuid.uuid4(),
                    "tenant_id": TENANT_ID,
                    "store_id": s["id"],
                    "ccp_id": ccp["id"],
                    "monitoring_date_time": datetime.combine(target_date, datetime.min.time()) +
                        timedelta(hours=RNG.randint(8, 22)),
                    "measured_value": val,
                    "is_compliant": compliant,
                    "deviation_action": None if compliant else "該当ロット廃棄、温度復帰確認、原因究明中",
                })
    BATCH = 5000
    for i in range(0, len(monitoring), BATCH):
        session.bulk_insert_mappings(HACCPMonitoring, monitoring[i:i+BATCH])
        session.commit()
    print(f"  inserted {len(ccp_rows)} CCPs, {len(monitoring)} monitoring records")
    return ccp_rows, monitoring


# Mutable cache for brand id -> name reverse-lookup during sales gen
BRANDS_CACHE = {}


def run():
    print("== Zensho demo seed ==")
    print("Ensuring schema exists...")
    Base.metadata.create_all(sync_engine)

    session = SyncSession()
    try:
        clear_existing_demo(session)

        print("Brands...")
        brands = get_or_create_demo_brands(session)
        global BRANDS_CACHE
        BRANDS_CACHE = brands
        company_id = list(brands.values())[0]["company_id"]

        print("Areas...")
        areas = get_or_create_demo_areas(session)

        print("Employees (200, 構成: 高校生/シニア/外国人技能実習生/正社員/パート主婦)...")
        employees = seed_employees(session, brands, company_id)

        print("Stores (50 直営 + 30 FC = 80)...")
        stores = seed_stores(session, brands, areas)

        print("Daily/Hourly sales (90 days, 月曜雨/給料日/台風 反映)...")
        seed_sales(session, stores)

        print("SV visits...")
        seed_sv_visits(session, stores, employees)

        print("Incidents (8 件)...")
        seed_incidents(session, stores)

        print("Reviews (200 件)...")
        seed_reviews(session, stores)

        print("HACCP records...")
        seed_haccp(session, stores)

        print("\n== DONE ==")
        print(f"  brands={len(brands)} areas={sum(len(v) for v in areas.values())}")
        print(f"  employees={len(employees)} stores={len(stores)}")
        print("  Tenant: 'demo' (00000000-0000-0000-0000-000000000001)")
        print("  Store code prefix: ZD-")
    except Exception as e:
        session.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run()
