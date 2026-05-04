# client-service

Микросервис управления клиентами и системой лояльности платформы **StackTour**.

Отвечает за хранение профилей клиентов, расчёт скидок и автоматическое повышение уровня лояльности по событиям продаж из `sales-service`.

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
  - [GET /clients](#get-clients)
  - [POST /clients](#post-clients)
  - [GET /clients/:id](#get-clientsid)
  - [PATCH /clients/:id](#patch-clientsid)
  - [DELETE /clients/:id](#delete-clientsid)
  - [GET /clients/:id/loyalty](#get-clientsidloyalty)
- [Система лояльности](#система-лояльности)
- [Kafka](#kafka)
- [Health checks](#health-checks)
- [Тесты](#тесты)

---

## Стек

| Компонент | Технология |
|---|---|
| Runtime | Python 3.13, FastAPI |
| БД | PostgreSQL 15 + SQLAlchemy 2.x async + asyncpg |
| Кэш | Redis (профили клиентов, TTL 5 мин) |
| Очередь | Apache Kafka — consumer `sale_created` |
| Миграции | Alembic |
| Аутентификация | JWT ES256, верификация через JWKS auth-service |

---

## Архитектура

```
HTTP Request
    │
    ▼
router.py          ← валидация входа (Pydantic), маршрутизация
    │
    ▼
services/client.py ← бизнес-логика, инвалидация кэша
    │
    ├── repositories/client.py  ← SQL-запросы (SQLAlchemy)
    └── cache.py                ← Redis read-through для GET /{id}

kafka_consumer.py  ← sale_created → increment_sales → loyalty upgrade
```

Сессия БД управляется через `get_db()` (FastAPI dependency): коммит при успехе, rollback при исключении. Репозиторий не вызывает `rollback()` — это зона ответственности транспортного слоя.

---

## Быстрый старт

```bash
cd services/client-service

# Установить зависимости
pip install -e ".[dev]"

# Применить миграции
alembic upgrade head

# Запустить сервис
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Swagger UI доступен на `http://localhost:8001/docs` (только в `development`).

---

## Переменные окружения

Сервис читает `.env` из корня `services/client-service/`. Обязательные поля не имеют дефолтов.

| Переменная | Обязательная | Дефолт | Описание |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | ✓ | — | `redis://localhost:6379/0` |
| `AUTH_SERVICE_JWKS_URL` | | `http://localhost:8000/.well-known/jwks.json` | JWKS endpoint auth-service |
| `JWKS_CACHE_TTL_SECONDS` | | `3600` | TTL кэша публичного ключа |
| `CLIENT_CACHE_TTL_SECONDS` | | `300` | TTL кэша профиля клиента в Redis |
| `KAFKA_BOOTSTRAP_SERVERS` | | `localhost:9092` | Список через запятую |
| `KAFKA_CONSUMER_GROUP_ID` | | `client-service-group` | |
| `KAFKA_SALE_CREATED_TOPIC` | | `sale_created` | |
| `LOYALTY_BRONZE_MIN_SALES` | | `1` | Порог перехода → bronze |
| `LOYALTY_SILVER_MIN_SALES` | | `3` | Порог перехода → silver |
| `LOYALTY_GOLD_MIN_SALES` | | `10` | Порог перехода → gold |
| `LOYALTY_STANDARD_DISCOUNT_PCT` | | `0.0` | Скидка в % |
| `LOYALTY_BRONZE_DISCOUNT_PCT` | | `3.0` | |
| `LOYALTY_SILVER_DISCOUNT_PCT` | | `6.0` | |
| `LOYALTY_GOLD_DISCOUNT_PCT` | | `9.0` | |
| `ENVIRONMENT` | | `development` | `development` / `staging` / `production` |
| `DB_ECHO` | | `false` | Логировать SQL-запросы |

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

Базовый URL: `/api/v1`

### Аутентификация

Все эндпоинты требуют JWT access-токен от `auth-service`:

```
Authorization: Bearer <access_token>
```

Токен не передан или невалиден → `401 Unauthorized`.

**Роли:**
- `employee`, `admin` — чтение, создание, обновление
- `admin` — дополнительно удаление (`DELETE`)

Недостаточно прав → `403 Forbidden`.

---

### Коды ошибок

| Код | Причина |
|---|---|
| `401` | Токен отсутствует, истёк или невалиден |
| `403` | Роль не позволяет выполнить операцию |
| `404` | Клиент с указанным `id` не найден |
| `409` | Конфликт уникальности: телефон, паспорт или email уже существует |
| `422` | Ошибка валидации входных данных (Pydantic) |
| `503` | JWKS endpoint auth-service недоступен |

Тело ошибки:

```json
{ "detail": "описание ошибки" }
```

---

### GET /clients

Список клиентов с фильтрацией, сортировкой и пагинацией.

**Query-параметры:**

| Параметр | Тип | Дефолт | Описание |
|---|---|---|---|
| `loyalty_level` | `standard\|bronze\|silver\|gold` | — | Фильтр по уровню лояльности |
| `search` | `string` (max 100) | — | Поиск по `full_name`, `email`, `phone` |
| `sort_by` | `full_name\|created_at\|loyalty_level\|sales_count` | `created_at` | |
| `order` | `asc\|desc` | `asc` | |
| `page` | `int ≥ 1` | `1` | |
| `page_size` | `int 1–100` | `20` | |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "full_name": "Иван Иванов",
      "phone": "+79001234567",
      "email": "ivan@example.com",
      "loyalty_level": "bronze",
      "sales_count": 2,
      "discount_pct": 3.0,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

> `passport` и `birth_date` в списке не возвращаются — только в детальном запросе.

---

### POST /clients

Создать нового клиента.

**Request body:**

```json
{
  "full_name": "Иван Иванов",
  "phone": "+7 900 123-45-67",
  "passport": "1234567890",
  "email": "ivan@example.com",
  "birth_date": "1990-01-15"
}
```

**Правила валидации:**
- `phone` — 10–15 цифр, допустимы `+`, пробелы, дефисы, скобки (нормализуется автоматически)
- `passport` — ровно 10 цифр, форматируется как `"1234 567890"`
- `birth_date` — клиент должен быть старше 18 лет
- `full_name` — 2–255 символов, ведущие/конечные пробелы обрезаются

**Response `201`:** объект [ClientResponse](#clientresponse)

---

### GET /clients/:id

Детальный профиль клиента. Ответ кэшируется в Redis на `CLIENT_CACHE_TTL_SECONDS` секунд.

**Response `200`:** <a name="clientresponse"></a>

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "full_name": "Иван Иванов",
  "phone": "+79001234567",
  "passport": "1234 567890",
  "email": "ivan@example.com",
  "birth_date": "1990-01-15",
  "loyalty_level": "bronze",
  "sales_count": 2,
  "is_vip": false,
  "discount_pct": 3.0,
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-03-01T08:00:00Z"
}
```

- `is_vip` — `true` только для уровня `gold`
- `discount_pct` — вычисляется из конфигурации, не хранится в БД

---

### PATCH /clients/:id

Частичное обновление профиля. Передавать только изменяемые поля.

**Request body** (все поля опциональны):

```json
{
  "full_name": "Иван Петров",
  "phone": "+79009876543",
  "passport": "9876543210",
  "email": "new@example.com",
  "birth_date": "1990-06-20"
}
```

> `loyalty_level` и `sales_count` через этот эндпоинт не изменяются — ими управляет система лояльности.

**Response `200`:** объект [ClientResponse](#clientresponse)

Кэш профиля инвалидируется после успешного обновления.

---

### DELETE /clients/:id

Удалить клиента. Требует роль `admin`.

**Response `204`:** тело отсутствует.

---

### GET /clients/:id/loyalty

Детальная информация о прогрессе лояльности клиента.

**Response `200`:**

```json
{
  "loyalty_level": "bronze",
  "sales_count": 2,
  "discount_pct": 3.0,
  "next_level": "silver",
  "sales_to_next_level": 1
}
```

- `next_level` — `null` если клиент уже на уровне `gold`
- `sales_to_next_level` — `null` если `next_level` равен `null`

---

## Система лояльности

Уровни обновляются автоматически при каждой подтверждённой продаже:

| Уровень | Минимум продаж | Скидка (дефолт) |
|---|---|---|
| `standard` | 0 | 0% |
| `bronze` | 1 | 3% |
| `silver` | 3 | 6% |
| `gold` | 10 | 9% |

Пороги и размеры скидок настраиваются через переменные окружения — изменение применяется без деплоя.

Логика повышения уровня живёт в `Client.apply_loyalty_upgrade()` (доменная модель) и вызывается сервисным слоем после каждого инкремента `sales_count`.

---

## Kafka

Сервис подписывается на топик `sale_created` (публикует `sales-service`) как consumer группа `client-service-group`.

**Формат сообщения:**

```json
{
  "client_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Поведение при обработке:**

| Ситуация | Действие |
|---|---|
| Успех | `sales_count++`, пересчёт `loyalty_level`, инвалидация кэша, коммит offset |
| Клиент не найден | Предупреждение в лог, коммит offset (пропуск) |
| Невалидный JSON | Предупреждение в лог, коммит offset (пропуск) |
| Прочие ошибки | Ошибка в лог, коммит offset (защита от poison pill) |

`enable_auto_commit=False` — offset коммитится явно после обработки каждого сообщения.

---

## Health checks

| Эндпоинт | Описание |
|---|---|
| `GET /health/live` | Liveness: процесс жив |
| `GET /health/ready` | Readiness: БД + Redis + Kafka consumer активны |

**Readiness response:**

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok",
    "kafka_consumer": "ok"
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

# Только интеграционные (без реальной БД — зависимости мокируются)
pytest tests/integration
```

Интеграционные тесты поднимают FastAPI через `httpx.AsyncClient` с `ASGITransport` и переопределяют все FastAPI-зависимости через `dependency_overrides`. Реальные БД и Redis не требуются.
