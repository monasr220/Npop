from __future__ import annotations

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class HashtagCreate(BaseSchema):
    tag: str = Field(min_length=1, max_length=55)
    usage: int = Field(default=1, ge=0)


class HashtagUpdate(BaseSchema):
    tag: str | None = Field(default=None, min_length=1, max_length=55)
    usage: int | None = Field(default=None, ge=0)


class HashtagRead(BaseReadSchema):
    tag: str
    usage: int
