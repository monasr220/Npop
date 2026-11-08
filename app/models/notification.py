from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.user import User


class NotificationStatus(str, Enum):
    read = "read"
    unread = "unread"


class Notification(AbstractBaseModel):
    __tablename__ = "notification"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        SQLAlchemyEnum(NotificationStatus),
        default=NotificationStatus.unread,
        server_default=NotificationStatus.unread.value,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="notifications")

    def __str__(self) -> str:
        return self.message
