import base64
import hashlib
from pathlib import Path

from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
    load_pem_public_key,
)
from pydantic import PostgresDsn, RedisDsn, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_SERVICE_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    environment: str = "development"
    debug: bool = False

    service_name: str = "auth-service"
    port: int = 8000

    jwt_private_key_path: Path = _SERVICE_ROOT / "private.pem"
    jwt_public_key_path: Path = _SERVICE_ROOT / "public.pem"

    jwt_private_key: SecretStr = SecretStr("")
    jwt_public_key: str = ""
    # kid вычисляется автоматически как SHA-256 от DER публичного ключа.
    # Меняется при ротации ключей без ручного управления.
    jwt_key_id: str = ""

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

    @model_validator(mode="after")
    def load_jwt_keys(self) -> "Settings":
        self.jwt_private_key = SecretStr(self.jwt_private_key_path.read_text())
        self.jwt_public_key = self.jwt_public_key_path.read_text()
        # SHA-256 от DER-представления публичного ключа — детерминированный kid
        _key = load_pem_public_key(self.jwt_public_key.encode())
        _der = _key.public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
        self.jwt_key_id = base64.urlsafe_b64encode(hashlib.sha256(_der).digest()).rstrip(b"=").decode()[:16]
        return self

    def is_production(self) -> bool:
        return self.environment == "production"

    def is_development(self) -> bool:
        return self.environment == "development"

settings = Settings()
