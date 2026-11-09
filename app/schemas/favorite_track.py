from __future__ import annotations

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class FavoriteTrackCreate(BaseSchema):
    track_id: str = Field(min_length=1, max_length=36)


class FavoriteTrackRead(BaseReadSchema):
    user_id: str
    track_id: str
