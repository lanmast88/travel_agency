"""Фикстуры для API-тестов: подменяем все FastAPI-зависимости моками."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.cache import get_cache
from app.core.enums import LoyaltyLevel, UserRole
from app.dependencies import TokenPayload, get_client_service, get_current_employee
from app.schemas.client import LoyaltyInfoResponse
from tests.factories import make_client


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    service.list.return_value = ([make_client()], 1)
    service.create.return_value = make_client()
    service.get.return_value = make_client()
    service.update.return_value = make_client()
    service.delete.return_value = None
    service.get_loyalty.return_value = LoyaltyInfoResponse.from_client(LoyaltyLevel.standard, 0)
    return service


@pytest.fixture
def employee_token() -> TokenPayload:
    return TokenPayload(user_id=uuid.uuid4(), role=UserRole.employee)


@pytest.fixture
def admin_token() -> TokenPayload:
    return TokenPayload(user_id=uuid.uuid4(), role=UserRole.admin)


def _make_client_fixture(token_fixture: str, mock_service_fixture: str = "mock_service"):
    @pytest_asyncio.fixture
    async def _client(request):
        from app.main import app

        token = request.getfixturevalue(token_fixture)
        service = request.getfixturevalue(mock_service_fixture)

        app.dependency_overrides[get_current_employee] = lambda: token
        app.dependency_overrides[get_client_service] = lambda: service
        app.dependency_overrides[get_cache] = lambda: None

        with (
            patch("app.main.init_cache", new_callable=AsyncMock),
            patch("app.main.close_cache", new_callable=AsyncMock),
            patch("app.main.start_consumer", new_callable=AsyncMock),
            patch("app.main.stop_consumer", new_callable=AsyncMock),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                yield c

        app.dependency_overrides.clear()

    return _client


@pytest_asyncio.fixture
async def employee_client(employee_token, mock_service):
    from app.main import app

    app.dependency_overrides[get_current_employee] = lambda: employee_token
    app.dependency_overrides[get_client_service] = lambda: mock_service
    app.dependency_overrides[get_cache] = lambda: None

    with (
        patch("app.main.init_cache", new_callable=AsyncMock),
        patch("app.main.close_cache", new_callable=AsyncMock),
        patch("app.main.start_consumer", new_callable=AsyncMock),
        patch("app.main.stop_consumer", new_callable=AsyncMock),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_client(admin_token, mock_service):
    from app.main import app

    app.dependency_overrides[get_current_employee] = lambda: admin_token
    app.dependency_overrides[get_client_service] = lambda: mock_service
    app.dependency_overrides[get_cache] = lambda: None

    with (
        patch("app.main.init_cache", new_callable=AsyncMock),
        patch("app.main.close_cache", new_callable=AsyncMock),
        patch("app.main.start_consumer", new_callable=AsyncMock),
        patch("app.main.stop_consumer", new_callable=AsyncMock),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def anon_client():
    from app.main import app

    with (
        patch("app.main.init_cache", new_callable=AsyncMock),
        patch("app.main.close_cache", new_callable=AsyncMock),
        patch("app.main.start_consumer", new_callable=AsyncMock),
        patch("app.main.stop_consumer", new_callable=AsyncMock),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c

    app.dependency_overrides.clear()
