from typing import Generic, TypeVar

from pydantic import BaseModel, Field, computed_field

T = TypeVar("T")


def normalize_str(v: str) -> str:
    """Убирает пробелы по краям, запрещает пустую строку и строку только из пробелов."""
    stripped = v.strip()
    if not stripped:
        raise ValueError("поле не может быть пустым или состоять только из пробелов")
    return stripped


def normalize_optional_str(v: str | None) -> str | None:
    """normalize_str для опциональных полей — None пропускается."""
    return normalize_str(v) if v is not None else None


class BaseUpdateSchema(BaseModel):
    """Базовый класс для всех Update-схем.

    Предоставляет has_changes() — проверяет, передал ли клиент хотя бы одно поле.
    Используется в сервисах перед обращением к БД чтобы не делать пустой UPDATE.
    """

    def has_changes(self) -> bool:
        # model_fields_set содержит только явно переданные поля,
        # в отличие от model_dump() который включает все поля включая дефолтные None
        return len(self.model_fields_set) > 0


class PaginationParams(BaseModel):
    """Параметры пагинации — используется через Depends() в роутерах."""

    page: int = Field(default=1, ge=1, description="Номер страницы")
    page_size: int = Field(default=20, ge=1, le=100, description="Элементов на странице")

    @property
    def offset(self) -> int:
        # @property намеренно — offset внутренний хелпер для репозиториев,
        # не должен попадать в OpenAPI схему как часть API контракта
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Универсальный ответ с пагинацией.

    Пример использования:
        response_model=PaginatedResponse[SaleListItemResponse]
    """

    items: list[T]
    total: int = Field(description="Общее количество элементов")
    page: int
    page_size: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def pages(self) -> int:
        """Общее количество страниц — computed_field попадает в OpenAPI схему."""
        if self.page_size == 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size
