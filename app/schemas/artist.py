from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class ArtistCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=160)
    bio: str = ""
    image_url: str = Field(default="", max_length=512)
    monthly_listeners: int = Field(default=0, ge=0)
    accent: str = Field(default="#1ed760", max_length=32)


class ArtistUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    bio: str | None = None
    image_url: str | None = Field(default=None, max_length=512)
    monthly_listeners: int | None = Field(default=None, ge=0)
    accent: str | None = Field(default=None, max_length=32)


class ArtistRead(BaseReadSchema):
    user_id: str | None
    name: str
    bio: str
    image_url: str
    monthly_listeners: int
    accent: str
    verified: bool
    verified_at: datetime | None
