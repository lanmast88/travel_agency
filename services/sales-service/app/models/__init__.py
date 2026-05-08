# Импорт всех моделей необходим чтобы Alembic обнаружил их при автогенерации миграций
from app.models.audit_log import AuditLog
from app.models.sale import Sale

__all__ = ["AuditLog", "Sale"]
