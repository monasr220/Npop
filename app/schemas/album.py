from __future__ import annotations

from pydantic import Field

from app.schemas.artist import ArtistRead
from app.schemas.common import BaseReadSchema, BaseSchema


class AlbumCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=200)
    artist_id: str = Field(min_length=1, max_length=36)
    cover_url: str = Field(default="", max_length=512)
    release_year: int = Field(default=2025, ge=0, le=9999)
    kind: str = Field(default="album", max_length=32)


class AlbumUpdate(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    artist_id: str | None = Field(default=None, min_length=1, max_length=36)
    cover_url: str | None = Field(default=None, max_length=512)
    release_year: int | None = Field(default=None, ge=0, le=9999)
    kind: str | None = Field(default=None, max_length=32)


class AlbumRead(BaseReadSchema):
    title: str
    artist_id: str
    cover_url: str
    release_year: int
    kind: str
    artist: ArtistRead | None = None
