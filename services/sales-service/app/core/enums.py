from enum import Enum as PyEnum


class SaleStatus(str, PyEnum):
    """Статус продажи."""

    confirmed = "confirmed"
    cancelled = "cancelled"


class LoyaltyLevel(str, PyEnum):
    """Уровень лояльности — зеркалит client-service, используется только для выбора стратегии скидки."""

    standard = "standard"
    bronze = "bronze"
    silver = "silver"
    gold = "gold"


class UserRole(str, PyEnum):
    """Роли сотрудников из JWT auth-service.

    Значения должны точно совпадать с UserRole в auth-service.
    """

    user = "user"
    employee = "employee"
    admin = "admin"
