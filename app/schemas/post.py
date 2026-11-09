from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class PostBase(BaseSchema):
    content: str | None = Field(default=None, max_length=1024)
    image: str | None = Field(default=None, max_length=1024)
    video: str | None = Field(default=None, max_length=1024)


class PostCreate(PostBase):
    user_id: str = Field(min_length=1, max_length=36)
    original_post_id: str | None = Field(default=None, max_length=36)


class PostUpdate(BaseSchema):
    content: str | None = Field(default=None, max_length=1024)
    image: str | None = Field(default=None, max_length=1024)
    video: str | None = Field(default=None, max_length=1024)
    original_post_id: str | None = Field(default=None, max_length=36)


class PostRead(BaseReadSchema):
    user_id: str
    content: str | None
    image: str | None
    video: str | None
    original_post_id: str | None
    updated_at: datetime


class LikeCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    post_id: str = Field(min_length=1, max_length=36)
    liked: bool = False


class LikeUpdate(BaseSchema):
    liked: bool | None = None


class LikeRead(BaseReadSchema):
    user_id: str
    post_id: str
    liked: bool
