from pathlib import Path
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, field_validator, model_validator
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

    service_name: str = "client-service"
    port: int = 8001

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

    # Redis — кэш профилей клиентов
    redis_url: RedisDsn
    redis_cache_db: int = 0
    client_cache_ttl_seconds: int = 300

    # Kafka Consumer — подписка на sale_created от sales-service для обновления лояльности
    kafka_bootstrap_servers: list[str] = ["localhost:9092"]
    kafka_consumer_group_id: str = "client-service-group"
    kafka_sale_created_topic: str = "sale_created"
    kafka_consumer_auto_offset_reset: str = "earliest"
    # session_timeout > 3 * heartbeat — требование Kafka-брокера
    kafka_consumer_session_timeout_ms: int = 30_000
    kafka_consumer_heartbeat_interval_ms: int = 10_000
    # Если poll() не вызывался дольше этого времени, брокер переназначает партиции
    kafka_consumer_max_poll_interval_ms: int = 300_000

    # Пороги системы лояльности (количество подтверждённых продаж)
    loyalty_bronze_min_sales: int = 1
    loyalty_silver_min_sales: int = 3
    loyalty_gold_min_sales: int = 10

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
    def validate_loyalty_thresholds(self) -> "Settings":
        thresholds = [
            ("loyalty_bronze_min_sales", self.loyalty_bronze_min_sales),
            ("loyalty_silver_min_sales", self.loyalty_silver_min_sales),
            ("loyalty_gold_min_sales", self.loyalty_gold_min_sales),
        ]
        for name, value in thresholds:
            if value <= 0:
                raise ValueError(f"{name} должен быть положительным")
        for (low_name, low_val), (high_name, high_val) in zip(thresholds, thresholds[1:]):
            if high_val <= low_val:
                raise ValueError(
                    f"{high_name} ({high_val}) должен быть > {low_name} ({low_val})"
                )
        return self

    def is_production(self) -> bool:
        return self.environment == "production"

    def is_development(self) -> bool:
        return self.environment == "development"


settings = Settings()
