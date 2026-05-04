import uuid
from datetime import date, datetime, timezone

from app.core.enums import LoyaltyLevel
from app.models.client import Client


def make_client(
    id: uuid.UUID | None = None,
    full_name: str = "Иван Иванов",
    phone: str = "+79001234567",
    passport: str = "1234 567890",
    email: str = "ivan@example.com",
    birth_date: date | None = None,
    loyalty_level: LoyaltyLevel = LoyaltyLevel.standard,
    sales_count: int = 0,
) -> Client:
    c = Client(
        full_name=full_name,
        phone=phone,
        passport=passport,
        email=email,
        birth_date=birth_date or date(1990, 1, 1),
        loyalty_level=loyalty_level,
        sales_count=sales_count,
    )
    c.id = id or uuid.uuid4()
    c.created_at = datetime.now(timezone.utc)
    c.updated_at = datetime.now(timezone.utc)
    return c
