# tour-service

Микросервис каталога туров платформы StackTour. Управляет справочниками городов и отелей, туровым каталогом с фильтрацией и сортировкой, горящими турами и отзывами клиентов.

Верификация JWT делегирована **auth-service** через JWKS — tour-service не хранит ключи локально и не обращается к БД за пользователями.

---

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | FastAPI + Uvicorn (ASGI) |
| ORM | SQLAlchemy 2 (async) + asyncpg |
| Миграции | Alembic |
| Кеш | Redis (cache-aside) |
| Авторизация | JWT ES256 via JWKS (python-jose) |
| Валидация | Pydantic v2 |
| Метрики | Prometheus (prometheus-fastapi-instrumentator) |
| Python | 3.13+ |

---

## Архитектура

```
                ┌─────────────────────────────────────────────┐
                │                tour-service                  │
                │                                              │
  Request  ──►  │  Router → Repository → SQLAlchemy → Postgres │
                │              ↕                               │
                │           Redis (cache-aside)                │
                │              ↕                               │
                │   JWT verify via JWKS ← auth-service         │
                └─────────────────────────────────────────────┘
```

**JWT-верификация.** При старте сервиса `JwksClient` загружает публичные ключи с `auth-service/.well-known/jwks.json` и кеширует их. При встрече неизвестного `kid` кеш обновляется автоматически — ротация ключей не требует рестарта. При недоступности auth-service используется устаревший кеш (graceful degradation).

**Кеширование туров.** `GET /tours/{id}` и горящие туры хранятся в Redis (TTL задаётся через `TOUR_CACHE_TTL_SECONDS`). Любая мутация тура (`PATCH`, `DELETE`) инвалидирует оба ключа параллельно.

**Статусы тура.**

```
draft ──► active ──► archived
```

- `draft` — черновик, виден только `employee`/`admin`.
- `active` — опубликован, отображается в публичном каталоге.
- `archived` — снят с продажи, скрыт из каталога.

Клиенты без токена или с ролью `user` принудительно получают только `active` туры вне зависимости от переданного фильтра `status`.

**Горящий тур.** Тур считается горящим если: `status = active` AND `0 ≤ (start_date − today) ≤ 5 дней`.

---

## Аутентификация и роли

Все запросы, требующие авторизации, принимают заголовок:

```
Authorization: Bearer <access_token>
```

Токен выдаётся **auth-service**. Роли:

| Роль | Возможности |
|---|---|
| `user` | чтение публичных данных, создание/редактирование своих отзывов |
| `employee` | + создание и редактирование городов, отелей, туров |
| `admin` | + удаление городов, отелей, туров |

Эндпоинты без токена (`OptionalUser`) при наличии валидного токена меняют поведение — например, `employee`/`admin` видят туры в статусе `draft`.

---

## Общие паттерны

### Пагинация

Все list-эндпоинты принимают query-параметры:

| Параметр | Тип | По умолчанию | Ограничения |
|---|---|---|---|
| `page` | int | `1` | ≥ 1 |
| `page_size` | int | `20` | 1–100 |

Ответ всегда оборачивается в:

```json
{
  "items": [...],
  "total": 142,
  "page": 1,
  "page_size": 20,
  "pages": 8
}
```

### Формат ошибок

```json
{ "detail": "описание ошибки" }
```

Ошибки валидации возвращают дополнительный массив:

```json
{
  "detail": "ошибка валидации",
  "errors": [
    { "field": "body.price", "message": "Input should be greater than 0" }
  ]
}
```

| HTTP | Когда |
|---|---|
| `400` | Невалидные данные запроса |
| `401` | Токен отсутствует, истёк или невалиден |
| `403` | Недостаточно прав |
| `404` | Ресурс не найден |
| `409` | Конфликт (дубликат) |
| `422` | Ошибка валидации тела запроса |
| `503` | auth-service недоступен (JWKS кеш пуст) |

---

## API Reference

Базовый URL: `http://localhost:8002/api/v1`

### Cities

#### `GET /cities`
Список городов. Публичный.

**Query:** `page`, `page_size`

**Response `200`:** `PaginatedResponse<CityResponse>`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Барселона",
      "country": "Испания",
      "description": "...",
      "climate": "средиземноморский"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

---

#### `GET /cities/{city_id}`
Публичный.

**Response `200`:** `CityResponse` | **`404`** если не найден.

---

#### `POST /cities`
Требует `employee` или `admin`.

**Body:**

```json
{
  "name": "Барселона",
  "country": "Испания",
  "description": "Столица Каталонии",
  "climate": "средиземноморский"
}
```

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `name` | string | да | 1–100 символов, обрезаются пробелы |
| `country` | string | да | 1–100 символов, обрезаются пробелы |
| `description` | string\|null | нет | до 2000 символов |
| `climate` | string\|null | нет | до 100 символов |

**Response `201`:** `CityResponse` | **`409`** если город с таким именем уже существует.

---

#### `PATCH /cities/{city_id}`
Требует `employee` или `admin`. Partial update — передавай только изменяемые поля.

**Response `200`:** `CityResponse` | **`404`** | **`409`**

---

#### `DELETE /cities/{city_id}`
Требует `admin`. Вернёт `409` если к городу привязаны туры (RESTRICT на FK).

**Response `204`**

---

### Hotels

#### `GET /hotels`
Публичный.

**Query:** `page`, `page_size`, `city_id` (UUID), `min_stars` (1–5), `max_stars` (1–5)

**Response `200`:** `PaginatedResponse<HotelResponse>`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Hotel Arts",
      "stars": 5,
      "address": "Carrer de la Marina, 19-21",
      "description": "...",
      "amenities": ["pool", "spa", "gym"],
      "city": { "id": "uuid", "name": "Барселона", "country": "Испания", "description": null, "climate": null }
    }
  ],
  ...
}
```

---

#### `GET /hotels/{hotel_id}`
Публичный.

**Response `200`:** `HotelResponse` | **`404`**

---

#### `POST /hotels`
Требует `employee` или `admin`.

**Body:**

```json
{
  "city_id": "uuid",
  "name": "Hotel Arts",
  "stars": 5,
  "address": "Carrer de la Marina, 19-21",
  "description": "Отель на берегу моря",
  "amenities": ["pool", "spa", "gym"]
}
```

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `city_id` | UUID | да | город должен существовать |
| `name` | string | да | 1–200 символов |
| `stars` | int | да | 1–5 |
| `address` | string | да | 1–500 символов |
| `description` | string\|null | нет | до 2000 символов |
| `amenities` | string[] | нет | до 50 элементов, пустые строки и дубликаты удаляются |

**Response `201`:** `HotelResponse` | **`404`** если город не найден.

---

#### `PATCH /hotels/{hotel_id}`
Требует `employee` или `admin`.

**Response `200`:** `HotelResponse`

---

#### `DELETE /hotels/{hotel_id}`
Требует `admin`.

**Response `204`**

---

### Tours

#### `GET /tours`
Публичный (optional auth). Без токена или с ролью `user` — только `status=active` туры.

**Query parameters:**

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `page` | int | `1` | |
| `page_size` | int | `20` | |
| `city_id` | UUID | — | фильтр по городу |
| `hotel_id` | UUID | — | фильтр по отелю |
| `min_price` | decimal | — | минимальная цена (> 0) |
| `max_price` | decimal | — | максимальная цена (> 0) |
| `start_date_from` | date `YYYY-MM-DD` | — | начало не раньше |
| `start_date_to` | date `YYYY-MM-DD` | — | начало не позже |
| `meal_type` | `none`\|`breakfast`\|`all` | — | тип питания |
| `status` | `draft`\|`active`\|`archived` | `active` | только для staff |
| `only_hot` | bool | `false` | только горящие туры (кешируются отдельно) |
| `sort_by` | `price`\|`start_date`\|`created_at` | `start_date` | |
| `order` | `asc`\|`desc` | `asc` | |

**Response `200`:** `PaginatedResponse<TourListItemResponse>`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Барселона 7 ночей",
      "start_date": "2025-08-10",
      "end_date": "2025-08-17",
      "price": "85000.00",
      "available": 4,
      "meal_type": "breakfast",
      "status": "active",
      "duration_nights": 7,
      "is_hot": false,
      "city_id": "uuid",
      "hotel_id": "uuid"
    }
  ],
  ...
}
```

---

#### `GET /tours/{tour_id}`
Публичный. Ответ кешируется в Redis на `TOUR_CACHE_TTL_SECONDS`.

**Response `200`:** `TourResponse`

```json
{
  "id": "uuid",
  "name": "Барселона 7 ночей",
  "description": "Тур включает...",
  "start_date": "2025-08-10",
  "end_date": "2025-08-17",
  "price": "85000.00",
  "available": 4,
  "meal_type": "breakfast",
  "status": "active",
  "created_at": "2025-05-01T10:00:00Z",
  "duration_nights": 7,
  "is_hot": false,
  "city": { "id": "uuid", "name": "Барселона", "country": "Испания", "description": null, "climate": null },
  "hotel": { "id": "uuid", "name": "Hotel Arts", "stars": 5, "address": "..." }
}
```

**`404`** если тур не найден.

---

#### `POST /tours`
Требует `employee` или `admin`. Тур создаётся в статусе `draft` — для публикации используй `PATCH` с `"status": "active"`.

**Body:**

```json
{
  "city_id": "uuid",
  "hotel_id": "uuid",
  "name": "Барселона 7 ночей",
  "description": "Описание тура",
  "start_date": "2025-08-10",
  "end_date": "2025-08-17",
  "price": "85000.00",
  "available": 10,
  "meal_type": "breakfast",
  "status": "draft"
}
```

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `city_id` | UUID | да | город должен существовать |
| `hotel_id` | UUID | да | отель должен существовать |
| `name` | string | да | 1–200 символов, обрезаются пробелы |
| `description` | string\|null | нет | до 5000 символов |
| `start_date` | date | да | не в прошлом |
| `end_date` | date | да | позже `start_date` |
| `price` | decimal | да | > 0, до 2 знаков после запятой |
| `available` | int | да | ≥ 0 |
| `meal_type` | `none`\|`breakfast`\|`all` | нет | по умолчанию `none` |
| `status` | `draft`\|`active`\|`archived` | нет | по умолчанию `draft` |

**Response `201`:** `TourResponse` | **`404`** если город или отель не найден.

---

#### `PATCH /tours/{tour_id}`
Требует `employee` или `admin`. Partial update. Инвалидирует кеш тура и список горящих туров.

Публикация черновика:
```json
{ "status": "active" }
```

Снятие с продажи:
```json
{ "status": "archived" }
```

**Response `200`:** `TourResponse` | **`404`**

---

#### `DELETE /tours/{tour_id}`
Требует `admin`. Каскадно удаляет все отзывы тура. Инвалидирует кеш.

**Response `204`**

---

### Reviews

#### `GET /tours/{tour_id}/reviews`
Публичный. Отзывы конкретного тура, сортировка по `created_at DESC`.

**Query:** `page`, `page_size`

**Response `200`:** `PaginatedResponse<ReviewResponse>`

```json
{
  "items": [
    {
      "id": "uuid",
      "tour_id": "uuid",
      "client_id": "uuid",
      "rating": 5,
      "comment": "Отличный тур!",
      "created_at": "2025-05-01T14:30:00Z",
      "updated_at": "2025-05-01T14:30:00Z"
    }
  ],
  ...
}
```

**`404`** если тур не найден.

---

#### `POST /reviews`
Требует любого авторизованного пользователя (`user`/`employee`/`admin`). `client_id` берётся из JWT — клиент не может оставить отзыв от чужого имени.

**Body:**

```json
{
  "tour_id": "uuid",
  "rating": 5,
  "comment": "Отличный тур!"
}
```

| Поле | Тип | Обязательное | Правила |
|---|---|---|---|
| `tour_id` | UUID | да | тур должен существовать |
| `rating` | int | да | 1–5 |
| `comment` | string\|null | нет | до 2000 символов, пустая строка приводится к `null` |

**Response `201`:** `ReviewResponse` | **`404`** если тур не найден | **`409`** если пользователь уже оставлял отзыв на этот тур.

---

#### `PATCH /reviews/{review_id}`
Требует авторизации. Только автор отзыва может редактировать.

**Body:** любое из полей `rating`, `comment`.

**Response `200`:** `ReviewResponse` | **`403`** если не владелец | **`404`**

---

#### `DELETE /reviews/{review_id}`
Требует авторизации. Автор или `employee`/`admin` могут удалить.

**Response `204`** | **`403`** | **`404`**

---

### Health & Ops

| Эндпоинт | Описание |
|---|---|
| `GET /health/live` | Liveness probe — сервис запущен |
| `GET /health/ready` | Readiness probe — БД и Redis доступны |
| `GET /metrics` | Prometheus метрики |

`/health/ready` возвращает `503` если хотя бы одна зависимость недоступна:

```json
{ "status": "unavailable", "db": "ok", "redis": "unavailable" }
```

---

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни значения:

```bash
cp .env.example .env
```

| Переменная | Описание | Пример |
|---|---|---|
| `ENVIRONMENT` | `development`\|`staging`\|`production` | `development` |
| `DEBUG` | Включает debug-логирование | `false` |
| `DATABASE_URL` | asyncpg DSN | `postgresql+asyncpg://user:pass@localhost:5432/tour_db` |
| `REDIS_URL` | Redis DSN | `redis://localhost:6379` |
| `REDIS_CACHE_DB` | Номер БД Redis | `0` |
| `TOUR_CACHE_TTL_SECONDS` | TTL кеша туров в секундах | `300` |
| `AUTH_SERVICE_JWKS_URL` | JWKS endpoint auth-service | `http://localhost:8000/.well-known/jwks.json` |
| `JWKS_CACHE_TTL_SECONDS` | TTL кеша публичных ключей | `3600` |
| `JWT_ALGORITHM` | Алгоритм подписи токена | `ES256` |
| `DB_POOL_SIZE` | Размер пула соединений | `10` |
| `DB_MAX_OVERFLOW` | Максимальный overflow пула | `20` |
| `DB_ECHO` | Логировать SQL-запросы | `false` |
| `CORS_ALLOWED_ORIGINS` | JSON-массив разрешённых origins | `["http://localhost:3000"]` |
| `PORT` | Порт сервиса | `8002` |

---

## Локальная разработка

### Зависимости

- Python 3.13+
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 15+
- Redis 7+

### Запуск

```bash
cp .env.example .env
# заполни DATABASE_URL и REDIS_URL

uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8002
```

Swagger UI доступен на `http://localhost:8002/docs` (только в `development`/`staging`).

### Миграции

```bash
# применить все
uv run alembic upgrade head

# создать новую
uv run alembic revision --autogenerate -m "описание изменения"

# откатить последнюю
uv run alembic downgrade -1
```

### Docker Compose

```bash
docker compose up --build
```

---

## Тесты

```bash
# только unit-тесты
uv run pytest tests/unit/ -v

# с coverage-отчётом (порог 80%)
uv run pytest --cov=app --cov-report=term-missing
```

Unit-тесты не требуют запущенной БД или Redis — Redis мокируется через `unittest.mock.AsyncMock`.

**Что покрыто:**
- `Tour.duration_nights`, `Tour.is_hot` — граничные значения и все ветки статусов
- Валидаторы схем: `TourCreate`, `TourUpdate`, `TourFilters`, `ReviewCreate`, `ReviewUpdate`
- Утилиты нормализации строк (`normalize_str`, `normalize_optional_text`)
- `PaginationParams.offset`, `PaginatedResponse.pages`
- `TourCache` — cache miss/hit, corrupt JSON, инвалидация
- `_parse_token_payload` — все ветки 401
