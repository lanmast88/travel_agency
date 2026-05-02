from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.exceptions import InvalidTokenError, JwksUnavailableError
from app.logic.jwks_client import JwksClient
from app.logic.jwt import decode_access_token


@dataclass(frozen=True)
class TokenPayload:
    """Данные из верифицированного JWT.

    Tour-service не хранит сотрудников локально — вся информация берётся
    из токена, подписанного auth-service. Запросов к БД не выполняется.
    """

    user_id: UUID
    role: UserRole


_cache_redis: Redis | None = None


async def init_redis() -> None:
    global _cache_redis
    _cache_redis = Redis.from_url(
        str(settings.redis_url),
        db=settings.redis_cache_db,
        decode_responses=False,
    )


async def close_redis() -> None:
    global _cache_redis
    if _cache_redis is not None:
        await _cache_redis.aclose()
        _cache_redis = None


def get_cache_redis() -> Redis:
    if _cache_redis is None:
        raise RuntimeError("Redis не инициализирован — вызовите init_redis() в lifespan")
    return _cache_redis


async def check_redis_health() -> bool:
    if _cache_redis is None:
        return False
    try:
        await _cache_redis.ping()
        return True
    except Exception:
        return False


_jwks_client: JwksClient | None = None


async def init_jwks_client() -> None:
    global _jwks_client
    client = JwksClient(
        jwks_url=settings.auth_service_jwks_url,
        cache_ttl_seconds=settings.jwks_cache_ttl_seconds,
    )
    await client.startup()
    _jwks_client = client


async def close_jwks_client() -> None:
    global _jwks_client
    if _jwks_client is not None:
        await _jwks_client.shutdown()
        _jwks_client = None


def get_jwks_client() -> JwksClient:
    if _jwks_client is None:
        raise RuntimeError(
            "JwksClient не инициализирован — вызовите init_jwks_client() в lifespan"
        )
    return _jwks_client


_bearer = HTTPBearer()


def _parse_token_payload(raw: dict) -> TokenPayload:
    """Валидирует и преобразует raw JWT payload в типизированный TokenPayload.

    Вынесено отдельно для тестируемости без mock JWKS.
    """
    try:
        user_id = UUID(str(raw.get("sub", "")))
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="токен содержит некорректный sub",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        role = UserRole(raw.get("role", ""))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"токен содержит неизвестную роль: {raw.get('role')!r}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenPayload(user_id=user_id, role=role)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    jwks_client: Annotated[JwksClient, Depends(get_jwks_client)],
) -> TokenPayload:
    """Верифицирует Bearer-токен через JWKS и возвращает payload."""
    try:
        payload = await decode_access_token(credentials.credentials, jwks_client)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except JwksUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="сервис аутентификации временно недоступен",
        ) from exc

    return _parse_token_payload(payload)


def require_role(
    *roles: UserRole,
) -> Callable[..., Coroutine[Any, Any, TokenPayload]]:
    """Фабрика зависимостей для проверки роли.

    Пример:
        Depends(require_role(UserRole.employee, UserRole.admin))
    """
    if not roles:
        raise ValueError("require_role() требует хотя бы одну роль")

    allowed = frozenset(roles)

    async def dependency(
        current_user: Annotated[TokenPayload, Depends(get_current_user)],
    ) -> TokenPayload:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="недостаточно прав",
            )
        return current_user

    return dependency


DbSession = Annotated[AsyncSession, Depends(get_db)]
CacheRedisDep = Annotated[Redis, Depends(get_cache_redis)]
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
StaffUser = Annotated[
    TokenPayload,
    Depends(require_role(UserRole.employee, UserRole.admin)),
]
AdminUser = Annotated[
    TokenPayload,
    Depends(require_role(UserRole.admin)),
]
