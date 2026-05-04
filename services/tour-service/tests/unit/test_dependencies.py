"""
Тесты _parse_token_payload — парсинг и валидация JWT payload без JWKS.
"""
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.enums import UserRole
from app.dependencies import _parse_token_payload


class TestParseTokenPayload:
    def test_valid_user_payload(self) -> None:
        user_id = uuid4()
        result = _parse_token_payload({"sub": str(user_id), "role": "user"})
        assert result.user_id == user_id
        assert result.role == UserRole.user

    def test_valid_employee_payload(self) -> None:
        result = _parse_token_payload({"sub": str(uuid4()), "role": "employee"})
        assert result.role == UserRole.employee

    def test_valid_admin_payload(self) -> None:
        result = _parse_token_payload({"sub": str(uuid4()), "role": "admin"})
        assert result.role == UserRole.admin

    def test_missing_sub_raises_401(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_token_payload({"role": "user"})
        assert exc_info.value.status_code == 401

    def test_invalid_uuid_sub_raises_401(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_token_payload({"sub": "not-a-uuid", "role": "user"})
        assert exc_info.value.status_code == 401

    def test_unknown_role_raises_401(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_token_payload({"sub": str(uuid4()), "role": "superadmin"})
        assert exc_info.value.status_code == 401

    def test_missing_role_raises_401(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_token_payload({"sub": str(uuid4())})
        assert exc_info.value.status_code == 401

    def test_401_includes_www_authenticate_header(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_token_payload({})
        assert "WWW-Authenticate" in exc_info.value.headers
