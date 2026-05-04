"""
Тесты доменной модели Client — инварианты лояльности.
"""
import pytest

from app.core.enums import LoyaltyLevel
from tests.factories import make_client

_THRESHOLDS = {"bronze_min": 1, "silver_min": 3, "gold_min": 10}


class TestApplyLoyaltyUpgrade:
    def test_zero_sales_stays_standard(self) -> None:
        c = make_client(sales_count=0, loyalty_level=LoyaltyLevel.standard)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is False
        assert c.loyalty_level == LoyaltyLevel.standard

    def test_reaches_bronze_threshold(self) -> None:
        c = make_client(sales_count=1, loyalty_level=LoyaltyLevel.standard)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is True
        assert c.loyalty_level == LoyaltyLevel.bronze

    def test_reaches_silver_threshold(self) -> None:
        c = make_client(sales_count=3, loyalty_level=LoyaltyLevel.bronze)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is True
        assert c.loyalty_level == LoyaltyLevel.silver

    def test_reaches_gold_threshold(self) -> None:
        c = make_client(sales_count=10, loyalty_level=LoyaltyLevel.silver)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is True
        assert c.loyalty_level == LoyaltyLevel.gold

    def test_already_correct_level_no_change(self) -> None:
        c = make_client(sales_count=5, loyalty_level=LoyaltyLevel.silver)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is False
        assert c.loyalty_level == LoyaltyLevel.silver

    def test_gold_stays_gold(self) -> None:
        c = make_client(sales_count=100, loyalty_level=LoyaltyLevel.gold)
        changed = c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert changed is False
        assert c.loyalty_level == LoyaltyLevel.gold

    def test_below_bronze_stays_standard(self) -> None:
        c = make_client(sales_count=0, loyalty_level=LoyaltyLevel.standard)
        c.apply_loyalty_upgrade(**_THRESHOLDS)
        assert c.loyalty_level == LoyaltyLevel.standard


class TestIsVip:
    def test_gold_is_vip(self) -> None:
        assert make_client(loyalty_level=LoyaltyLevel.gold).is_vip is True

    @pytest.mark.parametrize("level", [LoyaltyLevel.standard, LoyaltyLevel.bronze, LoyaltyLevel.silver])
    def test_non_gold_is_not_vip(self, level: LoyaltyLevel) -> None:
        assert make_client(loyalty_level=level).is_vip is False
