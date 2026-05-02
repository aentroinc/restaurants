"""Marking-based ACL evaluation engine.

evaluate_access: テーブル/行/列に貼られた marking を、ユーザの現在の
purpose-token が解放している marking と AND 評価し allow|mask|deny を返す。

filter_for_llm: AI Chat に渡す前に marking 付き列を mask / 削除する。
column_policy.py のマスクは PII 単位の独立レイヤとして温存し、Marking はその上に重ねる。
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Iterable
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.marking import Marking, MarkingAssignment, UserPurpose


# resource_type ごとに「purpose 未付与なら mask か deny か」のデフォルト方針
_LEVEL_TO_DECISION = {
    "low": "mask",
    "medium": "mask",
    "high": "deny",
}


async def get_active_purpose(db: AsyncSession, user_id: str | None) -> dict:
    """ユーザの現在 valid な purpose-token を返す。
    複数あれば granted_markings の和集合を返す（最大権限を採用）。
    """
    if not user_id:
        return {"purpose_token": None, "granted_markings": []}

    now = datetime.now(timezone.utc)
    q = select(UserPurpose).where(
        UserPurpose.user_id == user_id,
        or_(UserPurpose.valid_to.is_(None), UserPurpose.valid_to > now),
    )
    rows = (await db.execute(q)).scalars().all()
    if not rows:
        return {"purpose_token": None, "granted_markings": []}

    merged: set[str] = set()
    primary_token = None
    for r in rows:
        for code in (r.granted_markings or []):
            merged.add(code)
        if not primary_token:
            primary_token = r.purpose_token

    return {"purpose_token": primary_token, "granted_markings": sorted(merged)}


async def _load_marking_codes_for(
    db: AsyncSession,
    tenant_id: str,
    resource_type: str,
    resource_id: str | None,
    columns: Iterable[str] | None,
) -> dict[str, list[dict]]:
    """resource に貼られた marking を columns 別 + テーブル全体で返す。
    返り値: { "<col>": [{code, level}, ...], "__resource__": [...] }
    """
    _ = list(columns or [])  # 取り出すかは将来用 (per-column フィルタ最適化)
    where_clauses = [
        MarkingAssignment.tenant_id == tenant_id,
        MarkingAssignment.resource_type == resource_type,
    ]
    if resource_id:
        where_clauses.append(or_(
            MarkingAssignment.resource_id.is_(None),
            MarkingAssignment.resource_id == resource_id,
        ))
    else:
        # resource_id 指定なし → テーブルレベル + 全行 marking のみ
        where_clauses.append(MarkingAssignment.resource_id.is_(None))

    q = (
        select(MarkingAssignment.column_name, Marking.code, Marking.level)
        .join(Marking, Marking.id == MarkingAssignment.marking_id)
        .where(and_(*where_clauses))
    )
    rows = (await db.execute(q)).all()
    out: dict[str, list[dict]] = {"__resource__": []}
    for col, code, level in rows:
        bucket = out.setdefault(col or "__resource__", [])
        bucket.append({"code": code, "level": level or "medium"})
    return out


async def evaluate_access(
    db: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    resource_type: str,
    resource_id: str | None,
    columns: list[str],
) -> dict[str, str]:
    """各列について allow|mask|deny を返す。
    purpose の granted_markings に列の全 marking が含まれていれば allow。
    部分的に欠けていれば level に応じて mask か deny。
    """
    purpose = await get_active_purpose(db, user_id)
    granted = set(purpose["granted_markings"])

    marking_map = await _load_marking_codes_for(db, tenant_id, resource_type, resource_id, columns)
    table_marks = marking_map.get("__resource__", [])

    decisions: dict[str, str] = {}
    for col in columns:
        col_marks = list(marking_map.get(col, [])) + table_marks
        if not col_marks:
            decisions[col] = "allow"
            continue

        missing = [m for m in col_marks if m["code"] not in granted]
        if not missing:
            decisions[col] = "allow"
            continue

        # 最も厳しい level に従う
        worst = max((m["level"] for m in missing), key=lambda lv: {"low": 0, "medium": 1, "high": 2}.get(lv, 1))
        decisions[col] = _LEVEL_TO_DECISION.get(worst, "mask")
    return decisions


async def filter_for_llm(
    db: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    resource_type: str,
    data,
):
    """AI Chat に渡す前のデータを marking で除外 / マスクする。
    deny -> 列削除 / mask -> ***。再帰で list/dict をたどる。
    """
    if isinstance(data, list):
        return [await filter_for_llm(db, tenant_id, user_id, resource_type, x) for x in data]
    if not isinstance(data, dict):
        return data

    columns = list(data.keys())
    if not columns:
        return data
    resource_id = str(data.get("id") or data.get("store_id") or "") or None

    decisions = await evaluate_access(db, tenant_id, user_id, resource_type, resource_id, columns)
    out: dict = {}
    for col, val in data.items():
        verdict = decisions.get(col, "allow")
        if verdict == "deny":
            continue
        if verdict == "mask":
            out[col] = "***"
            continue
        # allow: ネスト dict も再帰
        if isinstance(val, (dict, list)):
            out[col] = await filter_for_llm(db, tenant_id, user_id, resource_type, val)
        else:
            out[col] = val
    return out


async def list_visible_columns(
    db: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    resource_type: str,
    candidate_columns: list[str],
) -> list[str]:
    """system prompt 用: 現在の purpose で露出してよい列名のみ返す。"""
    decisions = await evaluate_access(db, tenant_id, user_id, resource_type, None, candidate_columns)
    return [c for c, v in decisions.items() if v == "allow"]
