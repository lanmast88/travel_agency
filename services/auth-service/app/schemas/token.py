from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.enums import UserRole


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    refresh_expires_in: int


class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    # type разделяет access и refresh — без этого refresh-токен можно подставить вместо access
    type: Literal["access", "refresh"]
    exp: int
    iat: int
    # jti — уникальный ID токена, нужен для точечной инвалидации refresh-токена в Redis при logout
    jti: str

    @field_validator("sub")
    @classmethod
    def sub_must_be_valid_int(cls, v: str) -> str:
        try:
            if int(v) <= 0:
                raise ValueError
        except (ValueError, TypeError):
            raise ValueError(f"sub должен быть строковым представлением положительного целого числа, получено: {v!r}")
        return v

    @field_validator("exp", "iat")
    @classmethod
    def timestamp_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("exp и iat должны быть положительными Unix-таймстемпами")
        return v

    @field_validator("jti")
    @classmethod
    def jti_must_be_uuid(cls, v: str) -> str:
        try:
            UUID(v)
        except ValueError:
            raise ValueError(f"jti должен быть валидным UUID, получено: {v!r}")
        return v

    @property
    def user_id(self) -> int:
        # sub уже провалидирован как корректный int — исключения здесь быть не может
        return int(self.sub)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)
