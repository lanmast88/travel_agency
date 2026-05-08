import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        employee_id: uuid.UUID,
        action: str,
        entity: str,
        entity_id: uuid.UUID,
        ip_address: str | None = None,
    ) -> AuditLog:
        log = AuditLog(
            employee_id=employee_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            ip_address=ip_address,
        )
        self._session.add(log)
        await self._session.flush()
        return log
