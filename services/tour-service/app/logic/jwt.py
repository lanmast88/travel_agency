from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import InvalidTokenError
from app.logic.jwks_client import JwksClient


async def decode_access_token(token: str, jwks_client: JwksClient) -> dict:
    """Верифицирует access-токен через JWKS и возвращает payload.

    Шаги:
    1. Извлекает kid из заголовка без проверки подписи.
    2. Получает соответствующий JWK из кеша (с auto-refresh при ротации).
    3. Верифицирует подпись и exp через python-jose.
    4. Проверяет что тип токена — access (не refresh).

    Бросает InvalidTokenError при любой проблеме с токеном.
    """
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise InvalidTokenError("Невалидный формат токена") from exc

    kid = header.get("kid")
    if not kid:
        # Токен без kid — либо очень старый, либо не от нашего auth-service
        raise InvalidTokenError("Токен не содержит kid в заголовке")

    jwk = await jwks_client.get_public_key(kid)

    try:
        payload = jwt.decode(token, jwk, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise InvalidTokenError("Невалидный или истёкший токен") from exc

    # jose проверяет подпись и exp, но не знает о нашем кастомном поле type
    if payload.get("type") != "access":
        raise InvalidTokenError(
            f"Ожидался access-токен, получен {payload.get('type')!r}"
        )

    return payload
