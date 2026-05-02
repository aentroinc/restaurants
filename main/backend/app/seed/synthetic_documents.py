"""Synthetic document seed for the RAG pipeline.

Generates a realistic mix of meeting_note / review / sv_report / playbook
documents and embeds them using app.services.ai.embedder. Run from a
script entry point (or invoke programmatically) — does not auto-seed.

Target volume:
  - meeting_note: 1000 (5 brands x 200 monthly notes)
  - review:       5000
  - sv_report:    2000
  - playbook:     50
  -- total ≈ 8050
"""
from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.services.ai.embedder import embed_text

KEY_TOPICS = [
    "粗利率の改善", "人件費比率の最適化", "FL比率の悪化", "客単価向上施策",
    "深夜帯の人件費超過", "ピーク時の人手不足", "原価率の上昇要因", "新メニュー投入の効果",
    "値上げ後の客数推移", "競合店舗の影響", "立地別の収益性", "ロードサイド店の課題",
    "駅前店の客数減", "労基違反リスク", "シフト最適化", "理論原価との乖離",
    "アレルゲン表示の改訂", "HACCP モニタリング", "店長交代の影響", "QSC スコアの変動",
]

REVIEW_PHRASES = [
    "店員さんの対応がとても丁寧でした", "料理の提供が遅かった", "店内が清潔で気持ちよく食事できた",
    "値段の割に量が少ないと感じた", "リピートしたい味だった", "席が狭くて落ち着けなかった",
    "ランチタイムは混雑していた", "電話対応が悪かった", "新メニューが美味しかった",
    "駐車場が足りない", "アレルゲン表示が分かりやすい", "ドリンクのバリエーションが少ない",
]

PLAYBOOK_TITLES = [
    "原価率異常時の対応手順", "人件費オーバーラン時のSV介入",
    "新店オープン 90 日プレイブック", "値上げ時の客数モニタリング",
    "FC加盟店の月次レビュー", "QSC スコア改善 4 ステップ",
    "競合店舗開店時の防衛策", "深夜帯廃棄削減の標準手順",
]


def _meeting_note_text(brand: str, period: str, topic: str) -> str:
    return (
        f"{period} {brand} 月次経営会議 議事録\n\n"
        f"主要論点: {topic}\n\n"
        f"討議内容: 直近 3 ヶ月の {topic} について、エリア別 / 業態別の実績を確認した。"
        f"店舗ヘルススコアが 70 を下回る店舗群で {topic} の悪化が顕著であり、"
        f"SV 介入の優先順位を再構成する方針で合意した。\n\n"
        f"アクション: (1) 該当店舗にタスクを起票し SV が翌週訪問、"
        f"(2) 1ヶ月後に効果検証、(3) ベンチマーク比較で再ランク付け。"
    )


def _review_text(store: str, sentiment: str) -> str:
    phrase = random.choice(REVIEW_PHRASES)
    return f"{store} レビュー [{sentiment}]: {phrase}。来店時間 {random.randint(11,22)}時頃。"


def _sv_report_text(store: str, week: str) -> str:
    finding = random.choice(KEY_TOPICS)
    return (
        f"{store} 店舗 SV 訪問レポート ({week})\n\n"
        f"観察事項: {finding}が確認された。"
        f"スタッフ配置と発注パターンを点検し、店長と改善策を協議。\n"
        f"次回アクション: 2 週間後に再訪問、改善状況を確認。"
    )


def _playbook_text(title: str) -> str:
    return (
        f"プレイブック: {title}\n\n"
        f"目的: 店舗運営における {title} を、再現可能な標準手順として提供する。\n\n"
        f"前提条件: 月次の KPI が確定していること、SV と店長が同意していること。\n\n"
        f"手順:\n"
        f"1. データ確認 (StoreDailyKPI のトレンド)\n"
        f"2. 異常店舗の絞り込み\n"
        f"3. SV ミッション登録\n"
        f"4. 4 週間後に効果検証\n"
        f"5. レビュー後、Meeting Pack に反映"
    )


async def _exists_already(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    res = await db.execute(
        select(Document).where(Document.tenant_id == tenant_id).limit(1)
    )
    return 1 if res.scalar_one_or_none() else 0


async def seed(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    n_meeting: int = 1000,
    n_review: int = 5000,
    n_sv: int = 2000,
    n_playbook: int = 50,
    sample_only: bool = False,
) -> dict:
    """Generate + insert synthetic documents for the tenant."""
    if sample_only:
        n_meeting, n_review, n_sv, n_playbook = 20, 50, 20, 5

    if await _exists_already(db, tenant_id):
        return {"skipped": True, "reason": "documents already exist for this tenant"}

    rng = random.Random(int(tenant_id.int) & 0xFFFFFFFF)
    inserted = {"meeting_note": 0, "review": 0, "sv_report": 0, "playbook": 0}

    brands = ["AENTRO カレー", "AENTRO 牛丼", "AENTRO 居酒屋", "AENTRO カフェ", "AENTRO 寿司"]

    base_date = datetime.now(timezone.utc) - timedelta(days=200 * 30)

    # meeting notes
    for i in range(n_meeting):
        brand = rng.choice(brands)
        period = (base_date + timedelta(days=i)).strftime("%Y-%m")
        topic = rng.choice(KEY_TOPICS)
        title = f"{brand} {period} 月次経営会議"
        body = _meeting_note_text(brand, period, topic)
        emb = await embed_text(f"{title}\n{body}")
        db.add(Document(
            tenant_id=tenant_id, type="meeting_note",
            title=title, content=body, embedding=emb,
            metadata_={"brand": brand, "period": period, "topic": topic},
        ))
        inserted["meeting_note"] += 1
        if i % 200 == 0:
            await db.flush()

    # reviews
    sentiments = ["positive", "negative", "neutral"]
    for i in range(n_review):
        store = f"店舗-{rng.randint(1, 500):03d}"
        sentiment = rng.choice(sentiments)
        body = _review_text(store, sentiment)
        emb = await embed_text(body)
        db.add(Document(
            tenant_id=tenant_id, type="review",
            title=f"{store} レビュー", content=body, embedding=emb,
            metadata_={"store": store, "sentiment": sentiment},
        ))
        inserted["review"] += 1
        if i % 500 == 0:
            await db.flush()

    # sv reports
    for i in range(n_sv):
        store = f"店舗-{rng.randint(1, 500):03d}"
        week = (base_date + timedelta(weeks=i)).strftime("%Y-W%V")
        body = _sv_report_text(store, week)
        emb = await embed_text(body)
        db.add(Document(
            tenant_id=tenant_id, type="sv_report",
            title=f"{store} SV訪問レポート {week}", content=body, embedding=emb,
            metadata_={"store": store, "week": week},
        ))
        inserted["sv_report"] += 1
        if i % 500 == 0:
            await db.flush()

    # playbooks
    for title in PLAYBOOK_TITLES[:n_playbook]:
        body = _playbook_text(title)
        emb = await embed_text(f"{title}\n{body}")
        db.add(Document(
            tenant_id=tenant_id, type="playbook",
            title=title, content=body, embedding=emb,
            metadata_={"category": "operations"},
        ))
        inserted["playbook"] += 1

    await db.commit()
    return {"inserted": inserted, "total": sum(inserted.values())}


def main():  # pragma: no cover
    """CLI entry: python -m app.seed.synthetic_documents <tenant_uuid>"""
    import sys
    from app.database import async_session

    tid = uuid.UUID(sys.argv[1])

    async def _run():
        async with async_session() as s:
            print(await seed(s, tid, sample_only="--sample" in sys.argv))

    asyncio.run(_run())


if __name__ == "__main__":  # pragma: no cover
    main()
