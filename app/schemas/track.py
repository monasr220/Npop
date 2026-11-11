from __future__ import annotations

from pydantic import Field

from app.schemas.album import AlbumRead
from app.schemas.artist import ArtistRead
from app.schemas.common import BaseReadSchema, BaseSchema


class TrackCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=200)
    album_id: str = Field(min_length=1, max_length=36)
    artist_id: str = Field(min_length=1, max_length=36)
    duration: int = Field(default=0, ge=0)
    audio_url: str = Field(default="", max_length=512)
    track_number: int = Field(default=1, ge=1)
    explicit: bool = False
    plays: int = Field(default=0, ge=0)


class TrackUpdate(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    album_id: str | None = Field(default=None, min_length=1, max_length=36)
    artist_id: str | None = Field(default=None, min_length=1, max_length=36)
    duration: int | None = Field(default=None, ge=0)
    audio_url: str | None = Field(default=None, max_length=512)
    track_number: int | None = Field(default=None, ge=1)
    explicit: bool | None = None
    plays: int | None = Field(default=None, ge=0)


class TrackRead(BaseReadSchema):
    title: str
    album_id: str
    artist_id: str
    duration: int
    audio_url: str
    track_number: int
    explicit: bool
    plays: int
    artist: ArtistRead | None = None
    album: AlbumRead | None = None
