"""Line Check seed data — Sukiya opening / closing / 4h templates."""
from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.line_check import ChecklistTemplate, ChecklistItem


SUKIYA_OPENING_ITEMS: list[dict[str, Any]] = [
    {"text": "店舗外観・看板の点灯確認", "requires_photo": True},
    {"text": "入口・床の清掃完了", "requires_photo": True},
    {"text": "厨房冷蔵庫の温度（5℃以下）", "requires_temperature": True, "min_temp": 0, "max_temp": 5, "requires_photo": True},
    {"text": "冷凍庫の温度（-18℃以下）", "requires_temperature": True, "min_temp": -30, "max_temp": -18, "requires_photo": True},
    {"text": "牛丼鍋の温度確認（70℃以上）", "requires_temperature": True, "min_temp": 70, "max_temp": 95},
    {"text": "米炊飯の確認", "requires_photo": False},
    {"text": "POSレジ起動・釣銭確認"},
    {"text": "ホール備品（おしぼり・調味料）補充", "requires_photo": True},
    {"text": "トイレ清掃チェック", "requires_photo": True},
    {"text": "従業員の身だしなみ確認"},
    {"text": "手洗い・消毒の実施"},
    {"text": "本日のシフト確認"},
]

SUKIYA_CLOSING_ITEMS: list[dict[str, Any]] = [
    {"text": "売上日報の入力完了"},
    {"text": "レジ締め・現金照合"},
    {"text": "厨房機器の電源OFF確認", "requires_photo": True},
    {"text": "ガス元栓の閉鎖確認", "requires_photo": True},
    {"text": "残食材の冷蔵保管", "requires_temperature": True, "min_temp": 0, "max_temp": 5},
    {"text": "ゴミ出し完了", "requires_photo": True},
    {"text": "床清掃・テーブル拭き完了", "requires_photo": True},
    {"text": "看板・外灯の消灯"},
    {"text": "戸締まり確認", "requires_photo": True},
    {"text": "翌日仕込みの準備状況"},
]

SUKIYA_4H_ITEMS: list[dict[str, Any]] = [
    {"text": "牛丼の品質確認（味・温度）", "requires_temperature": True, "min_temp": 70, "max_temp": 95},
    {"text": "ライスの保温温度", "requires_temperature": True, "min_temp": 60, "max_temp": 75},
    {"text": "味噌汁の温度", "requires_temperature": True, "min_temp": 65, "max_temp": 85},
    {"text": "サラダ冷蔵ケース温度", "requires_temperature": True, "min_temp": 0, "max_temp": 7, "requires_photo": True},
    {"text": "テーブル・カウンター清掃", "requires_photo": True},
    {"text": "備品（紅生姜・七味）補充"},
    {"text": "床の汚れ確認・必要に応じて清掃"},
    {"text": "顧客クレーム有無の確認"},
]


def _build_template(tenant_id: UUID, name: str, schedule_type: str, items: list[dict[str, Any]]) -> ChecklistTemplate:
    tpl = ChecklistTemplate(
        id=uuid4(),
        tenant_id=tenant_id,
        name=name,
        schedule_type=schedule_type,
        active=True,
    )
    for idx, raw in enumerate(items):
        tpl.items.append(ChecklistItem(
            id=uuid4(),
            template_id=tpl.id,
            order=idx,
            text=raw["text"],
            required=raw.get("required", True),
            requires_photo=raw.get("requires_photo", False),
            requires_temperature=raw.get("requires_temperature", False),
            min_temp=raw.get("min_temp"),
            max_temp=raw.get("max_temp"),
        ))
    return tpl


async def seed_line_check_templates(db: AsyncSession, tenant_id: UUID) -> list[ChecklistTemplate]:
    """Idempotent seed: skip if templates with these names already exist for tenant."""
    existing = (await db.execute(
        select(ChecklistTemplate).where(ChecklistTemplate.tenant_id == tenant_id)
    )).scalars().all()
    existing_names = {t.name for t in existing}

    created: list[ChecklistTemplate] = []
    plan = [
        ("かっぱ寿司 開店チェックリスト", "opening", SUKIYA_OPENING_ITEMS),
        ("かっぱ寿司 閉店チェックリスト", "closing", SUKIYA_CLOSING_ITEMS),
        ("かっぱ寿司 4h品質チェック", "4h", SUKIYA_4H_ITEMS),
    ]
    for name, schedule, items in plan:
        if name in existing_names:
            continue
        tpl = _build_template(tenant_id, name, schedule, items)
        db.add(tpl)
        created.append(tpl)
    if created:
        await db.commit()
        for t in created:
            await db.refresh(t)
    return created
