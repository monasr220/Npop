from __future__ import annotations

from pydantic import Field

from app.models.notification import NotificationStatus
from app.schemas.common import BaseReadSchema, BaseSchema


class NotificationCreate(BaseSchema):
    user_id: str = Field(min_length=1, max_length=36)
    message: str = Field(min_length=1, max_length=255)
    status: NotificationStatus = NotificationStatus.unread


class NotificationUpdate(BaseSchema):
    message: str | None = Field(default=None, min_length=1, max_length=255)
    status: NotificationStatus | None = None


class NotificationRead(BaseReadSchema):
    user_id: str
    message: str
    status: NotificationStatus
