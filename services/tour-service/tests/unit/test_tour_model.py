"""
Тесты Tour model — mutation guards для properties бизнес-логики.
"""
from datetime import date, timedelta

from app.core.enums import TourStatus
from tests.factories import make_tour


class TestDurationNights:
    def test_seven_nights(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=17),
        )
        assert tour.duration_nights == 7

    def test_one_night(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=11),
        )
        assert tour.duration_nights == 1

    def test_zero_nights_same_day(self) -> None:
        """DB constraint запретит start==end, но property не должна падать."""
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=10),
        )
        assert tour.duration_nights == 0


class TestIsHot:
    def test_active_starts_today(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today,
            end_date=today + timedelta(days=7),
            status=TourStatus.active,
        )
        assert tour.is_hot is True

    def test_active_starts_in_5_days(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=12),
            status=TourStatus.active,
        )
        assert tour.is_hot is True

    def test_active_starts_in_6_days_not_hot(self) -> None:
        """Mutation guard: граница — 5 дней, а не 6 (>= не >)."""
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=6),
            end_date=today + timedelta(days=13),
            status=TourStatus.active,
        )
        assert tour.is_hot is False

    def test_draft_within_5_days_not_hot(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=9),
            status=TourStatus.draft,
        )
        assert tour.is_hot is False

    def test_archived_within_5_days_not_hot(self) -> None:
        today = date.today()
        tour = make_tour(
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=9),
            status=TourStatus.archived,
        )
        assert tour.is_hot is False

    def test_active_already_started_not_hot(self) -> None:
        """Тур уже начался — days_left < 0, не горящий."""
        today = date.today()
        tour = make_tour(
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=6),
            status=TourStatus.active,
        )
        assert tour.is_hot is False
