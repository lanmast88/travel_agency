"""seed: синтетические данные users

Revision ID: b2c3d4e5f6a7
Revises: a1f3c2e4b5d6
Create Date: 2026-06-01 12:00:00

Seed passwords (только для разработки и тестирования):
  22222222-0000-4000-8000-000000000001  admin@travel.local      Admin1234!
  22222222-0000-4000-8000-000000000002  smirnov@travel.local    Employee12!
  22222222-0000-4000-8000-000000000003  kozlova@travel.local    Employee12!
  22222222-0000-4000-8000-000000000004  novikov@travel.local    Employee12!
  22222222-0000-4000-8000-000000000005  belova@travel.local     User1234!
  22222222-0000-4000-8000-000000000006  orlov@travel.local      User1234!
  22222222-0000-4000-8000-000000000007  timofeeva@travel.local  User1234!
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from passlib.context import CryptContext

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1f3c2e4b5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

_SEED_IDS = (
    "22222222-0000-4000-8000-000000000001",
    "22222222-0000-4000-8000-000000000002",
    "22222222-0000-4000-8000-000000000003",
    "22222222-0000-4000-8000-000000000004",
    "22222222-0000-4000-8000-000000000005",
    "22222222-0000-4000-8000-000000000006",
    "22222222-0000-4000-8000-000000000007",
)

# (id, email, plain_password, first_name, last_name, role)
_USERS: list[tuple[str, str, str, str, str, str]] = [
    ("22222222-0000-4000-8000-000000000001", "admin@travel.local",     "Admin1234!",  "Иван",    "Петров",    "admin"),
    ("22222222-0000-4000-8000-000000000002", "smirnov@travel.local",   "Employee12!", "Алексей", "Смирнов",   "employee"),
    ("22222222-0000-4000-8000-000000000003", "kozlova@travel.local",   "Employee12!", "Елена",   "Козлова",   "employee"),
    ("22222222-0000-4000-8000-000000000004", "novikov@travel.local",   "Employee12!", "Дмитрий", "Новиков",   "employee"),
    ("22222222-0000-4000-8000-000000000005", "belova@travel.local",    "User1234!",   "Анна",    "Белова",    "user"),
    ("22222222-0000-4000-8000-000000000006", "orlov@travel.local",     "User1234!",   "Сергей",  "Орлов",     "user"),
    ("22222222-0000-4000-8000-000000000007", "timofeeva@travel.local", "User1234!",   "Мария",   "Тимофеева", "user"),
]


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            INSERT INTO users (id, email, hashed_password, first_name, last_name, role)
            VALUES (
                :id,
                :email,
                :hashed_password,
                :first_name,
                :last_name,
                CAST(:role AS userrole)
            )
            ON CONFLICT (id) DO NOTHING
        """),
        [
            {
                "id": uid,
                "email": email,
                "hashed_password": _pwd.hash(plain_password),
                "first_name": first_name,
                "last_name": last_name,
                "role": role,
            }
            for uid, email, plain_password, first_name, last_name, role in _USERS
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM users WHERE id = ANY(:ids)").bindparams(
            ids=list(_SEED_IDS)
        )
    )
