import uuid

from pydantic import BaseModel, Field, field_validator

from app.schemas.city import CityResponse
from app.schemas.common import BaseUpdateSchema, normalize_optional_str, normalize_str


def _normalize_amenities(v: list[str]) -> list[str]:
    """Убирает пробелы, пустые строки и дубликаты. Сохраняет порядок."""
    seen: set[str] = set()
    result = []
    for item in v:
        clean = item.strip()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result


class HotelCreate(BaseModel):
    city_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    stars: int = Field(ge=1, le=5)
    address: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    amenities: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("name", "address", mode="before")
    @classmethod
    def normalize(cls, v: str) -> str:
        return normalize_str(v)

    @field_validator("amenities", mode="before")
    @classmethod
    def normalize_amenities(cls, v: list[str]) -> list[str]:
        return _normalize_amenities(v)


class HotelUpdate(BaseUpdateSchema):
    city_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    stars: int | None = Field(default=None, ge=1, le=5)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    amenities: list[str] | None = None

    @field_validator("name", "address", mode="before")
    @classmethod
    def normalize(cls, v: str | None) -> str | None:
        return normalize_optional_str(v)

    @field_validator("amenities", mode="before")
    @classmethod
    def normalize_amenities(cls, v: list[str] | None) -> list[str] | None:
        return _normalize_amenities(v) if v is not None else None


class HotelBriefResponse(BaseModel):
    """Краткое представление отеля — используется внутри TourResponse."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    stars: int
    address: str


class HotelResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    stars: int
    address: str
    description: str | None
    amenities: list[str]
    # Вложенный объект вместо city_id — репозиторий загружает через selectinload()
    city: CityResponse
