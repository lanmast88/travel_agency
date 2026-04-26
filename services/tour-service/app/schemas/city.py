import uuid

from pydantic import Field, field_validator

from app.schemas.common import BaseUpdateSchema, normalize_optional_str, normalize_str
from pydantic import BaseModel


class CityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    climate: str | None = Field(default=None, max_length=100)

    @field_validator("name", "country", mode="before")
    @classmethod
    def normalize(cls, v: str) -> str:
        return normalize_str(v)


class CityUpdate(BaseUpdateSchema):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    climate: str | None = Field(default=None, max_length=100)

    @field_validator("name", "country", mode="before")
    @classmethod
    def normalize(cls, v: str | None) -> str | None:
        return normalize_optional_str(v)


class CityResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    country: str
    description: str | None
    climate: str | None
