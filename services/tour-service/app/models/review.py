from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
        # Проверка: клиент не должен оставлять два отзыва на один тур
        Index("uq_review_client_tour", "client_id", "tour_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tour_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tours.id", ondelete="CASCADE"), index=True
    )
    # client_id хранится как UUID без внешнего ключа — клиент живёт в client-service.
    # Целостность обеспечивается на уровне приложения при создании отзыва.
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)

    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # updated_at нужен чтобы клиент мог видеть был ли отредактирован отзыв
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tour: Mapped[Tour] = relationship(back_populates="reviews", lazy="raise")

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return (
            f"Review(id={self.id!r}, tour_id={self.tour_id!r}, rating={self.rating!r})"
        )
