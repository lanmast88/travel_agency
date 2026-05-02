from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.enums import TourStatus, UserRole
from app.core.exceptions import NotFoundError
from app.dependencies import AdminUser, DbSession, OptionalUser, StaffUser, TourCacheDep
from app.repositories.city import CityRepository
from app.repositories.hotel import HotelRepository
from app.repositories.tour import TourRepository
from app.schemas.common import PaginatedResponse, PaginationParams
from app.schemas.tour import (
    TourCreate,
    TourFilters,
    TourListItemResponse,
    TourResponse,
    TourUpdate,
)

router = APIRouter(prefix="/tours", tags=["tours"])


@router.get("", response_model=PaginatedResponse[TourListItemResponse])
async def list_tours(
    filters: Annotated[TourFilters, Depends()],
    pagination: Annotated[PaginationParams, Depends()],
    db: DbSession,
    cache: TourCacheDep,
    current_user: OptionalUser,
):
    is_staff = current_user is not None and current_user.role in (UserRole.employee, UserRole.admin)
    if not is_staff:
        filters = filters.model_copy(update={"status": TourStatus.active})

    if filters.only_hot:
        hot = await cache.get_hot_tours()
        if hot is None:
            tours = await TourRepository(db).get_hot_tours()
            hot = [TourListItemResponse.model_validate(t).model_dump(mode="json") for t in tours]
            await cache.set_hot_tours(hot)
        start = pagination.offset
        return PaginatedResponse(
            items=hot[start : start + pagination.page_size],
            total=len(hot),
            page=pagination.page,
            page_size=pagination.page_size,
        )

    tours, total = await TourRepository(db).get_list(filters, pagination)
    return PaginatedResponse(items=tours, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/{tour_id}", response_model=TourResponse)
async def get_tour(tour_id: UUID, db: DbSession, cache: TourCacheDep):
    cached = await cache.get_tour(tour_id)
    if cached is not None:
        return TourResponse.model_validate(cached)

    tour = await TourRepository(db).get_by_id(tour_id, load_relations=True)
    if tour is None:
        raise NotFoundError("Тур", tour_id)

    response = TourResponse.model_validate(tour)
    await cache.set_tour(tour_id, response.model_dump(mode="json"))
    return response


@router.post("", response_model=TourResponse, status_code=201)
async def create_tour(body: TourCreate, db: DbSession, _: StaffUser):
    if await CityRepository(db).get_by_id(body.city_id) is None:
        raise NotFoundError("Город", body.city_id)
    if await HotelRepository(db).get_by_id(body.hotel_id) is None:
        raise NotFoundError("Отель", body.hotel_id)
    repo = TourRepository(db)
    tour = await repo.create(**body.model_dump())
    return await repo.get_by_id(tour.id, load_relations=True)


@router.patch("/{tour_id}", response_model=TourResponse)
async def update_tour(tour_id: UUID, body: TourUpdate, db: DbSession, _: StaffUser, cache: TourCacheDep):
    repo = TourRepository(db)
    tour = await repo.get_by_id(tour_id, load_relations=True)
    if tour is None:
        raise NotFoundError("Тур", tour_id)
    if not body.has_changes():
        return tour

    await repo.update(tour, body.model_dump(exclude_unset=True))
    await cache.invalidate_on_tour_change(tour_id)
    return await repo.get_by_id(tour_id, load_relations=True)


@router.delete("/{tour_id}", status_code=204)
async def delete_tour(tour_id: UUID, db: DbSession, _: AdminUser, cache: TourCacheDep) -> None:
    repo = TourRepository(db)
    tour = await repo.get_by_id(tour_id)
    if tour is None:
        raise NotFoundError("Тур", tour_id)
    await repo.delete(tour)
    await cache.invalidate_on_tour_change(tour_id)
