"""
Тесты общих схем и утилит валидации.
"""
import pytest

from app.schemas.common import (
    BaseUpdateSchema,
    PaginatedResponse,
    PaginationParams,
    normalize_optional_str,
    normalize_optional_text,
    normalize_str,
)


class TestNormalizeStr:
    def test_strips_whitespace(self) -> None:
        assert normalize_str("  Барселона  ") == "Барселона"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError, match="пустым"):
            normalize_str("")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="пустым"):
            normalize_str("   ")

    def test_no_extra_whitespace_in_middle(self) -> None:
        assert normalize_str("  Новый  год  ") == "Новый  год"


class TestNormalizeOptionalStr:
    def test_none_returns_none(self) -> None:
        assert normalize_optional_str(None) is None

    def test_strips_string(self) -> None:
        assert normalize_optional_str("  test  ") == "test"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError):
            normalize_optional_str("")


class TestNormalizeOptionalText:
    def test_none_returns_none(self) -> None:
        assert normalize_optional_text(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert normalize_optional_text("") is None

    def test_whitespace_returns_none(self) -> None:
        assert normalize_optional_text("   ") is None

    def test_strips_string(self) -> None:
        assert normalize_optional_text("  описание  ") == "описание"

    def test_preserves_inner_content(self) -> None:
        assert normalize_optional_text("  hello world  ") == "hello world"


class TestBaseUpdateSchema:
    def test_no_changes_when_no_fields_set(self) -> None:
        class Schema(BaseUpdateSchema):
            name: str | None = None

        assert Schema().has_changes() is False

    def test_has_changes_when_field_explicitly_set(self) -> None:
        class Schema(BaseUpdateSchema):
            name: str | None = None

        assert Schema(name="test").has_changes() is True

    def test_has_changes_when_set_to_none(self) -> None:
        """Явная передача None тоже считается изменением."""
        class Schema(BaseUpdateSchema):
            name: str | None = None

        assert Schema(name=None).has_changes() is True


class TestPaginationParams:
    def test_offset_page_1(self) -> None:
        assert PaginationParams(page=1, page_size=20).offset == 0

    def test_offset_page_2(self) -> None:
        assert PaginationParams(page=2, page_size=20).offset == 20

    def test_offset_page_3(self) -> None:
        assert PaginationParams(page=3, page_size=20).offset == 40

    def test_offset_custom_page_size(self) -> None:
        assert PaginationParams(page=3, page_size=10).offset == 20

    def test_page_below_1_raises(self) -> None:
        with pytest.raises(Exception):
            PaginationParams(page=0)

    def test_page_size_above_100_raises(self) -> None:
        with pytest.raises(Exception):
            PaginationParams(page_size=101)


class TestPaginatedResponse:
    def test_pages_exact_division(self) -> None:
        r = PaginatedResponse(items=[], total=40, page=1, page_size=20)
        assert r.pages == 2

    def test_pages_rounds_up(self) -> None:
        r = PaginatedResponse(items=[], total=41, page=1, page_size=20)
        assert r.pages == 3

    def test_pages_zero_total(self) -> None:
        r = PaginatedResponse(items=[], total=0, page=1, page_size=20)
        assert r.pages == 0

    def test_pages_one_item(self) -> None:
        r = PaginatedResponse(items=[], total=1, page=1, page_size=20)
        assert r.pages == 1

    def test_pages_full_page(self) -> None:
        r = PaginatedResponse(items=[], total=20, page=1, page_size=20)
        assert r.pages == 1
