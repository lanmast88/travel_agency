from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import ConflictError, NotFoundError
from app.dependencies import AdminUser, DbSession, StaffUser
from app.repositories.city import CityRepository
from app.schemas.city import CityCreate, CityResponse, CityUpdate
from app.schemas.common import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=PaginatedResponse[CityResponse])
async def list_cities(
    pagination: Annotated[PaginationParams, Depends()],
    db: DbSession,
):
    cities, total = await CityRepository(db).get_all(pagination)
    return PaginatedResponse(items=cities, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/{city_id}", response_model=CityResponse)
async def get_city(city_id: UUID, db: DbSession):
    city = await CityRepository(db).get_by_id(city_id)
    if city is None:
        raise NotFoundError("Город", city_id)
    return city


@router.post("", response_model=CityResponse, status_code=201)
async def create_city(body: CityCreate, db: DbSession, _: StaffUser):
    repo = CityRepository(db)
    if await repo.exists_by_name(body.name):
        raise ConflictError(f"город с именем {body.name!r} уже существует")
    return await repo.create(**body.model_dump())


@router.patch("/{city_id}", response_model=CityResponse)
async def update_city(city_id: UUID, body: CityUpdate, db: DbSession, _: StaffUser):
    repo = CityRepository(db)
    city = await repo.get_by_id(city_id)
    if city is None:
        raise NotFoundError("Город", city_id)
    if not body.has_changes():
        return city
    if body.name is not None and await repo.exists_by_name(body.name, exclude_id=city_id):
        raise ConflictError(f"город с именем {body.name!r} уже существует")
    return await repo.update(city, body.model_dump(exclude_unset=True))


@router.delete("/{city_id}", status_code=204)
async def delete_city(city_id: UUID, db: DbSession, _: AdminUser) -> None:
    repo = CityRepository(db)
    city = await repo.get_by_id(city_id)
    if city is None:
        raise NotFoundError("Город", city_id)
    await repo.delete(city)
