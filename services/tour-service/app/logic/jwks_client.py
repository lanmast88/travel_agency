import asyncio
import logging

import httpx

from app.core.exceptions import InvalidTokenError, JwksUnavailableError

logger = logging.getLogger(__name__)


class JwksClient:
    """Async JWKS клиент с кешированием ключей по kid.

    Жизненный цикл:
    - startup()  — создаёт HTTP клиент, делает первый fetch. Бросает исключение
                   если JWKS недоступен: сервис не должен стартовать без
                   возможности верифицировать токены.
    - get_public_key(kid) — возвращает JWK dict. Обновляет кеш по TTL или
                            при встрече неизвестного kid (ротация ключей).
    - shutdown()  — закрывает HTTP клиент.

    Защита от thundering herd: asyncio.Lock предотвращает параллельные
    запросы к JWKS endpoint при одновременном инвалидировании кеша.
    """

    def __init__(self, jwks_url: str, cache_ttl_seconds: int) -> None:
        self._url = jwks_url
        self._ttl = cache_ttl_seconds
        self._keys: dict[str, dict] = {}
        self._fetched_at: float = 0.0
        self._lock = asyncio.Lock()
        self._http: httpx.AsyncClient | None = None

    async def startup(self) -> None:
        self._http = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0),
            # Переиспользование соединения — JWKS запросы редкие, но всё же
            limits=httpx.Limits(max_keepalive_connections=2, max_connections=5),
        )
        try:
            await self._fetch()
            logger.info("JWKS загружен: %d ключей из %s", len(self._keys), self._url)
        except Exception as exc:
            await self._http.aclose()
            self._http = None
            logger.critical("Не удалось загрузить JWKS при старте: %s", exc)
            raise

    async def shutdown(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None

    async def _fetch(self) -> None:
        assert self._http is not None, "JwksClient не инициализирован — вызовите startup()"

        response = await self._http.get(self._url)
        response.raise_for_status()
        data = response.json()

        keys = {k["kid"]: k for k in data.get("keys", []) if "kid" in k}
        if not keys:
            raise JwksUnavailableError(f"JWKS из {self._url!r} не содержит ключей с kid")

        self._keys = keys
        # get_event_loop().time() — монотонные часы, не зависят от NTP прыжков
        self._fetched_at = asyncio.get_event_loop().time()

    async def get_public_key(self, kid: str) -> dict:
        """Возвращает JWK по kid. При необходимости обновляет кеш.

        Порядок проверок:
        1. Быстрый путь: ключ есть и кеш не протух — сразу возвращаем.
        2. Медленный путь: берём lock, перепроверяем (double-check locking),
           делаем fetch если нужно.
        3. Если fetch упал, но ключ уже есть в устаревшем кеше — используем его
           (graceful degradation при временной недоступности JWKS).
        4. Если ключ не найден после всех попыток — InvalidTokenError.
        """
        elapsed = asyncio.get_event_loop().time() - self._fetched_at
        if kid in self._keys and elapsed <= self._ttl:
            return self._keys[kid]

        async with self._lock:
            # Перепроверяем внутри lock — параллельная корутина могла уже обновить кеш
            elapsed = asyncio.get_event_loop().time() - self._fetched_at
            needs_refresh = kid not in self._keys or elapsed > self._ttl

            if needs_refresh:
                logger.info(
                    "Обновление JWKS (kid=%r, ttl_expired=%s, unknown_kid=%s)",
                    kid,
                    elapsed > self._ttl,
                    kid not in self._keys,
                )
                try:
                    await self._fetch()
                except Exception as exc:
                    if kid in self._keys:
                        # Используем устаревший кеш — лучше чем отказать в запросе
                        logger.warning(
                            "JWKS обновить не удалось, используем устаревший кеш: %s", exc
                        )
                        return self._keys[kid]
                    raise JwksUnavailableError(
                        "Не удалось получить JWKS для верификации токена"
                    ) from exc

        if kid not in self._keys:
            raise InvalidTokenError(
                f"Неизвестный kid={kid!r} — токен выпущен неизвестным ключом"
            )

        return self._keys[kid]
