"""
Тесты TourCache — cache-aside логика поверх Redis.
"""
import json
from unittest.mock import AsyncMock
from uuid import uuid4

from app.logic.redis_cache import TourCache, _HOT_TOURS_KEY


def _make_cache(redis: AsyncMock | None = None) -> TourCache:
    return TourCache(redis=redis or AsyncMock(), ttl=300)


class TestGetTour:
    async def test_miss_returns_none(self) -> None:
        redis = AsyncMock()
        redis.get.return_value = None
        assert await _make_cache(redis).get_tour(uuid4()) is None

    async def test_hit_returns_dict(self) -> None:
        tour_id = uuid4()
        data = {"id": str(tour_id), "name": "Тур"}
        redis = AsyncMock()
        redis.get.return_value = json.dumps(data).encode()
        result = await _make_cache(redis).get_tour(tour_id)
        assert result == data

    async def test_corrupt_json_evicts_and_returns_none(self) -> None:
        tour_id = uuid4()
        redis = AsyncMock()
        redis.get.return_value = b"not-json{"
        result = await _make_cache(redis).get_tour(tour_id)
        assert result is None
        redis.delete.assert_awaited_once_with(f"tour:{tour_id}")


class TestSetTour:
    async def test_stores_serialized_json_with_ttl(self) -> None:
        redis = AsyncMock()
        cache = _make_cache(redis)
        tour_id = uuid4()
        data = {"id": str(tour_id), "name": "Тур"}
        await cache.set_tour(tour_id, data)
        redis.set.assert_awaited_once()
        args, kwargs = redis.set.call_args
        assert args[0] == f"tour:{tour_id}"
        assert json.loads(args[1]) == data
        assert kwargs.get("ex") == 300


class TestGetHotTours:
    async def test_miss_returns_none(self) -> None:
        redis = AsyncMock()
        redis.get.return_value = None
        assert await _make_cache(redis).get_hot_tours() is None

    async def test_hit_returns_list(self) -> None:
        data = [{"id": "abc", "name": "Горящий"}]
        redis = AsyncMock()
        redis.get.return_value = json.dumps(data).encode()
        result = await _make_cache(redis).get_hot_tours()
        assert result == data

    async def test_corrupt_json_evicts_and_returns_none(self) -> None:
        redis = AsyncMock()
        redis.get.return_value = b"{"
        result = await _make_cache(redis).get_hot_tours()
        assert result is None
        redis.delete.assert_awaited_once_with(_HOT_TOURS_KEY)


class TestSetHotTours:
    async def test_stores_serialized_json_with_ttl(self) -> None:
        redis = AsyncMock()
        data = [{"id": "abc"}, {"id": "def"}]
        await _make_cache(redis).set_hot_tours(data)
        redis.set.assert_awaited_once()
        args, kwargs = redis.set.call_args
        assert args[0] == _HOT_TOURS_KEY
        assert json.loads(args[1]) == data
        assert kwargs.get("ex") == 300


class TestInvalidateOnTourChange:
    async def test_deletes_tour_key_and_hot_tours_key(self) -> None:
        redis = AsyncMock()
        cache = _make_cache(redis)
        tour_id = uuid4()
        await cache.invalidate_on_tour_change(tour_id)
        deleted_keys = {call.args[0] for call in redis.delete.call_args_list}
        assert f"tour:{tour_id}" in deleted_keys
        assert _HOT_TOURS_KEY in deleted_keys

    async def test_both_keys_deleted_in_parallel(self) -> None:
        """Mutation guard: gather вызывает delete дважды, не один раз."""
        redis = AsyncMock()
        await _make_cache(redis).invalidate_on_tour_change(uuid4())
        assert redis.delete.await_count == 2
