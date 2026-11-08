from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.user import User


class ProfilePicture(AbstractBaseModel):
    __tablename__ = "profile_picture"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    image: Mapped[str] = mapped_column(String(1024), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="profile_pictures")

    def __str__(self) -> str:
        return self.image
