"""Seed 3 standard LogicFunctions for the demo tenant.

Idempotent — re-runnable. Inserts only when name does not already exist.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.aip_logic import LogicFunction


TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _seeds() -> list[dict[str, Any]]:
    return [
        {
            "name": "売上前年比 -10% 超で原因分析タスク発行",
            "description": "前年比で売上が 10% 以上落ちた店舗に対し、AI が仮説を生成しタスク化する。",
            "trigger_json": {
                "type": "anomaly",
                "config": {"kpi": "net_sales", "threshold_pct": -10, "compare": "yoy"},
            },
            "predicate_json": {
                "op": "<",
                "left": {"kpi": "net_sales"},
                "right": {"const": 800000},
            },
            "actions_json": [
                {
                    "type": "call_ai_chat",
                    "params": {
                        "prompt": "店舗の売上が前年比10%以上落ちました。原因仮説を3点、改善アクションを2点、簡潔に出してください。"
                    },
                },
                {
                    "type": "create_task",
                    "params": {
                        "title": "[AI] 売上低下の原因分析",
                        "description": "AI 仮説に基づいて店長と一緒に検証してください。",
                        "priority": "high",
                        "issue_type": "sales",
                    },
                },
            ],
            "enabled": True,
        },
        {
            "name": "労務違反検知で SV に通知",
            "description": "労働基準法違反の検知時に SV へ即時通知する。",
            "trigger_json": {
                "type": "event",
                "config": {"event": "labor_violation_detected"},
            },
            "predicate_json": {
                "op": ">",
                "left": {"kpi": "labor_cost_rate"},
                "right": {"const": 35.0},
            },
            "actions_json": [
                {
                    "type": "send_notification",
                    "params": {
                        "channel": "sv",
                        "message": "労務違反の可能性が検出されました。シフト構成を確認してください。",
                    },
                },
            ],
            "enabled": True,
        },
        {
            "name": "レビュー★3以下が3件続いたら店長日報生成",
            "description": "低評価レビューが連続した場合に店長向け日報を AI 生成する。",
            "trigger_json": {
                "type": "anomaly",
                "config": {"kpi": "review_score", "threshold": 3.0, "consecutive": 3},
            },
            "predicate_json": {
                "op": "<=",
                "left": {"kpi": "review_score"},
                "right": {"const": 3.0},
            },
            "actions_json": [
                {
                    "type": "call_ai_chat",
                    "params": {
                        "prompt": "★3以下のレビューが3件続きました。店長向けの改善日報を300字で書いてください。"
                    },
                },
                {
                    "type": "create_task",
                    "params": {
                        "title": "[AI] 低評価レビュー対応の店長日報",
                        "priority": "medium",
                        "issue_type": "qsc",
                    },
                },
            ],
            "enabled": True,
        },
    ]


def seed_aip_logic(session: Session) -> int:
    """Insert seed LogicFunctions if they don't exist. Returns count inserted."""
    inserted = 0
    existing_names = {
        r[0] for r in session.execute(
            LogicFunction.__table__.select().with_only_columns(LogicFunction.__table__.c.name)
            .where(LogicFunction.__table__.c.tenant_id == TENANT_ID)
        ).all()
    }
    for s in _seeds():
        if s["name"] in existing_names:
            continue
        session.execute(LogicFunction.__table__.insert().values(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            name=s["name"],
            description=s["description"],
            trigger_json=s["trigger_json"],
            predicate_json=s["predicate_json"],
            actions_json=s["actions_json"],
            enabled=s["enabled"],
            created_by="seed",
        ))
        inserted += 1
    session.commit()
    return inserted


if __name__ == "__main__":
    from app.database import SyncSession
    sess = SyncSession()
    try:
        n = seed_aip_logic(sess)
        print(f"AIP Logic seed: {n} inserted.")
    finally:
        sess.close()
