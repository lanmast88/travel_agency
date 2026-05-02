"""
Тесты Pydantic-схем — валидационные контракты.

Проверяем поведение валидаторов на граничных и негативных случаях,
не привязываясь к конкретным сообщениям об ошибках (они могут меняться).
"""
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.schemas.token import TokenPayload
from app.schemas.user import PasswordChange, UserRegister, UserUpdate


_VALID_REGISTER = {
    "email": "user@example.com",
    "password": "Secret123!",
    "password_confirm": "Secret123!",
    "first_name": "Иван",
}

_VALID_TOKEN_PAYLOAD = {
    "sub": str(uuid4()),
    "role": "user",
    "type": "access",
    "exp": 9_999_999_999,
    "iat": 1_700_000_000,
    "jti": str(uuid4()),
}


class TestUserRegisterValidation:
    def test_valid_data_passes(self) -> None:
        data = UserRegister(**_VALID_REGISTER)
        assert data.email == "user@example.com"

    def test_passwords_mismatch_fails(self) -> None:
        with pytest.raises(ValidationError, match="не совпадают"):
            UserRegister(**{**_VALID_REGISTER, "password_confirm": "Different1!"})

    def test_password_no_digit_fails(self) -> None:
        pwd = "NoDigit!!!!"
        with pytest.raises(ValidationError, match="цифру"):
            UserRegister(**{**_VALID_REGISTER, "password": pwd, "password_confirm": pwd})

    def test_password_no_special_char_fails(self) -> None:
        pwd = "NoSpecial12"
        with pytest.raises(ValidationError, match="специальный"):
            UserRegister(**{**_VALID_REGISTER, "password": pwd, "password_confirm": pwd})

    def test_password_with_leading_whitespace_fails(self) -> None:
        pwd = " Secret1!"
        with pytest.raises(ValidationError, match="пробел"):
            UserRegister(**{**_VALID_REGISTER, "password": pwd, "password_confirm": pwd})

    def test_password_min_length_boundary(self) -> None:
        """Ровно 8 символов — минимально допустимый пароль."""
        pwd = "Ab1!abcd"
        data = UserRegister(**{**_VALID_REGISTER, "password": pwd, "password_confirm": pwd})
        assert data.password == pwd

    def test_password_below_min_length_fails(self) -> None:
        pwd = "Ab1!abc"
        with pytest.raises(ValidationError):
            UserRegister(**{**_VALID_REGISTER, "password": pwd, "password_confirm": pwd})

    def test_whitespace_only_first_name_fails(self) -> None:
        with pytest.raises(ValidationError):
            UserRegister(**{**_VALID_REGISTER, "first_name": "   "})

    def test_first_name_is_stripped(self) -> None:
        data = UserRegister(**{**_VALID_REGISTER, "first_name": "  Иван  "})
        assert data.first_name == "Иван"

    def test_last_name_is_optional(self) -> None:
        data = UserRegister(**{**_VALID_REGISTER})
        assert data.last_name is None


class TestUserUpdateHasChanges:
    def test_empty_call_has_no_changes(self) -> None:
        assert UserUpdate().has_changes() is False

    def test_field_provided_has_changes(self) -> None:
        assert UserUpdate(first_name="Петр").has_changes() is True

    def test_explicit_none_counts_as_change(self) -> None:
        """None, переданный явно, отличается от поля, которое просто не передали."""
        assert UserUpdate(last_name=None).has_changes() is True


class TestTokenPayloadValidation:
    def test_valid_payload_parses(self) -> None:
        payload = TokenPayload(**_VALID_TOKEN_PAYLOAD)
        assert isinstance(payload.user_id, UUID)

    def test_user_id_is_uuid_type(self) -> None:
        """user_id должен возвращать UUID, независимо от строкового представления sub."""
        uid = uuid4()
        payload = TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "sub": str(uid)})
        assert payload.user_id == uid

    def test_sub_non_uuid_string_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "sub": "not-a-uuid"})

    def test_sub_integer_string_fails(self) -> None:
        """После миграции на UUID: числовой sub больше не является валидным."""
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "sub": "42"})

    def test_sub_empty_string_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "sub": ""})

    def test_jti_non_uuid_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "jti": "not-a-uuid"})

    def test_negative_exp_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "exp": -1})

    def test_zero_iat_fails(self) -> None:
        with pytest.raises(ValidationError):
            TokenPayload(**{**_VALID_TOKEN_PAYLOAD, "iat": 0})
