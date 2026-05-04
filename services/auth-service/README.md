# auth-service

Микросервис аутентификации и авторизации платформы **StackTour**.

Выдаёт JWT-токены (ES256) при регистрации и входе, управляет сессиями через refresh-ротацию, отзывает токены при logout, выставляет JWKS-endpoint для верификации токенов другими сервисами.

---

## Содержание

- [Стек](#стек)
- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Генерация ключей](#генерация-ключей)
- [Миграции](#миграции)
- [Система ролей](#система-ролей)
- [JWT: структура и жизненный цикл](#jwt-структура-и-жизненный-цикл)
- [API](#api)
  - [Коды ошибок](#коды-ошибок)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/logout](#post-authlogout)
  - [GET /users/me](#get-usersme)
  - [PATCH /users/me](#patch-usersme)
  - [PATCH /users/me/password](#patch-usersmeparent)
  - [POST /users](#post-users)
  - [GET /users](#get-users)
  - [GET /users/:id](#get-usersid)
  - [PATCH /users/:id](#patch-usersid)
  - [DELETE /users/:id](#delete-usersid)
  - [GET /.well-known/jwks.json](#get-well-knownjwksjson)
- [Rate Limiting](#rate-limiting)
- [Блокировка аккаунта](#блокировка-аккаунта)
- [Health checks](#health-checks)
- [Интеграция с другими сервисами](#интеграция-с-другими-сервисами)
- [Тесты](#тесты)

---

## Стек

| Компонент | Технология |
|---|---|
| Runtime | Python 3.13, FastAPI |
| БД | PostgreSQL 15 + SQLAlchemy 2.x async + asyncpg |
| Кэш / сессии | Redis — два логических DB: blacklist (DB 0), rate limiting (DB 1) |
| Подпись токенов | JWT ES256 (ECDSA P-256), python-jose |
| Хэширование паролей | bcrypt (passlib) |
| Миграции | Alembic |
| Линтинг | ruff, mypy (strict) |

---

## Архитектура

```
HTTP Request
    │
    ▼
routers/auth.py          ← /auth/* (register, login, refresh, logout)
routers/users.py         ← /users/* (профиль, управление пользователями)
    │
    ▼
logic/auth.py            ← AuthService: бизнес-логика (регистрация, вход, смена пароля)
    │
    ├── repositories/user.py  ← SQL-запросы (SQLAlchemy)
    ├── logic/jwt.py          ← create/decode/revoke токенов
    └── logic/rate_limiter.py ← Lua-атомарный INCR+EXPIRE в Redis

routers/jwks.py          ← GET /.well-known/jwks.json (discovery для других сервисов)
```

Сессия БД управляется через `get_db()` (FastAPI dependency): коммит при успехе, rollback при исключении. Репозиторий не вызывает `rollback()`.

Два независимых Redis-клиента: один для blacklist токенов, второй для счётчиков rate limit — разделение позволяет сбрасывать счётчики без затрагивания blacklist и наоборот.

---

## Быстрый старт

```bash
cd services/auth-service

# Установить зависимости
pip install -e ".[dev]"

# Сгенерировать ключевую пару (если нет private.pem / public.pem)
openssl ecparam -name prime256v1 -genkey -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem

# Применить миграции
alembic upgrade head

# Запустить сервис
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger UI доступен на `http://localhost:8000/docs` (только в `development`).

---

## Переменные окружения

Сервис читает `.env` из корня `services/auth-service/`. Обязательные поля не имеют дефолтов.

| Переменная | Обязательная | Дефолт | Описание |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | ✓ | — | `redis://localhost:6379` |
| `ENVIRONMENT` | | `development` | `development` / `staging` / `production` |
| `DEBUG` | | `false` | |
| `PORT` | | `8000` | |
| `JWT_PRIVATE_KEY_PATH` | | `./private.pem` | Путь к PEM-файлу приватного ключа EC |
| `JWT_PUBLIC_KEY_PATH` | | `./public.pem` | Путь к PEM-файлу публичного ключа EC |
| `JWT_ALGORITHM` | | `ES256` | |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | | `15` | Время жизни access-токена |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | | `30` | Время жизни refresh-токена |
| `REDIS_TOKEN_BLACKLIST_DB` | | `0` | Номер Redis DB для blacklist |
| `REDIS_RATE_LIMIT_DB` | | `1` | Номер Redis DB для rate limiting |
| `CORS_ALLOWED_ORIGINS` | | `["http://localhost:3000"]` | JSON-список origins |
| `CORS_ALLOW_CREDENTIALS` | | `true` | |
| `RATE_LIMIT_LOGIN_ATTEMPTS` | | `5` | Попыток до блокировки (rate limit + account lock) |
| `RATE_LIMIT_WINDOW_SECONDS` | | `300` | Окно rate limit в секундах |
| `DB_POOL_SIZE` | | `10` | |
| `DB_MAX_OVERFLOW` | | `20` | |
| `DB_ECHO` | | `false` | Логировать SQL-запросы |

> `JWT_KEY_ID` (kid) вычисляется автоматически как первые 16 символов base64url(SHA-256(DER-ключ)). Ручная установка не требуется и не поддерживается.

---

## Генерация ключей

Сервис использует ECDSA P-256 (ES256). Ключи хранятся как PEM-файлы рядом с `.env`.

```bash
# Генерация новой пары
openssl ecparam -name prime256v1 -genkey -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem
```

**Ротация ключей:** замените PEM-файлы и перезапустите сервис. `kid` пересчитается автоматически. Клиенты, кешировавшие JWKS, обнаружат неизвестный `kid` при следующей попытке верификации — это сигнал принудительно обновить JWKS с endpoint.

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

## Система ролей

| Роль | Описание |
|---|---|
| `user` | Базовая роль. Доступ только к `/users/me` и `/auth/*` |
| `employee` | Сотрудник. Может читать список пользователей и их профили |
| `admin` | Полный доступ: создание, обновление, деактивация пользователей |

Роль встраивается в JWT при выпуске токена и не требует обращения к БД при каждом запросе.

---

## JWT: структура и жизненный цикл

### Формат заголовка

```json
{
  "alg": "ES256",
  "typ": "JWT",
  "kid": "<16-char-key-id>"
}
```

### Payload

```json
{
  "sub": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "role": "employee",
  "type": "access",
  "iat": 1735000000,
  "exp": 1735000900,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Поле | Описание |
|---|---|
| `sub` | UUID пользователя |
| `role` | `user` / `employee` / `admin` |
| `type` | `access` или `refresh` — разделение предотвращает подстановку refresh вместо access |
| `jti` | UUID токена — используется для точечной инвалидации refresh в Redis при logout |

### Жизненный цикл

```
register/login
    │
    └─► access_token (15 мин) + refresh_token (30 дней)
              │
              │  access истёк?
              ▼
         POST /auth/refresh (refresh_token)
              │
              ├─► новый access_token + новый refresh_token
              └─► старый refresh_token → blacklist (ротация)

         POST /auth/logout (refresh_token)
              └─► refresh_token.jti → Redis blacklist (TTL = оставшееся время жизни)
```

**Access-токены не отзываются явно** — их TTL 15 минут. Logout отзывает только refresh-токен, делая невозможным получение новой пары. Если требуется немедленная инвалидация access-токена (например, при деактивации пользователя), выполните проверку `user.is_active` в `get_current_user` — эта проверка уже реализована.

**Refresh rotation:** при каждом вызове `/auth/refresh` старый refresh-токен немедленно помещается в blacklist до выдачи нового. Перехваченный токен становится невалидным сразу.

---

## API

Базовый URL: `/api/v1` (кроме `/.well-known/jwks.json`).

### Аутентификация

Защищённые эндпоинты требуют access-токен:

```
Authorization: Bearer <access_token>
```

Отсутствует или невалиден → `401 Unauthorized` + `WWW-Authenticate: Bearer`.

---

### Коды ошибок

| Код | Причина |
|---|---|
| `400` | Нельзя деактивировать собственный аккаунт |
| `401` | Токен отсутствует, истёк, невалидный тип или отозван; неверные credentials |
| `403` | Недостаточно прав; аккаунт деактивирован |
| `404` | Пользователь не найден |
| `409` | Email уже зарегистрирован |
| `422` | Ошибка валидации (Pydantic) |
| `429` | Rate limit по IP или блокировка аккаунта после N неудачных попыток |

Тело ошибки:

```json
{ "detail": "описание ошибки" }
```

При `429` от rate limit добавляется заголовок `Retry-After: <секунды>`.

---

### POST /auth/register

Зарегистрировать нового пользователя (роль `user`). Немедленно возвращает токены.

Rate-limited по IP.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "Secret1!",
  "password_confirm": "Secret1!",
  "first_name": "Иван",
  "last_name": "Иванов"
}
```

**Правила валидации пароля:**
- 8–128 символов
- Хотя бы одна цифра
- Хотя бы один специальный символ (`!@#$%^&*()-_=+[]{}` и др.)
- Без пробелов в начале и конце

**Response `201`:**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "refresh_expires_in": 2592000
}
```

---

### POST /auth/login

Войти с email и паролем. Использует форму `application/x-www-form-urlencoded` (OAuth2 Password Flow).

Rate-limited по IP.

**Request body** (`Content-Type: application/x-www-form-urlencoded`):

```
username=user@example.com&password=Secret1!
```

> Поле называется `username` — это требование спецификации OAuth2 Password Flow. Значение — email.

**Response `200`:** тот же формат `TokenResponse`, что и у `/register`.

**Ошибки:**
- `401` — неверный email или пароль (намеренно единственное сообщение — не раскрывает существование аккаунта)
- `429` — превышен rate limit по IP или аккаунт заблокирован после N неудачных попыток

---

### POST /auth/refresh

Обменять refresh-токен на новую пару токенов. Старый refresh-токен немедленно отзывается.

**Request body:**

```json
{
  "refresh_token": "eyJ..."
}
```

**Response `200`:** `TokenResponse` с новыми токенами.

**Ошибки:**
- `401` — невалидный, истёкший или уже отозванный refresh-токен

---

### POST /auth/logout

Отозвать refresh-токен. Access-токен продолжает работать до истечения TTL.

**Request body:**

```json
{
  "refresh_token": "eyJ..."
}
```

**Response `204`:** тело отсутствует.

---

### GET /users/me

Профиль текущего пользователя. Требует любую валидную роль.

**Response `200`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "user@example.com",
  "first_name": "Иван",
  "last_name": "Иванов",
  "role": "employee",
  "created_at": "2026-01-15T10:30:00Z",
  "last_login_at": "2026-04-01T08:00:00Z"
}
```

---

### PATCH /users/me

Обновить собственный профиль. Передавать только изменяемые поля.

**Request body** (все поля опциональны):

```json
{
  "first_name": "Пётр",
  "last_name": "Петров"
}
```

> `role` и `is_active` через этот эндпоинт не изменяются.

**Response `200`:** обновлённый `UserResponse`.

---

### PATCH /users/me/password

Сменить пароль текущего пользователя.

**Request body:**

```json
{
  "current_password": "OldSecret1!",
  "new_password": "NewSecret2@",
  "new_password_confirm": "NewSecret2@"
}
```

**Response `204`:** тело отсутствует.

**Ошибки:**
- `401` — неверный текущий пароль

---

### POST /users

Создать пользователя с явным указанием роли. Требует роль `admin`.

**Request body:**

```json
{
  "email": "employee@example.com",
  "password": "Secret1!",
  "password_confirm": "Secret1!",
  "first_name": "Мария",
  "last_name": "Смирнова",
  "role": "employee"
}
```

`role` — одно из `user`, `employee`, `admin`. По умолчанию `user`.

**Response `201`:** `UserResponse` созданного пользователя.

---

### GET /users

Список пользователей. Требует роль `employee` или `admin`.

**Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `role` | `user\|employee\|admin` | Фильтр по роли |
| `is_active` | `bool` | Фильтр по статусу активности |
| `limit` | `int` | Размер страницы, дефолт 50 |
| `offset` | `int` | Смещение, дефолт 0 |

**Response `200`:**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "employee@example.com",
    "first_name": "Мария",
    "last_name": "Смирнова",
    "role": "employee",
    "created_at": "2026-01-15T10:30:00Z",
    "last_login_at": null
  }
]
```

---

### GET /users/:id

Профиль конкретного пользователя. Требует роль `employee` или `admin`.

**Response `200`:** `UserResponse`.

---

### PATCH /users/:id

Обновить профиль пользователя. Требует роль `admin`.

**Request body** (все поля опциональны):

```json
{
  "first_name": "Новое",
  "last_name": "Имя",
  "is_active": true,
  "role": "admin"
}
```

**Response `200`:** обновлённый `UserResponse`.

---

### DELETE /users/:id

Деактивировать пользователя (устанавливает `is_active=false`). Требует роль `admin`.

> Физического удаления нет — только деактивация. Деактивированный пользователь не может войти и получает `403` при обращении к защищённым эндпоинтам.

**Ошибки:**
- `400` — нельзя деактивировать собственный аккаунт

**Response `204`:** тело отсутствует.

---

### GET /.well-known/jwks.json

Публичные ключи в формате JWKS (RFC 7517). Используется другими сервисами для верификации JWT без обращения к auth-service на каждый запрос.

Этот endpoint **не под `/api/v1`** — стандартный путь discovery.

**Response `200`:**

```json
{
  "keys": [
    {
      "kty": "EC",
      "use": "sig",
      "alg": "ES256",
      "kid": "AbCdEfGh01234567",
      "crv": "P-256",
      "x": "base64url-encoded-x",
      "y": "base64url-encoded-y"
    }
  ]
}
```

Заголовок ответа: `Cache-Control: public, max-age=3600`.

**Алгоритм kid:** SHA-256 от DER-представления публичного ключа, первые 16 символов base64url без padding. Детерминирован — не меняется между перезапусками при одном и том же ключе. Меняется при ротации ключей.

---

## Rate Limiting

Rate limiting работает на уровне IP-адреса для `/auth/register` и `/auth/login`.

- Лимит: `RATE_LIMIT_LOGIN_ATTEMPTS` запросов за `RATE_LIMIT_WINDOW_SECONDS` секунд (дефолт: 5/300)
- Счётчик хранится в Redis DB 1, TTL = размер окна
- При превышении: `429 Too Many Requests` + заголовок `Retry-After: <секунды>`
- Реализован через Lua-скрипт для атомарного `INCR + EXPIRE` (исключает race condition)
- IP берётся из заголовка `X-Real-IP` (выставляется nginx); fallback — `request.client.host`

---

## Блокировка аккаунта

Независимо от rate limit по IP, каждый аккаунт имеет собственный счётчик неудачных попыток входа.

- После `RATE_LIMIT_LOGIN_ATTEMPTS` неверных паролей подряд аккаунт блокируется на `RATE_LIMIT_WINDOW_SECONDS / 60` минут
- При блокировке: `429 Too Many Requests`
- Счётчик и `locked_until` хранятся в колонках таблицы `users`
- При успешном входе: счётчик обнуляется, `locked_until` сбрасывается

---

## Health checks

| Эндпоинт | Описание |
|---|---|
| `GET /health/live` | Liveness: процесс жив, event loop работает |
| `GET /health/ready` | Readiness: БД + Redis доступны |

**Readiness response:**

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

`503 Service Unavailable` если хотя бы один компонент недоступен.

> Без Redis сервис **не стартует** — blacklist недоступен, что делает logout и refresh небезопасными.

---

## Интеграция с другими сервисами

Сервисы (например, `client-service`) верифицируют токены самостоятельно без обращения к auth-service на каждый запрос:

1. Получить JWKS: `GET http://auth-service:8000/.well-known/jwks.json`
2. Кешировать ключи локально (рекомендуемый TTL: 1 час)
3. При получении JWT — извлечь `kid` из заголовка, найти соответствующий ключ в кеше
4. Если `kid` не найден — принудительно обновить JWKS и повторить (ротация ключей)
5. Верифицировать подпись и `exp`, проверить `type == "access"`

**Формат токена в запросе:**
```
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ii4uLiJ9...
```

**Переменная окружения для клиентов:**
```
AUTH_SERVICE_JWKS_URL=http://auth-service:8000/.well-known/jwks.json
```

---

## Тесты

```bash
# Все тесты
pytest

# С покрытием (порог 80%)
pytest --cov=app --cov-report=term-missing

# Только unit
pytest tests/unit

# Только интеграционные
pytest tests/integration
```

Интеграционные тесты поднимают FastAPI через `httpx.AsyncClient` с `ASGITransport` и переопределяют зависимости через `dependency_overrides`. Реальные БД и Redis не требуются.

Unit-тесты охватывают:
- `logic/jwt.py` — создание, декодирование, отзыв токенов
- `logic/auth.py` (AuthService) — регистрация, вход, refresh, logout, смена пароля
- `models/user.py` — блокировка аккаунта, сброс счётчика
- `schemas/user.py` — валидация пароля, совпадение полей
