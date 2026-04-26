from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UUID,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import MealType, TourStatus


class Tour(Base):
    __tablename__ = "tours"

    __table_args__ = (
        CheckConstraint("price > 0", name="ck_tour_price_positive"),
        CheckConstraint("available >= 0", name="ck_tour_available_non_negative"),
        # БД гарантирует корректный диапазон дат — start_date всегда раньше end_date
        CheckConstraint("end_date > start_date", name="ck_tour_dates_order"),
        # Основной запрос каталога: активные туры по городу с сортировкой по дате
        Index("ix_tour_status_city_start", "status", "city_id", "start_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cities.id", ondelete="RESTRICT"), index=True
    )
    hotel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("hotels.id", ondelete="RESTRICT"), index=True
    )

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)

    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date)

    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    available: Mapped[int] = mapped_column(Integer, default=0)
    meal_type: Mapped[MealType] = mapped_column(
        Enum(MealType, name="mealtype"), default=MealType.none
    )
    # Новые туры создаются как черновики — менеджер явно публикует через PATCH /tours/{id}/publish
    status: Mapped[TourStatus] = mapped_column(
        Enum(TourStatus, name="tourstatus"), default=TourStatus.draft, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    city: Mapped[City] = relationship(back_populates="tours", lazy="raise")
    hotel: Mapped[Hotel] = relationship(back_populates="tours", lazy="raise")
    reviews: Mapped[list[Review]] = relationship(
        back_populates="tour", cascade="all, delete-orphan", lazy="raise"
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    @property
    def duration_nights(self) -> int:
        """Количество ночей в туре."""
        return (self.end_date - self.start_date).days

    @property
    def is_hot(self) -> bool:
        """Горящий тур: до старта <= 5 дней, тур ещё не начался, статус active."""
        today = date.today()
        days_left = (self.start_date - today).days
        return self.status == TourStatus.active and 0 <= days_left <= 5

    def __repr__(self) -> str:
        return (
            f"Tour(id={self.id!r}, name={self.name!r}, "
            f"status={self.status!r}, start_date={self.start_date!r})"
        )
