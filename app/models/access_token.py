from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.user import User


class AccessToken(AbstractBaseModel):
    __tablename__ = "access_token"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    expiry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    blacklisted: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="access_tokens")

    def __str__(self) -> str:
        return self.token
