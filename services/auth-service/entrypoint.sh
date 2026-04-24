#!/bin/sh
set -e

MAX_RETRIES=10
RETRY_DELAY=3
n=0

echo "Применяем миграции..."
until alembic upgrade head; do
    n=$((n + 1))
    if [ "$n" -ge "$MAX_RETRIES" ]; then
        echo "Миграции не применились после $MAX_RETRIES попыток, выход"
        exit 1
    fi
    echo "Ошибка миграции, повтор через ${RETRY_DELAY}с... ($n/$MAX_RETRIES)"
    sleep "$RETRY_DELAY"
done

echo "Запускаем сервис..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
