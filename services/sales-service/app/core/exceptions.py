from typing import Any


class SalesServiceError(Exception):
    """Базовый класс доменных ошибок sales-service."""


class InvalidTokenError(SalesServiceError):
    """Токен невалиден, истёк или содержит неизвестный kid."""


class JwksUnavailableError(SalesServiceError):
    """JWKS endpoint недоступен и кэш пуст — верификация невозможна."""


class NotFoundError(SalesServiceError):
    def __init__(self, entity: str, identifier: Any) -> None:
        self.detail = f"{entity} {identifier!r} не найден"
        super().__init__(self.detail)


class ConflictError(SalesServiceError):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(SalesServiceError):
    def __init__(self, detail: str = "недостаточно прав") -> None:
        self.detail = detail
        super().__init__(detail)


class ClientServiceUnavailableError(SalesServiceError):
    """client-service недоступен при получении данных клиента (loyalty, exists)."""

    def __init__(self, detail: str = "client-service недоступен") -> None:
        self.detail = detail
        super().__init__(detail)


class SaleCancelledError(SalesServiceError):
    """Попытка изменить уже отменённую продажу."""

    def __init__(self) -> None:
        self.detail = "продажа уже отменена"
        super().__init__(self.detail)


class KafkaProducerUnavailableError(SalesServiceError):
    """Kafka producer не инициализирован или недоступен."""

    def __init__(self) -> None:
        self.detail = "очередь сообщений недоступна, попробуйте позже"
        super().__init__(self.detail)
