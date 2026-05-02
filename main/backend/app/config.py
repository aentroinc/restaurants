from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aentro:aentro_dev@db:5432/restaurant_os"
    DATABASE_URL_SYNC: str = "postgresql://aentro:aentro_dev@db:5432/restaurant_os"
    ENVIRONMENT: str = "local"
    JWT_SECRET_KEY: str = "aentro-dev-secret-key-change-in-production"
    ANTHROPIC_API_KEY: str = ""
    INGESTION_MASTER_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # Strict auth: when true, all non-public endpoints require valid JWT.
    # Default off for dev/demo; set STRICT_AUTH=true in production.
    STRICT_AUTH: bool = False

    # OpenTelemetry
    OTEL_ENABLED: bool = False
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    OTEL_SERVICE_NAME: str = "aentro-backend"

    # Secrets backend: env | sops | vault
    SECRETS_BACKEND: str = "env"
    VAULT_ADDR: str = ""
    VAULT_TOKEN: str = ""
    VAULT_PATH_PREFIX: str = "kv/aentro"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
