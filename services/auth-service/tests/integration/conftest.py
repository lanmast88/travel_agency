"""Фикстуры для API-тестов: подменяем все FastAPI-зависимости моками."""
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.enums import UserRole
from tests.factories import make_user


@pytest.fixture
def active_user():
    return make_user(id=1, email="user@example.com", role=UserRole.user)


@pytest.fixture
def admin():
    return make_user(id=2, email="admin@example.com", role=UserRole.admin)


@pytest.fixture
def employee():
    return make_user(id=3, email="emp@example.com", role=UserRole.employee)


@pytest.fixture
def mock_auth_service():
    return AsyncMock()


@pytest.fixture
def mock_user_repo():
    repo = AsyncMock()
    repo.get_by_id.return_value = None
    repo.get_by_email.return_value = None
    repo.exists_by_email.return_value = False
    repo.get_all.return_value = []
    return repo


@pytest.fixture
def mock_blacklist_redis():
    r = AsyncMock()
    r.exists.return_value = 0
    return r


@pytest.fixture
def mock_rate_redis():
    r = AsyncMock()
    r.eval.return_value = 1  # первый запрос, лимит не превышен
    return r


def _make_client(extra_overrides: dict) -> tuple:
    """Возвращает контекстный менеджер AsyncClient с нужными overrides."""
    from app.dependencies import (
        get_auth_service,
        get_blacklist_redis,
        get_rate_limit_redis,
        get_user_repo,
    )
    from app.main import app

    overrides = {
        get_auth_service: lambda: extra_overrides["auth_service"],
        get_user_repo: lambda: extra_overrides["user_repo"],
        get_blacklist_redis: lambda: extra_overrides["blacklist_redis"],
        get_rate_limit_redis: lambda: extra_overrides["rate_redis"],
        **extra_overrides.get("extra", {}),
    }
    return app, overrides


@pytest_asyncio.fixture
async def anon_client(mock_auth_service, mock_user_repo, mock_blacklist_redis, mock_rate_redis):
    """Клиент без аутентификации — зависимость get_current_user не переопределена."""
    from app.main import app
    from app.dependencies import get_auth_service, get_blacklist_redis, get_rate_limit_redis, get_user_repo

    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[get_user_repo] = lambda: mock_user_repo
    app.dependency_overrides[get_blacklist_redis] = lambda: mock_blacklist_redis
    app.dependency_overrides[get_rate_limit_redis] = lambda: mock_rate_redis

    with (
        patch("app.dependencies.init_redis", new_callable=AsyncMock),
        patch("app.dependencies.close_redis", new_callable=AsyncMock),
        # engine.dispose() — read-only, не патчим; пул не открывался, вызов безвреден
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def user_client(active_user, mock_auth_service, mock_user_repo, mock_blacklist_redis, mock_rate_redis):
    from app.main import app
    from app.dependencies import get_auth_service, get_blacklist_redis, get_current_user, get_rate_limit_redis, get_user_repo

    app.dependency_overrides[get_current_user] = lambda: active_user
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[get_user_repo] = lambda: mock_user_repo
    app.dependency_overrides[get_blacklist_redis] = lambda: mock_blacklist_redis
    app.dependency_overrides[get_rate_limit_redis] = lambda: mock_rate_redis

    with (
        patch("app.dependencies.init_redis", new_callable=AsyncMock),
        patch("app.dependencies.close_redis", new_callable=AsyncMock),
        # engine.dispose() — read-only, не патчим; пул не открывался, вызов безвреден
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_client(admin, mock_auth_service, mock_user_repo, mock_blacklist_redis, mock_rate_redis):
    from app.main import app
    from app.dependencies import get_auth_service, get_blacklist_redis, get_current_user, get_rate_limit_redis, get_user_repo

    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[get_user_repo] = lambda: mock_user_repo
    app.dependency_overrides[get_blacklist_redis] = lambda: mock_blacklist_redis
    app.dependency_overrides[get_rate_limit_redis] = lambda: mock_rate_redis

    with (
        patch("app.dependencies.init_redis", new_callable=AsyncMock),
        patch("app.dependencies.close_redis", new_callable=AsyncMock),
        # engine.dispose() — read-only, не патчим; пул не открывался, вызов безвреден
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def employee_client(employee, mock_auth_service, mock_user_repo, mock_blacklist_redis, mock_rate_redis):
    from app.main import app
    from app.dependencies import get_auth_service, get_blacklist_redis, get_current_user, get_rate_limit_redis, get_user_repo

    app.dependency_overrides[get_current_user] = lambda: employee
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[get_user_repo] = lambda: mock_user_repo
    app.dependency_overrides[get_blacklist_redis] = lambda: mock_blacklist_redis
    app.dependency_overrides[get_rate_limit_redis] = lambda: mock_rate_redis

    with (
        patch("app.dependencies.init_redis", new_callable=AsyncMock),
        patch("app.dependencies.close_redis", new_callable=AsyncMock),
        # engine.dispose() — read-only, не патчим; пул не открывался, вызов безвреден
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()
