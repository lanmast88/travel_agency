"""
Тесты ClientService — бизнес-логика и инварианты.
Принцип: тестируем контракт, не детали реализации.
"""
import uuid
from unittest.mock import AsyncMock, call

import pytest

from app.core.enums import LoyaltyLevel
from app.core.exceptions import NotFoundError
from app.schemas.client import ClientCreate, ClientUpdate, LoyaltyInfoResponse
from app.services.client import ClientService
from tests.factories import make_client

_VALID_CREATE = {
    "full_name": "Иван Иванов",
    "phone": "+79001234567",
    "passport": "1234 567890",
    "email": "ivan@example.com",
    "birth_date": "1990-01-01",
}


@pytest.fixture
def service(mock_repo: AsyncMock, mock_cache: AsyncMock) -> ClientService:
    return ClientService(mock_repo, mock_cache)


class TestGet:
    async def test_returns_client_when_found(self, service: ClientService, mock_repo: AsyncMock) -> None:
        expected = make_client()
        mock_repo.get_by_id.return_value = expected
        result = await service.get(expected.id)
        assert result is expected

    async def test_raises_not_found_when_missing(self, service: ClientService, mock_repo: AsyncMock) -> None:
        mock_repo.get_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.get(uuid.uuid4())


class TestCreate:
    async def test_calls_repo_and_returns_client(self, service: ClientService, mock_repo: AsyncMock) -> None:
        expected = make_client()
        mock_repo.create.return_value = expected
        data = ClientCreate(**_VALID_CREATE)
        result = await service.create(data)
        mock_repo.create.assert_awaited_once_with(data)
        assert result is expected


class TestUpdate:
    async def test_calls_repo_update_and_invalidates_cache(
        self, service: ClientService, mock_repo: AsyncMock, mock_cache: AsyncMock
    ) -> None:
        existing = make_client()
        updated = make_client(id=existing.id, full_name="Пётр Петров")
        mock_repo.get_by_id.return_value = existing
        mock_repo.update.return_value = updated

        result = await service.update(existing.id, ClientUpdate(full_name="Пётр Петров"))

        mock_repo.update.assert_awaited_once()
        mock_cache.delete.assert_awaited_once_with(f"client:{existing.id}")
        assert result is updated

    async def test_raises_not_found_when_missing(self, service: ClientService, mock_repo: AsyncMock) -> None:
        mock_repo.get_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.update(uuid.uuid4(), ClientUpdate(full_name="Пётр"))


class TestDelete:
    async def test_calls_repo_delete_and_invalidates_cache(
        self, service: ClientService, mock_repo: AsyncMock, mock_cache: AsyncMock
    ) -> None:
        existing = make_client()
        mock_repo.get_by_id.return_value = existing

        await service.delete(existing.id)

        mock_repo.delete.assert_awaited_once_with(existing)
        mock_cache.delete.assert_awaited_once_with(f"client:{existing.id}")

    async def test_raises_not_found_when_missing(self, service: ClientService, mock_repo: AsyncMock) -> None:
        mock_repo.get_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.delete(uuid.uuid4())


class TestHandleSaleCreated:
    async def test_increments_sales_and_invalidates_cache(
        self, service: ClientService, mock_repo: AsyncMock, mock_cache: AsyncMock
    ) -> None:
        existing = make_client(sales_count=0)
        mock_repo.get_by_id.return_value = existing
        mock_repo.increment_sales.return_value = existing

        await service.handle_sale_created(existing.id)

        mock_repo.increment_sales.assert_awaited_once_with(existing)
        mock_cache.delete.assert_awaited_once_with(f"client:{existing.id}")

    async def test_applies_loyalty_upgrade_on_threshold(
        self, service: ClientService, mock_repo: AsyncMock, mock_cache: AsyncMock
    ) -> None:
        # sales_count после increment станет 1 → переход standard→bronze
        existing = make_client(sales_count=1, loyalty_level=LoyaltyLevel.standard)
        mock_repo.get_by_id.return_value = existing
        mock_repo.increment_sales.return_value = existing

        await service.handle_sale_created(existing.id)

        assert existing.loyalty_level == LoyaltyLevel.bronze

    async def test_raises_not_found_when_missing(self, service: ClientService, mock_repo: AsyncMock) -> None:
        mock_repo.get_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.handle_sale_created(uuid.uuid4())


class TestGetLoyalty:
    async def test_returns_loyalty_info(self, service: ClientService, mock_repo: AsyncMock) -> None:
        existing = make_client(loyalty_level=LoyaltyLevel.bronze, sales_count=2)
        mock_repo.get_by_id.return_value = existing

        result = await service.get_loyalty(existing.id)

        assert isinstance(result, LoyaltyInfoResponse)
        assert result.loyalty_level == LoyaltyLevel.bronze
        assert result.sales_count == 2

    async def test_raises_not_found_when_missing(self, service: ClientService, mock_repo: AsyncMock) -> None:
        mock_repo.get_by_id.return_value = None
        with pytest.raises(NotFoundError):
            await service.get_loyalty(uuid.uuid4())
