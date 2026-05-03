from typing import Generic, TypeVar

from pydantic import BaseModel, Field, computed_field

T = TypeVar("T", bound=BaseModel)


def normalize_str(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("поле не может быть пустым или состоять только из пробелов")
    return stripped


class BaseUpdateSchema(BaseModel):

    def has_changes(self) -> bool:
        return len(self.model_fields_set) > 0


class PaginationParams(BaseModel):

    page: int = Field(default=1, ge=1, description="Номер страницы")
    page_size: int = Field(default=20, ge=1, le=100, description="Элементов на странице")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):

    items: list[T]
    total: int = Field(description="Общее количество элементов")
    page: int
    page_size: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def pages(self) -> int:
        if self.page_size == 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size
