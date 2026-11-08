from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.user import User


class SocialLink(AbstractBaseModel):
    __tablename__ = "social_link"

    link: Mapped[str] = mapped_column(String(1024), nullable=False)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="social_links")

    def __str__(self) -> str:
        return self.link
