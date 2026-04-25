"""
Тесты Pydantic-схем — правила, которые легко случайно сломать при изменении валидации.
"""
import pytest
from pydantic import ValidationError

from app.core.enums import UserRole
from app.schemas.token import TokenPayload
from app.schemas.user import PasswordChange, UserRegister, UserUpdate

_VALID = {
    "email": "user@example.com",
    "password": "Secret123!",
    "password_confirm": "Secret123!",
    "first_name": "Иван",
}


class TestUserRegisterValidation:
    def test_valid_data_passes(self) -> None:
        data = UserRegister(**_VALID)
        assert data.email == "user@example.com"

    def test_passwords_mismatch_fails(self) -> None:
        with pytest.raises(ValidationError, match="не совпадают"):
            UserRegister(**{**_VALID, "password_confirm": "Different1!"})

    def test_password_no_digit_fails(self) -> None:
        pwd = "NoDigit!!!!"
        with pytest.raises(ValidationError, match="цифру"):
            UserRegister(**{**_VALID, "password": pwd, "password_confirm": pwd})

    def test_password_no_special_char_fails(self) -> None:
        pwd = "NoSpecial12"
        with pytest.raises(ValidationError, match="специальный"):
            UserRegister(**{**_VALID, "password": pwd, "password_confirm": pwd})

    def test_password_leading_space_fails(self) -> None:
        pwd = " Secret1!"
        with pytest.raises(ValidationError, match="пробел"):
            UserRegister(**{**_VALID, "password": pwd, "password_confirm": pwd})

    def test_whitespace_only_first_name_fails(self) -> None:
        with pytest.raises(ValidationError):
            UserRegister(**{**_VALID, "first_name": "   "})

    def test_first_name_is_stripped(self) -> None:
        data = UserRegister(**{**_VALID, "first_name": "  Иван  "})
        assert data.first_name == "Иван"


class TestUserUpdateHasChanges:
    def test_empty_call_returns_false(self) -> None:
        assert UserUpdate().has_changes() is False

    def test_field_set_returns_true(self) -> None:
        assert UserUpdate(first_name="Петр").has_changes() is True

    def test_none_explicitly_set_returns_true(self) -> None:
        """None ≠ не передан: model_fields_set фиксирует явную передачу."""
        assert UserUpdate(last_name=None).has_changes() is True


class TestTokenPayloadValidation:
    _BASE = {
        "sub": "1", "role": "user", "type": "access",
        "exp": 9_999_999_999, "iat": 1_700_000_000,
        "jti": "550e8400-e29b-41d4-a716-446655440000",
    }

    def test_user_id_property_returns_int(self) -> None:
        assert TokenPayload(**{**self._BASE, "sub": "42"}).user_id == 42

    def test_sub_zero_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**self._BASE, "sub": "0"})

    def test_sub_non_integer_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**self._BASE, "sub": "abc"})

    def test_jti_invalid_uuid_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**self._BASE, "jti": "not-a-uuid"})
