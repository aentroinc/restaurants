import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./restaurant_os.db"
    DATABASE_URL_SYNC: str = "sqlite:///./restaurant_os.db"
    ENVIRONMENT: str = "local"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
