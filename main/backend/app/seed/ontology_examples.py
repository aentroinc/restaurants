"""Seed 30+ business-vertical ObjectTypes (Phase B/C complement).

Categories: 牛丼 / とんかつ / カレー / 居酒屋 / カフェ / 寿司 / ファミレス /
ベーカリー / ピザ.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ontology_v2 import OntologyObjectTypeV2, OntologyPropertyType


VERTICAL_OBJECT_TYPES: list[dict] = [
    # 牛丼
    {"api": "BeefBowlVariant", "name": "牛丼バリアント", "props": [("size", "enum", ["並","大","特盛","ミニ"]), ("rice_grade", "string", None), ("topping", "array", None)]},
    {"api": "MeatSource", "name": "肉産地", "props": [("country", "string", None), ("supplier", "string", None), ("usda_grade", "string", None)]},
    # とんかつ
    {"api": "TonkatsuCut", "name": "とんかつカット", "props": [("cut", "enum", ["ロース","ヒレ","厚切り"]), ("thickness_mm", "int", None)]},
    {"api": "BreadingType", "name": "衣の種類", "props": [("style", "enum", ["生パン粉","乾燥パン粉","二度衣"]), ("oil_temp_c", "int", None)]},
    # カレー
    {"api": "CurrySpiceBlend", "name": "カレースパイス", "props": [("base", "enum", ["欧風","インド","タイ"]), ("spice_count", "int", None), ("heat_level", "int", None)]},
    # 居酒屋
    {"api": "AlcoholType", "name": "酒類カテゴリ", "props": [("category", "enum", ["日本酒","焼酎","ビール","ハイボール","カクテル"]), ("abv_pct", "float", None)]},
    {"api": "OmuMenu", "name": "お通し", "props": [("season", "enum", ["春","夏","秋","冬"]), ("change_frequency_days", "int", None)]},
    # カフェ
    {"api": "BeanOrigin", "name": "コーヒー豆原産地", "props": [("country", "string", None), ("region", "string", None), ("varietal", "string", None)]},
    {"api": "RoastLevel", "name": "焙煎度", "props": [("level", "enum", ["浅煎り","中煎り","深煎り"]), ("city", "string", None)]},
    {"api": "BrewingMethod", "name": "抽出方法", "props": [("method", "enum", ["ハンドドリップ","エスプレッソ","フレンチプレス","エアロプレス"]), ("water_temp_c", "int", None)]},
    # 寿司
    {"api": "NetaType", "name": "ネタ種類", "props": [("category", "enum", ["白身","赤身","光物","貝","軍艦","巻物"]), ("seasonal", "bool", None)]},
    {"api": "ShariBlend", "name": "シャリ配合", "props": [("rice_blend", "string", None), ("vinegar_ratio_pct", "float", None)]},
    # ファミレス
    {"api": "KidsMenu", "name": "キッズメニュー", "props": [("age_band", "enum", ["3-5","6-8","9-12"]), ("includes_toy", "bool", None)]},
    {"api": "BirthdayService", "name": "誕生日サービス", "props": [("dessert_included", "bool", None), ("photo_included", "bool", None)]},
    # ベーカリー
    {"api": "BreadType", "name": "パン種類", "props": [("category", "enum", ["菓子パン","食パン","フランス系","総菜パン"]), ("yeast_type", "string", None)]},
    {"api": "Fermentation", "name": "発酵法", "props": [("method", "enum", ["直接法","ストレート法","中種法","老麺法"]), ("hours", "int", None)]},
    # ピザ
    {"api": "PizzaSize", "name": "ピザサイズ", "props": [("diameter_cm", "int", None), ("crust", "enum", ["薄","通常","パン"])]},
    {"api": "PizzaTopping", "name": "ピザトッピング", "props": [("name", "string", None), ("category", "enum", ["肉","野菜","シーフード","チーズ"])]},
    # 横断 / 業種共通拡張
    {"api": "DeliveryPlatform", "name": "デリバリープラットフォーム", "props": [("platform", "enum", ["Uber","出前館","Wolt","menu","DoorDash"]), ("commission_pct", "float", None)]},
    {"api": "ReservationSlot", "name": "予約枠", "props": [("source", "enum", ["店頭","電話","TableCheck","ぐるなび","食べログ"]), ("party_size", "int", None)]},
    {"api": "PromotionCampaign", "name": "販促キャンペーン", "props": [("type", "enum", ["値引","セット","ポイント還元","タイムサービス"]), ("budget_jpy", "int", None)]},
    {"api": "Staff", "name": "従業員", "props": [("position", "enum", ["店長","副店長","リーダー","アルバイト"]), ("license", "array", None)]},
    {"api": "Shift", "name": "シフト", "props": [("type", "enum", ["早番","遅番","通し","オープン","クローズ"]), ("hours", "float", None)]},
    {"api": "FranchiseAgreement", "name": "FC契約", "props": [("type", "enum", ["直営","FC","サブリース"]), ("royalty_rate_pct", "float", None)]},
    {"api": "TradeArea", "name": "商圏", "props": [("type", "enum", ["駅前","ロードサイド","商業施設","オフィス街","住宅街"]), ("population", "int", None)]},
    {"api": "CompetitorChain", "name": "競合チェーン", "props": [("name", "string", None), ("category", "string", None)]},
    {"api": "RenovationProject", "name": "改装プロジェクト", "props": [("scope", "enum", ["内装","厨房","設備","拡張"]), ("budget_jpy", "int", None)]},
    {"api": "EquipmentAsset", "name": "設備資産", "props": [("category", "enum", ["フライヤー","オーブン","冷蔵庫","レジ","POS"]), ("purchase_year", "int", None)]},
    {"api": "AllergenAdvisory", "name": "アレルゲン注意", "props": [("severity", "enum", ["注意","厳重","代替不可"]), ("notes", "string", None)]},
    {"api": "QSCAuditTemplate", "name": "QSCテンプレ", "props": [("section", "enum", ["Quality","Service","Cleanliness"]), ("question_count", "int", None)]},
    {"api": "HACCPCriticalPoint", "name": "HACCP重要管理点", "props": [("category", "enum", ["温度","衛生","異物混入"]), ("monitoring_interval_min", "int", None)]},
]


async def seed_vertical_object_types(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """Idempotent: skips object types that already exist for the tenant."""
    created = 0
    skipped = 0
    for spec in VERTICAL_OBJECT_TYPES:
        res = await db.execute(
            select(OntologyObjectTypeV2).where(
                OntologyObjectTypeV2.tenant_id == tenant_id,
                OntologyObjectTypeV2.api_name == spec["api"],
            )
        )
        if res.scalar_one_or_none():
            skipped += 1
            continue
        ot = OntologyObjectTypeV2(
            tenant_id=tenant_id,
            api_name=spec["api"],
            display_name=spec["name"],
            primary_key_field="id",
            version=1,
            status="active",
        )
        db.add(ot)
        await db.flush()
        for sort_idx, (prop_api, dtype, enum_vals) in enumerate(spec["props"]):
            db.add(OntologyPropertyType(
                tenant_id=tenant_id,
                object_type_id=ot.id,
                api_name=prop_api,
                display_name=prop_api,
                data_type=dtype,
                enum_values=enum_vals,
                required=False,
                sort_order=sort_idx,
                version=1,
            ))
        created += 1
    await db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "total_in_seed": len(VERTICAL_OBJECT_TYPES),
    }
