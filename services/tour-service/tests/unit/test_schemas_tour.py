"""
Тесты валидации схем тура.
"""
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.schemas.tour import TourCreate, TourFilters, TourUpdate


def _future(days: int = 10) -> date:
    return date.today() + timedelta(days=days)


class TestTourCreateValidation:
    def _base(self, **overrides: object) -> dict:
        return {
            "city_id": uuid.uuid4(),
            "hotel_id": uuid.uuid4(),
            "name": "Тур в Барселону",
            "start_date": _future(10),
            "end_date": _future(17),
            "price": Decimal("50000.00"),
            "available": 10,
            **overrides,
        }

    def test_valid(self) -> None:
        TourCreate(**self._base())

    def test_start_date_yesterday_raises(self) -> None:
        with pytest.raises(Exception, match="прошлом"):
            TourCreate(**self._base(start_date=date.today() - timedelta(days=1)))

    def test_end_date_equals_start_raises(self) -> None:
        with pytest.raises(Exception, match="позже"):
            TourCreate(**self._base(start_date=_future(10), end_date=_future(10)))

    def test_end_date_before_start_raises(self) -> None:
        with pytest.raises(Exception, match="позже"):
            TourCreate(**self._base(start_date=_future(10), end_date=_future(5)))

    def test_name_stripped(self) -> None:
        t = TourCreate(**self._base(name="  Тур  "))
        assert t.name == "Тур"

    def test_name_whitespace_only_raises(self) -> None:
        with pytest.raises(Exception):
            TourCreate(**self._base(name="   "))

    def test_price_zero_raises(self) -> None:
        with pytest.raises(Exception):
            TourCreate(**self._base(price=Decimal("0")))

    def test_price_negative_raises(self) -> None:
        with pytest.raises(Exception):
            TourCreate(**self._base(price=Decimal("-100")))

    def test_available_negative_raises(self) -> None:
        with pytest.raises(Exception):
            TourCreate(**self._base(available=-1))

    def test_available_zero_allowed(self) -> None:
        t = TourCreate(**self._base(available=0))
        assert t.available == 0


class TestTourUpdateValidation:
    def test_no_fields_no_changes(self) -> None:
        assert TourUpdate().has_changes() is False

    def test_single_field_has_changes(self) -> None:
        assert TourUpdate(available=5).has_changes() is True

    def test_both_dates_valid(self) -> None:
        u = TourUpdate(start_date=_future(10), end_date=_future(17))
        assert u.has_changes()

    def test_both_dates_invalid_raises(self) -> None:
        with pytest.raises(Exception, match="позже"):
            TourUpdate(start_date=_future(10), end_date=_future(5))

    def test_only_start_date_no_error(self) -> None:
        """Mutation guard: без end_date валидация дат не срабатывает."""
        u = TourUpdate(start_date=_future(10))
        assert u.start_date == _future(10)

    def test_name_stripped(self) -> None:
        u = TourUpdate(name="  Лондон  ")
        assert u.name == "Лондон"


class TestTourFiltersValidation:
    def test_defaults_are_valid(self) -> None:
        TourFilters()

    def test_min_price_greater_than_max_raises(self) -> None:
        with pytest.raises(Exception, match="min_price"):
            TourFilters(min_price=Decimal("1000"), max_price=Decimal("500"))

    def test_equal_price_range_allowed(self) -> None:
        TourFilters(min_price=Decimal("500"), max_price=Decimal("500"))

    def test_date_from_after_date_to_raises(self) -> None:
        with pytest.raises(Exception, match="start_date_from"):
            TourFilters(start_date_from=_future(10), start_date_to=_future(5))

    def test_valid_price_range(self) -> None:
        f = TourFilters(min_price=Decimal("500"), max_price=Decimal("1000"))
        assert f.min_price == Decimal("500")

    def test_valid_date_range(self) -> None:
        TourFilters(start_date_from=_future(0), start_date_to=_future(10))

    def test_only_min_price_no_error(self) -> None:
        TourFilters(min_price=Decimal("500"))

    def test_only_date_from_no_error(self) -> None:
        TourFilters(start_date_from=_future(5))
