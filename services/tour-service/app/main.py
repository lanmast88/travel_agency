import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.database import AsyncSessionFactory, check_db_connection
from app.dependencies import (
    check_redis_health,
    close_jwks_client,
    close_redis,
    init_jwks_client,
    init_redis,
)
from app.exception_handlers import register_exception_handlers
from app.logic import recommender
from app.logging_config import setup_logging
from app.routers import cities, hotels, reviews, tours

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("starting %s", settings.service_name)
    await init_redis()
    try:
        await init_jwks_client()
    except Exception:
        logger.warning("auth-service недоступен — JWT-верификация отключена до перезапуска")
    async with AsyncSessionFactory() as session:
        try:
            await recommender.build(session)
        except Exception:
            logger.exception("Ошибка построения матрицы рекомендаций — сервис запущен без рекомендаций")
    yield
    await close_jwks_client()
    await close_redis()
    logger.info("stopped %s", settings.service_name)


app = FastAPI(
    title="Tour Service",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production() else None,
    redoc_url="/redoc" if not settings.is_production() else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(cities.router, prefix="/api/v1")
app.include_router(hotels.router, prefix="/api/v1")
app.include_router(tours.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health/live", tags=["ops"])
async def liveness():
    """Liveness probe — приложение запущено и не завислo."""
    return {"status": "ok"}


@app.get("/health/ready", tags=["ops"])
async def readiness():
    """Readiness probe — зависимости доступны, pod готов принимать трафик."""
    db_ok = await check_db_connection()
    redis_ok = await check_redis_health()
    body = {
        "status": "ok" if (db_ok and redis_ok) else "unavailable",
        "db": "ok" if db_ok else "unavailable",
        "redis": "ok" if redis_ok else "unavailable",
    }
    return JSONResponse(content=body, status_code=200 if (db_ok and redis_ok) else 503)
