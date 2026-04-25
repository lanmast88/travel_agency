"""Фабрики тестовых объектов.

Используем обычный конструктор User() — SQLAlchemy создаёт transient-объект
(не привязан к сессии) с правильно инициализированным _sa_instance_state.
"""
from datetime import datetime, timezone
from typing import Optional

from app.core.enums import UserRole
from app.models.user import User


def make_user(
    id: int = 1,
    email: str = "user@example.com",
    hashed_password: str = "$2b$12$fakehashfortest",
    first_name: str = "Иван",
    last_name: Optional[str] = "Иванов",
    role: UserRole = UserRole.user,
    is_active: bool = True,
    failed_login_attempts: int = 0,
    locked_until: Optional[datetime] = None,
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        is_active=is_active,
        failed_login_attempts=failed_login_attempts,
        locked_until=locked_until,
    )
    # id — primary key, устанавливаем после создания transient-объекта
    user.id = id
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    user.last_login_at = None
    return user
