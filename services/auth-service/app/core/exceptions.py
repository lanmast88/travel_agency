class AuthError(Exception):
    """Базовый класс для доменных ошибок аутентификации."""


class InvalidTokenError(AuthError):
    """Токен невалиден, истёк или имеет неожиданный тип."""


class TokenRevokedError(AuthError):
    """Токен был отозван (logout)."""
