import logging
import logging.config

from app.core.config import settings


def setup_logging() -> None:
    log_level = logging.DEBUG if settings.debug else logging.INFO
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
                "static_fields": {"service": settings.service_name},
            },
            "plain": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
            },
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                # JSON в production/staging — ELK парсит stdout контейнера.
                # Plain text в development — читаемо при локальной разработке.
                "formatter": "plain" if settings.is_development() else "json",
            },
        },
        "loggers": {
            # SQLAlchemy: только WARNING чтобы не засорять логи SQL-запросами.
            # db_echo=True в Settings достаточно для отладки запросов локально.
            "sqlalchemy.engine": {"level": "WARNING"},
            "sqlalchemy.pool": {"level": "WARNING"},
            # uvicorn пишет access log отдельно — нам нужны только ошибки сервера
            "uvicorn.error": {"level": "WARNING"},
            "uvicorn.access": {"level": "WARNING"},
        },
        "root": {
            "level": log_level,
            "handlers": ["stdout"],
        },
    })
