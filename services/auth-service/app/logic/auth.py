from redis.asyncio import Redis

from app.core.config import settings
from app.core.enums import TokenType
from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotActiveError,
)
from app.logic import jwt as jwt_logic
from app.logic.password import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.token import TokenResponse
from app.schemas.user import PasswordChange, UserRegister


class AuthService:
    def __init__(self, repo: UserRepository, redis: Redis) -> None:
        self._repo = repo
        self._redis = redis

    async def register(self, data: UserRegister) -> TokenResponse:
        if await self._repo.exists_by_email(data.email):
            raise UserAlreadyExistsError(f"email {data.email!r} уже зарегистрирован")

        user = await self._repo.create(
            email=data.email,
            hashed_password=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
        )

        return jwt_logic.create_token_pair(user.id, user.role)

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self._repo.get_by_email(email)

        if user is None:
            # Не раскрываем существование email — тот же ответ что и при неверном пароле
            raise InvalidCredentialsError("неверный email или пароль")

        if user.is_locked:
            raise AccountLockedError("аккаунт временно заблокирован, попробуйте позже")

        if not user.is_active:
            raise UserNotActiveError("аккаунт деактивирован")

        if not verify_password(password, user.hashed_password):
            user.record_failed_attempt(
                max_attempts=settings.rate_limit_login_attempts,
                lock_minutes=settings.rate_limit_window_seconds // 60,
            )
            await self._repo.flush()
            raise InvalidCredentialsError("неверный email или пароль")

        user.reset_login_attempts()
        await self._repo.flush()

        return jwt_logic.create_token_pair(user.id, user.role)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = jwt_logic.decode_token(refresh_token, TokenType.refresh)
        await jwt_logic.verify_not_revoked(payload.jti, self._redis)

        user = await self._repo.get_by_id(payload.user_id)
        if user is None or not user.is_active:
            raise UserNotActiveError("пользователь не найден или деактивирован")

        # Ротация: отзываем старый refresh до выдачи нового —
        # перехваченный старый токен станет невалидным сразу
        await jwt_logic.revoke_refresh_token(payload.jti, payload.exp, self._redis)

        return jwt_logic.create_token_pair(user.id, user.role)

    async def logout(self, refresh_token: str) -> None:
        payload = jwt_logic.decode_token(refresh_token, TokenType.refresh)
        await jwt_logic.revoke_refresh_token(payload.jti, payload.exp, self._redis)

    async def change_password(self, user: User, data: PasswordChange) -> None:
        if not verify_password(data.current_password, user.hashed_password):
            raise InvalidCredentialsError("неверный текущий пароль")

        await self._repo.update(user, {"hashed_password": hash_password(data.new_password)})
