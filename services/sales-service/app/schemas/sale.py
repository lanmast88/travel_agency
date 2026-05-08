import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.enums import SaleSortField, SaleStatus, SortOrder


class SaleCreate(BaseModel):
    """Тело запроса POST /sales.

    original_price — итоговая стоимость до скидки (quantity уже учтён на стороне клиента).
    discount_amount и final_price вычисляются сервисом через стратегию скидки.
    """

    client_id: uuid.UUID
    tour_id: uuid.UUID
    quantity: int = Field(ge=1, le=50, description="Количество мест")
    sale_date: date = Field(default_factory=date.today)
    original_price: Decimal = Field(gt=Decimal("0"), description="Полная стоимость до скидки")

    @field_validator("sale_date")
    @classmethod
    def validate_sale_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("дата продажи не может быть в будущем")
        return v

    @field_validator("original_price", mode="before")
    @classmethod
    def round_price(cls, v: object) -> Decimal:
        # Приводим к 2 знакам после запятой до сохранения в Numeric(12,2)
        return Decimal(str(v)).quantize(Decimal("0.01"))


class SaleResponse(BaseModel):
    """Полное представление продажи — используется в detail-эндпоинте и после создания."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: uuid.UUID
    tour_id: uuid.UUID
    employee_id: uuid.UUID
    sale_date: date
    quantity: int
    original_price: Decimal
    discount_amount: Decimal
    final_price: Decimal
    discount_pct: Decimal  # читается из одноимённого property модели Sale
    status: SaleStatus
    created_at: datetime
    updated_at: datetime


class SaleListItemResponse(BaseModel):
    """Облегчённое представление для журнала продаж.

    Не включает created_at/updated_at — избыточны для табличного представления.
    """

    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: uuid.UUID
    tour_id: uuid.UUID
    employee_id: uuid.UUID
    sale_date: date
    quantity: int
    original_price: Decimal
    discount_amount: Decimal
    final_price: Decimal
    status: SaleStatus


class SaleFilters(BaseModel):
    """Фильтры для GET /sales — используется через Depends()."""

    model_config = {"extra": "ignore"}

    client_id: uuid.UUID | None = None
    employee_id: uuid.UUID | None = None
    status: SaleStatus | None = None
    date_from: date | None = None
    date_to: date | None = None
    sort_by: SaleSortField = SaleSortField.sale_date
    order: SortOrder = SortOrder.desc

    @model_validator(mode="after")
    def validate_date_range(self) -> "SaleFilters":
        if self.date_from is not None and self.date_to is not None and self.date_from > self.date_to:
            raise ValueError("date_from не может быть позже date_to")
        return self
