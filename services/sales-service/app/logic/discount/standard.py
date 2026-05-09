from decimal import Decimal

from app.core.config import settings
from app.logic.discount.strategy import IDiscountStrategy


class StandardDiscount(IDiscountStrategy):
    def calculate(self, original_price: Decimal) -> Decimal:
        pct = Decimal(str(settings.loyalty_standard_discount_pct))
        return (original_price * pct / 100).quantize(Decimal("0.01"))
