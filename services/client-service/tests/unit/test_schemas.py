"""
Тесты Pydantic-схем — валидационные контракты.
Проверяем поведение валидаторов на граничных и негативных случаях.
"""
from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.client import ClientCreate, ClientUpdate

_VALID = {
    "full_name": "Иван Иванов",
    "phone": "+79001234567",
    "passport": "1234567890",
    "email": "ivan@example.com",
    "birth_date": date(1990, 1, 1),
}


class TestClientCreatePhone:
    def test_valid_phone_passes(self) -> None:
        data = ClientCreate(**_VALID)
        assert data.phone == "+79001234567"

    def test_phone_strips_spaces_and_dashes(self) -> None:
        data = ClientCreate(**{**_VALID, "phone": "+7 900 123-45-67"})
        assert data.phone == "+79001234567"

    def test_phone_strips_parentheses(self) -> None:
        data = ClientCreate(**{**_VALID, "phone": "+7(900)1234567"})
        assert data.phone == "+79001234567"

    def test_phone_letters_fail(self) -> None:
        with pytest.raises(ValidationError):
            ClientCreate(**{**_VALID, "phone": "abc"})

    def test_phone_too_short_fails(self) -> None:
        with pytest.raises(ValidationError):
            ClientCreate(**{**_VALID, "phone": "123"})


class TestClientCreatePassport:
    def test_valid_passport_normalized(self) -> None:
        data = ClientCreate(**_VALID)
        assert data.passport == "1234 567890"

    def test_passport_with_space_normalized(self) -> None:
        data = ClientCreate(**{**_VALID, "passport": "1234 567890"})
        assert data.passport == "1234 567890"

    def test_passport_too_short_fails(self) -> None:
        with pytest.raises(ValidationError):
            ClientCreate(**{**_VALID, "passport": "12345"})

    def test_passport_letters_fail(self) -> None:
        with pytest.raises(ValidationError):
            ClientCreate(**{**_VALID, "passport": "abcd123456"})


class TestClientCreateBirthDate:
    def test_valid_adult_passes(self) -> None:
        data = ClientCreate(**_VALID)
        assert data.birth_date == date(1990, 1, 1)

    def test_underage_fails(self) -> None:
        today = date.today()
        underage = today.replace(year=today.year - 17)
        with pytest.raises(ValidationError, match="совершеннолетним"):
            ClientCreate(**{**_VALID, "birth_date": underage})

    def test_impossible_age_fails(self) -> None:
        with pytest.raises(ValidationError, match="некорректная"):
            ClientCreate(**{**_VALID, "birth_date": date(1800, 1, 1)})

    def test_exactly_18_passes(self) -> None:
        today = date.today()
        exactly_18 = today.replace(year=today.year - 18)
        data = ClientCreate(**{**_VALID, "birth_date": exactly_18})
        assert data.birth_date == exactly_18


class TestClientCreateFullName:
    def test_whitespace_stripped(self) -> None:
        data = ClientCreate(**{**_VALID, "full_name": "  Иван Иванов  "})
        assert data.full_name == "Иван Иванов"

    def test_whitespace_only_fails(self) -> None:
        with pytest.raises(ValidationError):
            ClientCreate(**{**_VALID, "full_name": "   "})


class TestClientUpdateHasChanges:
    def test_empty_update_has_no_changes(self) -> None:
        assert ClientUpdate().has_changes() is False

    def test_field_set_has_changes(self) -> None:
        assert ClientUpdate(full_name="Пётр Петров").has_changes() is True

    def test_explicit_none_counts_as_change(self) -> None:
        assert ClientUpdate(phone=None).has_changes() is True
