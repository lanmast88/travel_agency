"""create sales and audit_logs tables

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-05-09 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_salestatus_enum = sa.Enum("confirmed", "cancelled", name="salestatus")


def upgrade() -> None:
    _salestatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "sales",
        sa.Column(
            "id",
            sa.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("client_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("tour_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("original_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("final_price", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("confirmed", "cancelled", name="salestatus", create_type=False),
            nullable=False,
            server_default="confirmed",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("quantity > 0", name="ck_sale_quantity_positive"),
        sa.CheckConstraint("original_price > 0", name="ck_sale_original_price_positive"),
        sa.CheckConstraint("discount_amount >= 0", name="ck_sale_discount_non_negative"),
        sa.CheckConstraint("final_price > 0", name="ck_sale_final_price_positive"),
        sa.CheckConstraint(
            "discount_amount < original_price",
            name="ck_sale_discount_less_than_price",
        ),
    )

    op.create_index("ix_sale_employee_date", "sales", ["employee_id", "sale_date"])
    op.create_index("ix_sale_client_date", "sales", ["client_id", "sale_date"])
    op.create_index("ix_sale_tour_id", "sales", ["tour_id"])
    op.create_index("ix_sale_status_date", "sales", ["status", "sale_date"])

    # Триггер обновляет updated_at на уровне БД —
    # защищает от raw SQL в обход ORM (миграции, admin-инструменты)
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER sales_updated_at
            BEFORE UPDATE ON sales
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    """)

    op.create_table(
        "audit_logs",
        sa.Column(
            "id",
            sa.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("employee_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_audit_log_employee_created", "audit_logs", ["employee_id", "created_at"]
    )
    op.create_index("ix_audit_log_entity", "audit_logs", ["entity", "entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_entity", table_name="audit_logs", if_exists=True)
    op.drop_index(
        "ix_audit_log_employee_created", table_name="audit_logs", if_exists=True
    )
    op.drop_table("audit_logs")

    op.execute("DROP TRIGGER IF EXISTS sales_updated_at ON sales")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at")

    op.drop_index("ix_sale_status_date", table_name="sales", if_exists=True)
    op.drop_index("ix_sale_tour_id", table_name="sales", if_exists=True)
    op.drop_index("ix_sale_client_date", table_name="sales", if_exists=True)
    op.drop_index("ix_sale_employee_date", table_name="sales", if_exists=True)

    op.drop_table("sales")

    _salestatus_enum.drop(op.get_bind(), checkfirst=True)
