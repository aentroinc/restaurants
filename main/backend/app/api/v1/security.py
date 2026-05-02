"""Security API — column policies, PII logs, security review pack export"""
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.models.column_policy import ColumnPolicy, PIIRedactionLog
from app.services.column_security import DEFAULT_PII_COLUMNS

router = APIRouter(prefix="/api/v1/admin/security", tags=["admin-security"])


class ColumnPolicyCreate(BaseModel):
    role_id: UUID | None = None
    resource_name: str
    column_name: str
    action: str = "read"
    mask_type: str = "full"
    condition_json: dict | None = None
    enabled: bool = True


@router.get("/column-policies")
async def list_column_policies(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(ColumnPolicy).where(ColumnPolicy.tenant_id == tenant_id)
    )).scalars().all()
    return {"data": [_policy_dict(p) for p in rows]}


@router.post("/column-policies", status_code=201)
async def create_column_policy(
    body: ColumnPolicyCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = ColumnPolicy(
        id=uuid4(), tenant_id=tenant_id, role_id=body.role_id,
        resource_name=body.resource_name, column_name=body.column_name,
        action=body.action, mask_type=body.mask_type,
        condition_json=body.condition_json, enabled=body.enabled,
    )
    db.add(p)
    await db.commit()
    return {"data": _policy_dict(p)}


@router.put("/column-policies/{policy_id}")
async def update_column_policy(
    policy_id: UUID,
    body: ColumnPolicyCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(ColumnPolicy).where(ColumnPolicy.id == policy_id, ColumnPolicy.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Policy not found")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    await db.commit()
    return {"data": _policy_dict(p)}


@router.delete("/column-policies/{policy_id}")
async def delete_column_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    await db.execute(
        delete(ColumnPolicy).where(ColumnPolicy.id == policy_id, ColumnPolicy.tenant_id == tenant_id)
    )
    await db.commit()
    return {"data": {"deleted": True}}


@router.get("/pii-redaction-logs")
async def list_pii_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(PIIRedactionLog)
        .where(PIIRedactionLog.tenant_id == tenant_id)
        .order_by(PIIRedactionLog.created_at.desc())
        .limit(limit)
    )).scalars().all()
    return {"data": [
        {
            "id": str(l.id),
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "pii_type": l.pii_type,
            "redaction_method": l.redaction_method,
            "occurrences": l.occurrences,
            "ai_session_id": str(l.ai_session_id) if l.ai_session_id else None,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in rows
    ]}


@router.get("/pii-redaction-summary")
async def pii_summary(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(PIIRedactionLog.pii_type, func.sum(PIIRedactionLog.occurrences))
        .where(PIIRedactionLog.tenant_id == tenant_id)
        .group_by(PIIRedactionLog.pii_type)
    )).all()
    return {"data": [{"pii_type": r[0], "total_occurrences": int(r[1])} for r in rows]}


@router.post("/security-review-pack/export")
async def export_security_review_pack(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """情シス審査用パック生成 — ネットワーク図 / 権限モデル / 監査項目 / 暗号化 / DR を1本で"""
    policy_count = (await db.execute(
        select(func.count(ColumnPolicy.id)).where(ColumnPolicy.tenant_id == tenant_id)
    )).scalar() or 0

    pii_count = (await db.execute(
        select(func.sum(PIIRedactionLog.occurrences))
        .where(PIIRedactionLog.tenant_id == tenant_id)
    )).scalar() or 0

    return {"data": {
        "title": "AENTRO Restaurant OS — Security Review Pack",
        "generated_at": datetime.now().isoformat(),
        "sections": [
            {
                "title": "1. ネットワーク構成",
                "type": "diagram",
                "content": {
                    "topology": "VPC isolated, ALB → ECS Fargate → Aurora",
                    "regions": ["ap-northeast-1 (primary)", "ap-northeast-3 (DR)"],
                    "endpoint_visibility": "Private subnet, NAT egress only",
                    "tls": "TLS 1.2+, ALB managed cert",
                },
            },
            {
                "title": "2. データフロー",
                "type": "list",
                "items": [
                    "Source System → Connector (read-only) → IngestionJob → Canonical Tables",
                    "All ingestion records preserved in IngestionRecord (provenance)",
                    "Lineage event auto-emitted from each job",
                    "Writeback gated by approval workflow",
                ],
            },
            {
                "title": "3. 権限モデル",
                "type": "list",
                "items": [
                    "Multi-tenant isolation: tenant_id required on all rows",
                    "RBAC: 8 system roles (admin/executive/brand_manager/area_manager/sv/store_staff/viewer/analyst)",
                    f"Column-level policies: {policy_count} policies configured",
                    "Row-level scope: per-role region/brand restriction",
                    "AI tools subject to same RBAC as direct API",
                ],
            },
            {
                "title": "4. 監査ログ項目",
                "type": "list",
                "items": [
                    "AccessLog: 全 /api/v1/* request",
                    "AuditLog: schema 変更 / writeback / 権限変更",
                    "LoginAttempt: 全認証試行",
                    f"PIIRedactionLog: 累計 {int(pii_count)} 件 redaction",
                    "AIQueryLog: 全 LLM 呼び出し（prompt + response + tokens + cost）",
                ],
            },
            {
                "title": "5. 暗号化方式",
                "type": "list",
                "items": [
                    "Transport: TLS 1.2+",
                    "At rest: PostgreSQL native + AWS KMS (aurora-encryption-at-rest)",
                    "Application secrets: Fernet (AES-128-CBC + HMAC-SHA256), key rotation supported",
                    "MFA TOTP secret: Fernet encryption",
                    "JWT: HS256",
                ],
            },
            {
                "title": "6. バックアップ / DR",
                "type": "list",
                "items": [
                    "Aurora PITR: 7日",
                    "Daily snapshot: 30日保持",
                    "Cross-region replication: ap-northeast-3",
                    "RTO: 4 hours, RPO: 1 hour",
                    "DR drill: 月次（runbook 参照）",
                ],
            },
            {
                "title": "7. インシデント対応",
                "type": "list",
                "items": [
                    "incident-response.md runbook 参照",
                    "On-call rotation via PagerDuty",
                    "Severity 1: 1 hour escalation",
                    "Post-mortem 必須",
                ],
            },
            {
                "title": "8. LLM 利用時のデータ取扱い",
                "type": "list",
                "items": [
                    "Anthropic API directly (no third-party LLM)",
                    "PII auto-redaction before send (regex + pattern match)",
                    "Per-role tool whitelist (AI Governance)",
                    "Monthly budget cap per tenant",
                    "All prompts + responses logged to AIQueryLog",
                    "No data retention by Anthropic (Enterprise tier contract)",
                ],
            },
        ],
        "compliance_status": {
            "tenant_isolation": "✓",
            "column_level_security": "✓" if policy_count > 0 else "△ 設定推奨",
            "mfa_enrollment_supported": "✓",
            "sso_supported": "✓ (OIDC + SAML)",
            "pii_redaction": "✓",
            "audit_log": "✓",
            "encryption_at_rest": "✓",
            "encryption_in_transit": "✓",
            "soc2_track": "in_progress",
            "iso27001_track": "planned",
        },
    }}


def _policy_dict(p: ColumnPolicy) -> dict:
    return {
        "id": str(p.id),
        "role_id": str(p.role_id) if p.role_id else None,
        "resource_name": p.resource_name,
        "column_name": p.column_name,
        "action": p.action,
        "mask_type": p.mask_type,
        "condition_json": p.condition_json,
        "enabled": p.enabled,
    }
