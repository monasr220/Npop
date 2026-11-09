from __future__ import annotations

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class ProfileTrackCreate(BaseSchema):
    track_id: str = Field(min_length=1, max_length=36)
    position: int = Field(default=0, ge=0)


class ProfileTrackUpdate(BaseSchema):
    position: int | None = Field(default=None, ge=0)


class ProfileTrackRead(BaseReadSchema):
    user_id: str
    track_id: str
    position: int
