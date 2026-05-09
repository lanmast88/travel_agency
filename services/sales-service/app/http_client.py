import uuid

import httpx

from app.core.config import settings
from app.core.enums import LoyaltyLevel
from app.core.exceptions import ClientServiceUnavailableError, NotFoundError


class ClientServiceClient:
    """HTTP-клиент для межсервисных запросов к client-service.

    Принимает bearer-токен текущего сотрудника и пробрасывает его дальше,
    чтобы client-service мог авторизовать запрос.
    """

    def __init__(self, token: str) -> None:
        self._token = token

    async def get_loyalty_level(self, client_id: uuid.UUID) -> LoyaltyLevel:
        url = f"{settings.client_service_url}/clients/{client_id}/loyalty"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {self._token}"},
                )
        except httpx.RequestError as exc:
            raise ClientServiceUnavailableError() from exc

        if response.status_code == 404:
            raise NotFoundError("Клиент", client_id)
        if response.status_code != 200:
            raise ClientServiceUnavailableError(
                f"client-service вернул {response.status_code}"
            )

        return LoyaltyLevel(response.json()["loyalty_level"])
