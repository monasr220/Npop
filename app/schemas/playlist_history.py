from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema
from app.utils.time import utcnow


class PlayHistoryCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    track_id: str = Field(min_length=1, max_length=36)
    played_at: datetime = Field(default_factory=utcnow)


class PlayHistoryUpdate(BaseSchema):
    played_at: datetime | None = None


class PlayHistoryRead(BaseReadSchema):
    user_id: str
    track_id: str
    played_at: datetime
