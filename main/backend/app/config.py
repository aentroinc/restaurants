from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aentro:aentro_dev@db:5432/restaurant_os"
    DATABASE_URL_SYNC: str = "postgresql://aentro:aentro_dev@db:5432/restaurant_os"
    ENVIRONMENT: str = "local"
    JWT_SECRET_KEY: str = "aentro-dev-secret-key-change-in-production"
    ANTHROPIC_API_KEY: str = ""

    # Strict tenant mode: when True, unauthenticated requests are rejected
    # (no DEMO tenant fallback). Default off for demo / local.
    STRICT_TENANT_MODE: bool = False

    # PII redaction middleware switch
    PII_REDACTION_ENABLED: bool = True

    # AI cost guard
    AI_DEFAULT_MONTHLY_BUDGET_JPY: int = 100_000
    AI_BUDGET_SOFT_LIMIT_PCT: float = 0.8

    # Connector master encryption key (Fernet). Required when STRICT_TENANT_MODE=True.
    CONNECTOR_MASTER_KEY: str = "ZGV2LWNvbm5lY3Rvci1tYXN0ZXIta2V5LTMyLWJ5dGVzLWxvbmcw"

    # Smaregi sandbox credentials (optional — enables real fetch)
    SMAREGI_CLIENT_ID: str = ""
    SMAREGI_CLIENT_SECRET: str = ""
    SMAREGI_API_BASE: str = "https://api.smaregi.dev"
    SMAREGI_AUTH_BASE: str = "https://id.smaregi.dev"

    # Auto-create schema on startup (dev only)
    AUTO_CREATE_SCHEMA: bool = True

    # Scheduler
    SCHEDULER_ENABLED: bool = False
    SCHEDULER_TZ: str = "Asia/Tokyo"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
