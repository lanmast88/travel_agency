from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn, SecretStr

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    environment: str = "development"
    DEBUG: bool = False

    service_name: str = "auth-service"
    port: int = 8000

    jwt_secret_key: SecretStr
    jwt_algorithm: str = "ES256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30

    database_url: PostgresDsn
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    redis_url: RedisDsn
    redis_token_blacklist_db: int = 0
    redis_rate_limit_db: int = 1

    cors_allowed_origins: list[str] = ["http://localhost:3000"]
    cors_allow_credentials: bool = True

    rate_limit_login_attempts: int = 5
    rate_limit_window_seconds: int = 300

    password_reset_token_expire_minutes: int = 30

    
    def is_production(self) -> bool:
        return self.environment == "production"
    
    def is_development(self) -> bool:
        return self.environment == "development"
    
settings = Settings()