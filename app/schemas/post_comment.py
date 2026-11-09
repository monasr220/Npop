from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class PostCommentCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    post_id: str = Field(min_length=1, max_length=36)
    comment: str = Field(min_length=1)


class PostCommentUpdate(BaseSchema):
    comment: str | None = Field(default=None, min_length=1)


class PostCommentRead(BaseReadSchema):
    user_id: str
    post_id: str
    comment: str
    updated_at: datetime
