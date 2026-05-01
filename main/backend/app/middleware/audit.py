import threading
from app.models.audit import AuditLog
from app.database import SyncSession


def log_audit(
    tenant_id: str,
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
):
    """Write an audit log entry in a background thread (fire-and-forget)."""
    def _write():
        session = SyncSession()
        try:
            log = AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                metadata_=metadata or {},
            )
            session.add(log)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    t = threading.Thread(target=_write, daemon=True)
    t.start()
