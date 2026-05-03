from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import MealType, SortOrder, TourSortField, TourStatus
from app.models.tour import Tour
from app.schemas.common import PaginationParams
from app.schemas.tour import TourFilters


_SORT_COLUMNS = {
    TourSortField.price: Tour.price,
    TourSortField.start_date: Tour.start_date,
    TourSortField.created_at: Tour.created_at,
}

_HOT_TOUR_DAYS = 5


class TourRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, tour_id: UUID, load_relations: bool = False) -> Tour | None:
        """Возвращает тур по ID.

        load_relations=True загружает city и hotel через selectinload — нужно для TourResponse.
        Для операций обновления/удаления используй load_relations=False (быстрее).
        """
        if not load_relations:
            return await self._session.get(Tour, tour_id)
        result = await self._session.execute(
            select(Tour)
            .where(Tour.id == tour_id)
            .options(selectinload(Tour.city), selectinload(Tour.hotel))
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        filters: TourFilters,
        pagination: PaginationParams,
    ) -> tuple[list[Tour], int]:
        """Возвращает отфильтрованный список туров и общее количество для пагинации."""
        conditions = _build_filter_conditions(filters)

        total = await self._session.scalar(
            select(func.count()).select_from(Tour).where(*conditions)
        )

        sort_column = _SORT_COLUMNS[filters.sort_by]
        order_expr = sort_column.asc() if filters.order == SortOrder.asc else sort_column.desc()

        tours = await self._session.scalars(
            select(Tour)
            .where(*conditions)
            .order_by(order_expr)
            .limit(pagination.page_size)
            .offset(pagination.offset)
        )
        return list(tours.all()), total or 0

    async def get_hot_tours(self) -> list[Tour]:
        """Возвращает все горящие туры с загруженными city и hotel.

        Горящий тур: active, до начала <= 5 дней, тур ещё не начался.
        """
        today = date.today()
        result = await self._session.scalars(
            select(Tour)
            .where(
                Tour.status == TourStatus.active,
                Tour.start_date >= today,
                Tour.start_date <= today + timedelta(days=_HOT_TOUR_DAYS),
            )
            .options(selectinload(Tour.city), selectinload(Tour.hotel))
            .order_by(Tour.start_date)
        )
        return list(result.all())

    async def create(
        self,
        city_id: UUID,
        hotel_id: UUID,
        name: str,
        start_date: date,
        end_date: date,
        price: Decimal,
        available: int,
        meal_type: MealType,
        status: TourStatus = TourStatus.draft,
        description: str | None = None,
    ) -> Tour:
        tour = Tour(
            city_id=city_id,
            hotel_id=hotel_id,
            name=name,
            start_date=start_date,
            end_date=end_date,
            price=price,
            available=available,
            meal_type=meal_type,
            status=status,
            description=description,
        )
        self._session.add(tour)
        await self._session.flush()
        await self._session.refresh(tour)
        return tour

    async def update(self, tour: Tour, changes: dict[str, Any]) -> Tour:
        for field, value in changes.items():
            setattr(tour, field, value)
        await self._session.flush()
        await self._session.refresh(tour)
        return tour

    async def delete(self, tour: Tour) -> None:
        await self._session.delete(tour)
        await self._session.flush()


def _build_filter_conditions(filters: TourFilters) -> list:
    conditions = []

    if filters.only_hot:
        today = date.today()
        conditions.extend([
            Tour.status == TourStatus.active,
            Tour.start_date >= today,
            Tour.start_date <= today + timedelta(days=_HOT_TOUR_DAYS),
        ])
    elif filters.status is not None:
        conditions.append(Tour.status == filters.status)

    if filters.city_id is not None:
        conditions.append(Tour.city_id == filters.city_id)
    if filters.hotel_id is not None:
        conditions.append(Tour.hotel_id == filters.hotel_id)
    if filters.min_price is not None:
        conditions.append(Tour.price >= filters.min_price)
    if filters.max_price is not None:
        conditions.append(Tour.price <= filters.max_price)
    if filters.start_date_from is not None:
        conditions.append(Tour.start_date >= filters.start_date_from)
    if filters.start_date_to is not None:
        conditions.append(Tour.start_date <= filters.start_date_to)
    if filters.meal_type is not None:
        conditions.append(Tour.meal_type == filters.meal_type)

    return conditions
