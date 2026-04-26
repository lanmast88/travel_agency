# Импорт всех моделей необходим чтобы Alembic обнаружил их при автогенерации миграций
from app.models.city import City
from app.models.hotel import Hotel
from app.models.review import Review
from app.models.tour import Tour

__all__ = ["City", "Hotel", "Tour", "Review"]
