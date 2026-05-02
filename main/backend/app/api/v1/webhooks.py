"""Webhook receiver for connector providers.

Routes:
  POST /api/v1/webhooks/{connector}/{data_source_id}

Body: raw provider payload. HMAC verification happens before any DB
write. The verified payload is logged into ingestion_records and
optionally projected into Silver layer via the connector's transform.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import ConnectorRegistry
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.data_source import DataSource, IngestionRecord

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/{connector}/{data_source_id}")
async def receive_webhook(
    connector: str,
    data_source_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verify HMAC signature, persist payload, project to Silver."""
    res = await db.execute(
        select(DataSource).where(DataSource.id == data_source_id, DataSource.type == connector)
    )
    source = res.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "data source not found")

    body = await request.body()
    config = source.config or {}
    secret = config.get("webhook_secret", "")

    # Connector-specific verification
    sig_header_name = {
        "smaregi": "X-Smaregi-Signature",
        "square": "X-Square-HmacSha256-Signature",
    }.get(connector, "X-Webhook-Signature")
    sig = request.headers.get(sig_header_name, "")

    verified = False
    if connector == "square":
        try:
            from app.connectors.square.connector import SquareConnector
            verified = SquareConnector.verify_webhook(
                signature_header=sig, body=body, secret=secret, url=str(request.url),
            )
        except Exception:
            verified = False
    elif connector == "smaregi":
        # Smaregi: HMAC-SHA256 over body, hex-encoded
        import hashlib
        import hmac
        if sig and secret:
            expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            verified = hmac.compare_digest(sig, expected)
    else:
        # Unknown connector: require explicit allow
        verified = config.get("webhook_allow_unverified", False)

    if not verified:
        log_audit(
            str(source.tenant_id), None, "webhook_reject",
            f"webhook:{connector}", str(source.id),
            {"reason": "hmac_invalid", "size": len(body)},
        )
        raise HTTPException(403, "invalid signature")

    # Persist + transform
    import json
    try:
        payload = json.loads(body)
    except Exception:
        payload = {"_raw": body.decode("utf-8", errors="replace")}

    record = IngestionRecord(
        tenant_id=source.tenant_id,
        ingestion_job_id=source.id,  # webhooks don't belong to a job; reuse source id
        source_payload={"target_table": "_webhook_event", "event": payload},
        source_id=f"webhook:{connector}:{datetime.now(timezone.utc).isoformat()}",
        target_table="_webhook_event",
        ingested_at=datetime.now(timezone.utc),
    )
    db.add(record)

    # Try to project this single event into Silver via the connector.
    canonical_count = 0
    try:
        cls = ConnectorRegistry.get(connector)
        connector_inst = cls(credentials={}, config=source.config or {})
        events = payload if isinstance(payload, list) else [payload]
        canonicals = connector_inst.transform(events)
        if canonicals:
            from app.services.silver_writer import write_canonical
            for cr in canonicals:
                await write_canonical(db, str(source.tenant_id), cr)
                canonical_count += 1
    except Exception as e:
        record.error = str(e)[:512]

    await db.commit()
    log_audit(
        str(source.tenant_id), None, "webhook_accept",
        f"webhook:{connector}", str(source.id),
        {"canonical_records": canonical_count, "size": len(body)},
    )
    return {"accepted": True, "verified": True, "canonical_records": canonical_count}
