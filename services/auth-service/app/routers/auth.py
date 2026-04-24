from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies import AuthServiceDep, rate_limit
from app.schemas.token import RefreshRequest, TokenResponse
from app.schemas.user import UserRegister

OAuthForm = Annotated[OAuth2PasswordRequestForm, Depends()]

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register"))],
)
async def register(data: UserRegister, service: AuthServiceDep) -> TokenResponse:
    return await service.register(data)


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(rate_limit("login"))])
async def login(form: OAuthForm, service: AuthServiceDep) -> TokenResponse:
    return await service.login(form.username, form.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, service: AuthServiceDep) -> TokenResponse:
    return await service.refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest, service: AuthServiceDep) -> None:
    await service.logout(data.refresh_token)
