from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    InvalidTokenError,
    TokenRevokedError,
    UserAlreadyExistsError,
    UserNotActiveError,
)

_BEARER_HEADER = {"WWW-Authenticate": "Bearer"}


def register(app: FastAPI) -> None:
    """Регистрирует обработчики доменных исключений. Вызывается один раз в main.py."""

    @app.exception_handler(UserAlreadyExistsError)
    async def user_already_exists_handler(r: Request, exc: UserAlreadyExistsError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(r: Request, exc: InvalidCredentialsError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(exc)},
            headers=_BEARER_HEADER,
        )

    @app.exception_handler(AccountLockedError)
    async def account_locked_handler(r: Request, exc: AccountLockedError) -> JSONResponse:
        # 429 Too Many Requests — стандарт для блокировки после превышения попыток (RFC 6585)
        return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": str(exc)})

    @app.exception_handler(UserNotActiveError)
    async def user_not_active_handler(r: Request, exc: UserNotActiveError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(exc)})

    @app.exception_handler(InvalidTokenError)
    async def invalid_token_handler(r: Request, exc: InvalidTokenError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(exc)},
            headers=_BEARER_HEADER,
        )

    @app.exception_handler(TokenRevokedError)
    async def token_revoked_handler(r: Request, exc: TokenRevokedError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(exc)},
            headers=_BEARER_HEADER,
        )
