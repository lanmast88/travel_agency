import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Index,
    Integer,
    Numeric,
    UUID,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import SaleStatus


class Sale(Base):
    __tablename__ = "sales"

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_quantity_positive"),
        CheckConstraint("original_price > 0", name="ck_sale_original_price_positive"),
        CheckConstraint("discount_amount >= 0", name="ck_sale_discount_non_negative"),
        CheckConstraint("final_price > 0", name="ck_sale_final_price_positive"),
        # Защищает от скидки, превышающей стоимость тура
        CheckConstraint(
            "discount_amount < original_price",
            name="ck_sale_discount_less_than_price",
        ),
        # Журнал продаж: фильтр по сотруднику + сортировка по дате
        Index("ix_sale_employee_date", "employee_id", "sale_date"),
        # История покупок клиента — запрос из client-service / аналитики
        Index("ix_sale_client_date", "client_id", "sale_date"),
        # Фильтр по туру — для отчёта о заполняемости
        Index("ix_sale_tour_id", "tour_id"),
        # Фильтр по статусу — для подсчёта активных/отменённых
        Index("ix_sale_status_date", "status", "sale_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # UUID-ссылки на другие сервисы — намеренно без FK (Database per Service)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    tour_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    sale_date: Mapped[date] = mapped_column(Date)
    quantity: Mapped[int] = mapped_column(Integer)

    # Все цены — итоговые (quantity уже учтён на уровне сервиса)
    original_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    final_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus, name="salestatus"), default=SaleStatus.confirmed
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    @property
    def is_cancelled(self) -> bool:
        return self.status == SaleStatus.cancelled

    @property
    def discount_pct(self) -> Decimal:
        """Фактический процент скидки от original_price."""
        if self.original_price == 0:
            return Decimal("0.00")
        return (self.discount_amount / self.original_price * 100).quantize(Decimal("0.01"))

    def cancel(self) -> None:
        """Переводит продажу в статус cancelled.

        Проверку на уже отменённую продажу выполняет сервисный слой
        через SaleCancelledError — модель не импортирует исключения.
        """
        self.status = SaleStatus.cancelled

    def __repr__(self) -> str:
        return (
            f"Sale(id={self.id!r}, client_id={self.client_id!r}, "
            f"status={self.status!r}, final_price={self.final_price!r})"
        )
