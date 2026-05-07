"""Manual-input seed data for the Zensho demo (30 rows × 8 objects = 240).

Idempotent: re-running the seeder skips records whose ``id`` already exists
(deterministic UUIDs derived from the demo store list + an index).

Driven by sync SQLAlchemy session because it's intended to be called from
``scripts/seed_demo_zensho.py`` after the ZD- demo stores are created.
"""
from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text


DEMO_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
RNG = random.Random(20260502)


# ---------------------------------------------------------------------------
# fixed demo content snippets
# ---------------------------------------------------------------------------

DAILY_REPORT_SUMMARIES = [
    "本日の売上は前年同曜日比 +4%。ランチピーク堅調。",
    "雨天の影響で来客数 -8%。テイクアウト比率 +5pt。",
    "朝定セットの動きが弱い。学生層を取り込めず。",
    "週末ディナー帯で家族客増。客単価 +60円。",
    "新メニュー鶏そぼろ丼が好調、品切れ気味。",
    "深夜帯ワンオペでオーダー遅延。改善要。",
    "近隣イベントで飛び込み客多。店外オペ要員配置。",
]
WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "強風", "猛暑日", "寒波"]
SPECIAL_EVENTS = [
    "近隣で花火大会",
    "近隣商業施設リニューアル",
    "PTA会合で20名予約",
    "通学路工事による迂回",
    "競合店改装閉店中",
    None, None, None,  # most days have no special event
]

WASTE_REASONS = ["expired", "dropped", "over_made", "wrong_made", "other"]
WASTE_NOTES_BY_REASON = {
    "expired": "賞味期限切れの牛丼の具を廃棄。",
    "dropped": "盛付け中に床に落下、廃棄。",
    "over_made": "シフト交代時の予測ミスで作りすぎ。",
    "wrong_made": "オーダー誤読で誤調理、廃棄。",
    "other": "ホール温度逸脱の可能性、自主廃棄。",
}

COMPLAINT_CHANNELS = ["in_store", "phone", "email", "sns"]
COMPLAINT_SEVERITIES = ["low", "low", "low", "medium", "medium", "high"]  # weighted
COMPLAINT_TEMPLATES = [
    "提供が15分以上かかった。",
    "牛丼に髪の毛が混入していた。",
    "店内の清掃が雑、床がベタベタ。",
    "店員の挨拶がなく対応が冷たい。",
    "値上げ後も量が減っていて納得いかない。",
    "テイクアウトでスプーンが入っていなかった。",
    "深夜の店員1人体制で待たされた。",
    "アレルギー対応について確認しても曖昧な回答。",
]
COMPLAINT_RESPONSES = [
    "店長から謝罪、再提供。",
    "返金対応・本部報告。",
    "再発防止研修を実施予定。",
    "クーポン配布、SNS返信済。",
    "原因調査中、後日連絡予定。",
]

EQUIPMENT_CATS = ["refrigerator", "oven", "pos", "aircon", "plumbing", "other"]
EQUIPMENT_NAMES = {
    "refrigerator": ["業務用冷蔵庫A", "サラダ冷蔵ケース", "冷凍ストッカー"],
    "oven": ["スチコン", "コンベクションオーブン"],
    "pos": ["POSレジ1号機", "POSレジ2号機", "セルフレジ"],
    "aircon": ["客席エアコン東", "厨房エアコン", "ホール室外機"],
    "plumbing": ["客席トイレ給水", "厨房シンク排水", "食洗機給湯"],
    "other": ["券売機", "BGM音響", "看板照明"],
}
EQUIPMENT_SEVERITIES = ["minor", "minor", "major", "major", "critical"]

ALLERGENS = ["wheat", "egg", "milk", "soba", "peanut", "shrimp", "crab", "other"]
ALLERGY_ITEMS = {
    "wheat": [{"item_name": "うどん", "swap": "別茹で対応"}],
    "egg": [{"item_name": "親子丼", "swap": "卵抜き提供"}],
    "milk": [{"item_name": "デザート", "swap": "ノンミルク版"}],
    "soba": [{"item_name": "そば", "swap": "うどんに変更"}],
    "peanut": [{"item_name": "ソース", "swap": "代替ソース"}],
    "shrimp": [{"item_name": "天ぷら", "swap": "野菜天のみ"}],
    "crab": [{"item_name": "サラダ", "swap": "カニ抜き"}],
    "other": [{"item_name": "サイドメニュー", "swap": "代替提案"}],
}

LOSS_REASONS = ["spilled", "dropped", "broken", "wrong_order", "other"]
LOSS_ITEMS = ["味噌汁", "牛丼並", "親子丼", "サラダ", "デザート", "ドリンク", "つゆ"]

VOICE_SENTIMENTS = ["positive", "positive", "neutral", "negative"]
VOICE_SOURCES = ["heard", "observed", "online"]
VOICE_TEMPLATES = {
    "positive": ["丁寧な接客で気持ちよく食事できた。", "新メニューが美味しいとリピーターから好評。",
                 "深夜なのに対応が早かった。"],
    "neutral": ["値段相応との声。", "メニューが多すぎる。", "雰囲気は普通。"],
    "negative": ["待ち時間が長すぎる。", "席が狭くて落ち着かない。", "店員の声が小さくて聞こえない。"],
}

COMPETITOR_NAMES = [
    "吉野家 渋谷店", "松屋 新宿西口店", "食べ放題特化型 池袋店",
    "ガスト 大阪本町店", "サイゼリヤ 京都駅前店", "デニーズ 横浜西口店",
    "ジョナサン 千葉店", "ロイヤルホスト 福岡天神店",
]

COMPETITOR_MENU_OBS = [
    [{"item_name": "牛丼並", "price": 468, "popularity": "high"},
     {"item_name": "豚丼並", "price": 498, "popularity": "medium"}],
    [{"item_name": "プレミアム牛めし", "price": 580, "popularity": "high"},
     {"item_name": "カレー", "price": 480, "popularity": "low"}],
    [{"item_name": "親子丼", "price": 590, "popularity": "high"},
     {"item_name": "うどん", "price": 380, "popularity": "medium"}],
]


# ---------------------------------------------------------------------------
# id generator (idempotent)
# ---------------------------------------------------------------------------

def _det_uuid(namespace: str, idx: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_OID, f"ZD-{namespace}-{idx:04d}")


# ---------------------------------------------------------------------------
# seeders
# ---------------------------------------------------------------------------

def _fetch_demo_stores(session) -> list[tuple[uuid.UUID, str]]:
    rows = session.execute(text(
        "SELECT id, name FROM stores WHERE tenant_id=:t AND code LIKE 'ZD-%' ORDER BY code"
    ), {"t": str(DEMO_TENANT_ID)}).all()
    return [(r[0], r[1]) for r in rows]


def _fetch_demo_employees(session) -> list[uuid.UUID]:
    rows = session.execute(text(
        "SELECT id FROM employees WHERE tenant_id=:t AND code LIKE 'ZD-%' ORDER BY code LIMIT 200"
    ), {"t": str(DEMO_TENANT_ID)}).all()
    return [r[0] for r in rows]


def _fetch_demo_areas(session) -> list[uuid.UUID]:
    rows = session.execute(text(
        "SELECT id FROM areas WHERE tenant_id=:t"
    ), {"t": str(DEMO_TENANT_ID)}).all()
    return [r[0] for r in rows]


def _existing(session, table: str, ids: list[uuid.UUID]) -> set[uuid.UUID]:
    if not ids:
        return set()
    ids_str = ",".join([f"'{i}'" for i in ids])
    rows = session.execute(text(f"SELECT id FROM {table} WHERE id IN ({ids_str})")).all()
    return {r[0] for r in rows}


def seed_daily_reports(session, stores, employees, n: int = 30) -> int:
    today = date.today()
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        rid = _det_uuid("DAILY", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "report_date": (today - timedelta(days=i)).isoformat(),
            "sales_summary_text": RNG.choice(DAILY_REPORT_SUMMARIES),
            "weather": RNG.choice(WEATHER_OPTIONS),
            "special_events_text": RNG.choice(SPECIAL_EVENTS),
            "notes": "ZD-seed",
            "predicted_customers_tomorrow": RNG.randint(180, 460),
            "predicted_sales_tomorrow": RNG.randint(280000, 720000),
            "employee_id": str(emp_id) if emp_id else None,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        })
    existing = _existing(session, "manual_daily_reports", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_daily_reports
          (id, tenant_id, store_id, report_date, sales_summary_text, weather,
           special_events_text, notes, predicted_customers_tomorrow,
           predicted_sales_tomorrow, employee_id, submitted_at)
        VALUES
          (:id, :tenant_id, :store_id, :report_date, :sales_summary_text, :weather,
           :special_events_text, :notes, :predicted_customers_tomorrow,
           :predicted_sales_tomorrow, :employee_id, :submitted_at)
    """), rows)
    session.commit()
    return len(rows)


def seed_waste_logs(session, stores, employees, n: int = 30) -> int:
    today = date.today()
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        reason = RNG.choice(WASTE_REASONS)
        qty = round(RNG.uniform(0.2, 4.0), 2)
        cost = round(qty * RNG.uniform(150, 1200), 0)
        rid = _det_uuid("WASTE", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "waste_date": (today - timedelta(days=i % 14)).isoformat(),
            "product_id": None,
            "ingredient_id": None,
            "qty": qty,
            "unit": RNG.choice(["kg", "個", "L"]),
            "reason": reason,
            "cost_estimate": cost,
            "employee_id": str(emp_id) if emp_id else None,
            "photo_url": None,
        })
    existing = _existing(session, "manual_waste_logs", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_waste_logs
          (id, tenant_id, store_id, waste_date, product_id, ingredient_id,
           qty, unit, reason, cost_estimate, employee_id, photo_url)
        VALUES
          (:id, :tenant_id, :store_id, :waste_date, :product_id, :ingredient_id,
           :qty, :unit, :reason, :cost_estimate, :employee_id, :photo_url)
    """), rows)
    session.commit()
    return len(rows)


def seed_complaints(session, stores, employees, n: int = 30) -> int:
    today = date.today()
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        sev = RNG.choice(COMPLAINT_SEVERITIES)
        rid = _det_uuid("COMP", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "complaint_date": (today - timedelta(days=i % 30)).isoformat(),
            "customer_age_range": RNG.choice(["20-29", "30-39", "40-49", "50-59", "60+"]),
            "customer_gender": RNG.choice(["male", "female", "unknown"]),
            "channel": RNG.choice(COMPLAINT_CHANNELS),
            "severity": sev,
            "content": RNG.choice(COMPLAINT_TEMPLATES),
            "response_taken": RNG.choice(COMPLAINT_RESPONSES),
            "resolved": sev != "high",
            "follow_up_needed": sev == "high",
            "employee_id": str(emp_id) if emp_id else None,
        })
    existing = _existing(session, "manual_complaints", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_complaints
          (id, tenant_id, store_id, complaint_date, customer_age_range, customer_gender,
           channel, severity, content, response_taken, resolved, follow_up_needed, employee_id)
        VALUES
          (:id, :tenant_id, :store_id, :complaint_date, :customer_age_range, :customer_gender,
           :channel, :severity, :content, :response_taken, :resolved, :follow_up_needed, :employee_id)
    """), rows)
    session.commit()
    return len(rows)


def seed_equipment_issues(session, stores, employees, n: int = 30) -> int:
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        cat = RNG.choice(EQUIPMENT_CATS)
        sev = RNG.choice(EQUIPMENT_SEVERITIES)
        rid = _det_uuid("EQUIP", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "equipment_name": RNG.choice(EQUIPMENT_NAMES[cat]),
            "equipment_category": cat,
            "severity": sev,
            "description": f"{cat}に異常発生。{'即時停止' if sev == 'critical' else '使用可だが要確認'}。",
            "photo_url": None,
            "repair_requested": sev != "minor",
            "repair_status": RNG.choice(["reported", "scheduled", "done"]),
            "requested_at": (datetime.now(timezone.utc) - timedelta(days=i % 21)).isoformat(),
            "employee_id": str(emp_id) if emp_id else None,
        })
    existing = _existing(session, "manual_equipment_issues", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_equipment_issues
          (id, tenant_id, store_id, equipment_name, equipment_category, severity,
           description, photo_url, repair_requested, repair_status, requested_at, employee_id)
        VALUES
          (:id, :tenant_id, :store_id, :equipment_name, :equipment_category, :severity,
           :description, :photo_url, :repair_requested, :repair_status, :requested_at, :employee_id)
    """), rows)
    session.commit()
    return len(rows)


def seed_allergy_responses(session, stores, employees, n: int = 30) -> int:
    import json
    today = date.today()
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        allergen = RNG.choice(ALLERGENS)
        rid = _det_uuid("ALG", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "response_date": (today - timedelta(days=i % 30)).isoformat(),
            "customer_age_range": RNG.choice(["10-19", "20-29", "30-39", "40-49", "50-59"]),
            "allergen": allergen,
            "items_provided_json": json.dumps(ALLERGY_ITEMS[allergen]),
            "response_taken": "原材料表確認 + 別調理での提供",
            "incident_occurred": i % 12 == 0,  # 1/12 -> incident
            "employee_id": str(emp_id) if emp_id else None,
        })
    existing = _existing(session, "manual_allergy_responses", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_allergy_responses
          (id, tenant_id, store_id, response_date, customer_age_range, allergen,
           items_provided_json, response_taken, incident_occurred, employee_id)
        VALUES
          (:id, :tenant_id, :store_id, :response_date, :customer_age_range, :allergen,
           CAST(:items_provided_json AS JSONB), :response_taken, :incident_occurred, :employee_id)
    """), rows)
    session.commit()
    return len(rows)


def seed_loss_reports(session, stores, employees, n: int = 30) -> int:
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        item = RNG.choice(LOSS_ITEMS)
        qty = RNG.choice([1, 1, 1, 2, 3])
        cost = qty * RNG.choice([180, 250, 320, 480, 580])
        rid = _det_uuid("LOSS", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "employee_id": str(emp_id) if emp_id else None,
            "item_id": None,
            "item_name": item,
            "qty": qty,
            "reason": RNG.choice(LOSS_REASONS),
            "photo_url": None,
            "cost_estimate": cost,
            "occurred_at": (datetime.now(timezone.utc) - timedelta(days=i % 21, hours=RNG.randint(0, 14))).isoformat(),
        })
    existing = _existing(session, "manual_loss_reports", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_loss_reports
          (id, tenant_id, store_id, employee_id, item_id, item_name, qty, reason,
           photo_url, cost_estimate, occurred_at)
        VALUES
          (:id, :tenant_id, :store_id, :employee_id, :item_id, :item_name, :qty, :reason,
           :photo_url, :cost_estimate, :occurred_at)
    """), rows)
    session.commit()
    return len(rows)


def seed_customer_voices(session, stores, employees, n: int = 30) -> int:
    rows: list[dict[str, Any]] = []
    for i in range(n):
        s_id, _ = stores[i % len(stores)]
        emp_id = employees[i % len(employees)] if employees else None
        sentiment = RNG.choice(VOICE_SENTIMENTS)
        rid = _det_uuid("VOICE", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "store_id": str(s_id),
            "content": RNG.choice(VOICE_TEMPLATES[sentiment]),
            "sentiment": sentiment,
            "source": RNG.choice(VOICE_SOURCES),
            "rating": Decimal(str(round(RNG.uniform(1.5, 5.0), 1))) if RNG.random() < 0.5 else None,
            "customer_age_range": RNG.choice(["20-29", "30-39", "40-49", "50-59", None]),
            "employee_id": str(emp_id) if emp_id else None,
            "recorded_at": (datetime.now(timezone.utc) - timedelta(days=i % 30)).isoformat(),
        })
    existing = _existing(session, "manual_customer_voices", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_customer_voices
          (id, tenant_id, store_id, content, sentiment, source, rating,
           customer_age_range, employee_id, recorded_at)
        VALUES
          (:id, :tenant_id, :store_id, :content, :sentiment, :source, :rating,
           :customer_age_range, :employee_id, :recorded_at)
    """), rows)
    session.commit()
    return len(rows)


def seed_competitor_scans(session, areas, n: int = 30) -> int:
    import json
    rows: list[dict[str, Any]] = []
    for i in range(n):
        area_id = areas[i % len(areas)] if areas else None
        rid = _det_uuid("COMPET", i)
        rows.append({
            "id": str(rid),
            "tenant_id": str(DEMO_TENANT_ID),
            "sv_user_id": None,
            "competitor_name": RNG.choice(COMPETITOR_NAMES),
            "competitor_address": f"東京都サンプル区{i+1}-{RNG.randint(1,30)}",
            "latitude": round(35.0 + RNG.random() * 0.3, 6),
            "longitude": round(139.0 + RNG.random() * 0.5, 6),
            "observations_text": "ピーク時 8 割埋まり。POPで朝定推し。",
            "menu_observations_json": json.dumps(RNG.choice(COMPETITOR_MENU_OBS)),
            "photos_json": json.dumps([]),
            "visited_at": (datetime.now(timezone.utc) - timedelta(days=i % 21)).isoformat(),
            "area_id": str(area_id) if area_id else None,
        })
    existing = _existing(session, "manual_competitor_scans", [uuid.UUID(r["id"]) for r in rows])
    rows = [r for r in rows if uuid.UUID(r["id"]) not in existing]
    if not rows:
        return 0
    session.execute(text("""
        INSERT INTO manual_competitor_scans
          (id, tenant_id, sv_user_id, competitor_name, competitor_address,
           latitude, longitude, observations_text, menu_observations_json,
           photos_json, visited_at, area_id)
        VALUES
          (:id, :tenant_id, :sv_user_id, :competitor_name, :competitor_address,
           :latitude, :longitude, :observations_text,
           CAST(:menu_observations_json AS JSONB),
           CAST(:photos_json AS JSONB),
           :visited_at, :area_id)
    """), rows)
    session.commit()
    return len(rows)


def seed_manual_input_data(session) -> dict[str, int]:
    """Top-level entry for the demo seeder. Returns a per-object count map."""
    stores = _fetch_demo_stores(session)
    employees = _fetch_demo_employees(session)
    areas = _fetch_demo_areas(session)

    if not stores:
        return {"skipped": 0}

    counts = {
        "daily_reports": seed_daily_reports(session, stores, employees),
        "waste_logs": seed_waste_logs(session, stores, employees),
        "complaints": seed_complaints(session, stores, employees),
        "equipment_issues": seed_equipment_issues(session, stores, employees),
        "allergy_responses": seed_allergy_responses(session, stores, employees),
        "loss_reports": seed_loss_reports(session, stores, employees),
        "customer_voices": seed_customer_voices(session, stores, employees),
        "competitor_scans": seed_competitor_scans(session, areas),
    }
    counts["total"] = sum(v for v in counts.values())
    return counts


__all__ = [
    "seed_manual_input_data",
    "seed_daily_reports",
    "seed_waste_logs",
    "seed_complaints",
    "seed_equipment_issues",
    "seed_allergy_responses",
    "seed_loss_reports",
    "seed_customer_voices",
    "seed_competitor_scans",
    "DEMO_TENANT_ID",
]
