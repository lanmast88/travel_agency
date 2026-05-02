import asyncio
import json
import logging
from uuid import UUID

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_HOT_TOURS_KEY = "tours:hot"


def _tour_key(tour_id: UUID) -> str:
    return f"tour:{tour_id}"


class TourCache:
    """Cache-aside кэш для туров поверх Redis.

    Хранит два типа данных:
    - Детальное представление конкретного тура (ключ tour:{uuid})
    - Список горящих туров (ключ tours:hot)

    Данные сериализуются в JSON. Вызывающий код отвечает за передачу
    JSON-совместимых dict (например через Pydantic model_dump(mode="json")).
    """

    def __init__(self, redis: Redis, ttl: int) -> None:
        self._redis = redis
        self._ttl = ttl

    async def get_tour(self, tour_id: UUID) -> dict | None:
        key = _tour_key(tour_id)
        raw = await self._redis.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupt cache entry for tour %s, evicting", tour_id)
            await self._redis.delete(key)
            return None

    async def set_tour(self, tour_id: UUID, data: dict) -> None:
        await self._redis.set(
            _tour_key(tour_id),
            json.dumps(data),
            ex=self._ttl,
        )

    async def get_hot_tours(self) -> list[dict] | None:
        raw = await self._redis.get(_HOT_TOURS_KEY)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupt cache entry for hot tours, evicting")
            await self._redis.delete(_HOT_TOURS_KEY)
            return None

    async def set_hot_tours(self, data: list[dict]) -> None:
        await self._redis.set(
            _HOT_TOURS_KEY,
            json.dumps(data),
            ex=self._ttl,
        )

    async def invalidate_on_tour_change(self, tour_id: UUID) -> None:
        """Инвалидирует кэш тура и список горящих туров параллельно.

        Вызывается при любой мутации тура — изменение статуса, цены или дат
        может повлиять на попадание в горящие туры.
        """
        await asyncio.gather(
            self._redis.delete(_tour_key(tour_id)),
            self._redis.delete(_HOT_TOURS_KEY),
        )
