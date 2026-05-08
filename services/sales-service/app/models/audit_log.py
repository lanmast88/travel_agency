import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    __table_args__ = (
        # История действий сотрудника с сортировкой по времени
        Index("ix_audit_log_employee_created", "employee_id", "created_at"),
        # История изменений конкретной записи (например, все события по sale_id)
        Index("ix_audit_log_entity", "entity", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Ссылка на auth-service — намеренно без FK (Database per Service)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    # Действие: SALE_CREATE, SALE_CANCEL и т.д. — строка, не enum,
    # чтобы расширять набор действий без миграции
    action: Mapped[str] = mapped_column(String(50))

    # Тип сущности: "sale", "client" и т.д.
    entity: Mapped[str] = mapped_column(String(100))

    # ID изменённой записи
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    # IPv4 (15 символов) или IPv6 (до 45 символов включая scope id)
    # Nullable: внутренние фоновые операции могут не иметь HTTP-контекста
    ip_address: Mapped[str | None] = mapped_column(String(45))

    # AuditLog — append-only, updated_at не нужен
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("id", uuid.uuid4())
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return (
            f"AuditLog(id={self.id!r}, employee_id={self.employee_id!r}, "
            f"action={self.action!r}, entity={self.entity!r}, "
            f"entity_id={self.entity_id!r})"
        )
