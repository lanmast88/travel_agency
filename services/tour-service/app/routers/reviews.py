from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.enums import UserRole
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.dependencies import CurrentUser, DbSession
from app.repositories.review import ReviewRepository
from app.repositories.tour import TourRepository
from app.schemas.common import PaginatedResponse, PaginationParams
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate

router = APIRouter(tags=["reviews"])


@router.get("/tours/{tour_id}/reviews", response_model=PaginatedResponse[ReviewResponse])
async def list_reviews(
    tour_id: UUID,
    pagination: Annotated[PaginationParams, Depends()],
    db: DbSession,
):
    tour = await TourRepository(db).get_by_id(tour_id)
    if tour is None:
        raise NotFoundError("Тур", tour_id)
    reviews, total = await ReviewRepository(db).get_by_tour(tour_id, pagination)
    return PaginatedResponse(items=reviews, total=total, page=pagination.page, page_size=pagination.page_size)


@router.post("/reviews", response_model=ReviewResponse, status_code=201)
async def create_review(body: ReviewCreate, db: DbSession, current_user: CurrentUser):
    tour = await TourRepository(db).get_by_id(body.tour_id)
    if tour is None:
        raise NotFoundError("Тур", body.tour_id)
    repo = ReviewRepository(db)
    existing = await repo.get_by_client_and_tour(current_user.user_id, body.tour_id)
    if existing is not None:
        raise ConflictError("вы уже оставили отзыв на этот тур")
    return await repo.create(
        tour_id=body.tour_id,
        client_id=current_user.user_id,
        rating=body.rating,
        comment=body.comment,
    )


@router.patch("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(review_id: UUID, body: ReviewUpdate, db: DbSession, current_user: CurrentUser):
    repo = ReviewRepository(db)
    review = await repo.get_by_id(review_id)
    if review is None:
        raise NotFoundError("Отзыв", review_id)
    if review.client_id != current_user.user_id:
        raise ForbiddenError("редактировать можно только свои отзывы")
    if not body.has_changes():
        return review
    return await repo.update(review, body.model_dump(exclude_unset=True))


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(review_id: UUID, db: DbSession, current_user: CurrentUser) -> None:
    repo = ReviewRepository(db)
    review = await repo.get_by_id(review_id)
    if review is None:
        raise NotFoundError("Отзыв", review_id)
    is_owner = review.client_id == current_user.user_id
    is_staff = current_user.role in (UserRole.employee, UserRole.admin)
    if not is_owner and not is_staff:
        raise ForbiddenError("удалять можно только свои отзывы")
    await repo.delete(review)
