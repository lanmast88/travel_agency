from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.core.database import Base

# Единая точка регистрации моделей — добавлять новые модели в app/models/__init__.py
import app.models  # noqa: F401

config = context.config
fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Alembic использует синхронный psycopg2 — asyncpg не поддерживает DDL checkfirst корректно
sync_url = str(settings.database_url).replace("+asyncpg", "+psycopg2")


def run_migrations_offline() -> None:
    """Генерирует SQL-скрипт без подключения к БД (для review или ручного применения)."""
    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = sync_url
    connectable = engine_from_config(cfg, prefix="sqlalchemy.", poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
