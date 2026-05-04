import uuid

from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ClientSortField, LoyaltyLevel, SortOrder
from app.core.exceptions import ConflictError
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientFilters, ClientUpdate
from app.schemas.common import PaginationParams

_LOYALTY_ORDER = case(
    (Client.loyalty_level == LoyaltyLevel.standard, 0),
    (Client.loyalty_level == LoyaltyLevel.bronze, 1),
    (Client.loyalty_level == LoyaltyLevel.silver, 2),
    (Client.loyalty_level == LoyaltyLevel.gold, 3),
    else_=0,
)

_SORT_COLUMNS = {
    ClientSortField.full_name: Client.full_name,
    ClientSortField.created_at: Client.created_at,
    ClientSortField.loyalty_level: _LOYALTY_ORDER,
    ClientSortField.sales_count: Client.sales_count,
}


def _conflict_detail(exc: IntegrityError) -> str:
    msg = str(exc.orig).lower()
    if "phone" in msg:
        return "клиент с таким телефоном уже существует"
    if "passport" in msg:
        return "клиент с таким паспортом уже существует"
    if "email" in msg:
        return "клиент с таким email уже существует"
    return "клиент с такими данными уже существует"


class ClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, client_id: uuid.UUID) -> Client | None:
        return await self._session.get(Client, client_id)

    async def get_by_phone(self, phone: str) -> Client | None:
        result = await self._session.execute(
            select(Client).where(Client.phone == phone)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Client | None:
        result = await self._session.execute(
            select(Client).where(Client.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_passport(self, passport: str) -> Client | None:
        result = await self._session.execute(
            select(Client).where(Client.passport == passport)
        )
        return result.scalar_one_or_none()

    async def create(self, data: ClientCreate) -> Client:
        client = Client(**data.model_dump())
        self._session.add(client)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError(_conflict_detail(exc)) from exc
        return client

    async def update(self, client: Client, data: ClientUpdate) -> Client:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(client, field, value)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError(_conflict_detail(exc)) from exc
        return client

    async def delete(self, client: Client) -> None:
        await self._session.delete(client)
        await self._session.flush()

    async def increment_sales(self, client: Client) -> Client:
        client.sales_count += 1
        await self._session.flush()
        return client

    async def list(
        self,
        filters: ClientFilters,
        pagination: PaginationParams,
    ) -> tuple[list[Client], int]:
        query = select(Client)

        if filters.loyalty_level is not None:
            query = query.where(Client.loyalty_level == filters.loyalty_level)

        if filters.search:
            term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Client.full_name.ilike(term),
                    Client.email.ilike(term),
                    Client.phone.ilike(term),
                )
            )

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
