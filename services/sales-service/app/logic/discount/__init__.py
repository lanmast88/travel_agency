from app.core.enums import LoyaltyLevel
from app.logic.discount.bronze import BronzeDiscount
from app.logic.discount.gold import GoldDiscount
from app.logic.discount.silver import SilverDiscount
from app.logic.discount.standard import StandardDiscount
from app.logic.discount.strategy import IDiscountStrategy

_STRATEGIES: dict[LoyaltyLevel, IDiscountStrategy] = {
    LoyaltyLevel.standard: StandardDiscount(),
    LoyaltyLevel.bronze: BronzeDiscount(),
    LoyaltyLevel.silver: SilverDiscount(),
    LoyaltyLevel.gold: GoldDiscount(),
}


def get_discount_strategy(loyalty_level: LoyaltyLevel) -> IDiscountStrategy:
    return _STRATEGIES[loyalty_level]


__all__ = ["IDiscountStrategy", "get_discount_strategy"]
