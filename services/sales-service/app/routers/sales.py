import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.dependencies import DbSession, ManagerUser, RawToken
from app.http_client import ClientServiceClient
from app.logic.sale_service import SaleService
from app.repositories.audit_log import AuditLogRepository
from app.repositories.sale import SaleRepository
from app.schemas.common import PaginatedResponse, PaginationParams
from app.schemas.sale import SaleCreate, SaleFilters, SaleListItemResponse, SaleResponse

router = APIRouter(prefix="/sales", tags=["sales"])


def _get_service(db: DbSession, raw_token: RawToken) -> SaleService:
    return SaleService(
        sale_repo=SaleRepository(db),
        audit_repo=AuditLogRepository(db),
        http_client=ClientServiceClient(raw_token),
    )


_ServiceDep = Annotated[SaleService, Depends(_get_service)]


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    data: SaleCreate,
    request: Request,
    service: _ServiceDep,
    employee: ManagerUser,
) -> SaleResponse:
    sale = await service.create_sale(
        data,
        employee_id=employee.user_id,
        ip_address=request.client.host if request.client else None,
    )
    return SaleResponse.model_validate(sale)


@router.get("", response_model=PaginatedResponse[SaleListItemResponse])
async def list_sales(
    filters: Annotated[SaleFilters, Depends()],
    pagination: Annotated[PaginationParams, Depends()],
    service: _ServiceDep,
    _: ManagerUser,
) -> PaginatedResponse[SaleListItemResponse]:
    sales, total = await service.list_sales(filters, pagination)
    return PaginatedResponse(
        items=[SaleListItemResponse.model_validate(s) for s in sales],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: uuid.UUID,
    service: _ServiceDep,
    _: ManagerUser,
) -> SaleResponse:
    sale = await service.get_sale(sale_id)
    return SaleResponse.model_validate(sale)


@router.post("/{sale_id}/cancel", response_model=SaleResponse)
async def cancel_sale(
    sale_id: uuid.UUID,
    request: Request,
    service: _ServiceDep,
    employee: ManagerUser,
) -> SaleResponse:
    sale = await service.cancel_sale(
        sale_id,
        employee_id=employee.user_id,
        ip_address=request.client.host if request.client else None,
    )
    return SaleResponse.model_validate(sale)
