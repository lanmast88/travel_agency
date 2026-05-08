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


class SaleSortField(str, PyEnum):
    """Поля для сортировки списка продаж."""

    sale_date = "sale_date"
    final_price = "final_price"
    created_at = "created_at"


class SortOrder(str, PyEnum):
    """Направление сортировки."""

    asc = "asc"
    desc = "desc"
