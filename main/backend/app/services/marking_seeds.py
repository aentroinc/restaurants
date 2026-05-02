"""標準 markings + 標準 purpose のシード."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.marking import Marking, MarkingAssignment, UserPurpose


STANDARD_MARKINGS = [
    {"code": "pii.basic", "display_name": "PII（基本）", "description": "氏名・連絡先など基本個人情報", "level": "medium"},
    {"code": "pii.sensitive", "display_name": "PII（センシティブ）", "description": "マイナンバー / 健康情報等", "level": "high"},
    {"code": "labor.confidential", "display_name": "労務（機密）", "description": "時給・残業・人事評価", "level": "high"},
    {"code": "fc.financial", "display_name": "FC財務", "description": "店舗 P/L / ロイヤリティ / 財務指標", "level": "high"},
    {"code": "regulatory.haccp", "display_name": "HACCP規制", "description": "食品衛生・規制提出データ", "level": "medium"},
]


# purpose-token → 解放される markings
STANDARD_PURPOSES = {
    "operation": ["pii.basic", "regulatory.haccp"],
    "audit": ["pii.basic", "labor.confidential", "regulatory.haccp"],
    "executive": ["pii.basic", "labor.confidential", "fc.financial"],
    "research": [],  # 何も解放しない（集計済みデータ前提）
}


# デモ用に最低限の column → marking 紐付け
STANDARD_ASSIGNMENTS = [
    # 従業員系
    ("employee", None, "hourly_rate", "labor.confidential"),
    ("employee", None, "salary", "labor.confidential"),
    ("employee", None, "name", "pii.basic"),
    ("employee", None, "email", "pii.basic"),
    ("employee", None, "phone", "pii.basic"),
    # FC/財務系
    ("store_pl", None, "operating_profit", "fc.financial"),
    ("store_pl", None, "operating_profit_rate", "fc.financial"),
    ("store_pl", None, "royalty_amount", "fc.financial"),
    ("store_pl", None, "net_sales", "fc.financial"),
    # HACCP
    ("haccp", None, "ccp_value", "regulatory.haccp"),
    # store_kpi（ranking などにも乗る）
    ("kpi", None, "operating_profit_rate", "fc.financial"),
    ("kpi", None, "labor_cost_rate", "labor.confidential"),
]


async def ensure_standard_markings(db: AsyncSession, tenant_id: str) -> dict[str, str]:
    """標準 markings を upsert し、code -> id を返す."""
    code_to_id: dict[str, str] = {}
    existing = (await db.execute(
        select(Marking).where(Marking.tenant_id == tenant_id)
    )).scalars().all()
    for m in existing:
        code_to_id[m.code] = str(m.id)

    for spec in STANDARD_MARKINGS:
        if spec["code"] in code_to_id:
            continue
        obj = Marking(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            code=spec["code"],
            display_name=spec["display_name"],
            description=spec["description"],
            level=spec["level"],
        )
        db.add(obj)
        await db.flush()
        code_to_id[spec["code"]] = str(obj.id)

    await db.commit()
    return code_to_id


async def ensure_standard_assignments(db: AsyncSession, tenant_id: str) -> int:
    """標準 column→marking 紐付けを upsert."""
    code_to_id = await ensure_standard_markings(db, tenant_id)

    existing = (await db.execute(
        select(MarkingAssignment).where(MarkingAssignment.tenant_id == tenant_id)
    )).scalars().all()
    seen = {(a.resource_type, a.resource_id, a.column_name, str(a.marking_id)) for a in existing}

    added = 0
    for resource_type, resource_id, column_name, marking_code in STANDARD_ASSIGNMENTS:
        marking_id = code_to_id.get(marking_code)
        if not marking_id:
            continue
        key = (resource_type, resource_id, column_name, marking_id)
        if key in seen:
            continue
        db.add(MarkingAssignment(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            marking_id=uuid.UUID(marking_id),
            resource_type=resource_type,
            resource_id=resource_id,
            column_name=column_name,
        ))
        added += 1

    await db.commit()
    return added


async def grant_standard_purpose(
    db: AsyncSession,
    tenant_id: str,
    user_id: str,
    purpose_token: str,
    ttl_minutes: int = 60,
    granted_by: str | None = None,
) -> UserPurpose:
    """ユーザに標準 purpose を付与."""
    markings = STANDARD_PURPOSES.get(purpose_token, [])
    obj = UserPurpose(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        user_id=uuid.UUID(user_id),
        purpose_token=purpose_token,
        granted_markings=list(markings),
        valid_from=datetime.now(timezone.utc),
        valid_to=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        granted_by=uuid.UUID(granted_by) if granted_by else None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
