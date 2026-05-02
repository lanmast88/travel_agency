"""
Интеграционные тесты /users — RBAC и защита от деактивации собственного аккаунта.
"""
from uuid import uuid4

import pytest

from app.core.exceptions import InvalidCredentialsError
from tests.factories import make_user


class TestGetMe:
    @pytest.mark.asyncio
    async def test_returns_own_profile_without_sensitive_fields(
        self, user_client, active_user
    ) -> None:
        resp = await user_client.get("/api/v1/users/me")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(active_user.id)
        assert "hashed_password" not in body
        assert "password" not in body

    @pytest.mark.asyncio
    async def test_me_route_takes_precedence_over_user_id_route(self, user_client) -> None:
        """/me должен матчиться раньше /{user_id} — иначе строка не парсится как UUID."""
        resp = await user_client.get("/api/v1/users/me")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_unauthenticated_request_returns_401(self, anon_client) -> None:
        resp = await anon_client.get("/api/v1/users/me")
        assert resp.status_code == 401


class TestUpdateMe:
    @pytest.mark.asyncio
    async def test_empty_body_returns_422(self, user_client) -> None:
        resp = await user_client.patch("/api/v1/users/me", json={})
        assert resp.status_code == 422
        assert "нет данных" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_returns_401(
        self, user_client, mock_auth_service
    ) -> None:
        mock_auth_service.change_password.side_effect = InvalidCredentialsError("неверный")
        resp = await user_client.patch("/api/v1/users/me/password", json={
            "current_password": "Wrong1!",
            "new_password": "NewPass2@",
            "new_password_confirm": "NewPass2@",
        })
        assert resp.status_code == 401


class TestRBAC:
    @pytest.mark.asyncio
    async def test_regular_user_cannot_create_users(self, user_client) -> None:
        resp = await user_client.post("/api/v1/users", json={
            "email": "x@x.com", "password": "Secret1!",
            "password_confirm": "Secret1!", "first_name": "X", "role": "admin",
        })
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_create_user(self, admin_client, mock_auth_service) -> None:
        mock_auth_service.create_user.return_value = make_user()
        resp = await admin_client.post("/api/v1/users", json={
            "email": "x@x.com", "password": "Secret1!",
            "password_confirm": "Secret1!", "first_name": "X",
        })
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_regular_user_cannot_list_users(self, user_client) -> None:
        resp = await user_client.get("/api/v1/users")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_employee_can_list_users(self, employee_client, mock_user_repo) -> None:
        mock_user_repo.get_all.return_value = []
        resp = await employee_client.get("/api/v1/users")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_regular_user_cannot_get_other_user_profile(
        self, user_client, mock_user_repo
    ) -> None:
        other_user = make_user()
        mock_user_repo.get_by_id.return_value = other_user
        resp = await user_client.get(f"/api/v1/users/{other_user.id}")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_employee_can_get_any_user_profile(
        self, employee_client, mock_user_repo
    ) -> None:
        target = make_user()
        mock_user_repo.get_by_id.return_value = target
        resp = await employee_client.get(f"/api/v1/users/{target.id}")
        assert resp.status_code == 200


class TestDeactivateUser:
    @pytest.mark.asyncio
    async def test_admin_can_deactivate_other_user(self, admin_client, mock_user_repo) -> None:
        target = make_user()
        mock_user_repo.get_by_id.return_value = target
        resp = await admin_client.delete(f"/api/v1/users/{target.id}")
        assert resp.status_code == 204
        mock_user_repo.deactivate.assert_called_once()

    @pytest.mark.asyncio
    async def test_admin_cannot_deactivate_own_account(
        self, admin_client, mock_user_repo, admin
    ) -> None:
        """Нельзя деактивировать собственный аккаунт — защита от случайной потери доступа."""
        mock_user_repo.get_by_id.return_value = admin
        resp = await admin_client.delete(f"/api/v1/users/{admin.id}")
        assert resp.status_code == 400
        assert "собственный" in resp.json()["detail"]
        mock_user_repo.deactivate.assert_not_called()

    @pytest.mark.asyncio
    async def test_nonexistent_user_returns_404(self, admin_client, mock_user_repo) -> None:
        mock_user_repo.get_by_id.return_value = None
        resp = await admin_client.delete(f"/api/v1/users/{uuid4()}")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_regular_user_cannot_deactivate_anyone(self, user_client, mock_user_repo) -> None:
        target = make_user()
        mock_user_repo.get_by_id.return_value = target
        resp = await user_client.delete(f"/api/v1/users/{target.id}")
        assert resp.status_code == 403
