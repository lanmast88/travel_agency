from typing import Any


class TourServiceError(Exception):
    """Базовый класс доменных ошибок tour-service."""


class InvalidTokenError(TourServiceError):
    """Токен невалиден, истёк или содержит неизвестный kid."""


class JwksUnavailableError(TourServiceError):
    """JWKS endpoint недоступен и кеш пуст — верификация невозможна."""


class NotFoundError(TourServiceError):
    def __init__(self, entity: str, identifier: Any) -> None:
        self.detail = f"{entity} {identifier!r} не найден"
        super().__init__(self.detail)


class ConflictError(TourServiceError):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(TourServiceError):
    def __init__(self, detail: str = "недостаточно прав") -> None:
        self.detail = detail
        super().__init__(detail)
