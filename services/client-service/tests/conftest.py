"""
Корневой conftest.py — выставляет переменные окружения ДО импорта любого модуля приложения.
Settings() читает их при первом импорте app.core.config.
"""
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("AUTH_SERVICE_JWKS_URL", "http://localhost:8000/.well-known/jwks.json")

import pytest
from unittest.mock import AsyncMock

from tests.factories import make_client


@pytest.fixture
def client():
    return make_client()


@pytest.fixture
def mock_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.get_by_id.return_value = None
    repo.create.return_value = make_client()
    repo.update.return_value = make_client()
    repo.delete.return_value = None
    repo.increment_sales.return_value = make_client(sales_count=1)
    repo.list.return_value = ([], 0)
    return repo


@pytest.fixture
def mock_cache() -> AsyncMock:
    cache = AsyncMock()
    cache.delete.return_value = 1
    cache.get.return_value = None
    cache.set.return_value = True
    return cache
