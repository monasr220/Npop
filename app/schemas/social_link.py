from __future__ import annotations

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class SocialLinkCreate(BaseSchema):
    link: str = Field(min_length=1, max_length=1024)
    user_id: str = Field(min_length=1, max_length=36)


class SocialLinkUpdate(BaseSchema):
    link: str | None = Field(default=None, min_length=1, max_length=1024)


class SocialLinkRead(BaseReadSchema):
    link: str
    user_id: str
