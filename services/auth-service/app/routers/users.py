from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.enums import UserRole
from app.dependencies import AdminUser, AuthServiceDep, CurrentUser, EmployeeUser, UserRepoDep
from app.models.user import User
from app.schemas.user import PasswordChange, UserAdminUpdate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


async def get_user_or_404(user_id: int, repo: UserRepoDep) -> User:
    user = await repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="пользователь не найден")
    return user


UserOr404 = Annotated[User, Depends(get_user_or_404)]


# /me маршруты объявлены ДО /{user_id} — FastAPI матчит по порядку,
# без этого строка "me" интерпретируется как user_id
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: CurrentUser, repo: UserRepoDep) -> User:
    if not data.has_changes():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="нет данных для обновления",
        )
    return await repo.update(current_user, data.model_dump(exclude_unset=True))


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(data: PasswordChange, current_user: CurrentUser, service: AuthServiceDep) -> None:
    await service.change_password(current_user, data)


@router.get("", response_model=list[UserResponse])
async def list_users(
    repo: UserRepoDep,
    _: EmployeeUser,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[User]:
    return await repo.get_all(role=role, is_active=is_active, limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user: UserOr404, _: EmployeeUser) -> User:
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(data: UserAdminUpdate, user: UserOr404, _: AdminUser, repo: UserRepoDep) -> User:
    if not data.has_changes():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="нет данных для обновления",
        )
    return await repo.update(user, data.model_dump(exclude_unset=True))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(user: UserOr404, current_user: AdminUser, repo: UserRepoDep) -> None:
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="нельзя деактивировать собственный аккаунт",
        )
    await repo.deactivate(user)
