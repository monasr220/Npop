from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.models.user import RoleEnum
from app.schemas.common import EMAIL_PATTERN, BaseReadSchema, BaseSchema


class UserBase(BaseSchema):
    username: str = Field(min_length=3, max_length=255)
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    bio: str | None = Field(default=None, max_length=1024)
    contact_info: str | None = Field(default=None, max_length=15)
    role: RoleEnum = RoleEnum.user


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=1024)


class UserUpdate(BaseSchema):
    username: str | None = Field(default=None, min_length=3, max_length=255)
    email: str | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
    password: str | None = Field(default=None, min_length=8, max_length=1024)
    bio: str | None = Field(default=None, max_length=1024)
    contact_info: str | None = Field(default=None, max_length=15)
    role: RoleEnum | None = None
    last_login: datetime | None = None


class UserRead(BaseReadSchema):
    username: str
    email: str
    bio: str | None
    contact_info: str | None
    role: RoleEnum
    last_login: datetime | None
    updated_at: datetime
