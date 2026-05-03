from enum import Enum as PyEnum


class LoyaltyLevel(str, PyEnum):
    """Уровень лояльности клиента.

    Переходы: standard → bronze → silver → gold
    Пороги и скидки задаются в settings (loyalty_*_min_sales, loyalty_*_discount_pct).
    """

    standard = "standard"
    bronze = "bronze"
    silver = "silver"
    gold = "gold"


class UserRole(str, PyEnum):
    """Роли сотрудников из JWT auth-service.

    Значения зеркалят UserRole в auth-service — должны совпадать точно.
    """

    user = "user"
    employee = "employee"
    admin = "admin"
