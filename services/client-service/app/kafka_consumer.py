import asyncio
import json
import logging
import uuid

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError
from pydantic import BaseModel, ValidationError

from app.cache import get_cache
from app.core.config import settings
from app.core.database import AsyncSessionFactory
from app.core.exceptions import NotFoundError
from app.repositories.client import ClientRepository
from app.services.client import ClientService

logger = logging.getLogger(__name__)

_consumer: AIOKafkaConsumer | None = None
_consumer_task: asyncio.Task | None = None


class SaleCreatedEvent(BaseModel):
    client_id: uuid.UUID


async def _process(data: dict) -> None:
    try:
        event = SaleCreatedEvent.model_validate(data)
    except ValidationError as exc:
        logger.warning("sale_created: некорректный формат сообщения: %s", exc)
        return

    async with AsyncSessionFactory() as session:
        try:
            service = ClientService(ClientRepository(session), get_cache())
            await service.handle_sale_created(event.client_id)
            await session.commit()
        except NotFoundError:
            # Клиент мог быть удалён до обработки события — пропускаем
            logger.warning("sale_created: клиент %s не найден, пропускаем", event.client_id)
        except Exception:
            await session.rollback()
            raise


async def _consume_loop() -> None:
    assert _consumer is not None
    try:
        async for message in _consumer:
            try:
                data = json.loads(message.value)
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                logger.warning(
                    "sale_created: не удалось десериализовать сообщение offset=%d: %s",
                    message.offset,
                    exc,
                )
                await _consumer.commit()
                continue

            try:
                await _process(data)
            except Exception as exc:
                # Коммитим offset даже при ошибке — повторная обработка дублирует
                # лояльность. Ядовитые сообщения требуют DLQ (вне текущего scope).
                logger.error(
                    "sale_created: ошибка обработки offset=%d: %s",
                    message.offset,
                    exc,
                    exc_info=True,
                )

            await _consumer.commit()
    except asyncio.CancelledError:
        pass
    except KafkaError as exc:
        logger.error("sale_created: критическая ошибка Kafka consumer: %s", exc, exc_info=True)


async def start_consumer() -> None:
    global _consumer, _consumer_task

    _consumer = AIOKafkaConsumer(
        settings.kafka_sale_created_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_consumer_group_id,
        auto_offset_reset=settings.kafka_consumer_auto_offset_reset,
        enable_auto_commit=False,
        session_timeout_ms=settings.kafka_consumer_session_timeout_ms,
        heartbeat_interval_ms=settings.kafka_consumer_heartbeat_interval_ms,
        max_poll_interval_ms=settings.kafka_consumer_max_poll_interval_ms,
    )

    await _consumer.start()
    _consumer_task = asyncio.create_task(_consume_loop())
    logger.info("Kafka consumer запущен, топик: %s", settings.kafka_sale_created_topic)


async def stop_consumer() -> None:
    global _consumer, _consumer_task

    if _consumer_task is not None:
        _consumer_task.cancel()
        await asyncio.gather(_consumer_task, return_exceptions=True)
        _consumer_task = None

    if _consumer is not None:
        await _consumer.stop()
        _consumer = None

    logger.info("Kafka consumer остановлен")
