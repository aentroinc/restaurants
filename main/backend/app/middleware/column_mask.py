PII_FIELDS = {"employee_name", "email", "phone", "address", "manager_name", "name"}
MASK_EXEMPT_ROLES = {"admin", "executive"}


def _record_redaction(n: int = 1) -> None:
    """Lazy-import metrics helper to avoid a top-level import cycle
    (middleware.metrics depends on starlette/fastapi, importing it from
    middleware.column_mask at module load time risks circulars during
    app.main wiring)."""
    if n <= 0:
        return
    try:
        from app.middleware.metrics import inc_pii_redaction
        inc_pii_redaction(n)
    except Exception:
        pass


def mask_pii(data, user_roles: list[str]):
    """Recursively mask PII fields in response data."""
    if any(r in MASK_EXEMPT_ROLES for r in user_roles):
        return data
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if k in PII_FIELDS:
                out[k] = "***"
                _record_redaction(1)
            else:
                out[k] = mask_pii(v, user_roles)
        return out
    if isinstance(data, list):
        return [mask_pii(item, user_roles) for item in data]
    return data
