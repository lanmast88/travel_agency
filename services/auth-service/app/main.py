import logging
from contextlib import asynccontextmanager
from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import dependencies
from app.core.config import settings
from app.core.database import check_db_connection, engine
from app.routers import exception_handlers
from app.routers import router

logger = logging.getLogger(__name__)

try:
    _APP_VERSION = version("auth-service")
except PackageNotFoundError:
    _APP_VERSION = "dev"

_CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
_CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Accept"]


@asynccontextmanager
async def _lifespan(app: FastAPI):
    logger.info("Запуск auth-service v%s", _APP_VERSION)

    try:
        await dependencies.init_redis()
        logger.info("Redis подключён")
    except Exception as exc:
        # Без Redis blacklist сервис небезопасен — не стартуем
        logger.critical("Не удалось подключиться к Redis: %s", exc)
        raise

    yield

    await dependencies.close_redis()
    # Корректно закрываем пул соединений PostgreSQL при остановке
    await engine.dispose()
    logger.info("auth-service остановлен")


def _create_app() -> FastAPI:
    _docs = (
        {}
        if settings.is_production()
        # Swagger и ReDoc отключены в production — не раскрываем схему внешним клиентам
        else {"docs_url": "/docs", "redoc_url": "/redoc", "openapi_url": "/openapi.json"}
    )

    app = FastAPI(
        title=settings.service_name,
        version=_APP_VERSION,
        lifespan=_lifespan,
        **_docs,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=_CORS_ALLOW_METHODS,
        allow_headers=_CORS_ALLOW_HEADERS,
    )

    # Регистрация до include_router — обработчики должны быть готовы до первого запроса
    exception_handlers.register(app)
    app.include_router(router, prefix="/api/v1")

    return app


app = _create_app()


@app.get("/health/live", include_in_schema=False)
async def liveness() -> JSONResponse:
    """Liveness probe: процесс жив и event loop работает."""
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})


@app.get("/health/ready", include_in_schema=False)
async def readiness() -> JSONResponse:
    """Readiness probe: сервис готов принимать трафик."""
    db_ok = await check_db_connection()
    redis_ok = await dependencies.check_redis_health()
    all_ok = db_ok and redis_ok

    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ok" if all_ok else "degraded",
            "services": {
                "database": "ok" if db_ok else "unavailable",
                "redis": "ok" if redis_ok else "unavailable",
            },
        },
    )
