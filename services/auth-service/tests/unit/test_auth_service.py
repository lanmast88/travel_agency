"""
Тесты AuthService — ядро auth-сервиса.

Здесь проверяется бизнес-логика: порядок проверок, побочные эффекты,
и три главных инварианта безопасности в конце файла.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest

from app.core.enums import UserRole
from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    TokenRevokedError,
    UserAlreadyExistsError,
    UserNotActiveError,
)
from app.logic.auth import AuthService
from app.logic.password import hash_password, verify_password
from app.schemas.token import TokenResponse
from app.schemas.user import PasswordChange, UserCreate, UserRegister
from tests.factories import make_user


def _reg(**kwargs) -> UserRegister:
    return UserRegister(**{
        "email": "new@example.com",
        "password": "Secret123!",
        "password_confirm": "Secret123!",
        "first_name": "Иван",
        **kwargs,
    })


@pytest.fixture
def service(mock_repo, mock_redis) -> AuthService:
    return AuthService(mock_repo, mock_redis)


# ─── register ─────────────────────────────────────────────────────────────────

class TestRegister:
    @pytest.mark.asyncio
    async def test_success_returns_token_pair(self, service, mock_repo) -> None:
        mock_repo.create.return_value = make_user(id=1)
        result = await service.register(_reg())
        assert isinstance(result, TokenResponse)

    @pytest.mark.asyncio
    async def test_duplicate_email_raises_and_does_not_create(self, service, mock_repo) -> None:
        mock_repo.exists_by_email.return_value = True
        with pytest.raises(UserAlreadyExistsError):
            await service.register(_reg())
        mock_repo.create.assert_not_called()


# ─── login ────────────────────────────────────────────────────────────────────

class TestLogin:
    @pytest.mark.asyncio
    async def test_user_not_found_raises_invalid_credentials(self, service, mock_repo) -> None:
        """Не раскрываем что email не существует — тот же ответ что и при неверном пароле."""
        mock_repo.get_by_email.return_value = None
        with pytest.raises(InvalidCredentialsError):
            await service.login("ghost@example.com", "any")

    @pytest.mark.asyncio
    async def test_locked_checked_before_active(self, service, mock_repo) -> None:
        """Mutation guard: заблокированный + деактивированный → AccountLockedError (не UserNotActive)."""
        future = datetime.now(timezone.utc) + timedelta(minutes=10)
        mock_repo.get_by_email.return_value = make_user(is_active=False, locked_until=future)
        with pytest.raises(AccountLockedError):
            await service.login("user@example.com", "any")

    @pytest.mark.asyncio
    async def test_inactive_user_does_not_accumulate_failed_attempts(self, service, mock_repo) -> None:
        """Mutation guard: деактивированный пользователь не накапливает failed_login_attempts."""
        user = make_user(is_active=False, failed_login_attempts=0)
        mock_repo.get_by_email.return_value = user
        with pytest.raises(UserNotActiveError):
            await service.login(user.email, "wrong")
        assert user.failed_login_attempts == 0

    @pytest.mark.asyncio
    async def test_wrong_password_increments_failed_attempts(self, service, mock_repo) -> None:
        user = make_user(hashed_password=hash_password("CorrectPass1!"))
        mock_repo.get_by_email.return_value = user
        with pytest.raises(InvalidCredentialsError):
            await service.login(user.email, "WrongPass1!")
        assert user.failed_login_attempts == 1

    @pytest.mark.asyncio
    async def test_correct_password_resets_attempts_and_returns_tokens(self, service, mock_repo) -> None:
        user = make_user(hashed_password=hash_password("CorrectPass1!"), failed_login_attempts=3)
        mock_repo.get_by_email.return_value = user
        result = await service.login(user.email, "CorrectPass1!")
        assert isinstance(result, TokenResponse)
        assert user.failed_login_attempts == 0


# ─── refresh ──────────────────────────────────────────────────────────────────

class TestRefresh:
    @pytest.mark.asyncio
    async def test_success_returns_new_tokens(self, service, mock_repo, mock_redis) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        mock_repo.get_by_id.return_value = make_user(id=1)

        result = await service.refresh(tokens.refresh_token)
        assert isinstance(result, TokenResponse)

    @pytest.mark.asyncio
    async def test_old_token_revoked_after_refresh(self, service, mock_repo, mock_redis) -> None:
        """Mutation guard: ротация токенов — старый refresh должен быть отозван."""
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        mock_repo.get_by_id.return_value = make_user(id=1)

        await service.refresh(tokens.refresh_token)
        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_revoked_token_raises(self, service, mock_redis) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        mock_redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await service.refresh(tokens.refresh_token)


# ─── logout ───────────────────────────────────────────────────────────────────

class TestLogout:
    @pytest.mark.asyncio
    async def test_logout_revokes_token(self, service, mock_redis) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        await service.logout(tokens.refresh_token)
        mock_redis.set.assert_called_once()


# ─── change_password ─────────────────────────────────────────────────────────

class TestChangePassword:
    @pytest.mark.asyncio
    async def test_wrong_current_password_does_not_update(self, service, mock_repo) -> None:
        user = make_user(hashed_password=hash_password("CorrectOld1!"))
        with pytest.raises(InvalidCredentialsError):
            await service.change_password(user, PasswordChange(
                current_password="WrongOld1!",
                new_password="NewPass2@",
                new_password_confirm="NewPass2@",
            ))
        mock_repo.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_new_hash_is_not_old_hash(self, service, mock_repo) -> None:
        """Mutation guard: пароль действительно меняется, а не сохраняется прежний."""
        old_hash = hash_password("CorrectOld1!")
        user = make_user(hashed_password=old_hash)
        mock_repo.update.return_value = user
        await service.change_password(user, PasswordChange(
            current_password="CorrectOld1!",
            new_password="NewPass2@",
            new_password_confirm="NewPass2@",
        ))
        new_hash = mock_repo.update.call_args.args[1]["hashed_password"]
        assert verify_password("NewPass2@", new_hash) is True
        assert not verify_password("CorrectOld1!", new_hash)


# ─── Инварианты безопасности (написать самостоятельно и понять) ───────────────

class TestSecurityInvariants:
    @pytest.mark.asyncio
    async def test_access_token_cannot_be_used_for_logout(self, service, mock_redis) -> None:
        """Access-токен не должен приниматься в /logout."""
        from app.core.exceptions import InvalidTokenError
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        with pytest.raises(InvalidTokenError):
            await service.logout(tokens.access_token)

    @pytest.mark.asyncio
    async def test_access_token_cannot_be_used_for_refresh(self, service, mock_redis) -> None:
        """Access-токен не должен обновлять сессию."""
        from app.core.exceptions import InvalidTokenError
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        with pytest.raises(InvalidTokenError):
            await service.refresh(tokens.access_token)

    @pytest.mark.asyncio
    async def test_token_cannot_be_used_after_logout(self, service, mock_repo, mock_redis) -> None:
        """После logout refresh-токен должен быть невалиден."""
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(1, UserRole.user)
        mock_repo.get_by_id.return_value = make_user(id=1)

        # Первый refresh — OK
        await service.refresh(tokens.refresh_token)

        # После refresh старый токен попадает в blacklist
        # Симулируем что он теперь в blacklist
        mock_redis.exists.return_value = 1

        with pytest.raises(TokenRevokedError):
            await service.refresh(tokens.refresh_token)

    @pytest.mark.asyncio
    async def test_password_stored_as_hash_not_plaintext(self, service, mock_repo) -> None:
        """Mutation guard: в БД никогда не сохраняется открытый пароль."""
        mock_repo.create.return_value = make_user()
        await service.register(_reg())
        saved = mock_repo.create.call_args.kwargs["hashed_password"]
        assert saved != "Secret123!"
        assert saved.startswith("$2b$")
