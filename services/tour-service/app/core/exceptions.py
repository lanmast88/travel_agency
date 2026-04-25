class TourServiceError(Exception):
    """Базовый класс доменных ошибок tour-service."""


class InvalidTokenError(TourServiceError):
    """Токен невалиден, истёк или содержит неизвестный kid."""


class JwksUnavailableError(TourServiceError):
    """JWKS endpoint недоступен и кеш пуст — верификация невозможна."""
