"""
Корневой conftest.py — запускается ДО импорта любого модуля приложения.

Генерирует тестовую EC-пару ключей и пишет их во временные файлы,
затем выставляет переменные окружения, которые Settings() подберёт
при первом импорте app.core.config.
"""
import os
import tempfile

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

# Генерируем ключи на уровне модуля — до любого import из app.*
_priv_key = ec.generate_private_key(ec.SECP256R1())

TEST_PRIVATE_PEM: str = _priv_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()

TEST_PUBLIC_PEM: str = _priv_key.public_key().public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo,
).decode()

_tmp = tempfile.mkdtemp()
_PRIVATE_PATH = os.path.join(_tmp, "test_private.pem")
_PUBLIC_PATH = os.path.join(_tmp, "test_public.pem")

with open(_PRIVATE_PATH, "w") as _f:
    _f.write(TEST_PRIVATE_PEM)
with open(_PUBLIC_PATH, "w") as _f:
    _f.write(TEST_PUBLIC_PEM)

# Эти переменные должны быть выставлены ДО Settings() — pydantic-settings
# читает env vars с приоритетом выше, чем .env файл.
os.environ.setdefault("JWT_PRIVATE_KEY_PATH", _PRIVATE_PATH)
os.environ.setdefault("JWT_PUBLIC_KEY_PATH", _PUBLIC_PATH)
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

# --- Теперь можно безопасно импортировать app ---

import pytest
from unittest.mock import AsyncMock

from app.core.enums import UserRole
from tests.factories import make_user


@pytest.fixture
def user():
    return make_user()


@pytest.fixture
def admin_user():
    return make_user(id=2, email="admin@example.com", role=UserRole.admin)


@pytest.fixture
def employee_user():
    return make_user(id=3, email="emp@example.com", role=UserRole.employee)


@pytest.fixture
def mock_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.exists_by_email.return_value = False
    repo.get_by_email.return_value = None
    repo.get_by_id.return_value = None
    repo.flush.return_value = None
    return repo


@pytest.fixture
def mock_redis() -> AsyncMock:
    redis = AsyncMock()
    redis.exists.return_value = 0
    redis.set.return_value = True
    redis.eval.return_value = 1
    return redis
