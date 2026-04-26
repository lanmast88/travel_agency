import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import BaseUpdateSchema, normalize_optional_text


class ReviewCreate(BaseModel):
    # tour_id передаётся в теле — позволяет создавать отзывы через общий POST /reviews
    # а не только через вложенный POST /tours/{id}/reviews
    tour_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    # client_id НЕ принимается из тела запроса — берётся из JWT payload в роутере,
    # чтобы клиент не мог оставить отзыв от чужого имени

    @field_validator("comment", mode="before")
    @classmethod
    def normalize_comment(cls, v: str | None) -> str | None:
        # Пустую строку приводим к None — семантически одно и то же
        return normalize_optional_text(v)


class ReviewUpdate(BaseUpdateSchema):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("comment", mode="before")
    @classmethod
    def normalize_comment(cls, v: str | None) -> str | None:
        return normalize_optional_text(v)


class ReviewResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    tour_id: uuid.UUID
    client_id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime
    # Позволяет клиенту понять, был ли отзыв отредактирован после публикации
    updated_at: datetime
