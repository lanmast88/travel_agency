import json
import logging
import uuid
from datetime import date
from decimal import Decimal

from aiokafka import AIOKafkaProducer

from app.core.config import settings
from app.core.exceptions import KafkaProducerUnavailableError

logger = logging.getLogger(__name__)

_producer: AIOKafkaProducer | None = None


async def init_producer() -> None:
    global _producer
    _producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        acks=settings.kafka_producer_acks,
        value_serializer=lambda v: json.dumps(v).encode(),
    )
    await _producer.start()
    logger.info("Kafka producer запущен, топик: %s", settings.kafka_sale_created_topic)


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
        logger.info("Kafka producer остановлен")


def is_producer_running() -> bool:
    return _producer is not None


async def publish_sale_created(
    *,
    sale_id: uuid.UUID,
    client_id: uuid.UUID,
    employee_id: uuid.UUID,
    tour_id: uuid.UUID,
    final_price: Decimal,
    sale_date: date,
) -> None:
    """Публикует событие sale_created в Kafka.

    client-service потребляет это событие для инкремента sales_count
    и пересчёта loyalty_level клиента.
    """
    if _producer is None:
        raise KafkaProducerUnavailableError()

    payload = {
        "sale_id": str(sale_id),
        "client_id": str(client_id),
        "employee_id": str(employee_id),
        "tour_id": str(tour_id),
        "final_price": str(final_price),
        "sale_date": sale_date.isoformat(),
    }

    await _producer.send_and_wait(settings.kafka_sale_created_topic, payload)
    logger.info(
        "sale_created опубликован",
        extra={"sale_id": str(sale_id), "employee_id": str(employee_id)},
    )
