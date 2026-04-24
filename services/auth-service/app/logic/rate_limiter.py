from redis.asyncio import Redis

from app.core.exceptions import RateLimitExceededError

# Константы эндпоинтов — защита от опечаток при вызове rate_limit()
ENDPOINT_LOGIN = "login"
ENDPOINT_REGISTER = "register"

# Lua-скрипт для атомарного INCR + условного EXPIRE.
# Без атомарности между INCR и EXPIRE возможна race condition:
# ключ существует без TTL и живёт вечно, блокируя IP навсегда
_INCR_WITH_EXPIRE = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
"""


async def check_rate_limit(
    key: str,
    max_attempts: int,
    window_seconds: int,
    redis: Redis,
) -> None:
    count = await redis.eval(_INCR_WITH_EXPIRE, 1, key, window_seconds)
    if count > max_attempts:
        raise RateLimitExceededError(
            f"слишком много запросов, попробуйте через {window_seconds} секунд",
            retry_after=window_seconds,
        )
