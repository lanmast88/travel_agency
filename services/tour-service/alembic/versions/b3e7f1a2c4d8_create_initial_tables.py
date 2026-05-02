"""create initial tables

Revision ID: b3e7f1a2c4d8
Revises:
Create Date: 2026-05-02 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "b3e7f1a2c4d8"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cities",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("climate", sa.String(100), nullable=True),
    )
    op.create_index("ix_city_name", "cities", ["name"], unique=True)
    op.create_index("ix_city_country_name", "cities", ["country", "name"])

    op.create_table(
        "hotels",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("city_id", sa.UUID(as_uuid=True), sa.ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("stars", sa.Integer, nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("amenities", JSONB, nullable=False, server_default="[]"),
        sa.CheckConstraint("stars >= 1 AND stars <= 5", name="ck_hotel_stars"),
    )
    op.create_index("ix_hotel_city_id", "hotels", ["city_id"])
    op.create_index("ix_hotel_name", "hotels", ["name"])
    op.create_index("ix_hotel_city_stars", "hotels", ["city_id", "stars"])

    op.create_table(
        "tours",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("city_id", sa.UUID(as_uuid=True), sa.ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("hotel_id", sa.UUID(as_uuid=True), sa.ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("available", sa.Integer, nullable=False, server_default="0"),
        sa.Column("meal_type", sa.Enum("none", "breakfast", "all", name="mealtype"), nullable=False, server_default="none"),
        sa.Column("status", sa.Enum("draft", "active", "archived", name="tourstatus"), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("price > 0", name="ck_tour_price_positive"),
        sa.CheckConstraint("available >= 0", name="ck_tour_available_non_negative"),
        sa.CheckConstraint("end_date > start_date", name="ck_tour_dates_order"),
    )
    op.create_index("ix_tour_city_id", "tours", ["city_id"])
    op.create_index("ix_tour_hotel_id", "tours", ["hotel_id"])
    op.create_index("ix_tour_start_date", "tours", ["start_date"])
    op.create_index("ix_tour_status", "tours", ["status"])
    op.create_index("ix_tour_status_city_start", "tours", ["status", "city_id", "start_date"])
    op.create_index("ix_tour_status_start", "tours", ["status", "start_date"])
    op.create_index("ix_tour_price", "tours", ["price"])
    op.create_index("ix_tour_created_at", "tours", ["created_at"])

    op.create_table(
        "reviews",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tour_id", sa.UUID(as_uuid=True), sa.ForeignKey("tours.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating"),
    )
    op.create_index("ix_review_tour_id", "reviews", ["tour_id"])
    op.create_index("ix_review_client_id", "reviews", ["client_id"])
    op.create_index("uq_review_client_tour", "reviews", ["client_id", "tour_id"], unique=True)
    op.create_index("ix_review_tour_created", "reviews", ["tour_id", "created_at"])


def downgrade() -> None:
    op.drop_table("reviews")
    op.drop_table("tours")
    op.drop_table("hotels")
    op.drop_table("cities")
    op.execute("DROP TYPE IF EXISTS mealtype")
    op.execute("DROP TYPE IF EXISTS tourstatus")
