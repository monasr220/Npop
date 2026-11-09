from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseReadSchema, BaseSchema


class AccessTokenCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    token: str = Field(min_length=1, max_length=500)
    expiry_time: datetime
    blacklisted: bool = False


class AccessTokenUpdate(BaseSchema):
    token: str | None = Field(default=None, min_length=1, max_length=500)
    expiry_time: datetime | None = None
    blacklisted: bool | None = None


class AccessTokenRead(BaseReadSchema):
    user_id: str
    token: str
    expiry_time: datetime
    blacklisted: bool
