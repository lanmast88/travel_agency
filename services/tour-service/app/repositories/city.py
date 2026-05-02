from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.city import City
from app.schemas.common import PaginationParams


class CityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, city_id: UUID) -> City | None:
        return await self._session.get(City, city_id)

    async def get_by_name(self, name: str) -> City | None:
        result = await self._session.execute(
            select(City).where(City.name == name)
        )
        return result.scalar_one_or_none()

    async def exists_by_name(self, name: str, exclude_id: UUID | None = None) -> bool:
        stmt = select(City.id).where(City.name == name)
        if exclude_id is not None:
            stmt = stmt.where(City.id != exclude_id)
        result = await self._session.scalar(stmt)
        return result is not None

    async def get_all(self, pagination: PaginationParams) -> tuple[list[City], int]:
        total = await self._session.scalar(
            select(func.count()).select_from(City)
        )
        cities = await self._session.scalars(
            select(City)
            .order_by(City.country, City.name)
            .limit(pagination.page_size)
            .offset(pagination.offset)
        )
        return list(cities.all()), total or 0

    async def create(
        self,
        name: str,
        country: str,
        description: str | None = None,
        climate: str | None = None,
    ) -> City:
        city = City(name=name, country=country, description=description, climate=climate)
        self._session.add(city)
        await self._session.flush()
        await self._session.refresh(city)
        return city

    async def update(self, city: City, changes: dict[str, Any]) -> City:
        for field, value in changes.items():
            setattr(city, field, value)
        await self._session.flush()
        await self._session.refresh(city)
        return city

    async def delete(self, city: City) -> None:
        await self._session.delete(city)
        await self._session.flush()
