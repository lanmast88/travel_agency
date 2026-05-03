import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
    UUID,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import LoyaltyLevel


class Client(Base):
    __tablename__ = "clients"

    __table_args__ = (
        CheckConstraint("sales_count >= 0", name="ck_client_sales_count_non_negative"),
        Index("ix_client_loyalty_created", "loyalty_level", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    passport: Mapped[str] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    birth_date: Mapped[date] = mapped_column(Date)

    loyalty_level: Mapped[LoyaltyLevel] = mapped_column(
        Enum(LoyaltyLevel, name="loyaltylevel"), default=LoyaltyLevel.standard
    )

    sales_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    def apply_loyalty_upgrade(
        self,
        bronze_min: int,
        silver_min: int,
        gold_min: int,
    ) -> bool:
        """Пересчитывает loyalty_level по текущему sales_count.

        Возвращает True если уровень изменился — сигнал для loyalty_service
        зафиксировать изменение и при необходимости уведомить клиента.
        Пороги передаются явно чтобы модель не зависела от слоя конфигурации.
        """
        if self.sales_count >= gold_min:
            new_level = LoyaltyLevel.gold
        elif self.sales_count >= silver_min:
            new_level = LoyaltyLevel.silver
        elif self.sales_count >= bronze_min:
            new_level = LoyaltyLevel.bronze
        else:
            new_level = LoyaltyLevel.standard

        if new_level == self.loyalty_level:
            return False

        self.loyalty_level = new_level
        return True

    @property
    def is_vip(self) -> bool:
        return self.loyalty_level == LoyaltyLevel.gold

    def __repr__(self) -> str:
        return (
            f"Client(id={self.id!r}, full_name={self.full_name!r}, "
            f"loyalty_level={self.loyalty_level!r}, sales_count={self.sales_count!r})"
        )
