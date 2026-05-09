import uuid

from app.core.exceptions import NotFoundError, SaleCancelledError
from app.http_client import ClientServiceClient
from app.kafka_producer import publish_sale_created
from app.logic.discount import get_discount_strategy
from app.models.sale import Sale
from app.repositories.audit_log import AuditLogRepository
from app.repositories.sale import SaleRepository
from app.schemas.common import PaginationParams
from app.schemas.sale import SaleCreate, SaleFilters


class SaleService:
    def __init__(
        self,
        sale_repo: SaleRepository,
        audit_repo: AuditLogRepository,
        http_client: ClientServiceClient,
    ) -> None:
        self._sale_repo = sale_repo
        self._audit_repo = audit_repo
        self._http_client = http_client

    async def create_sale(
        self,
        data: SaleCreate,
        *,
        employee_id: uuid.UUID,
        ip_address: str | None = None,
    ) -> Sale:
        loyalty = await self._http_client.get_loyalty_level(data.client_id)
        strategy = get_discount_strategy(loyalty)
        discount_amount = strategy.calculate(data.original_price)
        final_price = data.original_price - discount_amount

        sale = await self._sale_repo.create(
            data,
            employee_id=employee_id,
            discount_amount=discount_amount,
            final_price=final_price,
        )
        await self._audit_repo.create(
            employee_id=employee_id,
            action="SALE_CREATE",
            entity="sale",
            entity_id=sale.id,
            ip_address=ip_address,
        )
        await publish_sale_created(
            sale_id=sale.id,
            client_id=sale.client_id,
            employee_id=sale.employee_id,
            tour_id=sale.tour_id,
            final_price=sale.final_price,
            sale_date=sale.sale_date,
        )
        return sale

    async def cancel_sale(
        self,
        sale_id: uuid.UUID,
        *,
        employee_id: uuid.UUID,
        ip_address: str | None = None,
    ) -> Sale:
        sale = await self._sale_repo.get_by_id(sale_id)
        if sale is None:
            raise NotFoundError("Продажа", sale_id)
        if sale.is_cancelled:
            raise SaleCancelledError()
        sale.cancel()
        await self._sale_repo.save(sale)
        await self._audit_repo.create(
            employee_id=employee_id,
            action="SALE_CANCEL",
            entity="sale",
            entity_id=sale.id,
            ip_address=ip_address,
        )
        return sale

    async def get_sale(self, sale_id: uuid.UUID) -> Sale:
        sale = await self._sale_repo.get_by_id(sale_id)
        if sale is None:
            raise NotFoundError("Продажа", sale_id)
        return sale

    async def list_sales(
        self,
        filters: SaleFilters,
        pagination: PaginationParams,
    ) -> tuple[list[Sale], int]:
        return await self._sale_repo.list(filters, pagination)
