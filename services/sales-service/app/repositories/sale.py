import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import SaleSortField, SortOrder
from app.models.sale import Sale
from app.schemas.common import PaginationParams
from app.schemas.sale import SaleCreate, SaleFilters

_SORT_COLUMNS = {
    SaleSortField.sale_date: Sale.sale_date,
    SaleSortField.final_price: Sale.final_price,
    SaleSortField.created_at: Sale.created_at,
}


class SaleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, sale_id: uuid.UUID) -> Sale | None:
        return await self._session.get(Sale, sale_id)

    async def create(
        self,
        data: SaleCreate,
        *,
        employee_id: uuid.UUID,
        discount_amount: Decimal,
        final_price: Decimal,
    ) -> Sale:
        sale = Sale(
            **data.model_dump(),
            employee_id=employee_id,
            discount_amount=discount_amount,
            final_price=final_price,
        )
        self._session.add(sale)
        await self._session.flush()
        return sale

    async def save(self, sale: Sale) -> Sale:
        """Сбрасывает изменения модели в транзакцию (используется после cancel())."""
        await self._session.flush()
        return sale

    async def list(
        self,
        filters: SaleFilters,
        pagination: PaginationParams,
    ) -> tuple[list[Sale], int]:
        query = select(Sale)

        if filters.client_id is not None:
            query = query.where(Sale.client_id == filters.client_id)
        if filters.employee_id is not None:
            query = query.where(Sale.employee_id == filters.employee_id)
        if filters.status is not None:
            query = query.where(Sale.status == filters.status)
        if filters.date_from is not None:
            query = query.where(Sale.sale_date >= filters.date_from)
        if filters.date_to is not None:
            query = query.where(Sale.sale_date <= filters.date_to)

        count_result = await self._session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total: int = count_result.scalar_one()

        sort_col = _SORT_COLUMNS[filters.sort_by]
        sort_expr = sort_col.desc() if filters.order == SortOrder.desc else sort_col.asc()

        items_result = await self._session.execute(
            query.order_by(sort_expr).offset(pagination.offset).limit(pagination.page_size)
        )
        return list(items_result.scalars().all()), total
