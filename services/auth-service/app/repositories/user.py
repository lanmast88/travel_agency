from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def exists_by_email(self, email: str) -> bool:
        result = await self._session.execute(select(User.id).where(User.email == email))
        return result.scalar_one_or_none() is not None

    async def get_all(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[User]:
        query = select(User)
        if role is not None:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        query = query.limit(limit).offset(offset)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def create(
        self,
        email: str,
        hashed_password: str,
        first_name: str,
        last_name: str | None,
    ) -> User:
        user = User(
            email=email,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
        )
        self._session.add(user)
        # flush без commit — id нужен до завершения транзакции,
        # которую контролирует вызывающий слой через get_db
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user: User, changes: dict[str, Any]) -> User:
        for field, value in changes.items():
            setattr(user, field, value)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def deactivate(self, user: User) -> None:
        user.is_active = False
        await self._session.flush()

    async def flush(self) -> None:
        # flush синхронизирует все отложенные изменения сессии, не только одного объекта
        await self._session.flush()
