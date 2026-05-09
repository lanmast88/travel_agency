from abc import ABC, abstractmethod
from decimal import Decimal


class IDiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, original_price: Decimal) -> Decimal:
        """Возвращает сумму скидки для заданной цены."""
        ...
