from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.schemas.common import PaginationParams


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, review_id: UUID) -> Review | None:
        return await self._session.get(Review, review_id)

    async def get_by_client_and_tour(self, client_id: UUID, tour_id: UUID) -> Review | None:
        """Проверяет существование отзыва клиента на конкретный тур.

        Используется перед созданием нового отзыва — один клиент не может
        оставить два отзыва на один тур (unique constraint в БД).
        """
        result = await self._session.execute(
            select(Review).where(
                Review.client_id == client_id,
                Review.tour_id == tour_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_tour(
        self,
        tour_id: UUID,
        pagination: PaginationParams,
    ) -> tuple[list[Review], int]:
        total = await self._session.scalar(
            select(func.count())
            .select_from(Review)
            .where(Review.tour_id == tour_id)
        )
        reviews = await self._session.scalars(
            select(Review)
            .where(Review.tour_id == tour_id)
            .order_by(Review.created_at.desc())
            .limit(pagination.page_size)
            .offset(pagination.offset)
        )
        return list(reviews.all()), total or 0

    async def create(
        self,
        tour_id: UUID,
        client_id: UUID,
        rating: int,
        comment: str | None = None,
    ) -> Review:
        review = Review(
            tour_id=tour_id,
            client_id=client_id,
            rating=rating,
            comment=comment,
        )
        self._session.add(review)
        await self._session.flush()
        await self._session.refresh(review)
        return review

    async def update(self, review: Review, changes: dict[str, Any]) -> Review:
        for field, value in changes.items():
            setattr(review, field, value)
        await self._session.flush()
        await self._session.refresh(review)
        return review

    async def delete(self, review: Review) -> None:
        await self._session.delete(review)
        await self._session.flush()
