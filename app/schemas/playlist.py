from __future__ import annotations

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class PlaylistCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    cover_url: str = Field(default="", max_length=512)
    owner_id: str | None = Field(default=None, max_length=36)
    is_system: bool = False


class PlaylistUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    cover_url: str | None = Field(default=None, max_length=512)
    owner_id: str | None = Field(default=None, max_length=36)
    is_system: bool | None = None


class PlaylistRead(BaseReadSchema):
    name: str
    description: str
    cover_url: str
    owner_id: str | None
    is_system: bool
