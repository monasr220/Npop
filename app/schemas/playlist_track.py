from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema
from app.utils.time import utcnow


class PlaylistTrackCreate(BaseSchema):
    playlist_id: str = Field(min_length=1, max_length=36)
    track_id: str = Field(min_length=1, max_length=36)
    position: int = Field(default=0, ge=0)
    added_at: datetime = Field(default_factory=utcnow)


class PlaylistTrackUpdate(BaseSchema):
    position: int | None = Field(default=None, ge=0)
    added_at: datetime | None = None


class PlaylistTrackRead(BaseReadSchema):
    playlist_id: str
    track_id: str
    position: int
    added_at: datetime
