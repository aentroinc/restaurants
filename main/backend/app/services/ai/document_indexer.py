"""Index existing DB records into the documents table for RAG search."""
import json
from sqlalchemy import select, and_
from app.database import SyncSession
from app.models.document import Document
from app.models.meeting_pack import BoardMeetingPack, BoardMeetingItem
from app.models.review import Review
from app.models.sv_visit import SVVisit
from app.models.industry_playbook import IndustryPlaybook
from app.services.ai.embedder import embed_text


def index_all_documents(tenant_id: str) -> dict:
    session = SyncSession()
    try:
        # delete existing (re-index)
        session.execute(
            Document.__table__.delete().where(Document.tenant_id == tenant_id)
        )
        session.commit()

        count = 0

        # 1. BoardMeetingPack -> meeting_note
        packs = session.execute(
            select(BoardMeetingPack).where(BoardMeetingPack.tenant_id == tenant_id)
        ).scalars().all()

        for pack in packs:
            items = session.execute(
                select(BoardMeetingItem).where(BoardMeetingItem.pack_id == pack.id)
            ).scalars().all()

            items_text = "\n".join([
                f"- {item.title}: {json.dumps(item.content, ensure_ascii=False)[:200]}"
                for item in items
            ])
            content = (
                f"経営会議パック「{pack.title}」\n"
                f"日付: {pack.meeting_date}\nステータス: {pack.status}\n\n"
                f"議題:\n{items_text}"
            )
            doc = Document(
                tenant_id=tenant_id,
                doc_type="meeting_note",
                source_id=pack.id,
                title=f"経営会議 {pack.meeting_date}: {pack.title}",
                content=content,
                embedding=embed_text(content),
                metadata_={"meeting_date": str(pack.meeting_date), "item_count": len(items)},
            )
            session.add(doc)
            count += 1

        # 2. Reviews (latest 500) -> review
        reviews = session.execute(
            select(Review).where(Review.tenant_id == tenant_id)
            .order_by(Review.review_date.desc()).limit(500)
        ).scalars().all()

        for rev in reviews:
            content = (
                f"レビュー ({rev.source})\n"
                f"評価: {rev.rating}/5.0\n日付: {rev.review_date}\n\n"
                f"{rev.text or '（テキストなし）'}"
            )
            doc = Document(
                tenant_id=tenant_id,
                doc_type="review",
                source_id=rev.id,
                title=f"{rev.source} {rev.rating}点 ({rev.review_date})",
                content=content,
                embedding=embed_text(content),
                metadata_={"source": rev.source, "rating": float(rev.rating or 0), "store_id": str(rev.store_id)},
            )
            session.add(doc)
            count += 1

        # 3. SVVisit with notes -> sv_report
        visits = session.execute(
            select(SVVisit).where(
                and_(SVVisit.tenant_id == tenant_id, SVVisit.notes.isnot(None))
            ).order_by(SVVisit.visit_date.desc()).limit(300)
        ).scalars().all()

        for v in visits:
            content = (
                f"SV訪問報告\n日付: {v.visit_date}\n"
                f"タイプ: {v.visit_type}\nチェックリストスコア: {v.checklist_score}\n\n"
                f"{v.notes}"
            )
            doc = Document(
                tenant_id=tenant_id,
                doc_type="sv_report",
                source_id=v.id,
                title=f"SV訪問 {v.visit_date} ({v.visit_type})",
                content=content,
                embedding=embed_text(content),
                metadata_={"visit_type": v.visit_type, "score": float(v.checklist_score or 0), "store_id": str(v.store_id)},
            )
            session.add(doc)
            count += 1

        # 4. IndustryPlaybook -> playbook
        playbooks = session.execute(
            select(IndustryPlaybook).where(IndustryPlaybook.tenant_id == tenant_id)
        ).scalars().all()

        for pb in playbooks:
            content = (
                f"業態プレイブック: {pb.name}\n業態: {pb.service_model}\n\n"
                f"KPI定義: {json.dumps(pb.kpi_definitions, ensure_ascii=False)}\n"
                f"課題ルール: {json.dumps(pb.issue_rules, ensure_ascii=False)}\n"
                f"推奨アクション: {json.dumps(pb.recommended_actions, ensure_ascii=False)}"
            )
            doc = Document(
                tenant_id=tenant_id,
                doc_type="playbook",
                source_id=pb.id,
                title=f"プレイブック: {pb.name}",
                content=content,
                embedding=embed_text(content),
                metadata_={"service_model": pb.service_model},
            )
            session.add(doc)
            count += 1

        session.commit()
        return {"indexed": count}

    finally:
        session.close()
