from typing import Any


class ClientServiceError(Exception):
    """Базовый класс доменных ошибок client-service."""


class InvalidTokenError(ClientServiceError):
    """Токен невалиден, истёк или содержит неизвестный kid."""


class JwksUnavailableError(ClientServiceError):
    """JWKS endpoint недоступен и кеш пуст — верификация невозможна."""


class NotFoundError(ClientServiceError):
    def __init__(self, entity: str, identifier: Any) -> None:
        self.detail = f"{entity} {identifier!r} не найден"
        super().__init__(self.detail)


class ConflictError(ClientServiceError):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(ClientServiceError):
    def __init__(self, detail: str = "недостаточно прав") -> None:
        self.detail = detail
        super().__init__(detail)
