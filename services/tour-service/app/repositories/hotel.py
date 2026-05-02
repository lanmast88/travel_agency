from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.hotel import Hotel
from app.schemas.common import PaginationParams


class HotelRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, hotel_id: UUID, load_city: bool = False) -> Hotel | None:
        if not load_city:
            return await self._session.get(Hotel, hotel_id)
        result = await self._session.execute(
            select(Hotel)
            .where(Hotel.id == hotel_id)
            .options(selectinload(Hotel.city))
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        pagination: PaginationParams,
        city_id: UUID | None = None,
        min_stars: int | None = None,
        max_stars: int | None = None,
    ) -> tuple[list[Hotel], int]:
        conditions = []
        if city_id is not None:
            conditions.append(Hotel.city_id == city_id)
        if min_stars is not None:
            conditions.append(Hotel.stars >= min_stars)
        if max_stars is not None:
            conditions.append(Hotel.stars <= max_stars)

        total = await self._session.scalar(
            select(func.count()).select_from(Hotel).where(*conditions)
        )
        hotels = await self._session.scalars(
            select(Hotel)
            .where(*conditions)
            .options(selectinload(Hotel.city))
            .order_by(Hotel.name)
            .limit(pagination.page_size)
            .offset(pagination.offset)
        )
        return list(hotels.all()), total or 0

    async def create(
        self,
        city_id: UUID,
        name: str,
        stars: int,
        address: str,
        description: str | None = None,
        amenities: list[str] | None = None,
    ) -> Hotel:
        hotel = Hotel(
            city_id=city_id,
            name=name,
            stars=stars,
            address=address,
            description=description,
            amenities=amenities or [],
        )
        self._session.add(hotel)
        await self._session.flush()
        await self._session.refresh(hotel)
        return hotel

    async def update(self, hotel: Hotel, changes: dict[str, Any]) -> Hotel:
        for field, value in changes.items():
            setattr(hotel, field, value)
        await self._session.flush()
        await self._session.refresh(hotel)
        return hotel

    async def delete(self, hotel: Hotel) -> None:
        await self._session.delete(hotel)
        await self._session.flush()
