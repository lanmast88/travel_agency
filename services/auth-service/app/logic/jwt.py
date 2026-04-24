from datetime import datetime, timezone
from uuid import uuid4

from jose import JWTError, jwt
from redis.asyncio import Redis

from app.core.config import settings
from app.core.enums import TokenType, UserRole
from app.core.exceptions import InvalidTokenError, TokenRevokedError
from app.schemas.token import TokenPayload, TokenResponse


_BLACKLIST_PREFIX = "blacklist:refresh:"


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _build_payload(
    user_id: int,
    role: UserRole,
    token_type: TokenType,
    expire_seconds: int,
) -> dict:
    now = _now()
    return {
        "sub": str(user_id),
        "role": role.value,
        "type": token_type.value,
        "iat": now,
        "exp": now + expire_seconds,
        "jti": str(uuid4()),
    }


def _encode(payload: dict) -> str:
    return jwt.encode(
        payload,
        settings.jwt_private_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def create_token_pair(user_id: int, role: UserRole) -> TokenResponse:
    access_seconds = settings.jwt_access_token_expire_minutes * 60
    refresh_seconds = settings.jwt_refresh_token_expire_days * 24 * 3600

    access_payload = _build_payload(user_id, role, TokenType.access, access_seconds)
    refresh_payload = _build_payload(user_id, role, TokenType.refresh, refresh_seconds)

    return TokenResponse(
        access_token=_encode(access_payload),
        refresh_token=_encode(refresh_payload),
        expires_in=access_seconds,
        refresh_expires_in=refresh_seconds,
    )


def decode_token(token: str, expected_type: TokenType) -> TokenPayload:
    try:
        raw = jwt.decode(
            token,
            settings.jwt_public_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise InvalidTokenError("невалидный или истёкший токен") from exc

    payload = TokenPayload(**raw)

    # Явная проверка типа — jose валидирует подпись и exp, но не знает о нашем поле type
    if payload.type != expected_type:
        raise InvalidTokenError(
            f"ожидался токен типа {expected_type.value!r}, получен {payload.type!r}"
        )

    return payload


async def revoke_refresh_token(jti: str, exp: int, redis: Redis) -> None:
    remaining_ttl = exp - _now()
    if remaining_ttl <= 0:
        # токен уже истёк — он и так не пройдёт decode, добавлять в blacklist незачем
        return
    # NX — записываем только если ключа ещё нет, чтобы повторный logout не перезаписывал TTL
    await redis.set(name=f"{_BLACKLIST_PREFIX}{jti}", value="1", ex=remaining_ttl, nx=True)


async def verify_not_revoked(jti: str, redis: Redis) -> None:
    """Бросает TokenRevokedError если refresh-токен был отозван."""
    if await redis.exists(f"{_BLACKLIST_PREFIX}{jti}"):
        raise TokenRevokedError("токен был отозван")
