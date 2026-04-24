import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.enums import UserRole


_PASSWORD_RULES = [
    (r"\d", "пароль должен содержать хотя бы одну цифру"),
    (r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", "пароль должен содержать хотя бы один специальный символ"),
]


def _validate_password(v: str) -> str:
    if v.strip() != v:
        raise ValueError("пароль не должен начинаться или заканчиваться пробелами")
    for pattern, message in _PASSWORD_RULES:
        if not re.search(pattern, v):
            raise ValueError(message)
    return v


def _validate_name(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("имя не может быть пустым или состоять только из пробелов")
    return stripped


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    password_confirm: str
    first_name: str = Field(min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        return _validate_name(v) if v is not None else v

    @model_validator(mode="after")
    def passwords_match(self) -> "UserRegister":
        if self.password != self.password_confirm:
            raise ValueError("пароли не совпадают")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    # Намеренно без валидации пароля: при логине всегда доходим до проверки credentials
    # и возвращаем единственную ошибку 401, не раскрывая требования к паролю
    password: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: EmailStr
    first_name: str
    last_name: Optional[str]
    role: UserRole
    created_at: datetime
    last_login_at: Optional[datetime]


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        return _validate_name(v) if v is not None else v

    def has_changes(self) -> bool:
        # model_fields_set содержит только явно переданные поля,
        # в отличие от model_dump() который включает все поля включая дефолтные None
        return len(self.model_fields_set) > 0


class UserAdminUpdate(UserUpdate):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    new_password_confirm: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordChange":
        if self.new_password != self.new_password_confirm:
            raise ValueError("пароли не совпадают")
        return self
