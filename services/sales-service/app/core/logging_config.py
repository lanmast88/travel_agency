import logging
import logging.config
from contextvars import ContextVar

from pythonjsonlogger import jsonlogger

from app.core.config import settings

_trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")


def set_trace_id(trace_id: str) -> None:
    _trace_id_var.set(trace_id)


class _TraceIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = _trace_id_var.get()  # type: ignore[attr-defined]
        return True


class _JsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(
        self,
        log_record: dict,
        record: logging.LogRecord,
        message_dict: dict,
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["timestamp"] = log_record.pop("asctime", None)
        log_record["level"] = log_record.pop("levelname", record.levelname)
        log_record["logger"] = log_record.pop("name", record.name)
        log_record.setdefault("service", settings.service_name)


def setup_logging() -> None:
    log_level = logging.DEBUG if settings.debug else logging.INFO
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "trace_id": {"()": _TraceIDFilter},
        },
        "formatters": {
            "json": {
                "()": _JsonFormatter,
                "fmt": "%(asctime)s %(levelname)s %(name)s %(trace_id)s %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
            },
            "plain": {
                "format": "%(asctime)s [%(levelname)s] %(name)s [%(trace_id)s]: %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
            },
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "plain" if settings.is_development() else "json",
                "filters": ["trace_id"],
            },
        },
        "loggers": {
            "sqlalchemy.engine": {"level": "WARNING"},
            "sqlalchemy.pool": {"level": "WARNING"},
            "uvicorn.error": {"level": "WARNING"},
            "uvicorn.access": {"level": "WARNING"},
        },
        "root": {
            "level": log_level,
            "handlers": ["stdout"],
        },
    })
