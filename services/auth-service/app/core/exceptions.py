class AuthError(Exception):
    """Базовый класс для доменных ошибок аутентификации."""


class InvalidTokenError(AuthError):
    """Токен невалиден, истёк или имеет неожиданный тип."""


class TokenRevokedError(AuthError):
    """Токен был отозван (logout)."""


class UserAlreadyExistsError(AuthError):
    """Пользователь с таким email уже зарегистрирован."""


class InvalidCredentialsError(AuthError):
    """Неверный email или пароль."""


class UserNotActiveError(AuthError):
    """Аккаунт деактивирован."""


class AccountLockedError(AuthError):
    """Аккаунт временно заблокирован из-за превышения попыток входа."""
