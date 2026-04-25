from pathlib import Path
from typing import Literal

from pydantic import PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_SERVICE_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    service_name: str = "tour-service"
    port: int = 8001

    # JWKS URL auth-service для верификации JWT.
    # Публичный ключ загружается при старте сервиса и кешируется.
    # При ротации ключей обновляется автоматически при встрече неизвестного kid.
    # Локально:  http://localhost:8000/.well-known/jwks.json
    # K8s:       http://auth-service:8000/.well-known/jwks.json
    auth_service_jwks_url: str = "http://localhost:8000/.well-known/jwks.json"
    jwks_cache_ttl_seconds: int = 3600
    jwt_algorithm: str = "ES256"

    database_url: PostgresDsn
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    redis_url: RedisDsn
    redis_cache_db: int = 0
    tour_cache_ttl_seconds: int = 300

    kafka_bootstrap_servers: list[str] = ["localhost:9092"]
    kafka_tour_updates_topic: str = "tour_updated"

    cors_allowed_origins: list[str] = ["http://localhost:3000"]
    cors_allow_credentials: bool = True

    def is_production(self) -> bool:
        return self.environment == "production"

    def is_development(self) -> bool:
        return self.environment == "development"


settings = Settings()
