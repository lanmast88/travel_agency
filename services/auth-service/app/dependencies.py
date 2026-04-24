from collections.abc import Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.enums import TokenType, UserRole
from app.core.exceptions import InvalidTokenError
from app.logic import jwt as jwt_logic
from app.logic.auth import AuthService
from app.models.user import User
from app.repositories.user import UserRepository


_bearer = HTTPBearer()

# Инициализируется в lifespan (main.py), здесь только хранится
_blacklist_redis: Redis | None = None


async def init_redis() -> None:
    global _blacklist_redis
    _blacklist_redis = Redis.from_url(
        str(settings.redis_url),
        db=settings.redis_token_blacklist_db,
        decode_responses=True,
    )


async def close_redis() -> None:
    global _blacklist_redis
    if _blacklist_redis is not None:
        await _blacklist_redis.aclose()
        _blacklist_redis = None


def get_blacklist_redis() -> Redis:
    if _blacklist_redis is None:
        raise RuntimeError("Redis не инициализирован — вызовите init_redis() в lifespan")
    return _blacklist_redis


def get_user_repo(session: Annotated[AsyncSession, Depends(get_db)]) -> UserRepository:
    return UserRepository(session)


def get_auth_service(
    repo: Annotated[UserRepository, Depends(get_user_repo)],
    redis: Annotated[Redis, Depends(get_blacklist_redis)],
) -> AuthService:
    return AuthService(repo, redis)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User:
    try:
        payload = jwt_logic.decode_token(credentials.credentials, TokenType.access)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await repo.get_by_id(payload.user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="пользователь не найден или деактивирован",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="аккаунт временно заблокирован",
        )

    return user


def require_role(*roles: UserRole) -> Callable[..., Coroutine[Any, Any, User]]:
    if not roles:
        raise ValueError("require_role() требует хотя бы одну роль")

    async def dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="недостаточно прав",
            )
        return current_user

    return dependency


# Annotated-алиасы для краткости в роутерах
CurrentUser = Annotated[User, Depends(get_current_user)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserRepoDep = Annotated[UserRepository, Depends(get_user_repo)]
EmployeeUser = Annotated[User, Depends(require_role(UserRole.employee, UserRole.admin))]
AdminUser = Annotated[User, Depends(require_role(UserRole.admin))]
