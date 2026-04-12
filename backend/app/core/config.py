from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List, Optional
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TREC - Transaction & Expense Controller"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Database — required, no default (must be in .env or env var)
    DATABASE_URL: str

    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300

    # JWT
    SECRET_KEY: str = "dev_secret_key_change_in_production_32x"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI (Google Gemini) — optional so app starts even without key
    GEMINI_API_KEY: str = ""

    # CORS — accepts a JSON array string or a plain comma-separated string
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost"]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AI_PER_MINUTE: int = 10

    # Security
    BCRYPT_ROUNDS: int = 12
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"   # ignore unknown env vars (e.g. DOMAIN, DOMAIN from shell)


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
