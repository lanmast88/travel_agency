"""
Интеграционные тесты /api/v1/clients — HTTP-контракт: коды, заголовки, структура тела.
Бизнес-логика покрыта в test_client_service.py, здесь только то, что видит клиент API.
"""
import uuid
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.schemas.client import ClientCreate

_BASE = "/api/v1/clients"

_VALID_PAYLOAD = {
    "full_name": "Иван Иванов",
    "phone": "+79001234567",
    "passport": "1234567890",
    "email": "ivan@example.com",
    "birth_date": "1990-01-01",
}


class TestListClients:
    async def test_employee_gets_200_with_paginated_body(self, employee_client) -> None:
        resp = await employee_client.get(_BASE)
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        assert "page" in body

    async def test_anon_gets_401(self, anon_client) -> None:
        resp = await anon_client.get(_BASE)
        assert resp.status_code == 401


class TestCreateClient:
    async def test_employee_creates_returns_201(self, employee_client) -> None:
        resp = await employee_client.post(_BASE, json=_VALID_PAYLOAD)
        assert resp.status_code == 201
        body = resp.json()
        assert "id" in body
        assert body["full_name"] == "Иван Иванов"

    async def test_invalid_payload_returns_422(self, employee_client) -> None:
        resp = await employee_client.post(_BASE, json={"full_name": "X"})
        assert resp.status_code == 422

    async def test_underage_birth_date_returns_422(self, employee_client) -> None:
        from datetime import date
        today = date.today()
        underage = today.replace(year=today.year - 17).isoformat()
        resp = await employee_client.post(_BASE, json={**_VALID_PAYLOAD, "birth_date": underage})
        assert resp.status_code == 422

    async def test_conflict_returns_409(self, employee_client, mock_service: AsyncMock) -> None:
        mock_service.create.side_effect = ConflictError("клиент с таким телефоном уже существует")
        resp = await employee_client.post(_BASE, json=_VALID_PAYLOAD)
        assert resp.status_code == 409

    async def test_anon_gets_401(self, anon_client) -> None:
        resp = await anon_client.post(_BASE, json=_VALID_PAYLOAD)
        assert resp.status_code == 401


class TestGetClient:
    async def test_employee_gets_200_with_full_profile(self, employee_client) -> None:
        cid = uuid.uuid4()
        resp = await employee_client.get(f"{_BASE}/{cid}")
        assert resp.status_code == 200
        body = resp.json()
        assert "id" in body
        assert "loyalty_level" in body
        assert "discount_pct" in body

    async def test_not_found_returns_404(self, employee_client, mock_service: AsyncMock) -> None:
        mock_service.get.side_effect = NotFoundError("Клиент", uuid.uuid4())
        resp = await employee_client.get(f"{_BASE}/{uuid.uuid4()}")
        assert resp.status_code == 404

    async def test_anon_gets_401(self, anon_client) -> None:
        resp = await anon_client.get(f"{_BASE}/{uuid.uuid4()}")
        assert resp.status_code == 401


class TestUpdateClient:
    async def test_employee_updates_returns_200(self, employee_client) -> None:
        cid = uuid.uuid4()
        resp = await employee_client.patch(f"{_BASE}/{cid}", json={"full_name": "Пётр Петров"})
        assert resp.status_code == 200

    async def test_not_found_returns_404(self, employee_client, mock_service: AsyncMock) -> None:
        mock_service.update.side_effect = NotFoundError("Клиент", uuid.uuid4())
        resp = await employee_client.patch(f"{_BASE}/{uuid.uuid4()}", json={"full_name": "Пётр Петров"})
        assert resp.status_code == 404

    async def test_conflict_returns_409(self, employee_client, mock_service: AsyncMock) -> None:
        mock_service.update.side_effect = ConflictError("клиент с таким email уже существует")
        resp = await employee_client.patch(f"{_BASE}/{uuid.uuid4()}", json={"email": "other@example.com"})
        assert resp.status_code == 409

    async def test_anon_gets_401(self, anon_client) -> None:
        resp = await anon_client.patch(f"{_BASE}/{uuid.uuid4()}", json={"full_name": "Пётр Петров"})
        assert resp.status_code == 401


class TestDeleteClient:
    async def test_admin_deletes_returns_204(self, admin_client) -> None:
        resp = await admin_client.delete(f"{_BASE}/{uuid.uuid4()}")
        assert resp.status_code == 204

    async def test_employee_gets_403(self, employee_client) -> None:
        resp = await employee_client.delete(f"{_BASE}/{uuid.uuid4()}")
        assert resp.status_code == 403

    async def test_not_found_returns_404(self, admin_client, mock_service: AsyncMock) -> None:
        mock_service.delete.side_effect = NotFoundError("Клиент", uuid.uuid4())
        resp = await admin_client.delete(f"{_BASE}/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestGetClientLoyalty:
    async def test_returns_200_with_loyalty_info(self, employee_client) -> None:
        resp = await employee_client.get(f"{_BASE}/{uuid.uuid4()}/loyalty")
        assert resp.status_code == 200
        body = resp.json()
        assert "loyalty_level" in body
        assert "sales_count" in body
        assert "discount_pct" in body
        assert "next_level" in body

    async def test_not_found_returns_404(self, employee_client, mock_service: AsyncMock) -> None:
        mock_service.get_loyalty.side_effect = NotFoundError("Клиент", uuid.uuid4())
        resp = await employee_client.get(f"{_BASE}/{uuid.uuid4()}/loyalty")
        assert resp.status_code == 404

    async def test_anon_gets_401(self, anon_client) -> None:
        resp = await anon_client.get(f"{_BASE}/{uuid.uuid4()}/loyalty")
        assert resp.status_code == 401
