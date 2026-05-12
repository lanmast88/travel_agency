FROM python:3.13-slim AS builder

WORKDIR /app

RUN pip install "uv==0.6.14"

COPY pyproject.toml .
COPY app/ app/

RUN uv pip install --system --no-cache .

# ---------------------------------------------------------------------------

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=builder /usr/local/bin/alembic /usr/local/bin/alembic

COPY . .

RUN useradd --no-create-home --shell /bin/false appuser && \
    chown -R appuser:appuser /app && \
    chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health/live')" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]

# ---------------------------------------------------------------------------

FROM python:3.13-slim AS dev

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install "uv==0.6.14"

COPY pyproject.toml .
COPY app/ app/

RUN uv pip install --system --no-cache ".[dev]"

COPY . .

CMD ["pytest", "-v", "--cov=app", "--cov-report=term-missing"]
