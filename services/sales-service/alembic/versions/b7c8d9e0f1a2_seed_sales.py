"""seed: синтетические данные sales и audit_logs

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-06-01 12:00:00

Ссылочные UUID из других сервисов (Database per Service — FK не создаются):
  client_id  → client-service seed (11111111-0000-4000-8000-00000000000X)
  tour_id    → tour-service  seed c9f3a1e8b2d7
  employee_id → auth-service  seed b2c3d4e5f6a7 (22222222-0000-4000-8000-00000000000X)

Скидки соответствуют умолчаниям settings:
  standard 0%, bronze 3%, silver 6%, gold 9%

Суммы проверены аналитически (Decimal, ROUND_HALF_UP):
  final_price = original_price - discount_amount, все > 0, discount < original.
"""
from decimal import Decimal
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Справочники UUID
# ---------------------------------------------------------------------------

_C = "11111111-0000-4000-8000-{:012d}"   # client seed
_E = "22222222-0000-4000-8000-{:012d}"   # employee (auth seed)

_CLIENT  = {i: _C.format(i) for i in range(1, 11)}
_EMPLOYEE = {i: _E.format(i) for i in range(2, 5)}

# tour UUIDs из c9f3a1e8b2d7 — проверено по seed-файлу
_TOUR = {
    "istanbul_comfort":  "362b3800-ccd0-47d2-b8cc-158bd0d22742",  # 1049.87
    "bali_budget":       "2f1de70e-2b56-4e38-80d2-af9aaf2edb17",  # 1564.80
    "istanbul_essential":"7aed5208-d601-41e1-bdbf-fbd10552f0ee",  # 498.27
    "paris_essential":   "dd14de7d-6ed1-493f-ae45-e16a75859757",  # 1169.81
    "prague_budget":     "5fc4ba77-a622-4c44-af3a-ed679412f73e",  # 689.77
    "barcelona_elite":   "edd32b21-f54f-48f6-ace1-d6acfad9817f",  # 2419.24
    "dubai_luxury":      "248ee8e7-1e6a-480c-9c21-817ef277a724",  # 7174.88
    "bali_luxury":       "60067aa4-f7c6-4567-b89a-5856dd5ee980",  # 3953.11
    "tokyo_premium":     "f7095d5a-c3bb-4e1f-957c-d268a7e34fe5",  # 4220.70
}

# ---------------------------------------------------------------------------
# Seed-данные продаж
# ---------------------------------------------------------------------------
# (id, client_id, tour_id, employee_id, sale_date,
#  quantity, original_price, discount_amount, final_price, status)
_SALES = [
    # ── standard (0%) ───────────────────────────────────────────────────────
    (
        "33333333-0000-4000-8000-000000000001",
        _CLIENT[1], _TOUR["istanbul_comfort"], _EMPLOYEE[2],
        "2025-09-01", 1,
        Decimal("1049.87"), Decimal("0.00"), Decimal("1049.87"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000002",
        _CLIENT[2], _TOUR["bali_budget"], _EMPLOYEE[3],
        "2025-08-20", 1,
        Decimal("1564.80"), Decimal("0.00"), Decimal("1564.80"),
        "confirmed",
    ),
    # ── bronze (3%) ─────────────────────────────────────────────────────────
    (
        "33333333-0000-4000-8000-000000000003",
        _CLIENT[3], _TOUR["istanbul_essential"], _EMPLOYEE[2],
        "2025-01-20", 1,
        Decimal("498.27"), Decimal("14.95"), Decimal("483.32"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000004",
        _CLIENT[4], _TOUR["paris_essential"], _EMPLOYEE[4],
        "2025-09-25", 1,
        Decimal("1169.81"), Decimal("35.09"), Decimal("1134.72"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000005",
        _CLIENT[4], _TOUR["prague_budget"], _EMPLOYEE[2],
        "2025-04-28", 1,
        Decimal("689.77"), Decimal("20.69"), Decimal("669.08"),
        "cancelled",
    ),
    # ── silver (6%) ─────────────────────────────────────────────────────────
    (
        "33333333-0000-4000-8000-000000000006",
        _CLIENT[5], _TOUR["paris_essential"], _EMPLOYEE[3],
        "2025-09-25", 1,
        Decimal("1169.81"), Decimal("70.19"), Decimal("1099.62"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000007",
        _CLIENT[6], _TOUR["istanbul_comfort"], _EMPLOYEE[2],
        "2025-09-03", 1,
        Decimal("1049.87"), Decimal("62.99"), Decimal("986.88"),
        "cancelled",
    ),
    (
        "33333333-0000-4000-8000-000000000008",
        _CLIENT[7], _TOUR["barcelona_elite"], _EMPLOYEE[4],
        "2025-06-04", 1,
        Decimal("2419.24"), Decimal("145.15"), Decimal("2274.09"),
        "confirmed",
    ),
    # ── gold (9%) ───────────────────────────────────────────────────────────
    (
        "33333333-0000-4000-8000-000000000009",
        _CLIENT[8], _TOUR["bali_luxury"], _EMPLOYEE[2],
        "2026-07-08", 1,
        Decimal("3953.11"), Decimal("355.78"), Decimal("3597.33"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000010",
        _CLIENT[9], _TOUR["dubai_luxury"], _EMPLOYEE[3],
        "2026-01-06", 1,
        Decimal("7174.88"), Decimal("645.74"), Decimal("6529.14"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000011",
        _CLIENT[10], _TOUR["dubai_luxury"], _EMPLOYEE[4],
        "2026-01-10", 2,
        Decimal("14349.76"), Decimal("1291.48"), Decimal("13058.28"),
        "confirmed",
    ),
    (
        "33333333-0000-4000-8000-000000000012",
        _CLIENT[10], _TOUR["tokyo_premium"], _EMPLOYEE[2],
        "2025-07-02", 1,
        Decimal("4220.70"), Decimal("379.86"), Decimal("3840.84"),
        "cancelled",
    ),
]

_SALE_IDS = tuple(row[0] for row in _SALES)
_CANCELLED_SALE_IDS = tuple(row[0] for row in _SALES if row[9] == "cancelled")

# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
# SALE_CREATE — по одному на каждую продажу
_AUDIT_CREATE = [
    {
        "id": f"44444444-0000-4000-8000-{i:012d}",
        "employee_id": row[3],
        "action": "SALE_CREATE",
        "entity": "sale",
        "entity_id": row[0],
        "ip_address": "192.168.1.100",
    }
    for i, row in enumerate(_SALES, start=1)
]

# SALE_CANCEL — по одному на каждую отменённую продажу
_AUDIT_CANCEL = [
    {
        "id": f"55555555-0000-4000-8000-{i:012d}",
        "employee_id": row[3],
        "action": "SALE_CANCEL",
        "entity": "sale",
        "entity_id": row[0],
        "ip_address": "192.168.1.100",
    }
    for i, row in enumerate((r for r in _SALES if r[9] == "cancelled"), start=1)
]

_AUDIT_IDS = (
    tuple(r["id"] for r in _AUDIT_CREATE)
    + tuple(r["id"] for r in _AUDIT_CANCEL)
)

# ---------------------------------------------------------------------------
# SQL-шаблоны
# ---------------------------------------------------------------------------
_INSERT_SALE = sa.text("""
    INSERT INTO sales
        (id, client_id, tour_id, employee_id, sale_date,
         quantity, original_price, discount_amount, final_price, status)
    VALUES
        (:id, :client_id, :tour_id, :employee_id, CAST(:sale_date AS date),
         :quantity, :original_price, :discount_amount, :final_price,
         CAST(:status AS salestatus))
    ON CONFLICT (id) DO NOTHING
""")

_INSERT_AUDIT = sa.text("""
    INSERT INTO audit_logs
        (id, employee_id, action, entity, entity_id, ip_address)
    VALUES
        (:id, :employee_id, :action, :entity, :entity_id, :ip_address)
    ON CONFLICT (id) DO NOTHING
""")


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        _INSERT_SALE,
        [
            {
                "id":             row[0],
                "client_id":      row[1],
                "tour_id":        row[2],
                "employee_id":    row[3],
                "sale_date":      row[4],
                "quantity":       row[5],
                "original_price": row[6],
                "discount_amount":row[7],
                "final_price":    row[8],
                "status":         row[9],
            }
            for row in _SALES
        ],
    )

    conn.execute(_INSERT_AUDIT, _AUDIT_CREATE + _AUDIT_CANCEL)


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM audit_logs WHERE id = ANY(:ids)").bindparams(
            ids=list(_AUDIT_IDS)
        )
    )
    op.execute(
        sa.text("DELETE FROM sales WHERE id = ANY(:ids)").bindparams(
            ids=list(_SALE_IDS)
        )
    )
