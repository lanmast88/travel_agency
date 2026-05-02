from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.dependencies import AdminUser, DbSession, StaffUser
from app.repositories.city import CityRepository
from app.repositories.hotel import HotelRepository
from app.schemas.common import PaginatedResponse, PaginationParams
from app.schemas.hotel import HotelCreate, HotelResponse, HotelUpdate

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.get("", response_model=PaginatedResponse[HotelResponse])
async def list_hotels(
    pagination: Annotated[PaginationParams, Depends()],
    db: DbSession,
    city_id: UUID | None = None,
    min_stars: int | None = None,
    max_stars: int | None = None,
):
    hotels, total = await HotelRepository(db).get_all(
        pagination, city_id=city_id, min_stars=min_stars, max_stars=max_stars
    )
    return PaginatedResponse(items=hotels, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel(hotel_id: UUID, db: DbSession):
    hotel = await HotelRepository(db).get_by_id(hotel_id, load_city=True)
    if hotel is None:
        raise NotFoundError("Отель", hotel_id)
    return hotel


@router.post("", response_model=HotelResponse, status_code=201)
async def create_hotel(body: HotelCreate, db: DbSession, _: StaffUser):
    if await CityRepository(db).get_by_id(body.city_id) is None:
        raise NotFoundError("Город", body.city_id)
    repo = HotelRepository(db)
    hotel = await repo.create(**body.model_dump())
    return await repo.get_by_id(hotel.id, load_city=True)


@router.patch("/{hotel_id}", response_model=HotelResponse)
async def update_hotel(hotel_id: UUID, body: HotelUpdate, db: DbSession, _: StaffUser):
    repo = HotelRepository(db)
    hotel = await repo.get_by_id(hotel_id, load_city=True)
    if hotel is None:
        raise NotFoundError("Отель", hotel_id)
    if not body.has_changes():
        return hotel
    await repo.update(hotel, body.model_dump(exclude_unset=True))
    return await repo.get_by_id(hotel_id, load_city=True)


@router.delete("/{hotel_id}", status_code=204)
async def delete_hotel(hotel_id: UUID, db: DbSession, _: AdminUser) -> None:
    repo = HotelRepository(db)
    hotel = await repo.get_by_id(hotel_id)
    if hotel is None:
        raise NotFoundError("Отель", hotel_id)
    await repo.delete(hotel)
