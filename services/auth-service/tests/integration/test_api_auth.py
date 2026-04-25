"""
Интеграционные тесты /auth — проверяем HTTP-слой: коды, заголовки, структуру ответа.
Бизнес-логику не дублируем — она покрыта в test_auth_service.py.
"""
import pytest

from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    RateLimitExceededError,
    TokenRevokedError,
    UserAlreadyExistsError,
)

_REGISTER = {
    "email": "new@example.com",
    "password": "Secret123!",
    "password_confirm": "Secret123!",
    "first_name": "Иван",
}


class TestRegister:
    @pytest.mark.asyncio
    async def test_success_returns_201_with_tokens(self, anon_client, mock_auth_service) -> None:
        from app.core.enums import UserRole
        from app.logic.jwt import create_token_pair
        mock_auth_service.register.return_value = create_token_pair(1, UserRole.user)

        resp = await anon_client.post("/api/v1/auth/register", json=_REGISTER)

        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body and "refresh_token" in body
        assert body["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_duplicate_email_returns_409(self, anon_client, mock_auth_service) -> None:
        mock_auth_service.register.side_effect = UserAlreadyExistsError("занят")
        resp = await anon_client.post("/api/v1/auth/register", json=_REGISTER)
        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_invalid_schema_returns_422(self, anon_client) -> None:
        resp = await anon_client.post("/api/v1/auth/register", json={
            **_REGISTER, "password_confirm": "Mismatch1!",
        })
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_rate_limit_returns_429_with_retry_after(self, anon_client, mock_auth_service) -> None:
        mock_auth_service.register.side_effect = RateLimitExceededError("лимит", retry_after=300)
        resp = await anon_client.post("/api/v1/auth/register", json=_REGISTER)
        assert resp.status_code == 429
        assert resp.headers.get("Retry-After") == "300"


class TestLogin:
    @pytest.mark.asyncio
    async def test_success_returns_200_with_tokens(self, anon_client, mock_auth_service) -> None:
        from app.core.enums import UserRole
        from app.logic.jwt import create_token_pair
        mock_auth_service.login.return_value = create_token_pair(1, UserRole.user)
        resp = await anon_client.post("/api/v1/auth/login", data={
            "username": "user@example.com", "password": "Secret1!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    @pytest.mark.asyncio
    async def test_wrong_credentials_returns_401_with_www_authenticate(
        self, anon_client, mock_auth_service
    ) -> None:
        mock_auth_service.login.side_effect = InvalidCredentialsError("неверный")
        resp = await anon_client.post("/api/v1/auth/login", data={
            "username": "x@x.com", "password": "wrong",
        })
        assert resp.status_code == 401
        assert resp.headers.get("WWW-Authenticate") == "Bearer"

    @pytest.mark.asyncio
    async def test_locked_account_returns_429(self, anon_client, mock_auth_service) -> None:
        mock_auth_service.login.side_effect = AccountLockedError("заблокирован")
        resp = await anon_client.post("/api/v1/auth/login", data={
            "username": "x@x.com", "password": "any",
        })
        assert resp.status_code == 429

    @pytest.mark.asyncio
    async def test_json_body_not_accepted(self, anon_client) -> None:
        """OAuth2PasswordRequestForm требует form-data — JSON возвращает 422."""
        resp = await anon_client.post("/api/v1/auth/login", json={
            "username": "x@x.com", "password": "pass",
        })
        assert resp.status_code == 422


class TestRefreshAndLogout:
    @pytest.mark.asyncio
    async def test_revoked_token_returns_401_with_www_authenticate(
        self, anon_client, mock_auth_service
    ) -> None:
        mock_auth_service.refresh.side_effect = TokenRevokedError("отозван")
        resp = await anon_client.post("/api/v1/auth/refresh", json={"refresh_token": "tok"})
        assert resp.status_code == 401
        assert resp.headers.get("WWW-Authenticate") == "Bearer"

    @pytest.mark.asyncio
    async def test_logout_success_returns_204_empty_body(self, anon_client, mock_auth_service) -> None:
        mock_auth_service.logout.return_value = None
        resp = await anon_client.post("/api/v1/auth/logout", json={"refresh_token": "tok"})
        assert resp.status_code == 204
        assert resp.content == b""
