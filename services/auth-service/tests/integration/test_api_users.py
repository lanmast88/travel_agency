"""
Интеграционные тесты /users — фокус на разграничении доступа (RBAC)
и защите от деактивации собственного аккаунта.
"""
import pytest

from app.core.exceptions import InvalidCredentialsError
from tests.factories import make_user


class TestGetMe:
    @pytest.mark.asyncio
    async def test_returns_own_data_without_password(self, user_client, active_user) -> None:
        resp = await user_client.get("/api/v1/users/me")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == active_user.id
        assert "hashed_password" not in body

    @pytest.mark.asyncio
    async def test_me_route_not_treated_as_user_id(self, user_client) -> None:
        """/me должен матчиться ДО /{user_id} — иначе "me" не парсится как int → 422."""
        resp = await user_client.get("/api/v1/users/me")
        assert resp.status_code == 200


class TestUpdateMe:
    @pytest.mark.asyncio
    async def test_empty_body_returns_422(self, user_client) -> None:
        resp = await user_client.patch("/api/v1/users/me", json={})
        assert resp.status_code == 422
        assert "нет данных" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_returns_401(self, user_client, mock_auth_service) -> None:
        mock_auth_service.change_password.side_effect = InvalidCredentialsError("неверный")
        resp = await user_client.patch("/api/v1/users/me/password", json={
            "current_password": "Wrong1!",
            "new_password": "NewPass2@",
            "new_password_confirm": "NewPass2@",
        })
        assert resp.status_code == 401


class TestRBAC:
    """Разграничение доступа — самое важное в auth-сервисе."""

    @pytest.mark.asyncio
    async def test_regular_user_cannot_create_users(self, user_client) -> None:
        resp = await user_client.post("/api/v1/users", json={
            "email": "x@x.com", "password": "Secret1!",
            "password_confirm": "Secret1!", "first_name": "X", "role": "admin",
        })
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_create_users(self, admin_client, mock_auth_service) -> None:
        mock_auth_service.create_user.return_value = make_user(id=10)
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
    async def test_regular_user_cannot_get_other_user(self, user_client, mock_user_repo) -> None:
        mock_user_repo.get_by_id.return_value = make_user(id=5)
        resp = await user_client.get("/api/v1/users/5")
        assert resp.status_code == 403


class TestDeactivateUser:
    @pytest.mark.asyncio
    async def test_admin_deactivates_other_user(self, admin_client, mock_user_repo) -> None:
        mock_user_repo.get_by_id.return_value = make_user(id=99)
        resp = await admin_client.delete("/api/v1/users/99")
        assert resp.status_code == 204
        mock_user_repo.deactivate.assert_called_once()

    @pytest.mark.asyncio
    async def test_cannot_deactivate_self(self, admin_client, mock_user_repo, admin) -> None:
        """Mutation guard: нельзя выстрелить себе в ногу."""
        mock_user_repo.get_by_id.return_value = admin
        resp = await admin_client.delete(f"/api/v1/users/{admin.id}")
        assert resp.status_code == 400
        assert "собственный" in resp.json()["detail"]
        mock_user_repo.deactivate.assert_not_called()

    @pytest.mark.asyncio
    async def test_nonexistent_user_returns_404(self, admin_client, mock_user_repo) -> None:
        mock_user_repo.get_by_id.return_value = None
        resp = await admin_client.delete("/api/v1/users/9999")
        assert resp.status_code == 404
