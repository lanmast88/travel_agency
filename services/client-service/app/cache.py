import uuid
from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis

from app.core.config import settings
from app.schemas.client import ClientResponse
from app.services.client import ClientService

_CACHE_PREFIX = "client:"
_redis: Redis | None = None


async def init_cache() -> None:
    global _redis
    _redis = Redis.from_url(
        str(settings.redis_url),
        db=settings.redis_cache_db,
        decode_responses=True,
    )


async def close_cache() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_cache() -> Redis | None:
    return _redis


async def check_cache_health() -> bool:
    if _redis is None:
        return False
    try:
        await _redis.ping()
        return True
    except Exception:
        return False


async def get_cached_client(
    client_id: uuid.UUID,
    service: ClientService,
    cache: Redis | None,
) -> ClientResponse:
    if cache is not None:
        raw = await cache.get(f"{_CACHE_PREFIX}{client_id}")
        if raw is not None:
            return ClientResponse.model_validate_json(raw)

    client = await service.get(client_id)
    response = ClientResponse.model_validate(client)

    if cache is not None:
        await cache.set(
            f"{_CACHE_PREFIX}{client_id}",
            response.model_dump_json(),
            ex=settings.client_cache_ttl_seconds,
        )

    return response


CacheDep = Annotated[Redis | None, Depends(get_cache)]
