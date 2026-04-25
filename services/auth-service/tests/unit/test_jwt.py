"""
Тесты JWT — только то, что касается безопасности.
Библиотечный код (jose, подпись) не тестируем — он уже протестирован авторами.
"""
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.core.enums import TokenType, UserRole
from app.core.exceptions import InvalidTokenError, TokenRevokedError
from app.logic.jwt import _now, create_token_pair, decode_token, revoke_refresh_token, verify_not_revoked


class TestTokenTypeSeparation:
    def test_access_token_rejected_as_refresh(self) -> None:
        """Ключевой инвариант: refresh-endpoint не должен принимать access-токен."""
        tokens = create_token_pair(1, UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.access_token, TokenType.refresh)

    def test_refresh_token_rejected_as_access(self) -> None:
        """Ключевой инвариант: access-endpoint не должен принимать refresh-токен."""
        tokens = create_token_pair(1, UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.refresh_token, TokenType.access)

    def test_expired_token_rejected(self) -> None:
        """Токен с exp в прошлом не проходит декод."""
        with patch("app.logic.jwt._now", return_value=1000):
            tokens = create_token_pair(1, UserRole.user)
        with pytest.raises(InvalidTokenError):
            decode_token(tokens.access_token, TokenType.access)

    def test_tampered_token_rejected(self) -> None:
        tokens = create_token_pair(1, UserRole.user)
        parts = tokens.access_token.split(".")
        tampered = parts[0] + "." + parts[1] + ".badsignature"
        with pytest.raises(InvalidTokenError):
            decode_token(tampered, TokenType.access)


class TestTokenRevocation:
    @pytest.mark.asyncio
    async def test_revoke_uses_nx_flag(self) -> None:
        """NX — не перезаписываем TTL при повторном logout (идемпотентность)."""
        redis = AsyncMock()
        await revoke_refresh_token(str(uuid4()), _now() + 3600, redis)
        assert redis.set.call_args.kwargs["nx"] is True

    @pytest.mark.asyncio
    async def test_expired_token_not_added_to_blacklist(self) -> None:
        """Истёкший токен и так не пройдёт decode — не засоряем Redis."""
        redis = AsyncMock()
        await revoke_refresh_token(str(uuid4()), _now() - 1, redis)
        redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_revoked_token_raises(self) -> None:
        redis = AsyncMock()
        redis.exists.return_value = 1
        with pytest.raises(TokenRevokedError):
            await verify_not_revoked("some-jti", redis)
