import time
import uuid
from collections.abc import Callable, Coroutine
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from jose import jwt as jose_jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.exceptions import InvalidTokenError, JwksUnavailableError

_bearer = HTTPBearer()

# In-process кэш JWKS — сбрасывается по TTL или при обнаружении неизвестного kid
_jwks_keys: list[dict] = []
_jwks_fetched_at: float = 0.0


class TokenPayload(BaseModel):
    user_id: uuid.UUID
    role: UserRole


async def _fetch_jwks(*, force_refresh: bool = False) -> list[dict]:
    global _jwks_keys, _jwks_fetched_at

    now = time.monotonic()
    if (
        not force_refresh
        and _jwks_keys
        and (now - _jwks_fetched_at) < settings.jwks_cache_ttl_seconds
    ):
        return _jwks_keys

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.auth_service_jwks_url)
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        if _jwks_keys:
            # Предпочитаем устаревший кэш полному отказу верификации
            return _jwks_keys
        raise JwksUnavailableError("JWKS endpoint недоступен и кэш пуст") from exc

    _jwks_keys = data.get("keys", [])
    _jwks_fetched_at = now
    return _jwks_keys


def _find_key(keys: list[dict], kid: str | None) -> dict | None:
    for key in keys:
        if kid is None or key.get("kid") == kid:
            return key
    return None


async def _verify_access_token(token: str) -> TokenPayload:
    try:
        header = jose_jwt.get_unverified_header(token)
    except JWTError as exc:
        raise InvalidTokenError("невалидный заголовок токена") from exc

    kid = header.get("kid")

    keys = await _fetch_jwks()
    key = _find_key(keys, kid)

    if key is None:
        # kid мог появиться после ротации — сбрасываем кэш и пробуем ещё раз
        keys = await _fetch_jwks(force_refresh=True)
        key = _find_key(keys, kid)

    if key is None:
        raise InvalidTokenError("ключ подписи не найден в JWKS")

    try:
        raw = jose_jwt.decode(token, key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise InvalidTokenError("невалидный или истёкший токен") from exc

    if raw.get("type") != "access":
        raise InvalidTokenError("ожидался access-токен")

    try:
        user_id = uuid.UUID(raw["sub"])
        role = UserRole(raw["role"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("некорректные claims в токене") from exc

    return TokenPayload(user_id=user_id, role=role)


async def get_current_employee(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> TokenPayload:
    try:
        return await _verify_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JwksUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )


def require_role(
    *roles: UserRole,
) -> Callable[..., Coroutine[Any, Any, TokenPayload]]:
    async def dependency(
        token: Annotated[TokenPayload, Depends(get_current_employee)],
    ) -> TokenPayload:
        if token.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="недостаточно прав",
            )
        return token

    return dependency


DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentEmployee = Annotated[TokenPayload, Depends(get_current_employee)]
ManagerUser = Annotated[TokenPayload, Depends(require_role(UserRole.employee, UserRole.admin))]
AdminUser = Annotated[TokenPayload, Depends(require_role(UserRole.admin))]
