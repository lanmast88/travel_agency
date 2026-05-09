from pathlib import Path
from typing import Literal

from pydantic import PostgresDsn, field_validator, model_validator
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

    service_name: str = "sales-service"
    port: int = 8003

    # JWT — верификация входящих токенов через JWKS auth-service.
    # При встрече неизвестного kid кэш сбрасывается и JWKS перезагружается.
    auth_service_jwks_url: str = "http://localhost:8000/.well-known/jwks.json"
    jwks_cache_ttl_seconds: int = 3600
    jwt_algorithm: str = "ES256"

    # PostgreSQL
    database_url: PostgresDsn
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # HTTP — межсервисные вызовы
    client_service_url: str = "http://localhost:8001"

    # Kafka Producer — публикует sale_created в client-service для обновления лояльности
    kafka_bootstrap_servers: list[str] = ["localhost:9092"]
    kafka_sale_created_topic: str = "sale_created"
    # Acks=all гарантирует запись на все реплики перед подтверждением
    kafka_producer_acks: str = "all"
    kafka_producer_retries: int = 3

    # Скидки по уровням лояльности, в процентах (0.0–100.0)
    loyalty_standard_discount_pct: float = 0.0
    loyalty_bronze_discount_pct: float = 3.0
    loyalty_silver_discount_pct: float = 6.0
    loyalty_gold_discount_pct: float = 9.0

    cors_allowed_origins: list[str] = ["http://localhost:3000"]
    cors_allow_credentials: bool = True

    @field_validator(
        "loyalty_standard_discount_pct",
        "loyalty_bronze_discount_pct",
        "loyalty_silver_discount_pct",
        "loyalty_gold_discount_pct",
        mode="after",
    )
    @classmethod
    def discount_in_range(cls, v: float) -> float:
        if not (0.0 <= v <= 100.0):
            raise ValueError("Скидка должна быть в диапазоне 0–100%")
        return v

    @model_validator(mode="after")
    def validate_discount_order(self) -> "Settings":
        discounts = [
            ("loyalty_standard_discount_pct", self.loyalty_standard_discount_pct),
            ("loyalty_bronze_discount_pct", self.loyalty_bronze_discount_pct),
            ("loyalty_silver_discount_pct", self.loyalty_silver_discount_pct),
            ("loyalty_gold_discount_pct", self.loyalty_gold_discount_pct),
        ]
        for (low_name, low_val), (high_name, high_val) in zip(discounts, discounts[1:]):
            if high_val < low_val:
                raise ValueError(
                    f"{high_name} ({high_val}) должен быть >= {low_name} ({low_val})"
                )
        return self

    def is_production(self) -> bool:
        return self.environment == "production"

    def is_development(self) -> bool:
        return self.environment == "development"


settings = Settings()
