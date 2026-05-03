import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.core.config import settings
from app.core.enums import ClientSortField, LoyaltyLevel, SortOrder
from app.schemas.common import BaseUpdateSchema, normalize_str


_PHONE_STRIP = re.compile(r"[\s\-\(\)\.]")
_PHONE_PATTERN = re.compile(r"^\+?\d{10,15}$")
_PASSPORT_DIGITS = re.compile(r"^\d{10}$")

# Вычисляется один раз при старте — settings иммутабельны после инициализации
_DISCOUNT_MAP: dict[LoyaltyLevel, float] = {
    LoyaltyLevel.standard: settings.loyalty_standard_discount_pct,
    LoyaltyLevel.bronze: settings.loyalty_bronze_discount_pct,
    LoyaltyLevel.silver: settings.loyalty_silver_discount_pct,
    LoyaltyLevel.gold: settings.loyalty_gold_discount_pct,
}

_NEXT_LEVEL_MAP: dict[LoyaltyLevel, LoyaltyLevel | None] = {
    LoyaltyLevel.standard: LoyaltyLevel.bronze,
    LoyaltyLevel.bronze: LoyaltyLevel.silver,
    LoyaltyLevel.silver: LoyaltyLevel.gold,
    LoyaltyLevel.gold: None,
}

_LEVEL_THRESHOLD_MAP: dict[LoyaltyLevel, int] = {
    LoyaltyLevel.bronze: settings.loyalty_bronze_min_sales,
    LoyaltyLevel.silver: settings.loyalty_silver_min_sales,
    LoyaltyLevel.gold: settings.loyalty_gold_min_sales,
}


def _normalize_phone(v: str) -> str:
    cleaned = _PHONE_STRIP.sub("", v)
    if not _PHONE_PATTERN.match(cleaned):
        raise ValueError("некорректный формат телефона (10–15 цифр, допускается + в начале)")
    return cleaned


def _normalize_passport(v: str) -> str:
    digits = v.replace(" ", "")
    if not _PASSPORT_DIGITS.match(digits):
        raise ValueError("паспорт должен содержать 10 цифр (серия 4 цифры + номер 6 цифр)")
    return f"{digits[:4]} {digits[4:]}"


def _validate_birth_date(v: date) -> date:
    today = date.today()
    age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
    if age < 18:
        raise ValueError("клиент должен быть совершеннолетним (18+)")
    if age > 120:
        raise ValueError("некорректная дата рождения")
    return v


class ClientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=20)
    passport: str = Field(min_length=10, max_length=20)
    email: EmailStr
    birth_date: date

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, v: str) -> str:
        return normalize_str(v)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_phone(v)

    @field_validator("passport", mode="before")
    @classmethod
    def normalize_passport(cls, v: str) -> str:
        return _normalize_passport(v)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date) -> date:
        return _validate_birth_date(v)


class ClientUpdate(BaseUpdateSchema):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    passport: str | None = Field(default=None, min_length=10, max_length=20)
    email: EmailStr | None = None
    birth_date: date | None = None

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, v: str | None) -> str | None:
        return normalize_str(v) if v is not None else None

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        return _normalize_phone(v) if v is not None else None

    @field_validator("passport", mode="before")
    @classmethod
    def normalize_passport(cls, v: str | None) -> str | None:
        return _normalize_passport(v) if v is not None else None

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date | None) -> date | None:
        return _validate_birth_date(v) if v is not None else None


class ClientResponse(BaseModel):
    """Полное представление клиента — используется в detail-эндпоинте."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    phone: str
    passport: str
    email: str
    birth_date: date
    loyalty_level: LoyaltyLevel
    sales_count: int
    is_vip: bool
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def discount_pct(self) -> float:
        """Скидка по текущему уровню лояльности — вычисляется из settings."""
        return _DISCOUNT_MAP[self.loyalty_level]


class ClientListItemResponse(BaseModel):
    """Облегчённое представление для списков — без passport и birth_date."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    phone: str
    email: str
    loyalty_level: LoyaltyLevel
    sales_count: int
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def discount_pct(self) -> float:
        return _DISCOUNT_MAP[self.loyalty_level]


class LoyaltyInfoResponse(BaseModel):
    """Детальная информация о лояльности — ответ GET /clients/{id}/loyalty."""

    loyalty_level: LoyaltyLevel
    sales_count: int
    discount_pct: float
    next_level: LoyaltyLevel | None
    sales_to_next_level: int | None  # None если клиент уже на максимальном уровне

    @classmethod
    def from_client(cls, loyalty_level: LoyaltyLevel, sales_count: int) -> "LoyaltyInfoResponse":
        """Строит ответ из данных клиента — вычисляет прогресс до следующего уровня."""
        next_level = _NEXT_LEVEL_MAP[loyalty_level]
        sales_to_next = (
            max(0, _LEVEL_THRESHOLD_MAP[next_level] - sales_count)
            if next_level is not None
            else None
        )
        return cls(
            loyalty_level=loyalty_level,
            sales_count=sales_count,
            discount_pct=_DISCOUNT_MAP[loyalty_level],
            next_level=next_level,
            sales_to_next_level=sales_to_next,
        )


class ClientFilters(BaseModel):
    """Фильтры для GET /clients — используется через Depends()."""

    model_config = {"extra": "ignore"}

    loyalty_level: LoyaltyLevel | None = None
    search: str | None = Field(
        default=None,
        max_length=100,
        description="Поиск по имени, email или телефону",
    )
    sort_by: ClientSortField = ClientSortField.created_at
    order: SortOrder = SortOrder.asc
