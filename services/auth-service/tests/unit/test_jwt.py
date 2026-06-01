"""
Тесты JWT — контракты безопасности токенов.

Тестируем поведение: что принимается, что отклоняется, идемпотентность отзыва.
Внутренние детали (алгоритм подписи, Redis-команды) не проверяем напрямую.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.core.enums import TokenType, UserRole
from app.core.exceptions import InvalidTokenError, TokenRevokedError
from app.logic.jwt import create_token_pair, decode_token, revoke_refresh_token, verify_not_revoked


def _future_exp() -> int:
    return int(datetime.now(timezone.utc).timestamp()) + 3600


def _past_exp() -> int:
    # Достаточно далеко в прошлом, чтобы past + любой TTL < реального now
    return int(datetime.now(timezone.utc).timestamp()) - 90000  # -25 часов


class TestTokenTypeSeparation:
    def test_access_token_rejected_as_refresh(self) -> None:
        tokens = create_token_pair(uuid4(), UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.access_token, TokenType.refresh)

    def test_refresh_token_rejected_as_access(self) -> None:
        tokens = create_token_pair(uuid4(), UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.refresh_token, TokenType.access)

    def test_expired_token_rejected(self) -> None:
        with patch("app.logic.jwt._now", return_value=_past_exp()):
            tokens = create_token_pair(uuid4(), UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.access_token, TokenType.access)

    def test_tampered_signature_rejected(self) -> None:
        tokens = create_token_pair(uuid4(), UserRole.user)
        header, payload, _ = tokens.access_token.split(".")
        with pytest.raises(InvalidTokenError):
            decode_token(f"{header}.{payload}.invalidsignature", TokenType.access)

    def test_payload_preserved_across_encode_decode(self) -> None:
        """Данные из payload доступны после декодирования без потерь."""
        user_id = uuid4()
        role = UserRole.employee
        tokens = create_token_pair(user_id, role)
        payload = decode_token(tokens.access_token, TokenType.access)
        assert payload.user_id == user_id
        assert payload.role == role


class TestTokenRevocation:
    @pytest.mark.asyncio
    async def test_not_revoked_token_passes_verification(self) -> None:
        redis = AsyncMock()
        redis.exists.return_value = 0
        await verify_not_revoked("some-jti", redis)

    @pytest.mark.asyncio
    async def test_revoked_token_raises(self) -> None:
        redis = AsyncMock()
        redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await verify_not_revoked("some-jti", redis)

    @pytest.mark.asyncio
    async def test_expired_token_not_added_to_blacklist(self) -> None:
        """Истёкший токен и так не пройдёт decode — не засоряем Redis лишними ключами."""
        redis = AsyncMock()
        await revoke_refresh_token(str(uuid4()), _past_exp(), redis)
        redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_revocation_is_idempotent(self) -> None:
        """Повторный отзыв того же токена не продлевает TTL записи в blacklist.
        Гарантируется через атомарный SET NX — второй вызов не перезаписывает."""
        redis = AsyncMock()
        jti = str(uuid4())
        await revoke_refresh_token(jti, _future_exp(), redis)
        await revoke_refresh_token(jti, _future_exp(), redis)

        for call in redis.set.call_args_list:
            assert call.kwargs.get("nx") is True
