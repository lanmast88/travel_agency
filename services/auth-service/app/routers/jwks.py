from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.logic.jwks import build_jwks

router = APIRouter(tags=["JWKS"])


@router.get(
    "/.well-known/jwks.json",
    summary="JSON Web Key Set",
    description=(
        "Публичные ключи для верификации JWT, выпущенных auth-service. "
        "Клиенты должны кешировать ответ согласно Cache-Control и обновлять "
        "при встрече неизвестного kid (ротация ключей)."
    ),
)
async def get_jwks() -> JSONResponse:
    return JSONResponse(
        content=build_jwks(),
        headers={"Cache-Control": "public, max-age=3600"},
    )
