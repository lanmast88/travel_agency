import uuid

from redis.asyncio import Redis

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.client import Client
from app.repositories.client import ClientRepository
from app.schemas.client import (
    ClientCreate,
    ClientFilters,
    ClientUpdate,
    LoyaltyInfoResponse,
)
from app.schemas.common import PaginationParams

_CACHE_PREFIX = "client:"


class ClientService:
    def __init__(self, repo: ClientRepository, cache: Redis | None = None) -> None:
        self._repo = repo
        self._cache = cache

    async def get(self, client_id: uuid.UUID) -> Client:
        client = await self._repo.get_by_id(client_id)
        if client is None:
            raise NotFoundError("Клиент", client_id)
        return client

    async def list(
        self,
        filters: ClientFilters,
        pagination: PaginationParams,
    ) -> tuple[list[Client], int]:
        return await self._repo.list(filters, pagination)

    async def create(self, data: ClientCreate) -> Client:
        return await self._repo.create(data)

    async def update(self, client_id: uuid.UUID, data: ClientUpdate) -> Client:
        client = await self.get(client_id)
        updated = await self._repo.update(client, data)
        await self._invalidate(client_id)
        return updated

    async def delete(self, client_id: uuid.UUID) -> None:
        client = await self.get(client_id)
        await self._repo.delete(client)
        await self._invalidate(client_id)

    async def get_loyalty(self, client_id: uuid.UUID) -> LoyaltyInfoResponse:
        client = await self.get(client_id)
        return LoyaltyInfoResponse.from_client(client.loyalty_level, client.sales_count)

    async def handle_sale_created(self, client_id: uuid.UUID) -> Client:
        client = await self.get(client_id)
        await self._repo.increment_sales(client)
        client.apply_loyalty_upgrade(
            bronze_min=settings.loyalty_bronze_min_sales,
            silver_min=settings.loyalty_silver_min_sales,
            gold_min=settings.loyalty_gold_min_sales,
        )
        await self._invalidate(client_id)
        return client

    async def _invalidate(self, client_id: uuid.UUID) -> None:
        if self._cache is not None:
            await self._cache.delete(f"{_CACHE_PREFIX}{client_id}")
