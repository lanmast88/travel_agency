import logging
from contextlib import asynccontextmanager
from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_db_connection, engine
from app.core.exceptions import (
    ClientServiceUnavailableError,
    ConflictError,
    ForbiddenError,
    KafkaProducerUnavailableError,
    NotFoundError,
    SaleCancelledError,
)
from app.core.logging_config import setup_logging
from app.core.middleware import TraceIDMiddleware
from app.kafka_producer import close_producer, init_producer, is_producer_running
from app.routers.sales import router as sales_router

setup_logging()

logger = logging.getLogger(__name__)

try:
    _APP_VERSION = version("sales-service")
except PackageNotFoundError:
    _APP_VERSION = "dev"

_CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
_CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Accept"]


@asynccontextmanager
async def _lifespan(app: FastAPI):
    logger.info("Запуск sales-service v%s", _APP_VERSION)

    try:
        await init_producer()
    except Exception as exc:
        logger.critical("Не удалось запустить Kafka producer: %s", exc)
        raise

    yield

    await close_producer()
    await engine.dispose()
    logger.info("sales-service остановлен")


def _create_app() -> FastAPI:
    _docs = (
        {}
        if settings.is_production()
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
    app.add_middleware(TraceIDMiddleware)

    _register_exception_handlers(app)
    app.include_router(sales_router, prefix="/api/v1")

    return app


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(r: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(r: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(r: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": exc.detail},
        )

    @app.exception_handler(SaleCancelledError)
    async def sale_cancelled_handler(r: Request, exc: SaleCancelledError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ClientServiceUnavailableError)
    async def client_service_unavailable_handler(
        r: Request, exc: ClientServiceUnavailableError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": exc.detail},
        )

    @app.exception_handler(KafkaProducerUnavailableError)
    async def kafka_unavailable_handler(
        r: Request, exc: KafkaProducerUnavailableError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": exc.detail},
        )


app = _create_app()


@app.get("/health/live", include_in_schema=False)
async def liveness() -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})


@app.get("/health/ready", include_in_schema=False)
async def readiness() -> JSONResponse:
    db_ok = await check_db_connection()
    kafka_ok = is_producer_running()
    all_ok = db_ok and kafka_ok

    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ok" if all_ok else "degraded",
            "services": {
                "database": "ok" if db_ok else "unavailable",
                "kafka_producer": "ok" if kafka_ok else "unavailable",
            },
        },
    )
