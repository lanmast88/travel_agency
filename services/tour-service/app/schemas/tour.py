import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.enums import MealType, SortOrder, TourCategory, TourSortField, TourStatus
from app.schemas.city import CityResponse
from app.schemas.common import BaseUpdateSchema, normalize_str
from app.schemas.hotel import HotelBriefResponse


class TourCreate(BaseModel):
    city_id: uuid.UUID
    hotel_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    start_date: date
    end_date: date
    price: Decimal = Field(gt=0, decimal_places=2)
    available: int = Field(ge=0)
    meal_type: MealType = MealType.none
    category: TourCategory = TourCategory.comfort
    photo_url: str | None = Field(default=None, max_length=500)
    # Новые туры создаются как черновики — публикация через отдельный PATCH /publish
    status: TourStatus = TourStatus.draft

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return normalize_str(v)

    @field_validator("start_date")
    @classmethod
    def start_date_not_in_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("дата начала тура не может быть в прошлом")
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "TourCreate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date должна быть позже start_date")
        return self


class TourUpdate(BaseUpdateSchema):
    city_id: uuid.UUID | None = None
    hotel_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    start_date: date | None = None
    end_date: date | None = None
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    available: int | None = Field(default=None, ge=0)
    meal_type: MealType | None = None
    category: TourCategory | None = None
    photo_url: str | None = Field(default=None, max_length=500)
    status: TourStatus | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v: str | None) -> str | None:
        return normalize_str(v) if v is not None else None

    @model_validator(mode="after")
    def validate_dates(self) -> "TourUpdate":
        # Проверяем только если оба поля переданы одновременно
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("end_date должна быть позже start_date")
        return self


class TourResponse(BaseModel):
    """Полное представление тура с вложенными объектами — используется в detail-эндпоинте."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str | None
    start_date: date
    end_date: date
    price: Decimal
    available: int
    meal_type: MealType
    category: TourCategory
    photo_url: str | None
    status: TourStatus
    created_at: datetime
    # Вложенные объекты — репозиторий обязан загружать через selectinload()
    city: CityResponse
    hotel: HotelBriefResponse
    # Вычисляемые поля из модели
    duration_nights: int
    is_hot: bool


class TourListItemResponse(BaseModel):
    """Облегчённое представление тура для списков — без description и вложенных объектов."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    price: Decimal
    available: int
    meal_type: MealType
    category: TourCategory
    photo_url: str | None
    status: TourStatus
    duration_nights: int
    is_hot: bool
    # Плоские поля вместо nested объектов — дешевле для больших списков
    city_id: uuid.UUID
    hotel_id: uuid.UUID


class SimilarTourResponse(TourListItemResponse):
    """Тур из списка рекомендаций — дополнен оценкой схожести [0, 1]."""

    similarity: float


class TourFilters(BaseModel):
    """Фильтры для GET /tours — используется через Depends()."""

    model_config = {"extra": "ignore"}

    city_id: uuid.UUID | None = None
    hotel_id: uuid.UUID | None = None
    min_price: Decimal | None = Field(default=None, gt=0)
    max_price: Decimal | None = Field(default=None, gt=0)
    start_date_from: date | None = None
    start_date_to: date | None = None
    meal_type: MealType | None = None
    category: TourCategory | None = None
    # По умолчанию клиенты видят только active туры; менеджеры могут передать другой статус
    status: TourStatus | None = TourStatus.active
    only_hot: bool = False
    sort_by: TourSortField = TourSortField.start_date
    order: SortOrder = SortOrder.asc

    @model_validator(mode="after")
    def validate_price_range(self) -> "TourFilters":
        if self.min_price and self.max_price and self.min_price > self.max_price:
            raise ValueError("min_price не может быть больше max_price")
        return self

    @model_validator(mode="after")
    def validate_date_range(self) -> "TourFilters":
        if self.start_date_from and self.start_date_to:
            if self.start_date_from > self.start_date_to:
                raise ValueError("start_date_from не может быть позже start_date_to")
        return self
