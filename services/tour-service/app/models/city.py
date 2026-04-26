from __future__ import annotations

import uuid

from sqlalchemy import Index, String, Text, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class City(Base):
    __tablename__ = "cities"

    __table_args__ = (
        # Составной индекс для запросов "все города страны" + поиск по имени внутри страны
        Index("ix_city_country_name", "country", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    country: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    climate: Mapped[str | None] = mapped_column(String(100))

    # lazy="raise" — запрещает неявную подгрузку в async контексте.
    # Репозиторий обязан явно указывать selectinload() / joinedload().
    # Без этого обращение к city.hotels вне сессии бросает MissingGreenlet.
    hotels: Mapped[list[Hotel]] = relationship(back_populates="city", lazy="raise")
    tours: Mapped[list[Tour]] = relationship(back_populates="city", lazy="raise")

    def __init__(self, **kwargs: object) -> None:
        # UUID генерируется здесь, а не при flush — city.id доступен сразу после City()
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"City(id={self.id!r}, name={self.name!r}, country={self.country!r})"
