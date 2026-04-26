from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    __table_args__ = (
        CheckConstraint("stars >= 1 AND stars <= 5", name="ck_hotel_stars"),
        # Поиск отелей по городу — самый частый запрос при формировании тура
        Index("ix_hotel_city_stars", "city_id", "stars"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cities.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    stars: Mapped[int] = mapped_column(Integer)
    address: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    # JSONB — список удобств: ["бассейн", "Wi-Fi", "парковка"]
    # server_default гарантирует [] в БД даже при INSERT без этого поля
    amenities: Mapped[list] = mapped_column(JSONB, server_default="[]")

    city: Mapped[City] = relationship(back_populates="hotels", lazy="raise")
    tours: Mapped[list[Tour]] = relationship(back_populates="hotel", lazy="raise")

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"Hotel(id={self.id!r}, name={self.name!r}, stars={self.stars!r})"
