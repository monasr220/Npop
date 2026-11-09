from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class ProfilePictureCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    image: str = Field(min_length=1, max_length=1024)


class ProfilePictureUpdate(BaseSchema):
    image: str | None = Field(default=None, min_length=1, max_length=1024)


class ProfilePictureRead(BaseReadSchema):
    user_id: str
    image: str
    updated_at: datetime
