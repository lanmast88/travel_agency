from enum import Enum as PyEnum


class TourCategory(str, PyEnum):
    """Категория тура — определяет ценовой сегмент и уровень сервиса."""

    budget = "budget"
    comfort = "comfort"
    luxury = "luxury"


class MealType(str, PyEnum):
    """Тип питания в туре."""

    none = "none"
    breakfast = "breakfast"
    all_inclusive = "all"


class TourStatus(str, PyEnum):
    """Статус тура — управляет видимостью в публичном каталоге.

    Переходы: draft → active → archived
    - draft:    черновик, виден только менеджерам и администраторам
    - active:   опубликован, отображается в каталоге для клиентов
    - archived: снят с продажи (закончились места, тур прошёл, ручное снятие)
    """

    draft = "draft"
    active = "active"
    archived = "archived"


class TourSortField(str, PyEnum):
    """Поля для сортировки списка туров в каталоге."""

    price = "price"
    start_date = "start_date"
    created_at = "created_at"


class SortOrder(str, PyEnum):
    """Направление сортировки."""

    asc = "asc"
    desc = "desc"


class UserRole(str, PyEnum):
    """Роли пользователей из JWT auth-service.

    Значения зеркалят UserRole в auth-service — должны совпадать точно.
    """

    user = "user"
    employee = "employee"
    admin = "admin"
