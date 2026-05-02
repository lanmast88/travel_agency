"""
Тесты AuthService — бизнес-логика и инварианты безопасности.

Принцип: тестируем контракт и наблюдаемое поведение, не детали реализации.
Тест должен проходить при любой замене алгоритма хэширования, ORM или Redis-клиента,
если контракт сохранился.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.enums import UserRole
from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    InvalidTokenError,
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


class TestRegister:
    @pytest.mark.asyncio
    async def test_success_returns_token_pair(self, service, mock_repo) -> None:
        mock_repo.create.return_value = make_user()
        result = await service.register(_reg())
        assert isinstance(result, TokenResponse)
        assert result.access_token and result.refresh_token

    @pytest.mark.asyncio
    async def test_duplicate_email_raises_and_does_not_create(self, service, mock_repo) -> None:
        mock_repo.exists_by_email.return_value = True
        with pytest.raises(UserAlreadyExistsError):
            await service.register(_reg())
        mock_repo.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_password_is_not_stored_in_plaintext(self, service, mock_repo) -> None:
        """Пароль в БД должен быть верифицируемым хэшем, но не открытым текстом."""
        plaintext = "Secret123!"
        mock_repo.create.return_value = make_user()
        await service.register(_reg(password=plaintext, password_confirm=plaintext))

        saved_hash = mock_repo.create.call_args.kwargs["hashed_password"]
        assert saved_hash != plaintext
        assert verify_password(plaintext, saved_hash)


class TestLogin:
    @pytest.mark.asyncio
    async def test_unknown_email_raises_invalid_credentials(self, service, mock_repo) -> None:
        """Несуществующий email неотличим от неверного пароля — не раскрываем перечисление."""
        mock_repo.get_by_email.return_value = None
        with pytest.raises(InvalidCredentialsError):
            await service.login("ghost@example.com", "any")

    @pytest.mark.asyncio
    async def test_locked_account_checked_before_active_status(self, service, mock_repo) -> None:
        """Заблокированный + деактивированный → AccountLockedError, а не UserNotActiveError.
        Порядок проверок важен: блокировка приоритетнее деактивации."""
        future = datetime.now(timezone.utc) + timedelta(minutes=10)
        mock_repo.get_by_email.return_value = make_user(is_active=False, locked_until=future)
        with pytest.raises(AccountLockedError):
            await service.login("user@example.com", "any")

    @pytest.mark.asyncio
    async def test_inactive_user_does_not_accumulate_failed_attempts(self, service, mock_repo) -> None:
        """Деактивированный пользователь отклоняется до проверки пароля."""
        user = make_user(is_active=False, failed_login_attempts=0)
        mock_repo.get_by_email.return_value = user
        with pytest.raises(UserNotActiveError):
            await service.login(user.email, "wrong")
        assert user.failed_login_attempts == 0

    @pytest.mark.asyncio
    async def test_wrong_password_increments_failed_attempts(self, service, mock_repo) -> None:
        user = make_user(hashed_password=hash_password("CorrectPass1!"))
        mock_repo.get_by_email.return_value = user
        before = user.failed_login_attempts
        with pytest.raises(InvalidCredentialsError):
            await service.login(user.email, "WrongPass1!")
        assert user.failed_login_attempts == before + 1

    @pytest.mark.asyncio
    async def test_correct_password_resets_attempts(self, service, mock_repo) -> None:
        user = make_user(hashed_password=hash_password("CorrectPass1!"), failed_login_attempts=3)
        mock_repo.get_by_email.return_value = user
        result = await service.login(user.email, "CorrectPass1!")
        assert isinstance(result, TokenResponse)
        assert user.failed_login_attempts == 0

    @pytest.mark.asyncio
    async def test_wrong_password_error_indistinguishable_from_unknown_email(
        self, service, mock_repo
    ) -> None:
        """Оба случая должны возвращать одно и то же исключение — без подсказок атакующему."""
        user = make_user(hashed_password=hash_password("CorrectPass1!"))
        mock_repo.get_by_email.return_value = user
        with pytest.raises(InvalidCredentialsError):
            await service.login(user.email, "WrongPass1!")


class TestRefresh:
    @pytest.mark.asyncio
    async def test_success_returns_new_token_pair(self, service, mock_repo) -> None:
        from app.logic.jwt import create_token_pair
        user = make_user()
        tokens = create_token_pair(user.id, UserRole.user)
        mock_repo.get_by_id.return_value = user

        result = await service.refresh(tokens.refresh_token)
        assert isinstance(result, TokenResponse)
        assert result.access_token != tokens.access_token
        assert result.refresh_token != tokens.refresh_token

    @pytest.mark.asyncio
    async def test_revoked_token_cannot_be_refreshed(self, service, mock_redis) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(uuid4(), UserRole.user)
        mock_redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await service.refresh(tokens.refresh_token)


class TestLogout:
    @pytest.mark.asyncio
    async def test_after_logout_same_token_raises_revoked(self, service, mock_repo, mock_redis) -> None:
        """После logout токен должен быть отозван — повторное использование невозможно."""
        from app.logic.jwt import create_token_pair
        user = make_user()
        tokens = create_token_pair(user.id, UserRole.user)

        await service.logout(tokens.refresh_token)

        mock_redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await service.refresh(tokens.refresh_token)


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
    async def test_new_password_verifiable_old_password_rejected(self, service, mock_repo) -> None:
        """После смены пароля: новый проходит верификацию, старый — нет."""
        old_pass, new_pass = "CorrectOld1!", "NewPass2@"
        user = make_user(hashed_password=hash_password(old_pass))
        mock_repo.update.return_value = user

        await service.change_password(user, PasswordChange(
            current_password=old_pass,
            new_password=new_pass,
            new_password_confirm=new_pass,
        ))

        saved_hash = mock_repo.update.call_args.args[1]["hashed_password"]
        assert verify_password(new_pass, saved_hash)
        assert not verify_password(old_pass, saved_hash)


class TestSecurityInvariants:
    @pytest.mark.asyncio
    async def test_access_token_cannot_be_used_for_logout(self, service) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(uuid4(), UserRole.user)
        with pytest.raises(InvalidTokenError):
            await service.logout(tokens.access_token)

    @pytest.mark.asyncio
    async def test_access_token_cannot_be_used_for_refresh(self, service) -> None:
        from app.logic.jwt import create_token_pair
        tokens = create_token_pair(uuid4(), UserRole.user)
        with pytest.raises(InvalidTokenError):
            await service.refresh(tokens.access_token)

    @pytest.mark.asyncio
    async def test_refresh_token_after_rotation_is_rejected(
        self, service, mock_repo, mock_redis
    ) -> None:
        """После ротации старый refresh-токен должен быть в blacklist."""
        from app.logic.jwt import create_token_pair
        user = make_user()
        tokens = create_token_pair(user.id, UserRole.user)
        mock_repo.get_by_id.return_value = user

        await service.refresh(tokens.refresh_token)

        mock_redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await service.refresh(tokens.refresh_token)
