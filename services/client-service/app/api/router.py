import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.cache import CacheDep, get_cached_client
from app.dependencies import AdminUser, ClientServiceDep, EmployeeUser
from app.schemas.client import (
    ClientCreate,
    ClientFilters,
    ClientListItemResponse,
    ClientResponse,
    ClientUpdate,
    LoyaltyInfoResponse,
)
from app.schemas.common import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=PaginatedResponse[ClientListItemResponse])
async def list_clients(
    filters: Annotated[ClientFilters, Depends()],
    pagination: Annotated[PaginationParams, Depends()],
    service: ClientServiceDep,
    _: EmployeeUser,
) -> PaginatedResponse[ClientListItemResponse]:
    clients, total = await service.list(filters, pagination)
    return PaginatedResponse(
        items=[ClientListItemResponse.model_validate(c) for c in clients],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    service: ClientServiceDep,
    _: EmployeeUser,
) -> ClientResponse:
    client = await service.create(data)
    return ClientResponse.model_validate(client)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    service: ClientServiceDep,
    cache: CacheDep,
    _: EmployeeUser,
) -> ClientResponse:
    return await get_cached_client(client_id, service, cache)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    service: ClientServiceDep,
    _: EmployeeUser,
) -> ClientResponse:
    client = await service.update(client_id, data)
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    service: ClientServiceDep,
    _: AdminUser,
) -> None:
    await service.delete(client_id)


@router.get("/{client_id}/loyalty", response_model=LoyaltyInfoResponse)
async def get_client_loyalty(
    client_id: uuid.UUID,
    service: ClientServiceDep,
    _: EmployeeUser,
) -> LoyaltyInfoResponse:
    return await service.get_loyalty(client_id)
