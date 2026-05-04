"""create clients table

Revision ID: c3e5f7a9b1d2
Revises:
Create Date: 2026-05-04 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3e5f7a9b1d2"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_loyalty_level_enum = sa.Enum(
    "standard", "bronze", "silver", "gold",
    name="loyaltylevel",
)


def upgrade() -> None:
    _loyalty_level_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "clients",
        sa.Column(
            "id",
            sa.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("passport", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column(
            "loyalty_level",
            sa.Enum("standard", "bronze", "silver", "gold", name="loyaltylevel", create_type=False),
            nullable=False,
            server_default="standard",
        ),
        sa.Column("sales_count", sa.Integer(), nullable=False, server_default="0"),
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
        sa.CheckConstraint("sales_count >= 0", name="ck_client_sales_count_non_negative"),
    )

    op.create_index("ix_clients_phone", "clients", ["phone"], unique=True)
    op.create_index("ix_clients_passport", "clients", ["passport"], unique=True)
    op.create_index("ix_clients_email", "clients", ["email"], unique=True)
    op.create_index("ix_client_loyalty_created", "clients", ["loyalty_level", "created_at"])

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
        CREATE TRIGGER clients_updated_at
            BEFORE UPDATE ON clients
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS clients_updated_at ON clients")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at")

    op.drop_index("ix_client_loyalty_created", table_name="clients", if_exists=True)
    op.drop_index("ix_clients_email", table_name="clients", if_exists=True)
    op.drop_index("ix_clients_passport", table_name="clients", if_exists=True)
    op.drop_index("ix_clients_phone", table_name="clients", if_exists=True)

    op.drop_table("clients")

    _loyalty_level_enum.drop(op.get_bind(), checkfirst=True)
