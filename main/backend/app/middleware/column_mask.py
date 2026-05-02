PII_FIELDS = {"employee_name", "email", "phone", "address", "manager_name", "name"}
MASK_EXEMPT_ROLES = {"admin", "executive"}


def mask_pii(data, user_roles: list[str]):
    """Recursively mask PII fields in response data."""
    if any(r in MASK_EXEMPT_ROLES for r in user_roles):
        return data
    if isinstance(data, dict):
        return {k: "***" if k in PII_FIELDS else mask_pii(v, user_roles) for k, v in data.items()}
    if isinstance(data, list):
        return [mask_pii(item, user_roles) for item in data]
    return data
