from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.track import Track
    from app.models.user import User


class PlayHistory(AbstractBaseModel):
    __tablename__ = "play_history"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    track_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
    )
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="history")
    track: Mapped["Track"] = relationship("Track")
