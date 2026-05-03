# Импорт всех моделей необходим чтобы Alembic обнаружил их при автогенерации миграций
from app.models.client import Client

__all__ = ["Client"]
