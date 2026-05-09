# sales-service

Микросервис управления продажами туров платформы **StackTour**.

Отвечает за регистрацию продаж, расчёт скидок по уровню лояльности клиента и публикацию событий в `client-service` через Kafka.

---

## Содержание

- [Стек](#стек)
- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Миграции](#миграции)
- [API](#api)
  - [Аутентификация](#аутентификация)
  - [Коды ошибок](#коды-ошибок)
  - [POST /sales](#post-sales)
  - [GET /sales](#get-sales)
  - [GET /sales/:id](#get-salesid)
  - [POST /sales/:id/cancel](#post-salesidcancel)
- [Стратегия скидок](#стратегия-скидок)
- [Kafka](#kafka)
- [Health checks](#health-checks)
- [Тесты](#тесты)

---

## Стек

| Компонент | Технология |
|---|---|
| Runtime | Python 3.13, FastAPI |
| БД | PostgreSQL 17 + SQLAlchemy 2.x async + asyncpg |
| Очередь | Apache Kafka — producer `sale_created` |
| Миграции | Alembic |
| Аутентификация | JWT ES256, верификация через JWKS auth-service |
| Межсервисные вызовы | httpx → client-service (получение уровня лояльности) |

---

## Архитектура

```
HTTP Request
    │
    ▼
routers/sales.py        ← валидация входа (Pydantic), маршрутизация
    │
    ▼
logic/sale_service.py   ← оркестрация: loyalty → стратегия → скидка → DB → аудит → Kafka
    │
    ├── http_client.py              ← GET /clients/{id}/loyalty (client-service)
    ├── logic/discount/             ← Strategy pattern: Standard/Bronze/Silver/Gold
    ├── repositories/sale.py        ← SQL-запросы (SQLAlchemy)
    ├── repositories/audit_log.py   ← append-only аудит действий сотрудников
    └── kafka_producer.py           ← publish sale_created
```

Сессия БД управляется через `get_db()` (FastAPI dependency): коммит при успехе, rollback при исключении. Kafka publish выполняется до коммита — если producer недоступен, транзакция откатывается и клиент получает `503`.

---

## Быстрый старт

```bash
cd services/sales-service

# Установить зависимости
pip install -e ".[dev]"

# Применить миграции
alembic upgrade head

# Запустить сервис
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

Swagger UI доступен на `http://localhost:8003/docs` (только в `development`).

**Через Docker:**

```bash
docker compose up --build
```

---

## Переменные окружения

Сервис читает `.env` из корня `services/sales-service/`. Пример — `.env.example`. Обязательные поля не имеют дефолтов.

| Переменная | Обязательная | Дефолт | Описание |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | `postgresql+asyncpg://user:pass@host:5432/db` |
| `AUTH_SERVICE_JWKS_URL` | | `http://localhost:8000/.well-known/jwks.json` | JWKS endpoint auth-service |
| `JWKS_CACHE_TTL_SECONDS` | | `3600` | TTL кэша публичного ключа |
| `CLIENT_SERVICE_URL` | | `http://localhost:8001` | Базовый URL client-service |
| `KAFKA_BOOTSTRAP_SERVERS` | | `["localhost:9092"]` | JSON-массив адресов брокеров |
| `KAFKA_SALE_CREATED_TOPIC` | | `sale_created` | Топик для событий продаж |
| `KAFKA_PRODUCER_ACKS` | | `all` | `all` — запись подтверждается всеми репликами |
| `KAFKA_PRODUCER_RETRIES` | | `3` | Число повторов при ошибке отправки |
| `LOYALTY_STANDARD_DISCOUNT_PCT` | | `0.0` | Скидка в % для уровня standard |
| `LOYALTY_BRONZE_DISCOUNT_PCT` | | `3.0` | Скидка в % для уровня bronze |
| `LOYALTY_SILVER_DISCOUNT_PCT` | | `6.0` | Скидка в % для уровня silver |
| `LOYALTY_GOLD_DISCOUNT_PCT` | | `9.0` | Скидка в % для уровня gold |
| `ENVIRONMENT` | | `development` | `development` / `staging` / `production` |
| `DB_POOL_SIZE` | | `10` | Размер пула соединений |
| `DB_ECHO` | | `false` | Логировать SQL-запросы |

> Порядок скидок должен соблюдаться: `standard ≤ bronze ≤ silver ≤ gold`. Нарушение вызывает ошибку при старте.

---

## Миграции

```bash
# Применить все
alembic upgrade head

# Откатить всё
alembic downgrade base

# Сгенерировать SQL без применения
alembic upgrade head --sql

# Создать новую миграцию
alembic revision --autogenerate -m "describe change"
```

> Alembic использует синхронный `psycopg2`, не `asyncpg`. URL с `+asyncpg` автоматически заменяется в `env.py`.

---

## API

Базовый URL: `/sales`

### Аутентификация

Все эндпоинты требуют JWT access-токен от `auth-service`:

```
Authorization: Bearer <access_token>
```

Токен не передан или невалиден → `401 Unauthorized`.

**Роли:**
- `employee`, `admin` — полный доступ ко всем операциям

Недостаточно прав → `403 Forbidden`.

---

### Коды ошибок

| Код | Причина |
|---|---|
| `401` | Токен отсутствует, истёк или невалиден |
| `403` | Роль не позволяет выполнить операцию |
| `404` | Продажа или клиент не найдены |
| `409` | Попытка отменить уже отменённую продажу |
| `422` | Ошибка валидации входных данных (Pydantic) |
| `503` | Kafka producer недоступен или client-service не отвечает |

Тело ошибки:

```json
{ "detail": "описание ошибки" }
```

---

### POST /sales

Создать продажу. Сервис запрашивает уровень лояльности клиента у `client-service`, применяет стратегию скидки и публикует событие `sale_created` в Kafka.

**Request body:**

```json
{
  "client_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tour_id":   "7a1b2c3d-4e5f-6789-abcd-ef0123456789",
  "quantity":  2,
  "sale_date": "2026-05-09",
  "original_price": "15000.00"
}
```

**Правила валидации:**
- `quantity` — от 1 до 50
- `sale_date` — не позднее сегодняшнего дня
- `original_price` — положительное число, округляется до 2 знаков

**Response `201`:** <a name="saleresponse"></a>

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "client_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tour_id":   "7a1b2c3d-4e5f-6789-abcd-ef0123456789",
  "employee_id": "c0ffee00-0000-0000-0000-000000000001",
  "sale_date": "2026-05-09",
  "quantity": 2,
  "original_price": "15000.00",
  "discount_amount": "450.00",
  "final_price": "14550.00",
  "discount_pct": "3.00",
  "status": "confirmed",
  "created_at": "2026-05-09T12:00:00Z",
  "updated_at": "2026-05-09T12:00:00Z"
}
```

- `employee_id` — заполняется из JWT токена сотрудника
- `discount_amount` и `final_price` — вычисляются сервисом, клиент не передаёт
- `discount_pct` — процент скидки, вычисляется из `discount_amount / original_price`

---

### GET /sales

Список продаж с фильтрацией, сортировкой и пагинацией.

**Query-параметры:**

| Параметр | Тип | Дефолт | Описание |
|---|---|---|---|
| `client_id` | `uuid` | — | Фильтр по клиенту |
| `employee_id` | `uuid` | — | Фильтр по сотруднику |
| `status` | `confirmed\|cancelled` | — | Фильтр по статусу |
| `date_from` | `date` | — | Начало диапазона `sale_date` включительно |
| `date_to` | `date` | — | Конец диапазона `sale_date` включительно |
| `sort_by` | `sale_date\|final_price\|created_at` | `sale_date` | |
| `order` | `asc\|desc` | `desc` | |
| `page` | `int ≥ 1` | `1` | |
| `page_size` | `int 1–100` | `20` | |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "client_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tour_id":   "7a1b2c3d-4e5f-6789-abcd-ef0123456789",
      "employee_id": "c0ffee00-0000-0000-0000-000000000001",
      "sale_date": "2026-05-09",
      "quantity": 2,
      "original_price": "15000.00",
      "discount_amount": "450.00",
      "final_price": "14550.00",
      "status": "confirmed"
    }
  ],
  "total": 87,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

> `created_at`, `updated_at` и `discount_pct` в списке не возвращаются — только в детальном запросе.

---

### GET /sales/:id

Детальная карточка продажи.

**Response `200`:** объект [SaleResponse](#saleresponse)

---

### POST /sales/:id/cancel

Отменить продажу. Повторная отмена уже отменённой продажи → `409`.

Действие фиксируется в `audit_logs`. Событие в Kafka при отмене **не публикуется** — `sales_count` клиента не изменяется.

**Response `200`:** объект [SaleResponse](#saleresponse) со статусом `"cancelled"`

---

## Стратегия скидок

Скидка рассчитывается паттерном Strategy на основе `loyalty_level` клиента, полученного из `client-service` перед созданием продажи:

| Уровень | Скидка (дефолт) |
|---|---|
| `standard` | 0% |
| `bronze` | 3% |
| `silver` | 6% |
| `gold` | 9% |

Размеры скидок настраиваются через переменные окружения (`LOYALTY_*_DISCOUNT_PCT`) без перезапуска кода — только перезапуск сервиса.

```
discount_amount = round(original_price × pct / 100, 2)
final_price     = original_price − discount_amount
```

---

## Kafka

Сервис является **producer** и публикует в топик `sale_created` после каждой успешной продажи.

**Формат сообщения:**

```json
{
  "sale_id":     "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "client_id":   "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "employee_id": "c0ffee00-0000-0000-0000-000000000001",
  "tour_id":     "7a1b2c3d-4e5f-6789-abcd-ef0123456789",
  "final_price": "14550.00",
  "sale_date":   "2026-05-09"
}
```

`client-service` подписывается на этот топик и инкрементирует `sales_count` клиента, что может повысить уровень лояльности.

**Гарантии доставки:** `acks=all`, `retries=3`.

**При недоступности Kafka:** `POST /sales` возвращает `503`. Запись в БД не коммитится — транзакция откатывается.

---

## Health checks

| Эндпоинт | Описание |
|---|---|
| `GET /health/live` | Liveness: процесс жив |
| `GET /health/ready` | Readiness: БД + Kafka producer инициализированы |

**Readiness response:**

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "kafka_producer": "ok"
  }
}
```

`503 Service Unavailable` если хотя бы один компонент недоступен.

---

## Тесты

```bash
# Все тесты
pytest

# С покрытием
pytest --cov=app --cov-report=term-missing

# Только unit
pytest tests/unit

# Только интеграционные
pytest tests/integration
```

Интеграционные тесты поднимают FastAPI через `httpx.AsyncClient` с `ASGITransport` и переопределяют все FastAPI-зависимости через `dependency_overrides`. Реальные БД и Kafka не требуются.
