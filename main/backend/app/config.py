from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aentro:aentro_dev@db:5432/restaurant_os"
    DATABASE_URL_SYNC: str = "postgresql://aentro:aentro_dev@db:5432/restaurant_os"
    ENVIRONMENT: str = "local"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
