# Импорт всех моделей для регистрации в Base.metadata
# env.py alembic импортирует этот модуль
from app.models.user import User  # noqa: F401
