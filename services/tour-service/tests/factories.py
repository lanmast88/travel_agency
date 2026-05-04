from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from app.core.enums import MealType, TourStatus
from app.models.review import Review
from app.models.tour import Tour


def make_tour(
    name: str = "Тур в Барселону",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    price: Decimal = Decimal("50000.00"),
    available: int = 10,
    meal_type: MealType = MealType.none,
    status: TourStatus = TourStatus.active,
    city_id: Optional[UUID] = None,
    hotel_id: Optional[UUID] = None,
) -> Tour:
    today = date.today()
    start = start_date or (today + timedelta(days=30))
    end = end_date or (start + timedelta(days=7))
    tour = Tour(
        id=uuid4(),
        city_id=city_id or uuid4(),
        hotel_id=hotel_id or uuid4(),
        name=name,
        start_date=start,
        end_date=end,
        price=price,
        available=available,
        meal_type=meal_type,
        status=status,
    )
    tour.created_at = datetime.now(timezone.utc)
    return tour


def make_review(
    tour_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    rating: int = 5,
    comment: Optional[str] = None,
) -> Review:
    now = datetime.now(timezone.utc)
    review = Review(
        id=uuid4(),
        tour_id=tour_id or uuid4(),
        client_id=client_id or uuid4(),
        rating=rating,
        comment=comment,
    )
    review.created_at = now
    review.updated_at = now
    return review
